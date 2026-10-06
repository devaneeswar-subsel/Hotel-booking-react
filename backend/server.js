require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Resend } = require("resend");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const PDFDocument = require("pdfkit");

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  "https://vvgrandpark.com",
  "https://www.vvgrandpark.com",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      /*
       * origin.includes("vercel.app") used to be here. Combined with
       * credentials:true it let ANY host whose name merely contains that
       * string — a free *.vercel.app site, or evil-vercel.app.attacker.com —
       * make authenticated requests with a signed-in user's cookie.
       *
       * Preview deployments are still supported: set FRONTEND_URL, or add the
       * exact preview URL to ALLOWED_ORIGINS. Nothing else changes.
       */
      if (
        !origin ||
        ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith(o))
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// cookieParser MUST run before any authenticated route is registered,
// otherwise req.cookies is undefined and requireAuth rejects valid sessions.
app.use(cookieParser());

/*
 * ── SQL DETAIL SHIELD ────────────────────────────────────────────────────
 *
 * Dozens of routes end with `res.status(500).json({ error: err.message })`.
 * A raw MySQL message names our tables and columns, which hands anyone
 * probing the API a free map of the schema.
 *
 * Rather than edit every route — and risk changing behaviour in any of them —
 * this wraps res.json once. Only 5xx replies are touched, and only in
 * production: every 2xx and 4xx body passes through untouched, so no working
 * flow and no error message a user is meant to read is affected. The real
 * message still goes to the server log.
 */
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production") return next();

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body.error === "string") {
      console.error(`[${req.method} ${req.originalUrl}] ${body.error}`);
      return originalJson({
        ...body,
        error: "Something went wrong. Please try again.",
      });
    }
    return originalJson(body);
  };

  next();
});

// ─── CLOUDINARY ───────────────────────────────────────────────────────────────
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Admin-only: an open upload endpoint lets anyone on the internet push files
// into our Cloudinary account and burn the plan's quota.
app.post("/api/upload", requireAdmin, async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });
    if (!process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({
        error:
          "Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
      });
    }
    const result = await cloudinary.uploader.upload(image, {
      folder: "vvgrandpark/rooms",
      transformation: [{ width: 1200, crop: "limit" }, { quality: "auto" }],
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    // Cloudinary errors are safe and useful to surface (bad key, bad file)
    res.status(500).json({ error: err.message });
  }
});

// ─── JWT ─────────────────────────────────────────────────────────────────────
// A random fallback secret means every restart invalidates all sessions, so
// staff get logged out constantly and never know why. Warn loudly instead of
// failing silently.
if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠  JWT_SECRET is not set. A random secret is being used, so every " +
      "restart will log all users out. Add JWT_SECRET to your .env file.",
  );
}
const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex");
const JWT_EXPIRES = "7d";

// ─── DB ──────────────────────────────────────────────────────────────────────
let db;
if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
  db = mysql.createPool({
    uri: process.env.MYSQL_URL || process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: { rejectUnauthorized: false },
  });
} else {
  db = mysql.createPool({
    host: process.env.MYSQLHOST || "127.0.0.1",
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE || "hotel_db",
    port: Number(process.env.MYSQLPORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
  });
}

// ─── RESEND EMAIL ─────────────────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

/*
 * The rate every add-on was charged at BEFORE per-service GST existed.
 *
 * The old code taxed room and add-ons together — (room + addons) * 0.12 — so
 * 12% is the rate historical add-on lines were actually billed at. The
 * migration stamps this onto them so their totals reproduce exactly, and a
 * free-text charge that matches nothing in the catalog still falls back to it
 * rather than silently picking a rate nobody chose.
 *
 * Declared here, above runMigrations, because the migration reads it. Keep it
 * equal to GST_RATE x 100.
 */
const LEGACY_ADDON_GST_PERCENT = 12;

/*
 * ── THE RATE HISTORY, AND WHY THERE ARE TWO CONSTANTS ──────────────────────
 *
 * Hotel accommodation in India was taxed at a flat 12% up to Rs.7,500 a night
 * (18% above) until 21 September 2025. From 22 September 2025 the lower slab
 * became 5%, charged WITHOUT input tax credit; the 18% band above Rs.7,500 is
 * unchanged and still carries ITC.
 *
 * That means 12 now means two completely different things, and they must
 * never share a constant:
 *
 *   LEGACY_ROOM_GST_PERCENT  — what historical bookings were ACTUALLY charged.
 *                              Used only to stamp rows that predate the
 *                              room_gst_rate column. It is a fact about the
 *                              past and must never change.
 *
 *   currentDefaultRoomGstPercent() — what a NEW booking is taxed at when the
 *                              admin has set no explicit rate on the room.
 *                              It follows the law and will change again.
 *
 * They were one constant before, which made the startup backfill below read
 * the live default: moving the default to 5 would have silently restamped any
 * unstamped historical booking at 5%, rewriting bills that were charged 12%.
 * Splitting them makes that class of mistake impossible.
 */
const LEGACY_ROOM_GST_PERCENT = 12;

/*
 * The tariff that divides the two accommodation slabs, per night.
 * At or below this value the room is taxed at the lower rate; above it, 18%.
 */
const ROOM_GST_SLAB_THRESHOLD = 7500;

/** Accommodation at or below the threshold. 5% from 22 Sep 2025, no ITC. */
const ROOM_GST_LOWER_PERCENT = 5;

/** Accommodation above the threshold. 18%, ITC available. */
const ROOM_GST_UPPER_PERCENT = 18;

/*
 * The rate a room SHOULD carry today, from the tariff actually being charged.
 *
 * Takes the resolved nightly rate, not the room's headline price, because a
 * room can cross Rs.7,500 between single and double occupancy — the slab
 * follows the value of the supply, so the same room can be 5% for one guest
 * and 18% for two.
 *
 * This is only the DEFAULT. An explicit rate on the room always wins, because
 * the admin may have a reason the law does not know about.
 */
function slabRateForTariff(nightlyTariff) {
  return Number(nightlyTariff) > ROOM_GST_SLAB_THRESHOLD
    ? ROOM_GST_UPPER_PERCENT
    : ROOM_GST_LOWER_PERCENT;
}

/*
 * Kept as a named export of the old meaning so nothing that still refers to
 * "the default" silently picks up the legacy rate. Anything quoting a real
 * booking should go through roomRatePercent(room, guests) instead, which
 * knows the tariff.
 */
const DEFAULT_ROOM_GST_PERCENT = ROOM_GST_LOWER_PERCENT;

/*
 * The GST rate a BOOKING is taxed at.
 *
 * Read from the booking, never from the room, and never from the current law.
 * Rooms get repriced and rates get rewritten — a stay sold at 12% in August
 * 2025 must keep printing 12% forever, or a settled invoice stops matching
 * the money taken and the audit trail breaks.
 *
 * NULL means the booking predates the column; those were all charged 12%,
 * which is why this falls back to the LEGACY constant and not to the default.
 */
function roomGstPercentOf(booking) {
  const r = booking?.room_gst_rate;
  return r == null ? LEGACY_ROOM_GST_PERCENT : Number(r);
}

/** Same thing as a multiplier, for `taxable * rate` arithmetic. */
function roomGstFractionOf(booking) {
  return roomGstPercentOf(booking) / 100;
}

/*
 * The rate to charge for a room at a KNOWN nightly tariff.
 *
 * An explicit gst_rate on the room wins outright — the admin may have a
 * reason the law does not know about. Otherwise the slab decides.
 *
 * Takes the tariff rather than deriving it, because the caller sometimes
 * knows better: a bulk booking can carry an admin-entered total that
 * overrides the room's list price, and the slab follows the value actually
 * being supplied.
 */
function roomRateForTariff(room, nightlyTariff) {
  /*
   * An explicit CGST/SGST pair IS the rate — the total is their sum. Checked
   * before gst_rate so that a room configured as 2.5 + 2.5 cannot end up
   * taxed at a stale total left in gst_rate from before the split was set.
   */
  const c = room?.cgst_rate;
  const s = room?.sgst_rate;
  if (c != null && c !== "" && s != null && s !== "") {
    return round2(Number(c) + Number(s));
  }

  const explicit = room?.gst_rate;
  if (explicit != null && explicit !== "") return Number(explicit);
  return slabRateForTariff(nightlyTariff);
}

/*
 * The rate to charge a booking about to be created, at a given occupancy.
 */
function roomRatePercent(room, guestCount = 1) {
  return roomRateForTariff(room, resolveNightlyRate(room || {}, guestCount));
}

/*
 * Freeze the room's current GST rate onto a booking that was just created.
 *
 * Done as a separate statement rather than as a column in each of the seven
 * INSERTs, because those use long positional parameter lists and adding a
 * column to each is an easy way to shift every value by one and corrupt a
 * booking silently.
 *
 * `WHERE room_gst_rate IS NULL` makes it idempotent and, more importantly,
 * makes it incapable of UN-freezing: calling it twice, or calling it on an
 * old booking, changes nothing. The rate is written once and then belongs to
 * that booking forever.
 *
 * Pass the transaction's connection when the booking was inserted inside one,
 * otherwise the pool cannot see the uncommitted row.
 */
async function stampRoomGstRate(bookingId, conn = db) {
  try {
    /*
     * The rate is computed here in JS rather than with a SQL COALESCE,
     * because the fallback is no longer a constant — it depends on the
     * tariff this stay was sold at, and a room can sit on either side of
     * Rs.7,500 depending on occupancy.
     *
     * Deriving it the same way calculateBookingAmounts() did is the whole
     * point: a COALESCE(r.gst_rate, <constant>) here would stamp 5% onto a
     * suite that was just CHARGED 18%, and the invoice would then contradict
     * the money taken.
     */
    const [rows] = await conn.query(
      `SELECT b.guest_count, r.gst_rate, r.cgst_rate, r.sgst_rate,
              r.price_per_night, r.price_double
         FROM bookings b
         JOIN rooms r ON r.room_id = b.room_id
        WHERE b.booking_id = ? AND b.room_gst_rate IS NULL`,
      [bookingId],
    );

    // Already stamped, or no such booking — either way there is nothing to do.
    if (rows.length) {
      const row = rows[0];
      const total = roomRatePercent(row, row.guest_count);

      /*
       * The split is frozen only when the room actually HAS one configured.
       * Writing the derived halves would record a figure nobody chose and
       * make a later change to how the split is derived unable to reach
       * these bookings; leaving them NULL keeps "ordinary half-and-half"
       * expressible as what it is.
       */
      const hasSplit =
        row.cgst_rate != null && row.cgst_rate !== "" &&
        row.sgst_rate != null && row.sgst_rate !== "";

      await conn.query(
        `UPDATE bookings
            SET room_gst_rate = ?, room_cgst_rate = ?, room_sgst_rate = ?
          WHERE booking_id = ? AND room_gst_rate IS NULL`,
        [
          total,
          hasSplit ? Number(row.cgst_rate) : null,
          hasSplit ? Number(row.sgst_rate) : null,
          bookingId,
        ],
      );
    }
  } catch (e) {
    // Never fail a confirmed booking over this.
    console.error(`Could not stamp room GST on booking ${bookingId}:`, e.message);
  }

  /*
   * Open the folio for this stay: a room line per night, plus the vehicle,
   * discounts and any advance already taken.
   *
   * Hung off this call because every one of the seven creation paths already
   * makes it, so there is exactly one place that knows a booking has just
   * come into existence — rather than seven places that each have to
   * remember two things instead of one.
   */
  try {
    await rebuildFolioFromColumns(bookingId, conn);
  } catch (e) {
    console.error(`Could not open folio for booking ${bookingId}:`, e.message);
  }
}

// ─── AUTO MIGRATE ────────────────────────────────────────────────────────────
async function runMigrations() {
  try {
    try {
      await db.query("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL");
    } catch (e) {}
    const cols = [
      "actual_checkin DATETIME DEFAULT NULL",
      "actual_checkout DATETIME DEFAULT NULL",
      "hours_spent DECIMAL(10,2) DEFAULT NULL",
      "addon_charges DECIMAL(10,2) DEFAULT 0",
      "gst_amount DECIMAL(10,2) DEFAULT 0",
      "final_total DECIMAL(10,2) DEFAULT NULL",
      "total_amount DECIMAL(10,2) DEFAULT NULL",
      "advance_amount DECIMAL(10,2) DEFAULT 0",
      "advance_paid DECIMAL(10,2) DEFAULT 0",
      "balance_paid DECIMAL(10,2) DEFAULT 0",
      "remaining_amount DECIMAL(10,2) DEFAULT 0",
      "payment_status VARCHAR(30) DEFAULT 'PAID'",
      "advance_payment_id VARCHAR(100) DEFAULT NULL",
      "advance_order_id VARCHAR(100) DEFAULT NULL",
      "payment_method VARCHAR(30) DEFAULT NULL",
      "booking_source VARCHAR(30) DEFAULT NULL",
      "vehicle_type VARCHAR(30) DEFAULT NULL",
      "vehicle_price DECIMAL(10,2) DEFAULT 0",
      "vehicle_status VARCHAR(30) DEFAULT 'pending'",
      "pickup_location VARCHAR(255) DEFAULT NULL",
      "dropoff_location VARCHAR(255) DEFAULT NULL",
      "notes TEXT DEFAULT NULL",
      // ── guest check-in details ──
      "id_proof_type VARCHAR(50) DEFAULT NULL",
      "id_proof_number VARCHAR(60) DEFAULT NULL",
      "adults_count INT DEFAULT NULL",
      "children_count INT DEFAULT 0",
      "checkin_payment_mode VARCHAR(40) DEFAULT NULL",
      // ── split payment tracking (advance vs balance) ──
      "advance_payment_mode VARCHAR(40) DEFAULT NULL",
      "advance_paid_at DATETIME DEFAULT NULL",
      "balance_payment_mode VARCHAR(40) DEFAULT NULL",
      "balance_paid_at DATETIME DEFAULT NULL",
      "addon_payment_mode VARCHAR(40) DEFAULT NULL",
      "addon_paid_at DATETIME DEFAULT NULL",
      "discount_applied TINYINT DEFAULT 0",
      "discount_amount DECIMAL(10,2) DEFAULT 0",
      // ── checkout-time discount (separate from booking-time discount) ──
      "checkout_discount_applied TINYINT DEFAULT 0",
      "checkout_discount_amount DECIMAL(10,2) DEFAULT 0",
      "checkout_discount_reason VARCHAR(255) DEFAULT NULL",
      "checkout_discount_at DATETIME DEFAULT NULL",
      "checkout_discount_by INT DEFAULT NULL",
      // ── GST breakdown, computed once by the backend ──
      // taxable_amount is the room value AFTER any discount. GST is charged on
      // this, never on the full tariff. Storing it means the invoice and the
      // dashboard read the same number instead of each recomputing it.
      "taxable_amount DECIMAL(10,2) DEFAULT NULL",
      // ADDITIONAL: 1 = taxed exactly as before, 0 = admin issued this
      // booking with GST off. Defaults to 1 so nothing existing changes.
      "gst_enabled TINYINT DEFAULT 1",
      /*
       * ADD-ON GST, stored separately from the room's GST.
       *
       * The room is taxed at GST_RATE (12%). Add-ons are taxed at whatever
       * rate the admin configured for that service in addon_catalog — 5% for
       * Food & Beverage, Laundry, Extra Bed and Room Service. Because the two
       * no longer share a rate, the add-on tax can no longer be derived from
       * addon_charges alone and has to be stored.
       *
       * NULL means "written before this column existed". Every reader falls
       * back to addon_charges * GST_RATE in that case, which is exactly what
       * those bookings were charged, so no historical total moves.
       */
      "addon_gst_amount DECIMAL(10,2) DEFAULT NULL",
      /*
       * The room GST rate this stay was sold at, as a percentage.
       *
       * Copied from the room when the booking is created and frozen there.
       * Repricing a room, or moving it across the Rs.7,500 slab, changes what
       * the NEXT booking is taxed at — never one already taken.
       *
       * Backfilled to 12 below for every pre-existing booking, which is what
       * they were actually charged.
       */
      "room_gst_rate DECIMAL(5,2) DEFAULT NULL",
      /*
       * The CGST / SGST halves this stay was billed at, frozen like the total.
       *
       * Both NULL means the split was the ordinary half-and-half, which is
       * what every booking so far used — the invoice derives it rather than
       * storing a figure nobody chose. They carry a value only when the room
       * had an uneven split configured at the moment of sale.
       */
      "room_cgst_rate DECIMAL(5,2) DEFAULT NULL",
      "room_sgst_rate DECIMAL(5,2) DEFAULT NULL",
      "gst_number VARCHAR(20) DEFAULT NULL",
      // Billing address printed under BILL TO. Optional — a booking without one
      // prints exactly as it did before.
      "customer_address VARCHAR(255) DEFAULT NULL",
    ];
    for (const col of cols) {
      try {
        await db.query(`ALTER TABLE bookings ADD COLUMN ${col}`);
      } catch (e) {
        // "column already exists" is the normal case on every restart after
        // the first. Anything else is a real problem and must not be silent.
        if (e.code !== "ER_DUP_FIELDNAME") {
          console.error(`Migration failed for column [${col}]:`, e.message);
        }
      }
    }

    // ── occupancy pricing ──
    // price_double is the nightly rate when 2 or more adults stay. Rooms that
    // leave it NULL keep charging price_per_night regardless of occupancy, so
    // existing rooms are unaffected.
    try {
      await db.query(
        "ALTER TABLE rooms ADD COLUMN price_double DECIMAL(10,2) DEFAULT NULL",
      );
    } catch (e) {}

    /*
     * ── per-room GST rate ──
     * The admin sets this on the room form. NULL means "follow the slab" —
     * 5% at or below Rs.7,500 a night, 18% above.
     */
    try {
      await db.query(
        "ALTER TABLE rooms ADD COLUMN gst_rate DECIMAL(5,2) DEFAULT NULL",
      );
    } catch (e) {
      if (e.code !== "ER_DUP_FIELDNAME") {
        console.error("Migration failed for rooms.gst_rate:", e.message);
      }
    }

    /*
     * ── per-room CGST / SGST split ──
     *
     * GST on a room is one rate that PRINTS as two halves. Accommodation's
     * place of supply is the property's own state (IGST Act s.12(3)(b)), so
     * a Tamil Nadu hotel always bills CGST + SGST and never IGST — even to a
     * company registered in another state. There is deliberately no IGST
     * column here, because for this supply there is no case that needs one.
     *
     * Both NULL means "split the total in half", which is the ordinary case
     * and what every existing room does without being touched. They exist
     * only so an admin can enter an uneven split if their auditor asks for
     * one; when they are set, the total becomes their sum.
     */
    for (const col of [
      "cgst_rate DECIMAL(5,2) DEFAULT NULL",
      "sgst_rate DECIMAL(5,2) DEFAULT NULL",
    ]) {
      try {
        await db.query(`ALTER TABLE rooms ADD COLUMN ${col}`);
      } catch (e) {
        if (e.code !== "ER_DUP_FIELDNAME") {
          console.error(`Migration failed for rooms.${col}:`, e.message);
        }
      }
    }

    /*
     * One-time room data correction (room types, occupancy and tariff).
     *
     * The client's inventory is 17 Deluxe (sleeps 2), 2 Suite Room and
     * 1 Suite with Balcony (both sleep 4). Older rows used names like
     * "Standard" and "Luxury" with the wrong capacity, which made the
     * availability search reject valid parties.
     *
     * Guarded by a marker row in a settings table so it runs ONCE and never
     * overwrites a price an admin later edits in the dashboard.
     */
    try {
      await db.query(
        `CREATE TABLE IF NOT EXISTS app_settings (
           setting_key VARCHAR(60) PRIMARY KEY,
           setting_value VARCHAR(255) DEFAULT NULL,
           applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         )`,
      );

      const [done] = await db.query(
        "SELECT setting_key FROM app_settings WHERE setting_key='room_types_normalised_v1'",
      );

      if (!done.length) {
        await db.query(
          `UPDATE rooms
              SET room_type='Deluxe Room', capacity=2,
                  price_per_night=2000, price_double=2300
            WHERE room_type IN ('Standard','Standard AC Room','Deluxe','Deluxe Room')`,
        );
        await db.query(
          `UPDATE rooms
              SET room_type='Suite Room', capacity=4,
                  price_per_night=4500, price_double=4500
            WHERE room_type IN ('Suite','Suite Room')`,
        );
        await db.query(
          `UPDATE rooms
              SET room_type='Suite with Balcony', capacity=4,
                  price_per_night=4500, price_double=4500
            WHERE room_type IN ('Luxury','Suite with Balcony','Suite With Balcony')`,
        );

        await db.query(
          "INSERT INTO app_settings (setting_key, setting_value) VALUES ('room_types_normalised_v1','done')",
        );

        const [summary] = await db.query(
          "SELECT room_type, COUNT(*) AS rooms, capacity FROM rooms GROUP BY room_type, capacity",
        );
        console.log("✅ Room types normalised:", summary);
      }
    } catch (e) {
      console.error("Room normalisation skipped:", e.message);
    }
    await db.query(
      `CREATE TABLE IF NOT EXISTS booking_addons (addon_id INT AUTO_INCREMENT PRIMARY KEY, booking_id INT NOT NULL, label VARCHAR(100) NOT NULL, amount DECIMAL(10,2) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE)`,
    );
    await db.query(
      `CREATE TABLE IF NOT EXISTS room_blocked_dates (
          room_id INT NOT NULL,
          blocked_date DATE NOT NULL,
          PRIMARY KEY (room_id, blocked_date),
          FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
        )`,
    );

    // why a room is held: maintenance, cleaning, or a bulk booking
    for (const col of [
      "block_reason VARCHAR(40) DEFAULT NULL",
      "block_note VARCHAR(255) DEFAULT NULL",
      "booking_id INT DEFAULT NULL",
    ]) {
      try {
        await db.query(`ALTER TABLE room_blocked_dates ADD COLUMN ${col}`);
      } catch (e) {}
    }
    try {
      await db.query(
        "ALTER TABLE booking_addons ADD COLUMN paid TINYINT DEFAULT 0",
      );
    } catch (e) {}

    /* ═══════════════════════════════════════════════════════════════════════
       ADD-ON GST CONFIGURATION  —  the ORDER / ORDER ITEM model
       ═══════════════════════════════════════════════════════════════════════

       Three tables, each with one job:

         addon_catalog    the PRODUCT list. One row per chargeable service
                          ("Food & Beverage", "Laundry"), carrying the GST
                          rate the admin configured for it. Editable from the
                          dashboard; new services are added here.

         bookings         the ORDER. One row per stay. Holds the totals.

         booking_addons   the ORDER ITEM. One row per charge posted to a
                          stay: which catalog item, how many, at what unit
                          price, and — critically — the GST RATE THAT APPLIED
                          AT THE MOMENT IT WAS POSTED.

       Why the rate is copied onto the line instead of being read from the
       catalog at print time:

         A guest checks in on the 1st and is charged Rs.1,000 of laundry at
         5%. On the 10th the admin changes Laundry to 12%. If the invoice
         read the rate from the catalog, that guest's already-settled bill
         would silently reprint at 12% and stop matching the money actually
         collected — and every historical report would drift with it.

         Copying the rate onto the order item freezes it. Changing the
         catalog affects the NEXT charge posted, never one already posted.
         This is the same reason an order item stores its own price rather
         than pointing at today's product price.
       ═══════════════════════════════════════════════════════════════════ */
    await db.query(
      `CREATE TABLE IF NOT EXISTS addon_catalog (
         catalog_id     INT AUTO_INCREMENT PRIMARY KEY,
         name           VARCHAR(100) NOT NULL,
         gst_rate       DECIMAL(5,2) NOT NULL DEFAULT 5.00,
         hsn_sac        VARCHAR(20)  DEFAULT NULL,
         default_amount DECIMAL(10,2) DEFAULT NULL,
         is_active      TINYINT DEFAULT 1,
         sort_order     INT DEFAULT 0,
         created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         UNIQUE KEY uniq_addon_name (name)
       )`,
    );

    /*
     * The four services the client asked for, all at 5%.
     *
     * Guarded by a marker in app_settings so it seeds ONCE. Without the
     * guard every restart would re-insert — or worse, reset a rate the
     * admin had just changed in the dashboard back to 5%.
     */
    try {
      // app_settings is normally created by the room-normalisation block
      // above; create it here too so a failure up there cannot stop the
      // catalog from ever seeding.
      await db.query(
        `CREATE TABLE IF NOT EXISTS app_settings (
           setting_key VARCHAR(60) PRIMARY KEY,
           setting_value VARCHAR(255) DEFAULT NULL,
           applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         )`,
      );
      const [seeded] = await db.query(
        "SELECT setting_key FROM app_settings WHERE setting_key='addon_catalog_seed_v1'",
      );
      if (!seeded.length) {
        const defaults = [
          ["Food & Beverage", 5.0, "996332", 10],
          ["Laundry", 5.0, "999711", 20],
          ["Extra Bed", 5.0, "996311", 30],
          ["Room Service", 5.0, "996311", 40],
        ];
        for (const [name, rate, hsn, order] of defaults) {
          // INSERT IGNORE so a name the client already created by hand is
          // left exactly as they set it rather than being overwritten.
          await db.query(
            `INSERT IGNORE INTO addon_catalog (name, gst_rate, hsn_sac, sort_order)
             VALUES (?,?,?,?)`,
            [name, rate, hsn, order],
          );
        }
        await db.query(
          "INSERT INTO app_settings (setting_key, setting_value) VALUES ('addon_catalog_seed_v1','done')",
        );
        console.log("✅ Add-on GST catalog seeded (F&B, Laundry, Extra Bed, Room Service @ 5%)");
      }
    } catch (e) {
      console.error("Add-on catalog seed skipped:", e.message);
    }

    // ── booking_addons becomes a proper order item ──
    // `label` and `amount` are deliberately left untouched. Every existing
    // query (SELECT SUM(amount), a.label on the invoice) keeps working with
    // no change at all; these columns sit alongside them.
    for (const col of [
      "catalog_id INT DEFAULT NULL",
      "quantity DECIMAL(10,2) NOT NULL DEFAULT 1",
      "unit_price DECIMAL(10,2) DEFAULT NULL",
      // percent, e.g. 5.00 — snapshotted when the line is posted
      "gst_rate DECIMAL(5,2) DEFAULT NULL",
      // quantity x unit_price, i.e. the value GST is charged on. Always kept
      // equal to `amount` so the two can never disagree.
      "taxable_amount DECIMAL(10,2) DEFAULT NULL",
      "gst_amount DECIMAL(10,2) DEFAULT NULL",
      "line_total DECIMAL(10,2) DEFAULT NULL",
    ]) {
      try {
        await db.query(`ALTER TABLE booking_addons ADD COLUMN ${col}`);
      } catch (e) {
        if (e.code !== "ER_DUP_FIELDNAME") {
          console.error(`Migration failed for booking_addons [${col}]:`, e.message);
        }
      }
    }

    /*
     * Backfill every add-on posted before this feature existed.
     *
     * They were charged at the room rate — 12% — because that is what the
     * old code did: gst = (room + addons) * 0.12. So 12 is the rate that
     * ACTUALLY applied to them, and writing it here reproduces their old
     * total to the paisa. Backfilling them at 5% would quietly rewrite
     * history and make every past invoice reprint with a smaller tax than
     * the guest paid.
     *
     * Only rows with gst_rate IS NULL are touched, so this is a no-op on
     * every restart after the first.
     */
    try {
      const [bf] = await db.query(
        `UPDATE booking_addons
            SET quantity       = 1,
                unit_price     = amount,
                gst_rate       = ?,
                taxable_amount = amount,
                gst_amount     = ROUND(amount * ? / 100, 2),
                line_total     = ROUND(amount * (1 + ? / 100), 2)
          WHERE gst_rate IS NULL`,
        [LEGACY_ADDON_GST_PERCENT, LEGACY_ADDON_GST_PERCENT, LEGACY_ADDON_GST_PERCENT],
      );
      if (bf.affectedRows) {
        console.log(
          `✅ Backfilled ${bf.affectedRows} existing add-on line(s) at ${LEGACY_ADDON_GST_PERCENT}% — totals unchanged`,
        );
      }
    } catch (e) {
      console.error("Add-on backfill skipped:", e.message);
    }

    /*
     * Stamp every pre-existing booking with the room GST rate it was actually
     * charged at.
     *
     * This writes LEGACY_ROOM_GST_PERCENT (12), never the current default.
     * Any booking still carrying NULL here was created before the column
     * existed, which means it was created under the flat-12% regime and was
     * charged 12% — regardless of what the law says today or what rate the
     * room now carries.
     *
     * Reading the live default here instead would mean that the day the
     * default moved to 5%, the next restart quietly restamped those rows at
     * 5% and every one of their invoices started printing a tax figure that
     * does not match the money that was taken.
     *
     * Only rows with room_gst_rate IS NULL are touched, so this is a no-op on
     * every restart after the first.
     */
    try {
      const [bf] = await db.query(
        "UPDATE bookings SET room_gst_rate = ? WHERE room_gst_rate IS NULL",
        [LEGACY_ROOM_GST_PERCENT],
      );
      if (bf.affectedRows) {
        console.log(
          `✅ Stamped ${bf.affectedRows} existing booking(s) at ${LEGACY_ROOM_GST_PERCENT}% room GST — totals unchanged`,
        );
      }
    } catch (e) {
      console.error("Room GST backfill skipped:", e.message);
    }

    // Set once the folio has been built for the bookings that existed before
    // it did. Checked after the table is created, below.
    var FOLIO_BACKFILL_KEY = "folio_backfill_v1";

    await db.query(
      /* ════════════════════════════════════════════════════════════════════
         THE FOLIO — booking_items
         ════════════════════════════════════════════════════════════════════

         One row per thing that has ever been posted to a stay: each night of
         room charge, each add-on, the vehicle, discounts, and payments. This
         is the order-item table a hotel PMS actually keeps, and it is what
         Opera, Mews and Cloudbeds all call the folio.

         THREE RULES IT FOLLOWS

         1. ROOM IS POSTED PER NIGHT.
            A three-night stay is three ROOM lines, each with its own
            service_date and its own rate. That is what makes a mid-stay rate
            change, an extension or an early checkout expressible at all —
            with the tariff as a single number on the booking, none of them
            can be represented without losing history.

         2. PAYMENTS ARE LINES TOO, carried negative.
            The balance is then simply SUM(line_total) over the live lines.
            There is no separate balance to keep in step, because there is
            nothing to keep in step.

         3. NOTHING POSTED IS EVER DELETED.
            A mistake is voided (voided=1, with a reason), never removed. A
            bill you can silently edit is not a bill anyone can audit, and
            "where did that charge go?" has to have an answer.

         SIGNS: charges positive, payments and discounts negative.

         SAFETY: this table is additive. Every existing column on `bookings`
         is still written exactly as before and every screen still reads
         those columns, so nothing depends on this table until the
         verification below proves it reproduces each booking to the paisa.
         ════════════════════════════════════════════════════════════════════ */
      `CREATE TABLE IF NOT EXISTS booking_items (
        item_id        INT AUTO_INCREMENT PRIMARY KEY,
        booking_id     INT NOT NULL,
        line_no        INT DEFAULT 0,

        -- ROOM | ADDON | VEHICLE | DISCOUNT | PAYMENT
        item_type      VARCHAR(20) NOT NULL,

        -- the configured service, for an ADDON line
        catalog_id     INT DEFAULT NULL,
        -- the booking_addons row this mirrors, while both exist
        source_addon_id INT DEFAULT NULL,

        label          VARCHAR(150) NOT NULL,
        -- which night, or the day the charge was incurred
        service_date   DATE DEFAULT NULL,

        quantity       DECIMAL(10,2) NOT NULL DEFAULT 1,
        unit_price     DECIMAL(12,2) NOT NULL DEFAULT 0,
        gst_rate       DECIMAL(5,2) NOT NULL DEFAULT 0,

        taxable_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        gst_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
        line_total     DECIMAL(12,2) NOT NULL DEFAULT 0,

        payment_mode   VARCHAR(40) DEFAULT NULL,
        reference      VARCHAR(120) DEFAULT NULL,

        voided         TINYINT DEFAULT 0,
        voided_at      DATETIME DEFAULT NULL,
        void_reason    VARCHAR(255) DEFAULT NULL,

        posted_by      INT DEFAULT NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_folio_booking (booking_id, voided),
        INDEX idx_folio_type (booking_id, item_type),
        FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
      )`,
    );
    /* ════════════════════════════════════════════════════════════════════
       CREDIT NOTES

       A tax invoice that has been issued is not editable. When the tax on it
       turns out to be wrong — the 12%-to-5% accommodation change of 22 Sep
       2025 being the case this was built for — the correction is a separate
       document that REFERENCES the original, not a rewrite of it.

       So nothing here ever touches the `bookings` row. The booking keeps the
       frozen room_gst_rate it was sold at and its invoice keeps reprinting
       exactly as it always did; the credit note sits beside it and records
       the difference. That is what makes the pair reconcilable afterwards:
       the original shows what was charged, the note shows what was given
       back, and both survive.

       THE SERIAL NUMBER IS THE PART THAT MATTERS.
       A credit note series has to be consecutive — gaps are what an auditor
       asks about. cn_seq is allocated as MAX+1 within the financial year
       under a transaction, and UNIQUE(fin_year, cn_seq) is the backstop: if
       two notes are ever issued at the same instant, the loser gets a
       duplicate-key error and retries, rather than silently reusing a number
       or skipping one.

       Indian financial years run April to March, so the year label is
       derived from the issue date, not the calendar year.
       ════════════════════════════════════════════════════════════════════ */
    await db.query(
      `CREATE TABLE IF NOT EXISTS credit_notes (
        credit_note_id  INT AUTO_INCREMENT PRIMARY KEY,

        -- the printed serial, e.g. CN/2025-26/0001
        cn_number       VARCHAR(32)  NOT NULL,
        fin_year        VARCHAR(9)   NOT NULL,
        cn_seq          INT          NOT NULL,

        booking_id      INT          NOT NULL,

        -- what this note corrects. Stored rather than derived, because the
        -- invoice number must stay stable even if the derivation changes.
        original_invoice_no   VARCHAR(64) NOT NULL,
        original_invoice_date DATE        DEFAULT NULL,

        issue_date      DATE         NOT NULL,
        reason          VARCHAR(255) NOT NULL,

        -- the taxable value the tax was charged on. Unchanged by a rate
        -- correction: only the tax moves, not the value of the supply.
        taxable_amount  DECIMAL(12,2) NOT NULL,

        original_rate   DECIMAL(5,2)  NOT NULL,
        revised_rate    DECIMAL(5,2)  NOT NULL,
        gst_original    DECIMAL(12,2) NOT NULL,
        gst_revised     DECIMAL(12,2) NOT NULL,

        -- what is being credited back: gst_original - gst_revised
        gst_credited    DECIMAL(12,2) NOT NULL,

        -- cancelled notes keep their serial, so the series stays gapless
        status          VARCHAR(12)  NOT NULL DEFAULT 'issued',
        cancelled_at    DATETIME     DEFAULT NULL,
        cancel_reason   VARCHAR(255) DEFAULT NULL,

        created_by      VARCHAR(120) DEFAULT NULL,
        created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

        UNIQUE KEY uniq_cn_number (cn_number),
        UNIQUE KEY uniq_cn_fy_seq (fin_year, cn_seq),
        INDEX idx_cn_booking (booking_id),
        INDEX idx_cn_issue (issue_date),
        FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
      )`,
    );
    await db.query(
      `CREATE TABLE IF NOT EXISTS booking_guests (
        guest_id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        guest_type VARCHAR(10) NOT NULL DEFAULT 'adult',
        name VARCHAR(120) NOT NULL,
        age INT DEFAULT NULL,
        gender VARCHAR(20) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
      )`,
    );
    await db.query(
      `CREATE TABLE IF NOT EXISTS reviews (review_id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, booking_id INT NOT NULL, room_id INT NOT NULL, rating INT NOT NULL, review_text TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE, FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE)`,
    );
    await db.query(
      `CREATE TABLE IF NOT EXISTS password_otps (otp_id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL, otp VARCHAR(6) NOT NULL, expires_at DATETIME NOT NULL, used TINYINT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    );
    /* ════════════════════════════════════════════════════════════════════
       FOLIO BACKFILL

       Build the folio for every booking that existed before the table did.

       The bar this has to clear: for each booking, the folio's balance must
       equal the remaining_amount already stored on it, and its gross must
       equal total_amount. If it does not, the folio is WRONG and must not be
       trusted — so a mismatch is reported loudly and the booking is left
       with its columns untouched. Nothing reads the folio yet, so a bad row
       cannot hurt anyone; it just has to be visible.

       Guarded by a marker so it runs once. Re-run it deliberately with
       POST /api/admin/folio/rebuild.
       ════════════════════════════════════════════════════════════════════ */
    try {
      const [done] = await db.query(
        "SELECT setting_key FROM app_settings WHERE setting_key=?",
        [FOLIO_BACKFILL_KEY],
      );
      if (!done.length) {
        const [ids] = await db.query(
          "SELECT booking_id FROM bookings ORDER BY booking_id ASC",
        );
        let built = 0;
        const mismatches = [];

        for (const { booking_id } of ids) {
          try {
            const folio = await rebuildFolioFromColumns(booking_id);
            if (!folio) continue;
            built += 1;

            const [[bk]] = await db.query(
              "SELECT total_amount, final_total, remaining_amount FROM bookings WHERE booking_id=?",
              [booking_id],
            );
            const storedTotal = Number(bk.total_amount ?? bk.final_total ?? 0);
            // a paisa of slack for values stored before the rounding rules settled
            if (storedTotal > 0 && Math.abs(folio.grossTotal - storedTotal) > 0.02) {
              mismatches.push(
                `#${booking_id}: folio ${folio.grossTotal} vs stored ${storedTotal}`,
              );
            }
          } catch (e) {
            mismatches.push(`#${booking_id}: ${e.message}`);
          }
        }

        await db.query(
          "INSERT INTO app_settings (setting_key, setting_value) VALUES (?,?)",
          [FOLIO_BACKFILL_KEY, `built=${built};mismatched=${mismatches.length}`],
        );

        console.log(`✅ Folio built for ${built} booking(s)`);
        if (mismatches.length) {
          console.warn(
            `⚠  ${mismatches.length} folio(s) do not match their stored total:`,
          );
          mismatches.slice(0, 20).forEach((m) => console.warn("   " + m));
          if (mismatches.length > 20) {
            console.warn(`   ...and ${mismatches.length - 20} more`);
          }
          console.warn(
            "   Nothing reads the folio yet, so no bill is affected. Send this list on.",
          );
        } else if (built) {
          console.log("✅ Every folio matches its stored total exactly");
        }
      }
    } catch (e) {
      console.error("Folio backfill skipped:", e.message);
    }

    console.log("✅ Migrations done");
  } catch (err) {
    console.error("Migration error:", err.message);
  }
}
runMigrations();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const GST_RATE = 0.12;
const VEHICLE_PRICES = {
  none: 0,
  "4-seater": 600,
  "7-seater": 900,
  "12-seater": 1400,
};
const ADVANCE_RATE = 0.3;
const MANUAL_ADVANCE_PAYMENT_MODES = {
  cash: "Cash",
  online: "Online",
  other: "Other",
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CUSTOMER_NAME_PATTERN = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

function normalizeCustomerPhone(value) {
  let phone = String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("91") && phone.length === 12) phone = phone.slice(2);
  if (phone.startsWith("0") && phone.length === 11) phone = phone.slice(1);
  return phone;
}

function resolveAdvanceAmount(value, totalAmount = null) {
  // Empty / null / undefined = ₹0
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return 0;
  }

  const amount = Number(value);

  // Negative / invalid only
  if (!Number.isFinite(amount) || amount < 0) {
    const error = new Error("Enter a valid advance amount");
    error.status = 400;
    throw error;
  }

  const normalizedAmount = Math.round(amount * 100) / 100;

  // Only validate against total when total is a valid positive number
  const fullAmount = Number(totalAmount);

  if (
    Number.isFinite(fullAmount) &&
    fullAmount > 0 &&
    normalizedAmount > fullAmount
  ) {
    const error = new Error(
      "Advance amount cannot exceed the full amount"
    );
    error.status = 400;
    throw error;
  }

  return normalizedAmount;
}

// ─── AUTH COOKIE ─────────────────────────────────────────────────────────────
function setAuthCookie(res, user) {
  const token = jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  return token;
}

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token =
    req.cookies?.auth_token ||
    req.headers?.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.clearCookie("auth_token");
    return res
      .status(401)
      .json({ error: "Session expired. Please login again." });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin")
      return res.status(403).json({ error: "Admin access required" });
    next();
  });
}

function requireManager(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin" && req.user.role !== "manager")
      return res.status(403).json({ error: "Manager access required" });
    next();
  });
}

// True when the caller is staff, or is acting on their own record. Guest
// endpoints that take a :user_id or a booking id must call this, otherwise
// changing the number in the URL exposes another guest's data.
function isStaff(req) {
  return req.user?.role === "admin" || req.user?.role === "manager";
}

function ownsOrStaff(req, ownerUserId) {
  if (isStaff(req)) return true;
  return Number(ownerUserId) === Number(req.user?.user_id);
}

// ─── LOGIN RATE LIMIT ────────────────────────────────────────────────────────
// Without this, an admin password can be brute forced at network speed.
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

function loginRateLimit(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const now = Date.now();
  const hits = (loginAttempts.get(ip) || []).filter(
    (t) => now - t < LOGIN_WINDOW_MS,
  );

  if (hits.length >= LOGIN_MAX_ATTEMPTS) {
    return res.status(429).json({
      error: "Too many login attempts. Please try again in 15 minutes.",
    });
  }

  hits.push(now);
  loginAttempts.set(ip, hits);

  if (loginAttempts.size > 5000) {
    for (const [key, times] of loginAttempts) {
      if (!times.some((t) => now - t < LOGIN_WINDOW_MS))
        loginAttempts.delete(key);
    }
  }
  next();
}

/*
 * ── OTP ATTEMPT LIMIT ────────────────────────────────────────────────────
 *
 * A password-reset OTP is six digits. Without a limit an attacker can try
 * every combination inside the ten-minute window and take over any account
 * whose email they know — including an admin's.
 *
 * Counted per email so the limit cannot be sidestepped by rotating IPs. A
 * correct OTP clears the counter, so a guest who mistypes twice is unaffected.
 */
const otpAttempts = new Map();
const OTP_WINDOW_MS = 15 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function otpAttemptsExceeded(email) {
  const key = String(email || "").toLowerCase();
  const now = Date.now();
  const hits = (otpAttempts.get(key) || []).filter(
    (t) => now - t < OTP_WINDOW_MS,
  );
  otpAttempts.set(key, hits);
  return hits.length >= OTP_MAX_ATTEMPTS;
}

function recordOtpAttempt(email) {
  const key = String(email || "").toLowerCase();
  const now = Date.now();
  const hits = (otpAttempts.get(key) || []).filter(
    (t) => now - t < OTP_WINDOW_MS,
  );
  hits.push(now);
  otpAttempts.set(key, hits);

  if (otpAttempts.size > 5000) {
    for (const [k, times] of otpAttempts) {
      if (!times.some((t) => now - t < OTP_WINDOW_MS)) otpAttempts.delete(k);
    }
  }
}

function clearOtpAttempts(email) {
  otpAttempts.delete(String(email || "").toLowerCase());
}

/*
 * ── OTP REQUEST LIMIT ────────────────────────────────────────────────────
 *
 * Stops one address being mailed an OTP over and over, which would flood the
 * guest's inbox, burn the Resend quota and get the sending domain flagged.
 */
const otpRequests = new Map();
const OTP_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const OTP_MAX_REQUESTS = 5;

function otpRequestsExceeded(email) {
  const key = String(email || "").toLowerCase();
  const now = Date.now();
  const hits = (otpRequests.get(key) || []).filter(
    (t) => now - t < OTP_REQUEST_WINDOW_MS,
  );
  otpRequests.set(key, hits);
  if (hits.length >= OTP_MAX_REQUESTS) return true;
  hits.push(now);
  otpRequests.set(key, hits);

  /*
   * BUGFIX: this map had no size cap, unlike loginAttempts, guestOrderAttempts
   * and otpAttempts which all prune themselves.
   *
   * It keeps one entry per email address that has ever asked for an OTP and
   * never removed any, so it grew for the lifetime of the process. Forgot
   * Password is a public endpoint, so anyone could inflate it by submitting
   * fresh addresses, and it would never shrink.
   *
   * Same prune as the other three: once the map is large, drop every key whose
   * attempts have all aged out of the window.
   */
  if (otpRequests.size > 5000) {
    for (const [k, times] of otpRequests) {
      if (!times.some((t) => now - t < OTP_REQUEST_WINDOW_MS)) {
        otpRequests.delete(k);
      }
    }
  }
  return false;
}

// Clear an IP's failed attempts once it authenticates successfully, so a
// legitimate user who mistyped a few times is not locked out afterwards.
function clearLoginAttempts(req) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  loginAttempts.delete(ip);
}

// Nightly rate for a room at a given occupancy.
// Rooms with price_double set charge that rate from 2 adults upward; rooms
// without it charge price_per_night at every occupancy, exactly as before.
// The room's taxable value: the tariff minus every discount applied to it.
// GST is charged on THIS, never on the raw tariff. Every place that
// recalculates a bill (add-ons, checkout, vehicle charges) must start here,
// otherwise adding a charge silently cancels the guest's discount.
/*
 * ── ADDITIONAL FEATURE: no-GST bookings ──────────────────────────────────
 *
 * Returns true when a booking was issued with GST switched off from the
 * admin booking screen (gst_enabled = 0).
 *
 * This does NOT change how GST is calculated. Every existing calculation
 * runs exactly as before at the existing GST_RATE; the only addition is one
 * line after each of them that replaces the computed tax with 0 when this
 * returns true.
 *
 * gst_enabled defaults to 1, so every booking made before this feature —
 * and every guest booking, which never sets it — behaves exactly as it
 * always has.
 */
function isGstDisabled(booking) {
  const flag = booking?.gst_enabled;
  if (flag === undefined || flag === null) return false;
  return Number(flag) === 0;
}

function roomTaxableValue(booking) {
  if (booking.taxable_amount != null) return Number(booking.taxable_amount);
  const tariff = Number(booking.total_price || 0);
  const bookingDiscount =
    Number(booking.discount_applied ? booking.discount_amount : 0) || 0;
  const checkoutDiscount =
    Number(
      booking.checkout_discount_applied ? booking.checkout_discount_amount : 0,
    ) || 0;
  return Math.max(
    0,
    Math.round((tariff - bookingDiscount - checkoutDiscount) * 100) / 100,
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADD-ON GST — per-service rates
   ═══════════════════════════════════════════════════════════════════════════

   The room is taxed at GST_RATE (12%). Each add-on is taxed at the rate its
   catalog entry carries — 5% for Food & Beverage, Laundry, Extra Bed and
   Room Service. A bill can therefore carry two or more tax rates at once,
   which is why the invoice prints a rate-wise summary.

   Every function below reads the rate from the ORDER ITEM (booking_addons
   .gst_rate), never from the catalog, so changing a rate in the dashboard
   never moves a charge that has already been posted.
   ═══════════════════════════════════════════════════════════════════════ */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/*
 * Which GST rate applies to a charge about to be posted.
 *
 * 1. an explicit catalog_id — the normal path from the dashboard
 * 2. an exact, case-insensitive name match — so the old free-text field and
 *    the preset chips ("Laundry") pick up the configured 5% automatically
 * 3. LEGACY_ADDON_GST_PERCENT — a one-off charge nobody has configured is
 *    taxed exactly as it would have been before this feature, so introducing
 *    the catalog cannot change a total by itself.
 */
async function resolveAddonGstRate({ catalogId, label }) {
  if (catalogId != null && catalogId !== "") {
    const [[row]] = await db.query(
      "SELECT catalog_id, name, gst_rate FROM addon_catalog WHERE catalog_id=?",
      [catalogId],
    );
    if (row) {
      return {
        catalogId: row.catalog_id,
        label: row.name,
        gstRate: Number(row.gst_rate),
        matched: "catalog_id",
      };
    }
  }

  if (label) {
    const [[row]] = await db.query(
      "SELECT catalog_id, name, gst_rate FROM addon_catalog WHERE LOWER(name)=LOWER(?) AND is_active=1",
      [String(label).trim()],
    );
    if (row) {
      return {
        catalogId: row.catalog_id,
        label: row.name,
        gstRate: Number(row.gst_rate),
        matched: "name",
      };
    }

    /*
     * Forgiving second pass, on punctuation, spacing and a trailing plural.
     *
     * The old preset chip read "Food & Beverages"; the configured service is
     * "Food & Beverage". Someone typing the label they are used to, or
     * "Room-Service", or "extra beds", clearly means the configured service —
     * and silently taxing them at 12% because of an 's' would be a billing
     * error nobody would think to look for. Matching is still exact after
     * normalising, so it can never pick the wrong service.
     */
    const normalise = (s) =>
      String(s)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(" ")
        .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
        .join(" ");

    const target = normalise(label);
    if (target) {
      const [all] = await db.query(
        "SELECT catalog_id, name, gst_rate FROM addon_catalog WHERE is_active=1",
      );
      const loose = all.find((c) => normalise(c.name) === target);
      if (loose) {
        return {
          catalogId: loose.catalog_id,
          label: loose.name,
          gstRate: Number(loose.gst_rate),
          matched: "name_normalised",
        };
      }
    }
  }

  return {
    catalogId: null,
    label: label ? String(label).trim() : "",
    gstRate: LEGACY_ADDON_GST_PERCENT,
    matched: "fallback",
  };
}

/* One order item's arithmetic, in one place so the API and the recalc agree. */
function computeAddonLine({ quantity = 1, unitPrice = 0, gstRate = 0 }) {
  const qty = Math.max(0, Number(quantity) || 0);
  const unit = round2(unitPrice);
  const rate = Math.max(0, Number(gstRate) || 0);
  const taxable = round2(qty * unit);
  const gst = round2((taxable * rate) / 100);
  return {
    quantity: qty,
    unitPrice: unit,
    gstRate: rate,
    taxableAmount: taxable,
    gstAmount: gst,
    lineTotal: round2(taxable + gst),
  };
}

/*
 * Every add-on on a booking, summed, plus a rate-wise breakdown.
 *
 * gst_amount is only recomputed when the column is NULL, which happens only
 * for a row written before the migration ran. Otherwise the stored figure is
 * used as-is — the line was billed at that number and must not drift.
 */
async function getAddonTotals(bookingId) {
  const [rows] = await db.query(
    "SELECT * FROM booking_addons WHERE booking_id=?",
    [bookingId],
  );

  let taxable = 0;
  let gst = 0;
  let unpaidTaxable = 0;
  let unpaidGst = 0;
  const byRate = new Map();

  for (const r of rows) {
    const lineTaxable = round2(r.taxable_amount ?? r.amount);
    const rate =
      r.gst_rate != null ? Number(r.gst_rate) : LEGACY_ADDON_GST_PERCENT;
    const lineGst =
      r.gst_amount != null ? round2(r.gst_amount) : round2((lineTaxable * rate) / 100);

    taxable = round2(taxable + lineTaxable);
    gst = round2(gst + lineGst);

    if (Number(r.paid) !== 1) {
      unpaidTaxable = round2(unpaidTaxable + lineTaxable);
      unpaidGst = round2(unpaidGst + lineGst);
    }

    const bucket = byRate.get(rate) || { gstRate: rate, taxable: 0, gst: 0 };
    bucket.taxable = round2(bucket.taxable + lineTaxable);
    bucket.gst = round2(bucket.gst + lineGst);
    byRate.set(rate, bucket);
  }

  return {
    rows,
    taxable,
    gst,
    total: round2(taxable + gst),
    unpaidTaxable,
    unpaidGst,
    unpaidTotal: round2(unpaidTaxable + unpaidGst),
    byRate: [...byRate.values()].sort((a, b) => a.gstRate - b.gstRate),
  };
}

/*
 * Rewrite every derived money column on a booking from its current parts.
 *
 * Several routes used to update only gst_amount and final_total. The screens
 * and the invoice read total_amount and remaining_amount first, so adding an
 * add-on left those two stale and the guest was shown the pre-add-on figure —
 * "Balance not collected yet" for money that was genuinely owed.
 *
 * Call this from anywhere that changes the room value, the add-ons, or a
 * payment, and every column stays in step.
 *
 * ── WHAT CHANGED WITH PER-SERVICE GST ──────────────────────────────────────
 * This used to be  gst = (room + addons) * 12%.  It is now
 *
 *     gst = room * 12%  +  SUM(each add-on line's own gst)
 *
 * For a booking whose add-ons are all at 12% — every booking that existed
 * before this feature, because the migration stamped them at 12 — the two
 * expressions give the identical figure. Only a line posted at 5% differs,
 * which is the point.
 */
/* ═══════════════════════════════════════════════════════════════════════════
   THE FOLIO ENGINE

   Everything that reads or writes booking_items goes through here, so the
   ledger can never be written two different ways.
   ═══════════════════════════════════════════════════════════════════════ */

const FOLIO = {
  ROOM: "ROOM",
  ADDON: "ADDON",
  VEHICLE: "VEHICLE",
  DISCOUNT: "DISCOUNT",
  PAYMENT: "PAYMENT",
};

/** Charges are positive; payments and discounts reduce the bill. */
const FOLIO_NEGATIVE = new Set([FOLIO.DISCOUNT, FOLIO.PAYMENT]);

/**
 * Split an amount into `parts` pieces that sum EXACTLY back to it.
 *
 * Rs.1,000 over 3 nights is 333.33 + 333.33 + 333.34, not 333.33 x 3 — which
 * would lose a paisa and make the folio disagree with the stored total. The
 * remainder always lands on the last piece.
 */
function splitEvenly(amount, parts) {
  const total = Math.round((Number(amount) || 0) * 100);
  const n = Math.max(1, Math.floor(parts));
  const base = Math.floor(total / n);
  const out = new Array(n).fill(base);
  out[n - 1] = total - base * (n - 1);
  return out.map((cents) => cents / 100);
}

/** Every date from check-in up to (not including) check-out, as YYYY-MM-DD. */
function nightsBetween(checkIn, checkOut) {
  const out = [];
  const start = new Date(checkIn);
  const end = new Date(checkOut);

  /*
   * Unparseable dates still get one night, not zero.
   *
   * Returning an empty list here meant no ROOM line was posted at all, so the
   * folio showed a stay costing nothing — the tariff silently disappeared.
   * One undated night carries the full charge, which is wrong about WHEN but
   * right about HOW MUCH, and the reconciliation check then passes instead of
   * hiding a missing charge behind a mismatch nobody reads.
   */
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [null];
  }

  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (d < last) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
    );
    d.setDate(d.getDate() + 1);
  }
  // A same-day stay is still one night's charge, not zero.
  if (!out.length) {
    out.push(
      `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
        start.getDate(),
      ).padStart(2, "0")}`,
    );
  }
  return out;
}

/**
 * Post one line to a folio.
 *
 * The caller gives the taxable value and the rate; the tax and the signed
 * line total are derived here so no caller can invent its own arithmetic.
 */
async function postFolioLine(
  bookingId,
  {
    itemType,
    label,
    serviceDate = null,
    quantity = 1,
    unitPrice = 0,
    gstRate = 0,
    catalogId = null,
    sourceAddonId = null,
    paymentMode = null,
    reference = null,
    postedBy = null,
    // PAYMENT lines are a flat amount with no tax of their own — the tax was
    // already charged on the lines they are settling.
    flatAmount = null,
  },
  conn = db,
) {
  const taxable =
    flatAmount != null ? round2(flatAmount) : round2(Number(quantity) * Number(unitPrice));
  const gst = flatAmount != null ? 0 : round2((taxable * Number(gstRate || 0)) / 100);
  const gross = round2(taxable + gst);
  const signed = FOLIO_NEGATIVE.has(itemType) ? -Math.abs(gross) : gross;

  const [[row]] = await conn.query(
    "SELECT COALESCE(MAX(line_no),0) AS n FROM booking_items WHERE booking_id=?",
    [bookingId],
  );

  const [r] = await conn.query(
    `INSERT INTO booking_items
       (booking_id, line_no, item_type, catalog_id, source_addon_id, label,
        service_date, quantity, unit_price, gst_rate,
        taxable_amount, gst_amount, line_total,
        payment_mode, reference, posted_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      bookingId,
      Number(row?.n || 0) + 1,
      itemType,
      catalogId,
      sourceAddonId,
      String(label || itemType).slice(0, 150),
      serviceDate,
      Number(quantity) || 1,
      flatAmount != null ? round2(flatAmount) : round2(unitPrice),
      flatAmount != null ? 0 : Number(gstRate) || 0,
      FOLIO_NEGATIVE.has(itemType) ? -Math.abs(taxable) : taxable,
      FOLIO_NEGATIVE.has(itemType) ? -Math.abs(gst) : gst,
      signed,
      paymentMode,
      reference,
      postedBy,
    ],
  );
  return r.insertId;
}

/**
 * Read a folio and total it.
 *
 * Voided lines are excluded from every figure but still returned, so a screen
 * can show that something was reversed rather than pretending it never was.
 */
async function getFolio(bookingId, conn = db) {
  const [rows] = await conn.query(
    "SELECT * FROM booking_items WHERE booking_id=? ORDER BY line_no ASC, item_id ASC",
    [bookingId],
  );

  const live = rows.filter((r) => Number(r.voided) !== 1);
  const sum = (pred, field) =>
    round2(live.filter(pred).reduce((a, r) => a + Number(r[field] || 0), 0));

  const charges = (r) => !FOLIO_NEGATIVE.has(r.item_type);
  const payments = (r) => r.item_type === FOLIO.PAYMENT;
  const discounts = (r) => r.item_type === FOLIO.DISCOUNT;

  const byRate = new Map();
  for (const r of live) {
    if (r.item_type === FOLIO.PAYMENT) continue;
    const rate = Number(r.gst_rate || 0);
    if (!rate && !Number(r.gst_amount)) continue;
    const b = byRate.get(rate) || { gstRate: rate, taxable: 0, gst: 0 };
    b.taxable = round2(b.taxable + Number(r.taxable_amount || 0));
    b.gst = round2(b.gst + Number(r.gst_amount || 0));
    byRate.set(rate, b);
  }

  const roomTaxable = sum((r) => r.item_type === FOLIO.ROOM, "taxable_amount");
  const roomGst = sum((r) => r.item_type === FOLIO.ROOM, "gst_amount");
  const addonTaxable = sum((r) => r.item_type === FOLIO.ADDON, "taxable_amount");
  const addonGst = sum((r) => r.item_type === FOLIO.ADDON, "gst_amount");
  const vehicleTaxable = sum((r) => r.item_type === FOLIO.VEHICLE, "taxable_amount");
  const vehicleGst = sum((r) => r.item_type === FOLIO.VEHICLE, "gst_amount");
  const discountTaxable = sum(discounts, "taxable_amount"); // negative
  const discountGst = sum(discounts, "gst_amount"); // negative
  const paid = round2(-sum(payments, "line_total")); // payments are negative

  const chargesTotal = sum(charges, "line_total");
  const grossTotal = round2(chargesTotal + discountTaxable + discountGst);

  return {
    rows,
    live,
    roomTaxable,
    roomGst,
    addonTaxable,
    addonGst,
    vehicleTaxable,
    vehicleGst,
    discountTaxable,
    discountGst,
    taxableTotal: round2(roomTaxable + addonTaxable + vehicleTaxable + discountTaxable),
    gstTotal: round2(roomGst + addonGst + vehicleGst + discountGst),
    grossTotal,
    paid,
    balance: round2(grossTotal - paid),
    byRate: [...byRate.values()]
      .filter((b) => b.taxable || b.gst)
      .sort((a, b) => a.gstRate - b.gstRate),
  };
}

/**
 * Build a booking's folio from the columns that currently describe it.
 *
 * Used to backfill the history and to repair a folio that has drifted. It
 * clears and rewrites the whole folio, so it is only ever called for a
 * booking whose columns are the authority — never to "correct" a folio that
 * has become the authority itself.
 *
 * The output is designed to reproduce the stored total_amount exactly:
 * the room value is whatever roomTaxableValue() says, split across the
 * nights with the remainder on the last, and the tax on each night is split
 * the same way from the room's total tax rather than recomputed per night.
 */
async function rebuildFolioFromColumns(bookingId, conn = db) {
  const [[booking]] = await conn.query(
    "SELECT * FROM bookings WHERE booking_id=?",
    [bookingId],
  );
  if (!booking) return null;

  await conn.query("DELETE FROM booking_items WHERE booking_id=?", [bookingId]);

  const gstOff = isGstDisabled(booking);
  const roomRatePct = roomGstPercentOf(booking);
  const vehiclePrice = round2(booking.vehicle_price);

  /*
   * The room's own taxable value.
   *
   * total_price carries the vehicle on some booking paths, so it comes off
   * first — the vehicle gets its own line. taxable_amount, where the backend
   * has written it, is the room value after discount; the discount is posted
   * as its own line, so it is added back here to get the gross tariff.
   */
  const bookingDiscount = round2(
    booking.discount_applied ? booking.discount_amount : 0,
  );
  const checkoutDiscount = round2(
    booking.checkout_discount_applied ? booking.checkout_discount_amount : 0,
  );
  const grossRoom = Math.max(
    0,
    round2(Number(booking.total_price || 0) - vehiclePrice),
  );

  // ── ROOM, one line per night ──
  const nights = nightsBetween(booking.check_in_date, booking.check_out_date);
  const roomSlices = splitEvenly(grossRoom, nights.length);
  const roomGstTotal = gstOff ? 0 : round2((grossRoom * roomRatePct) / 100);
  const gstSlices = splitEvenly(roomGstTotal, nights.length);

  for (let i = 0; i < nights.length; i += 1) {
    const taxable = roomSlices[i];
    const gst = gstSlices[i];
    const [[ln]] = await conn.query(
      "SELECT COALESCE(MAX(line_no),0) AS n FROM booking_items WHERE booking_id=?",
      [bookingId],
    );
    // Written directly rather than through postFolioLine, because the tax on
    // each night is a slice of the room's total tax, not a fresh calculation
    // — that is what keeps the folio equal to the stored figure to the paisa.
    await conn.query(
      `INSERT INTO booking_items
         (booking_id, line_no, item_type, label, service_date, quantity,
          unit_price, gst_rate, taxable_amount, gst_amount, line_total)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        bookingId,
        Number(ln?.n || 0) + 1,
        FOLIO.ROOM,
        `Room charge${booking.room_id ? "" : ""} — night ${i + 1}`,
        nights[i],
        1,
        taxable,
        gstOff ? 0 : roomRatePct,
        taxable,
        gst,
        round2(taxable + gst),
      ],
    );
  }

  // ── VEHICLE ──
  if (vehiclePrice > 0) {
    await postFolioLine(
      bookingId,
      {
        itemType: FOLIO.VEHICLE,
        label: `Vehicle — ${booking.vehicle_type || "transfer"}`,
        unitPrice: vehiclePrice,
        gstRate: gstOff ? 0 : roomRatePct,
      },
      conn,
    );
  }

  // ── ADD-ONS, each at its own frozen rate ──
  const [addonRows] = await conn.query(
    "SELECT * FROM booking_addons WHERE booking_id=? ORDER BY addon_id ASC",
    [bookingId],
  );
  for (const a of addonRows) {
    const taxable = round2(a.taxable_amount ?? a.amount);
    const rate = a.gst_rate != null ? Number(a.gst_rate) : LEGACY_ADDON_GST_PERCENT;
    const gst =
      a.gst_amount != null ? round2(a.gst_amount) : round2((taxable * rate) / 100);
    const [[ln]] = await conn.query(
      "SELECT COALESCE(MAX(line_no),0) AS n FROM booking_items WHERE booking_id=?",
      [bookingId],
    );
    await conn.query(
      `INSERT INTO booking_items
         (booking_id, line_no, item_type, catalog_id, source_addon_id, label,
          service_date, quantity, unit_price, gst_rate,
          taxable_amount, gst_amount, line_total)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        bookingId,
        Number(ln?.n || 0) + 1,
        FOLIO.ADDON,
        a.catalog_id ?? null,
        a.addon_id,
        a.label,
        a.created_at ? new Date(a.created_at) : null,
        Number(a.quantity ?? 1),
        round2(a.unit_price ?? taxable),
        gstOff ? 0 : rate,
        taxable,
        gstOff ? 0 : gst,
        round2(taxable + (gstOff ? 0 : gst)),
      ],
    );
  }

  // ── DISCOUNTS, pre-tax, so each reverses the room's tax too ──
  for (const [amount, label] of [
    [bookingDiscount, "Booking discount"],
    [checkoutDiscount, "Checkout discount"],
  ]) {
    if (amount > 0) {
      await postFolioLine(
        bookingId,
        {
          itemType: FOLIO.DISCOUNT,
          label,
          unitPrice: amount,
          gstRate: gstOff ? 0 : roomRatePct,
        },
        conn,
      );
    }
  }

  // ── PAYMENTS ──
  for (const [amount, label, mode, at] of [
    [
      round2(booking.advance_paid),
      "Advance payment",
      booking.advance_payment_mode || booking.payment_method,
      booking.advance_paid_at,
    ],
    [
      round2(booking.balance_paid),
      "Balance payment",
      booking.balance_payment_mode,
      booking.balance_paid_at,
    ],
  ]) {
    if (amount > 0) {
      await postFolioLine(
        bookingId,
        {
          itemType: FOLIO.PAYMENT,
          label,
          flatAmount: amount,
          paymentMode: mode || null,
          serviceDate: at ? new Date(at) : null,
        },
        conn,
      );
    }
  }

  return getFolio(bookingId, conn);
}

/**
 * Keep the folio honest.
 *
 * In normal running the folio is APPEND-ONLY: each posting route adds its own
 * line, with its own timestamp, and a reversal is a void rather than a
 * delete. That is the whole point of a ledger and it is what makes a bill
 * auditable.
 *
 * But "every route remembers to post" is exactly the assumption that rots.
 * One new route, one forgotten call, and the folio quietly stops matching the
 * bill — and a ledger nobody can trust is worse than no ledger.
 *
 * So this runs after every recalculation and compares the folio's gross with
 * the total the columns say. Equal, and it leaves the ledger alone, history
 * intact. Drifted, and it rebuilds from the columns, which remain the
 * authority, and says so in the log.
 *
 * A rebuild loses that booking's posting history — which is the cost of
 * self-healing, and why the log line matters: a route showing up here
 * repeatedly is a route that needs its posting call added.
 */
async function syncFolio(bookingId, expectedTotal) {
  try {
    const folio = await getFolio(bookingId);

    // Nothing posted yet: first sight of this booking, so build it.
    if (!folio.rows.length) {
      await rebuildFolioFromColumns(bookingId);
      return { built: true, repaired: false };
    }

    if (Math.abs(folio.grossTotal - round2(expectedTotal)) <= 0.02) {
      return { built: false, repaired: false };
    }

    console.warn(
      `⚠  Folio drift on booking ${bookingId}: ledger ${folio.grossTotal} vs bill ${round2(expectedTotal)} — rebuilding. ` +
        `A posting route is not writing to the folio.`,
    );
    await rebuildFolioFromColumns(bookingId);
    return { built: false, repaired: true };
  } catch (e) {
    // The folio is a parallel record. It must never break a real booking.
    console.error(`Folio sync failed for booking ${bookingId}:`, e.message);
    return { built: false, repaired: false, error: e.message };
  }
}

async function recalcBookingTotals(bookingId) {
  const [rows] = await db.query("SELECT * FROM bookings WHERE booking_id=?", [
    bookingId,
  ]);
  if (!rows.length) return null;
  const booking = rows[0];

  const addons = await getAddonTotals(bookingId);
  const addonTotal = addons.taxable;
  const addonGst = addons.gst;

  const roomTaxable = roomTaxableValue(booking);
  // PER-ROOM GST: the rate frozen onto this booking when it was created,
  // falling back to 12% for a booking written before the column existed.
  const roomGst = round2(roomTaxable * roomGstFractionOf(booking));

  const subtotal = round2(roomTaxable + addonTotal);

  /*
   * A booking the admin issued with GST off pays no tax on either part.
   * gst_enabled defaults to 1, so this is a no-op for every normal booking;
   * it brings the stored columns in line with the screens and the invoice,
   * which have always honoured the flag.
   */
  const gstAmount = isGstDisabled(booking) ? 0 : round2(roomGst + addonGst);
  const storedAddonGst = isGstDisabled(booking) ? 0 : addonGst;

  const totalAmount = round2(subtotal + gstAmount);

  const paid =
    Math.round(
      (Number(booking.advance_paid || 0) + Number(booking.balance_paid || 0)) *
        100,
    ) / 100;
  const remaining = Math.max(0, Math.round((totalAmount - paid) * 100) / 100);

  /*
   * BUGFIX: payment_status was never updated here.
   *
   * A booking settled in full is marked PAID. Post an add-on to it and this
   * helper correctly raised total_amount and remaining_amount — but left the
   * status at PAID. Every screen short-circuits on that status ("PAID -> owed
   * is zero"), so the desk was shown Rs.0 outstanding for money the guest
   * genuinely owed, and the add-on could never be collected.
   *
   * Derived from the remaining balance, which is the only thing that can
   * define it. A cancelled booking keeps whatever status it had — its bill is
   * closed and nothing should reopen it.
   */
  const nextStatus =
    String(booking.status || "").toLowerCase() === "cancelled"
      ? booking.payment_status
      : remaining > 0
        ? "PARTIALLY_PAID"
        : "PAID";

  await db.query(
    `UPDATE bookings
        SET addon_charges    = ?,
            addon_gst_amount = ?,
            gst_amount       = ?,
            final_total      = ?,
            total_amount     = ?,
            remaining_amount = ?,
            payment_status   = ?
      WHERE booking_id = ?`,
    [
      addonTotal,
      storedAddonGst,
      gstAmount,
      totalAmount,
      totalAmount,
      remaining,
      nextStatus,
      bookingId,
    ],
  );

  /*
   * Keep the ledger in step with the bill. Append-only in normal running;
   * rebuilt only if a posting route has drifted (which it logs).
   */
  await syncFolio(bookingId, totalAmount);

  return {
    roomTaxable,
    roomGst,
    paymentStatus: nextStatus,
    addonCharges: addonTotal,
    addonGst: storedAddonGst,
    addonGstByRate: addons.byRate,
    taxableAmount: subtotal,
    gstAmount,
    totalAmount,
    paid,
    remainingAmount: remaining,
  };
}

// True when a date string is before today. Compared date-only in local time so
// a booking made at 11pm for "today" is still accepted.
function isPastDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return target < today;
}

function resolveNightlyRate(room, guestCount) {
  const single = Number(room.price_per_night || 0);
  const double = Number(room.price_double || 0);
  const guests = Math.max(1, Number(guestCount) || 1);
  if (guests >= 2 && double > 0) return double;
  return single;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CREDIT NOTES — numbering and issue
   ═══════════════════════════════════════════════════════════════════════ */

/*
 * The Indian financial year a date falls in, as "2025-26".
 * April to March, so January 2026 is still 2025-26.
 */
function finYearOf(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  // getMonth() is 0-based: 3 is April.
  const startYear = d.getMonth() >= 3 ? y : y - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/*
 * The invoice number a booking prints under.
 *
 * Mirrors formatBookingId()/invNo in frontend/src/invoicePdf.js. It is
 * derived rather than stored, so this has to agree with the frontend exactly
 * — a credit note that references an invoice number the guest's copy does not
 * carry is useless to both of them.
 *
 * The year is taken in IST, not in the server's local zone. The frontend
 * reads it from the browser, which at this property is IST; a server running
 * UTC would otherwise disagree for any booking created between midnight and
 * 05:30 IST on 1 January, and print a different invoice number for the same
 * booking than the guest's own copy carries.
 */
const INVOICE_TZ = "Asia/Kolkata";

function invoiceNoFor(booking) {
  const raw = booking?.created_at ? new Date(booking.created_at) : null;
  const d = raw && !Number.isNaN(raw.getTime()) ? raw : new Date();
  const year = new Intl.DateTimeFormat("en-GB", {
    timeZone: INVOICE_TZ,
    year: "numeric",
  }).format(d);
  return `INV-${year}-${String(booking.booking_id).padStart(4, "0")}`;
}

/*
 * Issue a credit note against a booking, inside a transaction.
 *
 * The serial is allocated as MAX(cn_seq)+1 for the financial year while
 * holding the row lock, and UNIQUE(fin_year, cn_seq) catches the race that
 * the lock does not. On a duplicate key the caller retries: the series stays
 * consecutive either way, which is the whole requirement.
 *
 * Returns the inserted row. Never mutates the booking.
 */
async function issueCreditNote({
  bookingId,
  issueDate,
  reason,
  taxableAmount,
  originalRate,
  revisedRate,
  originalInvoiceNo,
  originalInvoiceDate,
  createdBy,
}) {
  const gstOriginal = round2((Number(taxableAmount) * Number(originalRate)) / 100);
  const gstRevised = round2((Number(taxableAmount) * Number(revisedRate)) / 100);
  const gstCredited = round2(gstOriginal - gstRevised);

  if (gstCredited <= 0) {
    const err = new Error(
      "A credit note must reduce the tax. The revised rate is not lower than the original.",
    );
    err.status = 400;
    throw err;
  }

  const finYear = finYearOf(issueDate);

  // Two attempts: one for the ordinary case, one for losing the race.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [[seqRow]] = await conn.query(
        `SELECT COALESCE(MAX(cn_seq), 0) + 1 AS next_seq
           FROM credit_notes
          WHERE fin_year = ?
          FOR UPDATE`,
        [finYear],
      );
      const seq = Number(seqRow.next_seq);
      const cnNumber = `CN/${finYear}/${String(seq).padStart(4, "0")}`;

      const [ins] = await conn.query(
        `INSERT INTO credit_notes
           (cn_number, fin_year, cn_seq, booking_id,
            original_invoice_no, original_invoice_date,
            issue_date, reason, taxable_amount,
            original_rate, revised_rate,
            gst_original, gst_revised, gst_credited, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          cnNumber,
          finYear,
          seq,
          bookingId,
          originalInvoiceNo,
          originalInvoiceDate || null,
          issueDate,
          reason,
          round2(taxableAmount),
          Number(originalRate),
          Number(revisedRate),
          gstOriginal,
          gstRevised,
          gstCredited,
          createdBy || null,
        ],
      );

      await conn.commit();

      const [[row]] = await db.query(
        "SELECT * FROM credit_notes WHERE credit_note_id = ?",
        [ins.insertId],
      );
      return row;
    } catch (e) {
      await conn.rollback().catch(() => {});
      // Lost the race for this serial — take the next one.
      if (e && e.code === "ER_DUP_ENTRY" && attempt < 2) continue;
      throw e;
    } finally {
      conn.release();
    }
  }

  const err = new Error("Could not allocate a credit note number. Try again.");
  err.status = 503;
  throw err;
}

/*
 * The CGST / SGST halves of a rate.
 *
 * A room's GST is ONE rate that prints as two components. For accommodation
 * the place of supply is the property's own state, so it is always CGST+SGST
 * and never IGST — a Chennai company booking a Thiruvarur room is still an
 * intra-state supply.
 *
 * The ordinary case is half each, and that is what both-NULL means. An
 * explicit pair is honoured as given, because an auditor asking for an uneven
 * split is the only reason to set one, and silently re-halving it would throw
 * away the thing they asked for.
 *
 * The halves are rounded to 2dp and the SECOND one absorbs the remainder, so
 * cgst + sgst always equals the total exactly. Without that, an odd rate like
 * 5.01% would print 2.51 + 2.51 = 5.02 and the invoice would not foot.
 */
function splitGstRate(totalPercent, cgstPercent = null, sgstPercent = null) {
  const hasExplicit =
    cgstPercent != null && cgstPercent !== "" &&
    sgstPercent != null && sgstPercent !== "";

  if (hasExplicit) {
    const c = Number(cgstPercent);
    const s = Number(sgstPercent);
    return { cgst: c, sgst: s, total: round2(c + s) };
  }

  const total = Number(totalPercent) || 0;
  const cgst = round2(total / 2);
  // the remainder, so the two halves always sum back to the total
  const sgst = round2(total - cgst);
  return { cgst, sgst, total: round2(total) };
}

/*
 * The split a BOOKING was billed at. Frozen columns win; otherwise the
 * total it was sold at is halved. Never reads the room — that may have been
 * reconfigured since.
 */
function bookingGstSplit(booking) {
  return splitGstRate(
    roomGstPercentOf(booking),
    booking?.room_cgst_rate,
    booking?.room_sgst_rate,
  );
}

async function calculateBookingAmounts({

  room_id,
  check_in_date,
  check_out_date,
  advance_amount,
  guest_count,
  discount_applied = false,
  discount_amount = 0,
  // Staff need to enter walk-ins and late paperwork for stays that have
  // already begun, so the past-date guard is skipped for them. Public guest
  // checkout always leaves this false.
  allowPastDates = false,
  // ADDITIONAL: admin bookings may be issued without GST. Defaults to true,
  // so guest checkout and every existing caller behave exactly as before.
  gst_enabled = true,
}) {
  const [roomRows] = await db.query("SELECT * FROM rooms WHERE room_id=?", [
    room_id,
  ]);
  if (!roomRows.length) {
    const err = new Error("Room not found");
    err.status = 404;
    throw err;
  }

  const room = roomRows[0];
  if (Number(room.is_available) === 0) {
    const err = new Error("Room is not available for booking");
    err.status = 400;
    throw err;
  }

  const nights = Math.ceil(
    (new Date(check_out_date) - new Date(check_in_date)) / 86400000,
  );
  if (nights <= 0) {
    const err = new Error("Invalid dates");
    err.status = 400;
    throw err;
  }

  if (!allowPastDates && isPastDate(check_in_date)) {
    const err = new Error("Check-in date cannot be in the past");
    err.status = 400;
    throw err;
  }

  const [conflicts] = await db.query(
    `SELECT booking_id
     FROM bookings
     WHERE room_id = ?
       AND status NOT IN ('cancelled','pending')
       AND check_in_date < ?
       AND check_out_date > ?
     LIMIT 1`,
    [room_id, check_out_date, check_in_date],
  );
  if (conflicts.length) {
    const err = new Error("Selected dates are already booked for this room");
    err.status = 409;
    throw err;
  }

  const [blockedDates] = await db.query(
    `SELECT blocked_date
       FROM room_blocked_dates
       WHERE room_id = ? AND blocked_date >= ? AND blocked_date < ?
       LIMIT 1`,
    [room_id, check_in_date, check_out_date],
  );
  if (blockedDates.length) {
    const err = new Error("Room is blocked for one or more selected dates");
    err.status = 400;
    throw err;
  }

  const nightlyRate = resolveNightlyRate(room, guest_count);
  const roomSubtotal = nightlyRate * nights;
  const requestedDiscount = Number(discount_amount || 0);
  const discountAmount = discount_applied ? requestedDiscount : 0;
  if (!Number.isFinite(discountAmount) || discountAmount < 0) {
    const err = new Error("Discount must be a valid non-negative amount");
    err.status = 400;
    throw err;
  }
  if (discountAmount > roomSubtotal) {
    const err = new Error("Discount cannot exceed the room tariff");
    err.status = 400;
    throw err;
  }
  // PRE-TAX DISCOUNT MODEL
  // The discount reduces the room's taxable value first, then GST is charged
  // on the reduced amount. Example: Rs.3000 tariff with a Rs.500 discount
  //   taxable = 3000 - 500 = 2500
  //   GST     = 2500 x 12% = 450
  //   total   = 2500 + 450 = 2950
  // This is how a discount is shown on a GST invoice: the tax follows the
  // discounted value, it is not charged on the full tariff.
  const taxableAmount = Math.round((roomSubtotal - discountAmount) * 100) / 100;

  /*
   * PER-ROOM GST: an explicit rate on the room wins; otherwise the slab
   * decides from the tariff this stay is actually being sold at (5% at or
   * below Rs.7,500 a night, 18% above). Occupancy is passed because a room
   * can cross that line between single and double.
   *
   * The caller writes this onto the booking as room_gst_rate, freezing it.
   */
  const roomGstRate = roomRatePercent(room, guest_count);
  const gstAmount =
    Math.round(taxableAmount * (roomGstRate / 100) * 100) / 100;

  // ADDITIONAL: the line above is unchanged. When the admin issued this
  // booking with GST off, the computed tax is simply dropped, so the guest
  // pays the discounted room value as-is (2000 - 500 = 1500).
  const chargedGst = gst_enabled ? gstAmount : 0;

  const totalAmount = Math.max(
    0,
    Math.round((taxableAmount + chargedGst) * 100) / 100,
  );
  const discountedRoomAmount = taxableAmount;
  const advanceAmount = resolveAdvanceAmount(
  advance_amount,
  totalAmount
);
  const remainingAmount =
    Math.round(Math.max(0, totalAmount - advanceAmount) * 100) / 100;

  return {
    room,
    nights,
    nightlyRate,
    roomSubtotal,
    discountApplied: Boolean(discount_applied),
    discountAmount,
    discountedRoomAmount,
    taxableAmount,
    gstAmount: chargedGst,
    gstEnabled: Boolean(gst_enabled),
    // the rate used above — callers store this on the booking so it is frozen
    roomGstRate,
    totalAmount,
    advanceAmount,
    remainingAmount,
  };
}

async function findOrCreateGuestUser({ name, email, phone }) {
  const normalizedName = String(name || "").trim();
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const rawPhone = String(phone || "").trim();
  if (!normalizedName || !rawPhone) {
    const err = new Error("Customer name and phone are required");
    err.status = 400;
    throw err;
  }
  if (!CUSTOMER_NAME_PATTERN.test(normalizedName)) {
    const err = new Error("Customer name must contain letters only");
    err.status = 400;
    throw err;
  }
  if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
    const err = new Error("Enter a valid email address");
    err.status = 400;
    throw err;
  }

  const normalizedPhone = normalizeCustomerPhone(rawPhone);
  if (!INDIAN_MOBILE_PATTERN.test(normalizedPhone)) {
    const err = new Error("Enter a valid 10-digit mobile number");
    err.status = 400;
    throw err;
  }

  const [existing] = await db.query(
    "SELECT user_id, role, email FROM users WHERE phone=? LIMIT 1",
    [normalizedPhone],
  );
  if (existing.length) {
    if (existing[0].role !== "guest") {
      const err = new Error("This phone number belongs to a staff account");
      err.status = 400;
      throw err;
    }
    await db.query(
      "UPDATE users SET name=?, email=COALESCE(?, email), phone=? WHERE user_id=?",
      [
        normalizedName,
        normalizedEmail || null,
        normalizedPhone,
        existing[0].user_id,
      ],
    );
    return existing[0].user_id;
  }

  const randomPassword = crypto.randomBytes(12).toString("hex");
  const hashed = await bcrypt.hash(randomPassword, 12);
  const [result] = await db.query(
    "INSERT INTO users (name,email,password,phone,role) VALUES (?,?,?,?,'guest')",
    [normalizedName, normalizedEmail || null, hashed, normalizedPhone],
  );
  return result.insertId;
}

app.get("/api/customers/lookup", requireManager, async (req, res) => {
  try {
    const phone = normalizeCustomerPhone(req.query.phone);
    if (!phone)
      return res.status(400).json({ error: "Phone number is required" });
    if (!INDIAN_MOBILE_PATTERN.test(phone)) {
      return res
        .status(400)
        .json({ error: "Enter a valid 10-digit mobile number" });
    }

    const [rows] = await db.query(
      "SELECT user_id, name, email, phone, role FROM users WHERE phone=? LIMIT 1",
      [phone],
    );
    if (!rows.length) return res.json({ exists: false });

    const user = rows[0];
    if (user.role !== "guest") {
      return res
        .status(400)
        .json({ error: "Use a guest/customer phone number" });
    }

    res.json({
      exists: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── hotel tax identity ───────────────────────────────────────────────────────
// Single source of truth for the hotel's own GSTIN. Every invoice — the mailed
// PDF, the admin PDF and the guest download — reads this constant, so the
// number can never drift between documents.
const HOTEL_GSTIN = "33BRCPA1008G1ZQ";

// 15-character GSTIN: 2-digit state code, 5 letters + 4 digits + 1 letter of
// the PAN, 1 entity code, literal Z, 1 checksum character.
const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// invoice numbers are year-prefixed, e.g. INV-2026-0037
function formatBookingId(booking) {
  const year = new Date(booking.created_at || Date.now()).getFullYear();
  return `${year}-${String(booking.booking_id).padStart(4, "0")}`;
}

function formatInvoiceMoney(value) {
  return `Rs.${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
}

const INVOICE_TERMS = [
  "A valid government-issued photo ID must be presented at check-in.",
  "Check-in and check-out are available 24 hours. The stay duration is counted as 24 hours from the actual check-in time.",
  "Early check-in and late check-out are subject to availability and may incur additional charges.",
  "Pets, outside food and beverages, alcohol, and smoking are not permitted on the hotel premises.",
  "Cancellations must be made at least 48 hours before the scheduled check-in time to be eligible for a refund, subject to the applicable booking rate and cancellation policy.",
  "For no-shows or cancellations made within 48 hours of check-in, a cancellation charge equivalent to the first night's room tariff may apply, subject to the booking terms.",
  "Eligible refunds will be processed to the original payment method within 5-7 working days. The actual credit time may vary depending on the bank or payment provider.",
  "Personal and identification data is processed for booking management, guest services, payment processing, security, and legal or regulatory compliance.",
  "Payments are securely processed through approved payment methods. The hotel does not store full card details. Personal data is not sold to third parties.",
  "Full Terms & Conditions, Privacy Policy, and Cancellation Policy are available at: https://vvgrandpark.com/policies",
  "Please verify the booking dates, room type, guest count, tariff, and contact details shown on this invoice and report any discrepancy promptly.",
  "Vehicle pickup and drop-off requests are subject to availability, applicable charges, and separate confirmation by the hotel.",
  "Guests are responsible for room keys/cards and hotel property provided during their stay. Reasonable charges may apply for loss or damage caused during the stay.",
  "Hotel policies may be updated from time to time for legal, safety, or operational reasons.",
  "For booking assistance or invoice corrections, please contact the hotel as soon as possible and preferably before check-in.",
  "The room tariff does not include additional services or charges unless expressly included in the booking.",
  "Visitors are permitted only with hotel approval and may be required to provide valid identification.",
  "All guests must comply with hotel quiet hours, safety instructions, and reasonable house rules during their stay.",
  "Lost-property claims will be handled in accordance with hotel records, hotel policy, and applicable law.",
  "This is an electronically generated invoice and does not require a physical signature where permitted under applicable law.",
];

function formatInvoiceDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadBookingForInvoice(bookingId) {
  const [rows] = await db.query(
    `SELECT b.*, u.name AS guest_name, u.email, u.phone,
            r.room_type, r.room_number, r.price_per_night, r.image_url
     FROM bookings b
     JOIN users u ON b.user_id = u.user_id
     JOIN rooms r ON b.room_id = r.room_id
     WHERE b.booking_id = ?`,
    [bookingId],
  );
  return rows[0] || null;
}

async function generateAdvanceInvoicePdf(booking) {
  const invNo = `INV-${formatBookingId(booking)}`;
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(booking.check_out_date) - new Date(booking.check_in_date)) /
        86400000,
    ),
  );
  const roomSubtotal = Number(booking.total_price || 0);
  const discountAmount =
    Number(booking.discount_applied ? booking.discount_amount : 0) || 0;
  // Prefer the stored taxable value; fall back for rows written before the
  // taxable_amount column existed.
  const discountedRoomAmount =
    booking.taxable_amount != null
      ? Number(booking.taxable_amount)
      : Math.max(0, roomSubtotal - discountAmount);
  const gstAmount = Number(booking.gst_amount || 0);
  const totalAmount = Number(
    booking.total_amount || booking.final_total || roomSubtotal + gstAmount,
  );
  const advancePaid = Number(booking.advance_paid || 0);
  const remainingAmount = Number(
    booking.remaining_amount || Math.max(0, totalAmount - advancePaid),
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, 595, 96).fill("#0F1923");
    doc
      .fillColor("#C9A84C")
      .font("Helvetica-Bold")
      .fontSize(22)
      .text("VV GRAND PARK", 50, 28);
    doc
      .fillColor("#C9A84C")
      .font("Helvetica")
      .fontSize(10)
      .text("RESIDENCY", 50, 54);
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("INVOICE", 395, 28, { align: "right" });
    doc
      .fillColor("#AAB2BA")
      .font("Helvetica")
      .fontSize(9)
      .text(invNo, 395, 54, {
        align: "right",
      });

    doc
      .moveTo(50, 115)
      .lineTo(545, 115)
      .strokeColor("#C9A84C")
      .lineWidth(1)
      .stroke();

    doc
      .fillColor("#868E96")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("BILL TO", 50, 132);
    doc
      .fillColor("#0F1923")
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(booking.guest_name || "Guest", 50, 148);
    doc
      .fillColor("#495057")
      .font("Helvetica")
      .fontSize(9)
      // Width-capped: an unusually long address would otherwise run straight
      // across the page and collide with the FROM block at x=350.
      .text(booking.email || "", 50, 166, { width: 250, lineBreak: false });

    /*
     * BILL TO runs down the page instead of sitting on fixed rows, because the
     * phone, GSTIN and address lines are each optional. Tracking the cursor
     * here is what stopped the GSTIN from being printed on top of the address
     * on bookings that carry both.
     */
    let billY = 179;
    if (booking.phone) {
      doc.text(booking.phone, 50, billY);
      billY += 12;
    }
    if (booking.customer_address) {
      // Kept to two lines so a long address cannot push the invoice onto a
      // second page.
      const address = doc.heightOfString(String(booking.customer_address), {
        width: 250,
      });
      doc.text(String(booking.customer_address), 50, billY, {
        width: 250,
        height: 24,
        ellipsis: true,
      });
      billY += Math.min(24, Math.max(12, address));
    }
    if (booking.gst_number) {
      doc
        .fillColor("#0F1923")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(`GSTIN: ${booking.gst_number}`, 50, billY);
      billY += 12;
    }

    doc
      .fillColor("#868E96")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("FROM", 350, 132);
    doc
      .fillColor("#0F1923")
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("VV Grand Park Residency", 350, 148);
    doc
      .fillColor("#495057")
      .font("Helvetica")
      .fontSize(9)
      .text("3/4/D, Thanjai Saalai", 350, 166)
      .text("Thiruvarur - 610004", 350, 180)
      .text("+91 93849 82510, +91 90032 51115", 350, 194);
    doc
      .fillColor("#0F1923")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(`GSTIN: ${HOTEL_GSTIN}`, 350, 208);

    // The table starts below whichever column ran longer.
    const tableTop = Math.max(230, billY + 6);
    doc.rect(50, tableTop, 495, 25).fill("#0F1923");
    doc
      .fillColor("#C9A84C")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("DESCRIPTION", 60, tableTop + 8)
      .text("DETAILS", 285, tableTop + 8)
      .text("AMOUNT", 430, tableTop + 8);

    let y = tableTop + 34;
    const rows = [
      [
        `${booking.room_type} - Room ${booking.room_number || booking.room_id}`,
        `${nights} night${nights > 1 ? "s" : ""}`,
        formatInvoiceMoney(roomSubtotal),
      ],
      ["Check-in", formatInvoiceDate(booking.check_in_date), "-"],
      ["Check-out", formatInvoiceDate(booking.check_out_date), "-"],
      ["Guests", String(booking.guest_count || 1), "-"],
      ["Payment Mode", booking.payment_method || "-", "-"],
      ["Payment ID", booking.payment_id || "-", "-"],
    ];

    rows.forEach((row, index) => {
      if (index % 2 === 0) doc.rect(50, y - 6, 495, 23).fill("#F8F9FA");
      doc
        .fillColor("#0F1923")
        .font("Helvetica")
        .fontSize(9)
        .text(row[0], 60, y)
        .text(row[1], 285, y)
        .text(row[2], 430, y, { width: 110, align: "right" });
      y += 24;
    });

    y += 14;
    [
      ["Room Charges", roomSubtotal],
      // Pre-tax discount: the discount comes off the tariff first, then GST is
      // charged on the reduced (taxable) value.
      ...(discountAmount > 0
        ? [
            ["Discount", -discountAmount],
            ["Taxable Value", discountedRoomAmount],
          ]
        : []),
      [`GST (${roomGstPercentOf(booking)}%)`, gstAmount],
      ["Total Amount", totalAmount],
      ["Advance Paid", advancePaid],
      ["Remaining Balance", remainingAmount],
    ].forEach(([label, amount], index) => {
      const strong = index >= 2;
      doc
        .fillColor(strong ? "#0F1923" : "#868E96")
        .font(strong ? "Helvetica-Bold" : "Helvetica")
        .fontSize(strong ? 10 : 9)
        .text(label, 330, y);
      doc
        .fillColor(strong ? "#0F1923" : "#495057")
        .font(strong ? "Helvetica-Bold" : "Helvetica")
        .fontSize(strong ? 10 : 9)
        .text(formatInvoiceMoney(amount), 430, y, {
          width: 110,
          align: "right",
        });
      y += 20;
    });

    y += 8;
    doc.rect(330, y, 215, 38).fill("#0F1923");
    doc
      .fillColor("#C9A84C")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("AMOUNT PAID", 342, y + 13);
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(formatInvoiceMoney(advancePaid), 430, y + 11, {
        width: 105,
        align: "right",
      });

    y += 20;
    doc
      .fillColor("#333333")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("TERMS & CONDITIONS", 50, y);
    doc
      .moveTo(50, y + 12)
      .lineTo(545, y + 12)
      .strokeColor("#C9A84C")
      .lineWidth(0.4)
      .stroke();
    y += 18;
    doc.fillColor("#666666").font("Helvetica").fontSize(6);
    /*
     * Height-capped to the space left above the footer. Without a cap, a
     * booking with a discount (two extra summary rows) pushed the terms past
     * the bottom margin and PDFKit silently started a second page — leaving
     * page 1 with no footer and page 2 with nothing but stray text.
     */
    doc.text(
      INVOICE_TERMS.map((term, i) => `${i + 1}. ${term}`).join("   "),
      50,
      y,
      { width: 495, align: "justify", height: Math.max(60, 752 - y) },
    );

    const footerY = 762;
    doc
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .strokeColor("#C9A84C")
      .lineWidth(0.5)
      .stroke();
    doc
      .fillColor("#868E96")
      .font("Helvetica-Oblique")
      .fontSize(9)
      .text(
        "Thank you for choosing VV Grand Park Residency!",
        50,
        footerY + 10,
        {
          width: 495,
          align: "center",
        },
      );
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(
        "3/4/D, Thanjai Saalai, Thiruvarur - 610004  |  +91 93849 82510 | +91 90032 51115  |  vvgrandpark.com",
        50,
        footerY + 26,
        { width: 495, align: "center" },
      );

    doc.end();
  });
}

async function sendAdvanceInvoiceEmail(booking) {
  if (!booking?.email) return;

  const invNo = `INV-${formatBookingId(booking)}`;
  const pdfBuffer = await generateAdvanceInvoicePdf(booking);
  const totalAmount = Number(
    booking.total_amount || booking.final_total || booking.total_price || 0,
  );
  const advancePaid = Number(booking.advance_paid || 0);
  const remainingAmount = Number(
    booking.remaining_amount || Math.max(0, totalAmount - advancePaid),
  );
  const roomLabel = `${escapeHtml(booking.room_type)} - Room ${escapeHtml(
    booking.room_number || booking.room_id,
  )}`;
  const discountAmount =
    Number(booking.discount_applied ? booking.discount_amount : 0) || 0;
  const emailTermsHtml = INVOICE_TERMS.map(
    (term) =>
      `<li style="margin:0 0 6px;color:#6B7280;line-height:18px;">${escapeHtml(
        term,
      )}</li>`,
  ).join("");

  await resend.emails.send({
    from: "VV Grand Park Residency <bookings@vvgrandpark.com>",
    to: booking.email,
    subject: `Booking Confirmed! ${invNo} - VV Grand Park Residency`,
    html: `
      <div style="background:#F1F3F5;padding:24px 12px;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E9ECEF;border-radius:12px;overflow:hidden;">
          <div style="background:#0F1923;padding:26px 30px;text-align:center;">
            <div style="color:#C9A84C;font-size:22px;font-weight:700;letter-spacing:2px;">VV GRAND PARK</div>
            <div style="color:#8B9298;font-size:12px;letter-spacing:3px;margin-top:4px;">RESIDENCY</div>
          </div>
          <div style="padding:28px 30px;">
            <h2 style="margin:0 0 8px;color:#0F1923;font-size:24px;">Booking Confirmed!</h2>
            <p style="margin:0 0 20px;color:#868E96;font-size:14px;">Dear ${escapeHtml(
              booking.guest_name || "Guest",
            )}, your booking is confirmed. Invoice PDF is attached.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#F8F9FA;border-radius:10px;overflow:hidden;">
              <tr><td style="padding:10px 14px;color:#868E96;">Booking ID</td><td style="padding:10px 14px;text-align:right;font-weight:700;color:#0F1923;">${invNo}</td></tr>
              <tr><td style="padding:10px 14px;border-top:1px solid #E9ECEF;color:#868E96;">Room</td><td style="padding:10px 14px;border-top:1px solid #E9ECEF;text-align:right;font-weight:700;color:#0F1923;">${roomLabel}</td></tr>
              <tr><td style="padding:10px 14px;border-top:1px solid #E9ECEF;color:#868E96;">Check-in</td><td style="padding:10px 14px;border-top:1px solid #E9ECEF;text-align:right;color:#0F1923;">${formatInvoiceDate(
                booking.check_in_date,
              )}</td></tr>
              <tr><td style="padding:10px 14px;border-top:1px solid #E9ECEF;color:#868E96;">Check-out</td><td style="padding:10px 14px;border-top:1px solid #E9ECEF;text-align:right;color:#0F1923;">${formatInvoiceDate(
                booking.check_out_date,
              )}</td></tr>
              <tr><td style="padding:10px 14px;border-top:1px solid #E9ECEF;color:#868E96;">Payment Mode</td><td style="padding:10px 14px;border-top:1px solid #E9ECEF;text-align:right;color:#0F1923;">${escapeHtml(
                booking.payment_method || "-",
              )}</td></tr>
              ${booking.gst_number ? `<tr><td style="padding:10px 14px;border-top:1px solid #E9ECEF;color:#868E96;">Your GSTIN</td><td style="padding:10px 14px;border-top:1px solid #E9ECEF;text-align:right;font-weight:700;color:#0F1923;">${escapeHtml(booking.gst_number)}</td></tr>` : ""}
              ${discountAmount > 0 ? `<tr><td style="padding:10px 14px;border-top:1px solid #E9ECEF;color:#868E96;">Discount</td><td style="padding:10px 14px;border-top:1px solid #E9ECEF;text-align:right;font-weight:700;color:#C0392B;">-${formatInvoiceMoney(discountAmount)}</td></tr>` : ""}
              <tr><td style="padding:10px 14px;border-top:1px solid #E9ECEF;color:#868E96;">Advance Paid</td><td style="padding:10px 14px;border-top:1px solid #E9ECEF;text-align:right;font-weight:700;color:#2D9A6E;">${formatInvoiceMoney(
                advancePaid,
              )}</td></tr>
              <tr><td style="padding:10px 14px;border-top:1px solid #E9ECEF;color:#868E96;">Remaining Balance</td><td style="padding:10px 14px;border-top:1px solid #E9ECEF;text-align:right;font-weight:700;color:#B8872F;">${formatInvoiceMoney(
                remainingAmount,
              )}</td></tr>
            </table>
            <div style="margin-top:20px;border-top:1px solid #E9ECEF;padding-top:16px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#0F1923;text-transform:uppercase;margin-bottom:8px;">Terms & Conditions</div>
              <ol style="margin:0;padding-left:18px;font-size:12px;">${emailTermsHtml}</ol>
            </div>
            <p style="margin:20px 0 0;color:#868E96;font-size:12px;text-align:center;">VV Grand Park Residency | +91 93849 82510 | +91 90032 51115 | vvgrandpark@gmail.com</p>
            <p style="margin:6px 0 0;color:#868E96;font-size:12px;text-align:center;">GSTIN: ${HOTEL_GSTIN}</p>
          </div>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `${invNo}-${(booking.guest_name || "guest").replace(/\s+/g, "_")}.pdf`,
        content: pdfBuffer.toString("base64"),
        type: "application/pdf",
      },
    ],
  });
}

app.get("/", (req, res) =>
  res.json({ message: "VV Grand Park Residency API", status: "OK" }),
);

// ─── SESSION CHECK ────────────────────────────────────────────────────────────
app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT user_id, name, email, role, phone FROM users WHERE user_id=?",
      [req.user.user_id],
    );
    if (!rows.length) {
      res.clearCookie("auth_token");
      return res.status(401).json({ error: "User not found" });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════════════════════
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email, password required" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    const [ex] = await db.query("SELECT user_id FROM users WHERE email=?", [
      email,
    ]);
    if (ex.length)
      return res.status(409).json({ error: "Email already registered" });
    const hashedPassword = await bcrypt.hash(password, 12);
    const [r] = await db.query(
      "INSERT INTO users (name,email,password,phone,role) VALUES (?,?,?,?,'guest')",
      [name, email, hashedPassword, phone || null],
    );
    res
      .status(201)
      .json({ message: "Registered successfully", user_id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });
    const [rows] = await db.query(
      "SELECT user_id,name,email,role,phone,password FROM users WHERE email=?",
      [email],
    );
    if (!rows.length)
      return res.status(401).json({ error: "Invalid credentials" });
    const user = rows[0];
    let passwordValid = false;
    if (user.password.startsWith("$2")) {
      passwordValid = await bcrypt.compare(password, user.password);
    } else {
      passwordValid = user.password === password;
      if (passwordValid) {
        const hashed = await bcrypt.hash(password, 12);
        await db.query("UPDATE users SET password=? WHERE user_id=?", [
          hashed,
          user.user_id,
        ]);
      }
    }
    if (!passwordValid)
      return res.status(401).json({ error: "Invalid credentials" });
    const { password: _, ...safeUser } = user;
    clearLoginAttempts(req);
    setAuthCookie(res, safeUser);
    res.json({ message: "Login successful", user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.json({ message: "Logged out successfully" });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    /*
     * Always answer the same way, whether or not the address is registered.
     * The old 404 ("No account found with this email") let anyone test an
     * address against the guest list.
     */
    const NEUTRAL = {
      message: "If that email is registered, an OTP has been sent",
    };

    // One address cannot be mailed an OTP more than a handful of times an hour.
    if (otpRequestsExceeded(email)) return res.json(NEUTRAL);

    const [users] = await db.query(
      "SELECT user_id, name FROM users WHERE email=?",
      [email],
    );
    if (!users.length) return res.json(NEUTRAL);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.query("DELETE FROM password_otps WHERE email=?", [email]);
    await db.query(
      "INSERT INTO password_otps (email, otp, expires_at) VALUES (?,?,?)",
      [email, otp, expiresAt],
    );
    const { error } = await resend.emails.send({
      from: "VV Grand Park Residency <bookings@vvgrandpark.com>",
      to: email,
      subject: "Password Reset OTP — VV Grand Park Residency",
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e9ecef"><div style="background:#0F1923;padding:28px 32px;text-align:center"><h1 style="color:#C9A84C;font-size:1.4rem;margin:0;letter-spacing:2px">VV GRAND PARK</h1><p style="color:rgba(255,255,255,0.5);font-size:0.75rem;margin:4px 0 0;letter-spacing:3px">RESIDENCY</p></div><div style="padding:32px;text-align:center;background:#fff"><h2 style="color:#0F1923;margin-bottom:8px">Password Reset OTP</h2><p style="color:#868E96;font-size:0.9rem;margin-bottom:24px">Hello ${users[0].name}, use this OTP to reset your password. Valid for <strong>10 minutes</strong>.</p><div style="background:#0F1923;border-radius:12px;padding:20px 32px;display:inline-block;margin-bottom:24px"><span style="font-size:2.5rem;font-weight:700;color:#C9A84C;letter-spacing:8px">${otp}</span></div><p style="color:#C0392B;font-size:0.8rem">Do not share this OTP with anyone.</p></div><div style="background:#0F1923;padding:16px;text-align:center"><p style="color:rgba(255,255,255,0.3);font-size:0.72rem;margin:0">VV Grand Park Residency · vvgrandpark.com</p></div></div>`,
    });
    if (error) {
      console.error("Resend error:", error);
      return res.status(500).json({ error: "Failed to send OTP. Try again." });
    }
    // Same wording as the not-registered path above.
    res.json(NEUTRAL);
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ error: "Failed to send OTP. Try again." });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ error: "Email and OTP required" });

    // Five wrong guesses per address per fifteen minutes. Without this a
    // six-digit code can be enumerated inside its ten-minute lifetime.
    if (otpAttemptsExceeded(email)) {
      return res.status(429).json({
        error: "Too many incorrect attempts. Request a new OTP in 15 minutes.",
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM password_otps WHERE email=? AND otp=? AND used=0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [email, otp],
    );
    if (!rows.length) {
      recordOtpAttempt(email);
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // A correct code clears the counter, so an honest mistype costs nothing.
    clearOtpAttempts(email);
    res.json({ message: "OTP verified", valid: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password)
      return res
        .status(400)
        .json({ error: "Email, OTP and new password required" });
    if (new_password.length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });

    // Same limit as verify-otp — otherwise this route is an unguarded second
    // door onto the same six-digit code.
    if (otpAttemptsExceeded(email)) {
      return res.status(429).json({
        error: "Too many incorrect attempts. Request a new OTP in 15 minutes.",
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM password_otps WHERE email=? AND otp=? AND used=0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [email, otp],
    );
    if (!rows.length) {
      recordOtpAttempt(email);
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    clearOtpAttempts(email);
    const hashed = await bcrypt.hash(new_password, 12);
    await db.query("UPDATE users SET password=? WHERE email=?", [
      hashed,
      email,
    ]);
    await db.query("UPDATE password_otps SET used=1 WHERE email=?", [email]);
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ROOMS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/rooms", async (req, res) => {
  try {
    const { type, min_price, max_price, check_in, check_out } = req.query;
    let q =
      "SELECT room_id, room_number, room_type, price_per_night, price_double, gst_rate, cgst_rate, sgst_rate, capacity, description, image_url, image2, image3, image4, image5, is_available, created_at FROM rooms WHERE is_available=1";
    const p = [];
    if (type) {
      q += " AND room_type=?";
      p.push(type);
    }
    if (min_price) {
      q += " AND price_per_night>=?";
      p.push(+min_price);
    }
    if (max_price) {
      q += " AND price_per_night<=?";
      p.push(+max_price);
    }
    if (check_in && check_out) {
      q += ` AND room_id NOT IN (SELECT room_id FROM bookings WHERE status NOT IN ('cancelled','pending') AND check_in_date<? AND check_out_date>?)`;
      p.push(check_out, check_in);
      q +=
        " AND room_id NOT IN (SELECT room_id FROM room_blocked_dates WHERE blocked_date>=? AND blocked_date<?)";
      p.push(check_in, check_out);
    }
    const [rooms] = await db.query(q, p);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/rooms/:roomId/booked-dates", async (req, res) => {
  try {
    const { roomId } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        booking_id,
        check_in_date,
        check_out_date
      FROM bookings
      WHERE room_id = ?
      AND status NOT IN ('cancelled','pending')
      `,
      [roomId],
    );

    const [blockedRows] = await db.query(
      `SELECT
        NULL AS booking_id,
        blocked_date AS check_in_date,
        DATE_ADD(blocked_date, INTERVAL 1 DAY) AS check_out_date
       FROM room_blocked_dates
       WHERE room_id = ?`,
      [roomId],
    );

    res.json([...rows, ...blockedRows]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
});

app.get(
  "/api/rooms/:roomId/blocked-dates",
  requireManager,
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT DATE_FORMAT(blocked_date, '%Y-%m-%d') AS blocked_date,
             block_reason, block_note, booking_id
        FROM room_blocked_dates WHERE room_id=? ORDER BY blocked_date ASC`,
        [req.params.roomId],
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);
app.get("/api/rooms/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM rooms WHERE room_id=?", [
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: "Room not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  REVIEWS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/reviews", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.name AS guest_name, rm.room_type FROM reviews r JOIN users u ON r.user_id=u.user_id JOIN rooms rm ON r.room_id=rm.room_id ORDER BY r.created_at DESC LIMIT 20`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reviews", requireAuth, async (req, res) => {
  try {
    // user_id comes from the verified token, never from the body — otherwise
    // a logged-in guest can post a review in another guest's name.
    const user_id = req.user.user_id;
    const { booking_id, room_id, rating, review_text } = req.body;
    if (!booking_id || !room_id || !rating || !review_text)
      return res.status(400).json({ error: "All fields required" });
    if (rating < 1 || rating > 5)
      return res.status(400).json({ error: "Rating must be 1-5" });
    const [booking] = await db.query(
      "SELECT * FROM bookings WHERE booking_id=? AND user_id=? AND status IN ('confirmed','completed')",
      [booking_id, user_id],
    );
    if (!booking.length)
      return res
        .status(403)
        .json({ error: "You can only review your own confirmed bookings" });
    const [existing] = await db.query(
      "SELECT review_id FROM reviews WHERE booking_id=?",
      [booking_id],
    );
    if (existing.length)
      return res
        .status(409)
        .json({ error: "You already reviewed this booking" });
    const [r] = await db.query(
      "INSERT INTO reviews (user_id, booking_id, room_id, rating, review_text) VALUES (?,?,?,?,?)",
      [user_id, booking_id, room_id, rating, review_text],
    );
    res
      .status(201)
      .json({ message: "Review submitted!", review_id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reviews/user/:user_id", requireAuth, async (req, res, next) => {
  try {
    if (!ownsOrStaff(req, req.params.user_id)) {
      return res
        .status(403)
        .json({ error: "You can only view your own reviews" });
    }
    const [rows] = await db.query(
      "SELECT review_id, booking_id FROM reviews WHERE user_id=?",
      [req.params.user_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PAYMENT
// ══════════════════════════════════════════════════════════════════════════════
/* ─────────────────────────────────────────────────────────────────────────────
   GUEST CHECKOUT (no account required)

   Lets a walk-up visitor book without registering. They give name, email and
   phone; we find-or-create a guest account behind the scenes and put the
   booking through the normal Razorpay flow.

   These two routes are deliberately public, so both are rate limited by IP.
   A booking only becomes 'confirmed' once Razorpay has verified the payment,
   so an unpaid attempt never holds a room.
   ──────────────────────────────────────────────────────────────────────────── */

const guestOrderAttempts = new Map();
const GUEST_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const GUEST_MAX_ORDERS = 8; // per IP per window

function guestRateLimit(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const now = Date.now();
  const hits = (guestOrderAttempts.get(ip) || []).filter(
    (t) => now - t < GUEST_WINDOW_MS,
  );

  if (hits.length >= GUEST_MAX_ORDERS) {
    return res.status(429).json({
      error: "Too many booking attempts. Please try again in a few minutes.",
    });
  }

  hits.push(now);
  guestOrderAttempts.set(ip, hits);

  // keep the map from growing without bound
  if (guestOrderAttempts.size > 5000) {
    for (const [key, times] of guestOrderAttempts) {
      if (!times.some((t) => now - t < GUEST_WINDOW_MS))
        guestOrderAttempts.delete(key);
    }
  }
  next();
}

app.post(
  "/api/payment/guest/create-order",
  guestRateLimit,
  async (req, res) => {
    try {
      const { room_id, check_in_date, check_out_date, guest_count, customer } =
        req.body;

      if (!room_id || !check_in_date || !check_out_date) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // validates name/email/phone and reuses an existing guest account when the
      // email is already known, so repeat visitors keep one booking history
      const userId = await findOrCreateGuestUser(customer || {});

      const amounts = await calculateBookingAmounts({
        room_id,
        check_in_date,
        check_out_date,
        advance_amount: null,
        guest_count,
      });

      const requestedGuests = Math.max(1, Number(guest_count) || 1);
      if (requestedGuests > Number(amounts.room.capacity || requestedGuests)) {
        return res.status(400).json({
          error: `This room allows up to ${amounts.room.capacity} guests`,
        });
      }

      const [result] = await db.query(
        `INSERT INTO bookings
        (user_id, room_id, check_in_date, check_out_date, guest_count,
         total_price, taxable_amount, gst_amount, final_total, total_amount,
         payment_method, booking_source, vehicle_type, vehicle_price, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')`,
        [
          userId,
          room_id,
          check_in_date,
          check_out_date,
          requestedGuests,
          amounts.roomSubtotal,
          amounts.taxableAmount,
          amounts.gstAmount,
          amounts.totalAmount,
          amounts.totalAmount,
          "Razorpay",
          "GUEST_CHECKOUT",
          "none",
          0,
        ],
      );

      const bookingId = result.insertId;
      // freeze the room's GST rate onto this booking
      await stampRoomGstRate(bookingId);

      const order = await razorpay.orders.create({
        amount: Math.round(amounts.totalAmount * 100),
        currency: "INR",
        receipt: `guest_${bookingId}`,
        notes: { booking_id: String(bookingId), source: "guest_checkout" },
      });

      res.status(201).json({
        booking_id: bookingId,
        user_id: userId,
        nights: amounts.nights,
        room_subtotal: amounts.roomSubtotal,
        gst_amount: amounts.gstAmount,
        total_price: amounts.totalAmount,
        razorpay_order_id: order.id,
        razorpay_key: process.env.RAZORPAY_KEY_ID,
        room_name: `${amounts.room.room_type} — Room ${
          amounts.room.room_number || room_id
        }`,
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
);

app.post("/api/payment/guest/verify", guestRateLimit, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !booking_id
    ) {
      return res.status(400).json({ error: "Missing payment details" });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      await db.query(
        "UPDATE bookings SET status='cancelled' WHERE booking_id=? AND status='pending'",
        [booking_id],
      );
      return res.status(400).json({ error: "Payment verification failed." });
    }

    // the order must be the one we created for this booking
    const order = await razorpay.orders.fetch(razorpay_order_id);
    if (String(order?.notes?.booking_id || "") !== String(booking_id)) {
      return res
        .status(400)
        .json({ error: "Payment does not match this booking" });
    }

    const [rows] = await db.query(
      "SELECT status FROM bookings WHERE booking_id=?",
      [booking_id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Booking not found" });

    if (rows[0].status === "confirmed") {
      return res.json({ success: true, message: "Already confirmed" });
    }

    await db.query(
      `UPDATE bookings
          SET status='confirmed',
              payment_id=?,
              payment_status='PAID',
              advance_paid=total_amount,
              remaining_amount=0,
              advance_payment_mode='Razorpay',
              advance_paid_at=NOW()
        WHERE booking_id=?`,
      [razorpay_payment_id, booking_id],
    );

    const booking = await loadBookingForInvoice(booking_id);

    // confirmation email in the background — never block the response
    if (booking) {
      sendAdvanceInvoiceEmail(booking).catch((e) =>
        console.error("Guest booking invoice email error:", e.message),
      );
    }

    res.json({
      success: true,
      message: "Payment verified. Booking confirmed!",
      booking,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payment/create-order", requireAuth, async (req, res) => {
  try {
    const {
      user_id,
      room_id,
      check_in_date,
      check_out_date,
      guest_count,
      vehicle_type,
    } = req.body;
    if (!user_id || !room_id || !check_in_date || !check_out_date)
      return res.status(400).json({ error: "Missing required fields" });
    if (Number(user_id) !== Number(req.user.user_id))
      return res.status(403).json({ error: "You can only book for yourself" });
    if (!Object.prototype.hasOwnProperty.call(VEHICLE_PRICES, vehicle_type))
      return res.status(400).json({ error: "Invalid vehicle type" });
    const [roomRows] = await db.query(
      "SELECT * FROM rooms WHERE room_id=? AND is_available=1",
      [room_id],
    );
    if (!roomRows.length)
      return res.status(404).json({ error: "Room not found or unavailable" });
    const room = roomRows[0];
    const [conflicts] = await db.query(
      `SELECT booking_id FROM bookings WHERE room_id=? AND status NOT IN ('cancelled','pending') AND check_in_date<? AND check_out_date>?`,
      [room_id, check_out_date, check_in_date],
    );
    if (conflicts.length)
      return res
        .status(409)
        .json({ error: "Room already booked for these dates" });
    const nights = Math.ceil(
      (new Date(check_out_date) - new Date(check_in_date)) / 86400000,
    );
    if (nights <= 0) return res.status(400).json({ error: "Invalid dates" });
    const base_price = nights * resolveNightlyRate(room, guest_count);
    const vehicle_price = 0;
    const room_subtotal = base_price + vehicle_price;
    // PER-ROOM GST — explicit room rate, else the slab for this tariff.
    const gst_amount =
      Math.round(room_subtotal * (roomRatePercent(room, guest_count) / 100) * 100) / 100;
    const total_price = Math.round((room_subtotal + gst_amount) * 100) / 100;
    const [result] = await db.query(
      `INSERT INTO bookings (user_id,room_id,check_in_date,check_out_date,guest_count,total_price,taxable_amount,gst_amount,final_total,vehicle_type,vehicle_price,status) VALUES (?,?,?,?,?,?,?,?,?,?,?, 'pending')`,
      [
        user_id,
        room_id,
        check_in_date,
        check_out_date,
        guest_count || 1,
        room_subtotal,
        room_subtotal,
        gst_amount,
        total_price,
        vehicle_type,
        vehicle_price,
      ],
    );
    const booking_id = result.insertId;
    // freeze the room's GST rate onto this booking
    await stampRoomGstRate(booking_id);
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total_price * 100),
      currency: "INR",
      receipt: `booking_${booking_id}`,
      notes: { booking_id: String(booking_id) },
    });
    res.status(201).json({
      booking_id,
      total_price,
      base_price,
      vehicle_type,
      vehicle_price,
      room_subtotal,
      gst_amount,
      nights,
      razorpay_order_id: razorpayOrder.id,
      razorpay_key: process.env.RAZORPAY_KEY_ID,
      room_name: `${room.room_type} — Room ${room.room_number || room_id}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payment/verify", requireAuth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id,
    } = req.body;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
    if (expected !== razorpay_signature) {
      /*
       * SECURITY FIX: this cancelled `WHERE booking_id=?` with nothing else.
       *
       * requireAuth only proves the caller is signed in — it says nothing
       * about whose booking this is, and the ownership check below runs
       * AFTER this branch has already returned. So any logged-in guest could
       * post a deliberately wrong signature with somebody else's booking_id
       * and cancel their stay, confirmed and paid for or not.
       *
       * Scoped to the caller's own still-pending booking, which is the only
       * row a failed payment should ever touch, and which matches the guard
       * the guest-checkout verify route already had. A bad signature against
       * anyone else's booking now changes nothing and still returns 400.
       */
      await db.query(
        "UPDATE bookings SET status='cancelled' WHERE booking_id=? AND user_id=? AND status='pending'",
        [booking_id, req.user.user_id],
      );
      return res.status(400).json({ error: "Payment verification failed." });
    }
    const [ownedBooking] = await db.query(
  `SELECT
     booking_id,
     status,
     final_total,
     total_price,
     advance_amount,
     advance_paid,
     balance_paid,
     remaining_amount,
     payment_status
   FROM bookings
   WHERE booking_id=?
     AND user_id=?
     AND status IN ('pending','cancelled')`,
  [booking_id, req.user.user_id],
);
    if (!ownedBooking.length) {
      const [already] = await db.query(
        "SELECT status FROM bookings WHERE booking_id=? AND user_id=?",
        [booking_id, req.user.user_id],
      );
      if (
        already.length &&
        ["confirmed", "completed"].includes(already[0].status)
      ) {
        return res.json({ success: true, message: "Already confirmed" });
      }
      return res
        .status(403)
        .json({ error: "Booking not found or already processed" });
    }
  const bookingTotal = Number(
  ownedBooking[0].final_total ||
    ownedBooking[0].total_price ||
    0
);

if (!Number.isFinite(bookingTotal) || bookingTotal <= 0) {
  return res.status(400).json({
    error: "Invalid booking total.",
  });
}

await db.query(
  `UPDATE bookings
   SET
     status='confirmed',
     payment_id=?,

     advance_amount=?,
     advance_paid=?,

     balance_paid=0,
     remaining_amount=0,

     payment_status='PAID',

     advance_payment_id=?,
     advance_order_id=?,
     advance_payment_mode='Online',
     advance_paid_at=NOW()

   WHERE booking_id=?
     AND user_id=?`,
  [
    razorpay_payment_id,

    bookingTotal,
    bookingTotal,

    razorpay_payment_id,
    razorpay_order_id,

    booking_id,
    req.user.user_id,
  ],
);
    const [rows] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, u.phone, r.room_type, r.room_number, r.price_per_night, r.image_url FROM bookings b JOIN users u ON b.user_id=u.user_id JOIN rooms r ON b.room_id=r.room_id WHERE b.booking_id=?`,
      [booking_id],
    );
    const booking = rows[0];

    // Send booking confirmation email with PDF in background
    (async () => {
      try {
        const nights = Math.ceil(
          (new Date(booking.check_out_date) - new Date(booking.check_in_date)) /
            86400000,
        );
        const basePrice = Number(booking.total_price || 0);
        const gst = Number(
          // PER-ROOM GST: fall back to the rate frozen onto this booking,
          // not a constant, so the emailed figure matches the invoice.
          booking.gst_amount ||
            Math.round(basePrice * roomGstFractionOf(booking) * 100) / 100,
        );
        const total = Number(
          booking.final_total || Math.round((basePrice + gst) * 100) / 100,
        );
        const invNo = `INV-${formatBookingId(booking)}`;

        // Generate PDF
        const pdfBuffer = await new Promise((resolve, reject) => {
          const doc = new PDFDocument({ margin: 50, size: "A4" });
          const chunks = [];
          doc.on("data", (chunk) => chunks.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(chunks)));
          doc.on("error", reject);

          doc.rect(0, 0, 595, 100).fill("#0F1923");
          doc
            .fillColor("#C9A84C")
            .font("Helvetica-Bold")
            .fontSize(22)
            .text("VV GRAND PARK", 50, 30);
          doc
            .fillColor("#C9A84C")
            .font("Helvetica")
            .fontSize(10)
            .text("RESIDENCY", 50, 56);
          doc
            .fillColor("#ffffff")
            .font("Helvetica-Bold")
            .fontSize(22)
            .text("INVOICE", 400, 30, { align: "right" });
          doc
            .fillColor("#8B9298")
            .font("Helvetica")
            .fontSize(10)
            .text(invNo, 400, 56, { align: "right" });
          doc
            .fillColor("#8B9298")
            .fontSize(9)
            .text(
              new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
              400,
              72,
              { align: "right" },
            );
          doc
            .moveTo(50, 115)
            .lineTo(545, 115)
            .strokeColor("#C9A84C")
            .lineWidth(1)
            .stroke();
          doc
            .fillColor("#868E96")
            .font("Helvetica-Bold")
            .fontSize(8)
            .text("BILL TO", 50, 130);
          doc
            .fillColor("#0F1923")
            .font("Helvetica-Bold")
            .fontSize(13)
            .text(booking.guest_name || "Guest", 50, 145);
          doc
            .fillColor("#495057")
            .font("Helvetica")
            .fontSize(9)
            .text(booking.email || "", 50, 162);

          let billY = 174;
          if (booking.phone) {
            doc.text(booking.phone, 50, billY);
            billY += 12;
          }
          if (booking.customer_address) {
            doc.text(String(booking.customer_address), 50, billY, {
              width: 250,
              height: 24,
              ellipsis: true,
            });
            billY += Math.min(
              24,
              Math.max(
                12,
                doc.heightOfString(String(booking.customer_address), {
                  width: 250,
                }),
              ),
            );
          }
          if (booking.gst_number) {
            doc
              .fillColor("#0F1923")
              .font("Helvetica-Bold")
              .fontSize(9)
              .text(`GSTIN: ${booking.gst_number}`, 50, billY);
            billY += 12;
          }

          doc
            .fillColor("#868E96")
            .font("Helvetica-Bold")
            .fontSize(8)
            .text("FROM", 350, 130);
          doc
            .fillColor("#0F1923")
            .font("Helvetica-Bold")
            .fontSize(13)
            .text("VV Grand Park Residency", 350, 145);
          doc
            .fillColor("#495057")
            .font("Helvetica")
            .fontSize(9)
            .text("3/4/D, Thanjai Saalai, Thiruvarur - 610004", 350, 162)
            .text(
              "+91 93849 82510 | +91 90032 51115 | vvgrandpark@gmail.com",
              350,
              175,
            );
          doc
            .fillColor("#0F1923")
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(`GSTIN: ${HOTEL_GSTIN}`, 350, 188);

          const tableTop = Math.max(210, billY + 6);
          doc.rect(50, tableTop, 495, 25).fill("#0F1923");
          doc
            .fillColor("#C9A84C")
            .font("Helvetica-Bold")
            .fontSize(9)
            .text("DESCRIPTION", 60, tableTop + 8)
            .text("DETAILS", 280, tableTop + 8)
            .text("AMOUNT", 400, tableTop + 8, { width: 145, align: "center" });

          const tableRows = [
            [
              `${booking.room_type} — Room ${booking.room_number || booking.room_id}`,
              `${nights} night${nights > 1 ? "s" : ""}`,
              `Rs.${basePrice.toLocaleString()}`,
            ],
            [
              "Check-in",
              new Date(booking.check_in_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
              "—",
            ],
            [
              "Check-out",
              new Date(booking.check_out_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
              "—",
            ],
            ["Guests", `${booking.guest_count || 1}`, "—"],
            ["Payment ID", booking.payment_id || "—", "—"],
          ];

          let y = tableTop + 30;
          tableRows.forEach((row, i) => {
            if (i % 2 === 0) doc.rect(50, y - 5, 495, 22).fill("#F8F9FA");
            doc
              .fillColor("#0F1923")
              .font("Helvetica")
              .fontSize(9)
              .text(row[0], 60, y)
              .text(row[1], 280, y)
              .text(row[2], 400, y, { width: 145, align: "center" });
            y += 22;
          });

          y += 15;
          doc
            .moveTo(50, y)
            .lineTo(545, y)
            .strokeColor("#E9ECEF")
            .lineWidth(0.5)
            .stroke();
          y += 15;
          [
            ["Room Charges", `Rs.${basePrice.toLocaleString()}`],
            [
              `GST (${roomGstPercentOf(booking)}%)`,
              `Rs.${Math.round(gst).toLocaleString()}`,
            ],
          ].forEach(([label, val]) => {
            doc
              .fillColor("#868E96")
              .font("Helvetica")
              .fontSize(10)
              .text(label, 350, y);
            doc
              .fillColor("#0F1923")
              .font("Helvetica-Bold")
              .fontSize(10)
              .text(val, 400, y, { width: 145, align: "center" });
            y += 20;
          });

          y += 5;
          doc.rect(350, y, 195, 36).fill("#0F1923");
          doc
            .fillColor("#C9A84C")
            .font("Helvetica-Bold")
            .fontSize(11)
            .text("TOTAL PAID", 360, y + 12);

          doc
            .fillColor("#ffffff")
            .font("Helvetica-Bold")
            .fontSize(14)
            .text(`Rs.${Math.round(total).toLocaleString()}`, 400, y + 10, {
              width: 145,
              align: "center",
            });

          y += 50;
          y += 10;
          doc
            .fillColor("#333")
            .font("Helvetica-Bold")
            .fontSize(8)
            .text("TERMS & CONDITIONS", 50, y);
          doc
            .moveTo(50, y + 12)
            .lineTo(545, y + 12)
            .strokeColor("#C9A84C")
            .lineWidth(0.4)
            .stroke();
          y += 18;
          doc.fillColor("#666").font("Helvetica").fontSize(4.6);
          doc.text(
            INVOICE_TERMS.map((term, index) => `${index + 1}. ${term}`).join(
              " ",
            ),
            50,
            y,
            { width: 495, lineGap: 0, height: 136 },
          );
          const footerY = 760;

          doc
            .moveTo(50, footerY)
            .lineTo(545, footerY)
            .strokeColor("#C9A84C")
            .lineWidth(0.5)
            .stroke();
          doc
            .fillColor("#868E96")
            .font("Helvetica-Oblique")
            .fontSize(9)
            .text(
              "Thank you for choosing VV Grand Park Residency!",
              50,
              footerY + 10,
              {
                width: 495,
                align: "center",
              },
            );
          doc
            .fillColor("#868E96")
            .font("Helvetica")
            .fontSize(8)
            .text(
              "vvgrandpark.com  |  bookings@vvgrandpark.com",
              50,
              footerY + 24,
              {
                width: 495,
                align: "center",
              },
            );
          doc
            .fillColor("#868E96")
            .font("Helvetica")
            .fontSize(8)
            .text(
              "3/4/D, Thanjai Saalai, Thiruvarur - 610004  |  +91 93849 82510 | +91 90032 51115  |  vvgrandpark@gmail.com",
              50,
              footerY + 38,
              { width: 495, align: "center" },
            );
          doc.end();
        });

        // Send via Resend
        await resend.emails.send({
          from: "VV Grand Park Residency <bookings@vvgrandpark.com>",
          to: booking.email,
          subject: `Booking Confirmed! ${invNo} — VV Grand Park Residency`,
          html: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#F1F3F5;margin:0;padding:0;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:24px 12px;">

      <div
        style="
          font-family:Arial,sans-serif;
          max-width:560px;
          margin:0 auto;
          border-radius:12px;
          overflow:hidden;
          border:1px solid #e9ecef;
        "
      >

        <!-- Header -->
        <div
          style="
            background:#0F1923;
            padding:28px 32px;
            text-align:center;
          "
        >
          <div
            style="
              color:#C9A84C;
              font-family:Arial,sans-serif;
              font-size:22px;
              line-height:28px;
              font-weight:700;
              letter-spacing:2px;
            "
          >
            VV GRAND PARK
          </div>

          <div
            style="
              color:#8B9298;
              font-family:Arial,sans-serif;
              font-size:12px;
              line-height:18px;
              margin-top:4px;
              letter-spacing:3px;
            "
          >
            RESIDENCY
          </div>
        </div>


        <!-- Content -->
        <div style="padding:32px;background:#ffffff;">

          <!-- SUCCESS SECTION -->
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width:100%;
              border-collapse:collapse;
              margin:0 0 24px 0;
            "
          >

            <tr>
              <td
                align="center"
                style="text-align:center;padding:0 0 12px 0;"
              >

                <table
                  role="presentation"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  align="center"
                  style="border-collapse:collapse;margin:0 auto;"
                >
                  <tr>
                    <td
                      width="64"
                      height="64"
                      align="center"
                      valign="middle"
                      style="
                        width:64px;
                        height:64px;
                        background:#E8F8F0;
                        border-radius:50%;
                        color:#2D9A6E;
                        font-family:Arial,sans-serif;
                        font-size:32px;
                        font-weight:700;
                        line-height:64px;
                        text-align:center;
                        vertical-align:middle;
                        mso-line-height-rule:exactly;
                      "
                    >
                      &#10003;
                    </td>
                  </tr>
                </table>

              </td>
            </tr>


            <tr>
              <td
                align="center"
                style="
                  font-family:Arial,sans-serif;
                  font-size:24px;
                  line-height:30px;
                  font-weight:700;
                  color:#0F1923;
                  text-align:center;
                  padding:0 20px 4px;
                "
              >
                Booking Confirmed!
              </td>
            </tr>


            <tr>
              <td
                align="center"
                style="
                  font-family:Arial,sans-serif;
                  font-size:14px;
                  line-height:21px;
                  color:#868E96;
                  text-align:center;
                  padding:0 20px;
                "
              >
                Thank you, ${booking.guest_name}. Your reservation is confirmed.
              </td>
            </tr>

          </table>


          <!-- Booking Details -->
          <div
            style="
              background:#F8F9FA;
              border-radius:10px;
              padding:20px;
              margin-bottom:20px;
            "
          >

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              border="0"
              style="
                width:100%;
                border-collapse:collapse;
              "
            >

              <tr>
                <td
                  style="
                    color:#868E96;
                    font-size:14px;
                    padding:8px 0;
                    white-space:nowrap;
                  "
                >
                  Booking ID
                </td>

                <td
                  style="
                    text-align:right;
                    font-weight:700;
                    color:#0F1923;
                    padding:8px 0;
                  "
                >
                  ${invNo}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    color:#868E96;
                    font-size:14px;
                    padding:8px 0;
                    white-space:nowrap;
                  "
                >
                  Room
                </td>

                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    text-align:right;
                    font-weight:700;
                    color:#0F1923;
                    padding:8px 0;
                  "
                >
                  ${booking.room_type} — Room ${booking.room_number || booking.room_id}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    color:#868E96;
                    font-size:14px;
                    padding:8px 0;
                    white-space:nowrap;
                  "
                >
                  Payment ID
                </td>

                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    text-align:right;
                    font-weight:700;
                    color:#0F1923;
                    padding:8px 0;
                  "
                >
                  ${booking.payment_id || "—"}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    color:#868E96;
                    font-size:14px;
                    padding:8px 0;
                    white-space:nowrap;
                  "
                >
                  Check-in
                </td>

                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    text-align:right;
                    font-weight:700;
                    color:#0F1923;
                    padding:8px 0;
                  "
                >
                  ${new Date(booking.check_in_date).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    color:#868E96;
                    font-size:14px;
                    padding:8px 0;
                    white-space:nowrap;
                  "
                >
                  Check-out
                </td>

                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    text-align:right;
                    font-weight:700;
                    color:#0F1923;
                    padding:8px 0;
                  "
                >
                  ${new Date(booking.check_out_date).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    color:#868E96;
                    font-size:14px;
                    padding:8px 0;
                    white-space:nowrap;
                  "
                >
                  Nights
                </td>

                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    text-align:right;
                    color:#0F1923;
                    padding:8px 0;
                  "
                >
                  ${nights}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    color:#868E96;
                    font-size:14px;
                    padding:8px 0;
                    white-space:nowrap;
                  "
                >
                  Room Charges
                </td>

                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    text-align:right;
                    color:#0F1923;
                    padding:8px 0;
                  "
                >
                  Rs.${basePrice.toLocaleString()}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    color:#868E96;
                    font-size:14px;
                    padding:8px 0;
                    white-space:nowrap;
                  "
                >
                  GST (${roomGstPercentOf(booking)}%)
                </td>

                <td
                  style="
                    border-top:1px solid #E9ECEF;
                    text-align:right;
                    color:#0F1923;
                    padding:8px 0;
                  "
                >
                  Rs.${Math.round(gst).toLocaleString()}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    border-top:2px solid #C9A84C;
                    font-weight:700;
                    color:#0F1923;
                    font-size:16px;
                    padding:10px 0;
                    white-space:nowrap;
                  "
                >
                  Total Paid
                </td>

                <td
                  style="
                    border-top:2px solid #C9A84C;
                    text-align:right;
                    font-weight:700;
                    color:#C9A84C;
                    font-size:18px;
                    padding:10px 0;
                  "
                >
                  Rs.${Math.round(total).toLocaleString()}
                </td>
              </tr>

            </table>
          </div>


          <div
            style="
              color:#868E96;
              font-family:Arial,sans-serif;
              font-size:13px;
              line-height:21px;
              text-align:center;
            "
          >
            Invoice PDF attached to this email.<br>
            Please carry a valid ID proof at check-in.<br>

            For queries:
            <a
              href="mailto:bookings@vvgrandpark.com"
              style="
                color:#C9A84C;
                text-decoration:none;
              "
            >
              bookings@vvgrandpark.com
            </a>
          </div>

        </div>


        <!-- Footer -->
        <div
          style="
            background:#0F1923;
            padding:16px;
            text-align:center;
          "
        >
          <div
            style="
              color:#8B9298;
              font-size:12px;
              line-height:18px;
            "
          >
            VV Grand Park Residency ·
            <a
              href="https://vvgrandpark.com"
              style="
                color:#C9A84C;
                text-decoration:none;
              "
            >
              vvgrandpark.com
            </a>
            <br>
            3/4/D, Thanjai Saalai, Thiruvarur - 610004 · +91 93849 82510 · +91 90032 51115  · vvgrandpark@gmail.com
          </div>
        </div>

      </div>

    </td>
  </tr>
</table>
`,
          attachments: [
            {
              filename: `${invNo}-${(booking.guest_name || "guest").replace(/\s+/g, "_")}.pdf`,
              content: pdfBuffer.toString("base64"),
              type: "application/pdf",
              disposition: "attachment",
            },
          ],
        });
        console.log(`✅ Booking email sent to ${booking.email}`);
      } catch (emailErr) {
        console.error("Booking email error:", emailErr.message);
      }
    })();

    res.json({
      success: true,
      message: "Payment verified. Booking confirmed!",
      booking,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
 * Called when a guest closes the Razorpay window, so it cannot require a
 * login — guests check out without an account. It stays open, but is now
 * narrowed so it can only ever do what it is meant to:
 *
 *   - only a booking still in 'pending' can be touched (already true)
 *   - only within an hour of that booking being created, so an old pending
 *     row cannot be cancelled later by anyone who guesses its id
 *   - rate limited, so ids cannot be swept in bulk
 *
 * The guest-facing behaviour is unchanged.
 */
app.post("/api/payment/failed", guestRateLimit, async (req, res) => {
  try {
    const bookingId = Number(req.body.booking_id);
    if (!bookingId) return res.status(400).json({ error: "booking_id required" });

    await db.query(
      `UPDATE bookings
          SET status='cancelled'
        WHERE booking_id = ?
          AND status = 'pending'
          AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [bookingId],
    );

    // Always the same reply, so the endpoint cannot be used to discover which
    // booking ids exist.
    res.json({ message: "Booking cancelled." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  BOOKINGS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/bookings/user/:user_id", requireAuth, async (req, res, next) => {
  try {
    if (!ownsOrStaff(req, req.params.user_id)) {
      return res
        .status(403)
        .json({ error: "You can only view your own bookings" });
    }
    const [rows] = await db.query(
      `SELECT b.*, r.room_type, r.price_per_night, r.image_url FROM bookings b JOIN rooms r ON b.room_id=r.room_id WHERE b.user_id=? AND b.status != 'pending' ORDER BY b.created_at DESC`,
      [req.params.user_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch(
  "/api/admin/users/:id/reset-password",
  requireAdmin,
  async (req, res) => {
    try {
      const { new_password } = req.body;
      if (!new_password || new_password.length < 6)
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });
      const [[target]] = await db.query(
        "SELECT role FROM users WHERE user_id=?",
        [req.params.id],
      );
      if (!target) return res.status(404).json({ error: "User not found" });
      if (target.role !== "admin" && target.role !== "manager")
        return res.status(403).json({
          error:
            "Admins can only reset admin or manager passwords. Guests should use the forgot-password flow.",
        });
      const hashed = await bcrypt.hash(new_password, 12);
      const [result] = await db.query(
        "UPDATE users SET password=? WHERE user_id=?",
        [hashed, req.params.id],
      );
      if (!result.affectedRows)
        return res.status(404).json({ error: "User not found" });
      res.json({ message: "Password reset successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.patch("/api/bookings/:id/cancel", requireAuth, async (req, res) => {
  try {
    const [bookings] = await db.query(
      "SELECT booking_id, user_id, status, actual_checkin, vehicle_type, vehicle_status FROM bookings WHERE booking_id=?",
      [req.params.id],
    );
    if (!bookings.length)
      return res.status(404).json({ error: "Booking not found" });

    const booking = bookings[0];
    const canManageBookings =
      req.user.role === "admin" || req.user.role === "manager";
    if (
      !canManageBookings &&
      Number(booking.user_id) !== Number(req.user.user_id)
    ) {
      return res.status(403).json({ error: "You cannot cancel this booking" });
    }
    if (booking.actual_checkin) {
      return res
        .status(400)
        .json({ error: "Checked-in bookings cannot be cancelled" });
    }
    if (booking.status === "cancelled") {
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    // If a vehicle is attached and hasn't already been picked up/completed/cancelled,
    // cancel the vehicle request along with the booking.
    const hasActiveVehicle =
      booking.vehicle_type &&
      booking.vehicle_type !== "none" &&
      !["completed", "cancelled"].includes(booking.vehicle_status);

    const [result] = await db.query(
      hasActiveVehicle
        ? "UPDATE bookings SET status='cancelled', vehicle_status='cancelled' WHERE booking_id=?"
        : "UPDATE bookings SET status='cancelled' WHERE booking_id=?",
      [req.params.id],
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: "Booking not found" });

    res.json({
      message: "Booking cancelled successfully",
      vehicle_status: hasActiveVehicle ? "cancelled" : booking.vehicle_status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/bookings", requireAuth, async (req, res, next) => {
  try {
    // Staff may book on behalf of a guest; a guest may only book for themself.
    // Taking user_id straight from the body would let any logged-in user
    // create bookings in someone else's name.
    const user_id = isStaff(req)
      ? req.body.user_id || req.user.user_id
      : req.user.user_id;
    const { room_id, check_in_date, check_out_date, guest_count } = req.body;
    if (!user_id || !room_id || !check_in_date || !check_out_date)
      return res.status(400).json({ error: "Missing required fields" });
    const [roomRows] = await db.query("SELECT * FROM rooms WHERE room_id=?", [
      room_id,
    ]);
    if (!roomRows.length)
      return res.status(404).json({ error: "Room not found" });
    const room = roomRows[0];

    // Every other booking route enforces this; without it here a party of 10
    // could be booked into a room that sleeps 2.
    const requestedGuests = Math.max(1, Number(guest_count) || 1);
    if (requestedGuests > Number(room.capacity || requestedGuests)) {
      return res.status(400).json({
        error: `This room allows up to ${room.capacity} guests`,
      });
    }

    const nights = Math.ceil(
      (new Date(check_out_date) - new Date(check_in_date)) / 86400000,
    );
    if (nights <= 0) return res.status(400).json({ error: "Invalid dates" });

    // Guests cannot book a date that has already gone — that is always a typo
    // or a stale browser tab. Staff CAN, because walk-ins and late paperwork
    // are entered after the stay has already started.
    if (!isStaff(req) && isPastDate(check_in_date)) {
      return res
        .status(400)
        .json({ error: "Check-in date cannot be in the past" });
    }

    const base_price = nights * resolveNightlyRate(room, guest_count);
    // PER-ROOM GST — explicit room rate, else the slab for this tariff.
    const gst_amount =
      Math.round(base_price * (roomRatePercent(room, guest_count) / 100) * 100) / 100;
    const total_price = Math.round((base_price + gst_amount) * 100) / 100;

    // The availability check and the insert must be one atomic unit. Without
    // the transaction two guests hitting Book at the same moment both pass
    // the check and both get the room. The row lock makes the second request
    // wait until the first has committed, so it sees the new booking.
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [conflicts] = await conn.query(
        `SELECT booking_id
         FROM bookings
         WHERE room_id = ?
           AND status NOT IN ('cancelled','pending')
           AND check_in_date < ?
           AND check_out_date > ?
         LIMIT 1
         FOR UPDATE`,
        [room_id, check_out_date, check_in_date],
      );
      if (conflicts.length) {
        await conn.rollback();
        return res.status(409).json({
          error: "Selected dates are already booked for this room",
        });
      }

      const [blocked] = await conn.query(
        `SELECT blocked_date FROM room_blocked_dates
          WHERE room_id = ? AND blocked_date >= ? AND blocked_date < ? LIMIT 1`,
        [room_id, check_in_date, check_out_date],
      );
      if (blocked.length) {
        await conn.rollback();
        return res
          .status(400)
          .json({ error: "Room is blocked for one or more selected dates" });
      }

      const [result] = await conn.query(
        `INSERT INTO bookings (user_id,room_id,check_in_date,check_out_date,guest_count,total_price,taxable_amount,gst_amount,final_total,total_amount,status) VALUES (?,?,?,?,?,?,?,?,?,?,'confirmed')`,
        [
          user_id,
          room_id,
          check_in_date,
          check_out_date,
          guest_count || 1,
          base_price,
          base_price,
          gst_amount,
          total_price,
          total_price,
        ],
      );
      // inside the transaction, so the pool cannot see this row yet — stamp
      // on the same connection, before the commit
      await stampRoomGstRate(result.insertId, conn);
      await conn.commit();
      res.status(201).json({
        message: "Booking confirmed",
        booking_id: result.insertId,
        total_price,
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

app.post(
  "/api/admin/bookings/advance-order",
  requireManager,
  async (req, res) => {
    try {
      const {
        room_id,
        check_in_date,
        check_out_date,
        advance_amount,
        // The discount was missing from this route, so an online advance was
        // computed on the undiscounted tariff and Razorpay charged the guest
        // more than the screen showed.
        discount_applied = false,
        discount_amount = 0,
        gst_enabled = true,
      } = req.body;
      if (!room_id || !check_in_date || !check_out_date)
        return res.status(400).json({ error: "Missing required fields" });

      const amounts = await calculateBookingAmounts({
        room_id,
        check_in_date,
        check_out_date,
        advance_amount,
        guest_count: req.body.guest_count,
        discount_applied,
        discount_amount,
        gst_enabled,
        // staff route — walk-ins and late paperwork need past check-in dates
        allowPastDates: true,
      });
      const requestedGuests = Math.max(1, Number(req.body.guest_count) || 1);
      if (requestedGuests > Number(amounts.room.capacity || requestedGuests)) {
        return res.status(400).json({
          error: `This room allows up to ${amounts.room.capacity} guests`,
        });
      }

      // Refuse to take money for nights that are not available. Checking here
      // as well as at confirm time means the common case never reaches a
      // payment that has to be refunded.
      const conflict = await findDateConflict(db, {
        room_id,
        check_in_date,
        check_out_date,
      });
      if (conflict) {
        return res.status(409).json({ error: conflict });
      }

      const order = await razorpay.orders.create({
        amount: Math.round(amounts.advanceAmount * 100),
        currency: "INR",
        receipt: `ADV-${Date.now()}`,
        notes: {
          room_id: String(room_id),
          check_in_date,
          check_out_date,
          advance_amount: String(amounts.advanceAmount),
          created_by: String(req.user.user_id),
        },
      });

      res.json({
        razorpay_key: process.env.RAZORPAY_KEY_ID,
        order_id: order.id,
        currency: order.currency,
        ...amounts,
        room: undefined,
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
);

app.post(
  "/api/admin/bookings/advance-confirm",
  requireManager,
  async (req, res) => {
    try {
      const {
        room_id,
        check_in_date,
        check_out_date,
        guest_count,
        customer,
        vehicle_type = "none",
        advance_amount,
        pickup_location,
        dropoff_location,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        discount_applied = false,
        discount_amount = 0,
        gst_enabled = true,
      } = req.body;

      // ------------------------------------------------------------
      // 1. REQUIRED FIELDS
      // ------------------------------------------------------------
      if (
        !room_id ||
        !check_in_date ||
        !check_out_date ||
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          error: "Missing required fields",
        });
      }

      // ------------------------------------------------------------
      // 2. NORMALIZE ADVANCE AMOUNT
      //
      // Empty / null / undefined = Rs.0
      // 0 = valid
      // Positive number = valid
      // Negative / NaN = invalid
      // ------------------------------------------------------------
      const normalizedAdvanceAmount =
        advance_amount === undefined ||
        advance_amount === null ||
        String(advance_amount).trim() === ""
          ? 0
          : Number(advance_amount);

      if (
        !Number.isFinite(normalizedAdvanceAmount) ||
        normalizedAdvanceAmount < 0
      ) {
        return res.status(400).json({
          error: "Enter a valid advance amount",
        });
      }

      // ------------------------------------------------------------
      // 3. VERIFY RAZORPAY SIGNATURE
      // ------------------------------------------------------------
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({
          error: "Payment verification failed",
        });
      }

      // ------------------------------------------------------------
      // 4. VEHICLE VALIDATION
      // ------------------------------------------------------------
      const validVehicleTypes = [
        "none",
        "4-seater",
        "7-seater",
        "12-seater",
      ];

      if (!validVehicleTypes.includes(vehicle_type)) {
        return res.status(400).json({
          error: "Invalid vehicle type",
        });
      }

      // ------------------------------------------------------------
      // 5. CALCULATE BOOKING AMOUNTS
      // ------------------------------------------------------------
      const amounts = await calculateBookingAmounts({
        room_id,
        check_in_date,
        check_out_date,
        advance_amount: normalizedAdvanceAmount,
        guest_count,
        discount_applied,
        discount_amount,
        gst_enabled: gst_enabled !== false,
        allowPastDates: true,
      });

      // ------------------------------------------------------------
      // 6. GUEST COUNT VALIDATION
      // ------------------------------------------------------------
      const requestedGuests = Math.max(
        1,
        Number(guest_count) || 1,
      );

      if (
        requestedGuests >
        Number(amounts.room.capacity || requestedGuests)
      ) {
        return res.status(400).json({
          error: `This room allows up to ${amounts.room.capacity} guests`,
        });
      }

      // ------------------------------------------------------------
      // 7. FETCH RAZORPAY ORDER
      // ------------------------------------------------------------
      const paidOrder = await razorpay.orders.fetch(
        razorpay_order_id,
      );

      const orderNotes = paidOrder.notes || {};

      if (
        String(orderNotes.room_id || "") !== String(room_id) ||
        orderNotes.check_in_date !== check_in_date ||
        orderNotes.check_out_date !== check_out_date
      ) {
        return res.status(400).json({
          error: "Paid order does not match this booking",
        });
      }

      // ------------------------------------------------------------
      // 8. CHECK PAYMENT STATUS
      // ------------------------------------------------------------
      if (paidOrder.status !== "paid") {
        return res.status(400).json({
          error: "This payment has not completed",
        });
      }

      // ------------------------------------------------------------
      // 9. DUPLICATE PAYMENT CHECK
      // ------------------------------------------------------------
      const [dupe] = await db.query(
        `
          SELECT booking_id
          FROM bookings
          WHERE advance_order_id = ?
          LIMIT 1
        `,
        [razorpay_order_id],
      );

      if (dupe.length) {
        return res.json({
          message: "Booking already confirmed for this payment",
          booking_id: dupe[0].booking_id,
          duplicate: true,
        });
      }

      // ------------------------------------------------------------
      // 10. ROOM DATE CONFLICT CHECK
      // ------------------------------------------------------------
      const conflict = await findDateConflict(db, {
        room_id,
        check_in_date,
        check_out_date,
      });

      if (conflict) {
        return res.status(409).json({
          error:
            `${conflict}. The payment succeeded — refund it from the Razorpay dashboard.`,
          razorpay_payment_id,
        });
      }

      // ------------------------------------------------------------
      // 11. VERIFY RAZORPAY AMOUNT
      // ------------------------------------------------------------
      if (
        Number(paidOrder.amount) !==
        Math.round(amounts.advanceAmount * 100)
      ) {
        return res.status(400).json({
          error: "Advance amount does not match paid order",
        });
      }

      // ------------------------------------------------------------
      // 12. CREATE / FIND GUEST
      // ------------------------------------------------------------
      const userId = await findOrCreateGuestUser(
        customer || {},
      );

      // ------------------------------------------------------------
      // 13. GST NUMBER
      // ------------------------------------------------------------
      const gstNumberRaw = String(
        customer?.gst_number || "",
      )
        .trim()
        .toUpperCase();

      if (
        gstNumberRaw &&
        !GSTIN_REGEX.test(gstNumberRaw)
      ) {
        return res.status(400).json({
          error: "Enter a valid 15-character GSTIN",
        });
      }

      const gstNumber = gstNumberRaw || null;

      // ------------------------------------------------------------
      // 14. CUSTOMER ADDRESS
      // ------------------------------------------------------------
      const customerAddress =
        String(
          customer?.customer_address ||
            customer?.address ||
            "",
        )
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 255) || null;

      // ------------------------------------------------------------
      // 15. INSERT BOOKING
      // ------------------------------------------------------------
      const [result] = await db.query(
        `
          INSERT INTO bookings (
            user_id,
            room_id,
            check_in_date,
            check_out_date,
            guest_count,

            total_price,
            taxable_amount,
            gst_amount,
            final_total,
            total_amount,

            advance_amount,
            advance_paid,
            balance_paid,
            remaining_amount,

            payment_status,
            payment_id,
            advance_payment_id,
            advance_order_id,

            payment_method,
            booking_source,

            vehicle_type,
            vehicle_price,
            vehicle_status,

            pickup_location,
            dropoff_location,

            discount_applied,
            discount_amount,

            gst_enabled,
            gst_number,

            customer_address,
            status
          )
          VALUES (
            ?,?,?,?,?,?,?,?,?,?,
            ?,?,?,?,
            ?,?,?,?,
            ?,?,
            ?,?,?,
            ?,?,
            ?,?,
            ?,?,
            ?,?,
            ?,
            'confirmed'
          )
        `,
        [
          userId,
          room_id,
          check_in_date,
          check_out_date,
          requestedGuests,

          amounts.roomSubtotal,
          amounts.taxableAmount,
          amounts.gstAmount,
          amounts.totalAmount,
          amounts.totalAmount,

          amounts.advanceAmount,
          amounts.advanceAmount,
          0,
          amounts.remainingAmount,

          amounts.remainingAmount > 0
            ? "PARTIALLY_PAID"
            : "PAID",

          razorpay_payment_id,
          razorpay_payment_id,
          razorpay_order_id,

          "Razorpay Advance",

          req.user.role === "admin"
            ? "ADMIN_ADVANCE"
            : "MANAGER_ADVANCE",

          vehicle_type,
          0,

          vehicle_type === "none"
            ? "not_required"
            : "pending",

          pickup_location || null,
          dropoff_location || null,

          amounts.discountAmount > 0 ? 1 : 0,
          amounts.discountAmount,

          amounts.gstEnabled ? 1 : 0,
          gstNumber,

          customerAddress,
        ],
      );

      // ------------------------------------------------------------
      // 16. INVOICE
      // ------------------------------------------------------------
      const bookingId = result.insertId;
      // freeze the room's GST rate onto this booking, before the invoice is
      // built from it
      await stampRoomGstRate(bookingId);

      loadBookingForInvoice(bookingId)
        .then((booking) => {
          if (booking) {
            return sendAdvanceInvoiceEmail(booking);
          }
        })
        .catch((emailErr) => {
          console.error(
            "Advance booking invoice email error:",
            emailErr.message,
          );
        });

      // ------------------------------------------------------------
      // 17. RESPONSE
      // ------------------------------------------------------------
      return res.status(201).json({
        message: "Booking confirmed with advance payment",

        booking_id: bookingId,

        totalAmount: amounts.totalAmount,

        advanceAmount: amounts.advanceAmount,

        advancePaid: amounts.advanceAmount,

        remainingAmount: amounts.remainingAmount,

        paymentStatus:
          amounts.remainingAmount > 0
            ? "PARTIALLY_PAID"
            : "PAID",

        bookingStatus: "CONFIRMED",
      });
    } catch (err) {
      console.error(
        "Advance booking error:",
        err,
      );

      return res.status(err.status || 500).json({
        error:
          err.message ||
          "Failed to confirm advance booking",
      });
    }
  },
);


// ================================================================
// MANUAL CASH / ONLINE ADVANCE CONFIRM
// ================================================================

app.post(
  "/api/admin/bookings/manual-advance-confirm",
  requireManager,
  async (req, res) => {
    try {
      const {
        room_id,
        check_in_date,
        check_out_date,
        guest_count,
        customer,
        vehicle_type = "none",
        advance_amount,
        payment_mode,
        discount_applied = false,
        discount_amount = 0,
        pickup_location,
        dropoff_location,
        gst_enabled = true,
      } = req.body;

      // ============================================================
      // 1. REQUIRED BOOKING FIELDS
      // ============================================================

      if (
        !room_id ||
        !check_in_date ||
        !check_out_date
      ) {
        return res.status(400).json({
          error: "Missing required fields",
        });
      }

      // ============================================================
      // 2. ADVANCE AMOUNT
      //
      // Empty = 0
      // null  = 0
      // undefined = 0
      // "0" = 0
      // 0 = 0
      // 403 = 403
      // ============================================================

      let normalizedAdvanceAmount = 0;

      if (
        advance_amount !== undefined &&
        advance_amount !== null &&
        String(advance_amount).trim() !== ""
      ) {
        normalizedAdvanceAmount = Number(
          advance_amount
        );
      }

      // Validate advance amount
      if (
        !Number.isFinite(normalizedAdvanceAmount) ||
        normalizedAdvanceAmount < 0
      ) {
        return res.status(400).json({
          error: "Enter a valid advance amount",
        });
      }

      // Keep only 2 decimal places
      normalizedAdvanceAmount =
        Math.round(
          normalizedAdvanceAmount * 100
        ) / 100;

      // ============================================================
      // 3. PAYMENT MODE
      // ============================================================

      const selectedPaymentMode =
        MANUAL_ADVANCE_PAYMENT_MODES[
          String(payment_mode || "")
            .trim()
            .toLowerCase()
        ];

      if (!selectedPaymentMode) {
        return res.status(400).json({
          error:
            "Select Cash, Online or Other payment mode",
        });
      }

      // ============================================================
      // 4. ONLINE PAYMENT MUST HAVE ADVANCE
      //
      // Cash can be Rs.0
      // Online cannot be Rs.0
      // ============================================================

      if (
        selectedPaymentMode === "Online" &&
        normalizedAdvanceAmount <= 0
      ) {
        return res.status(400).json({
          error:
            "Enter a valid advance amount",
        });
      }

      // ============================================================
      // 5. VEHICLE VALIDATION
      // ============================================================

      const validVehicleTypes = [
        "none",
        "4-seater",
        "7-seater",
        "12-seater",
      ];

      if (
        !validVehicleTypes.includes(
          vehicle_type
        )
      ) {
        return res.status(400).json({
          error: "Invalid vehicle type",
        });
      }

      // ============================================================
      // 6. CALCULATE BOOKING AMOUNTS
      // ============================================================

      const amounts =
        await calculateBookingAmounts({
          room_id,
          check_in_date,
          check_out_date,

          // IMPORTANT
          // Empty Cash = 0
          advance_amount:
            normalizedAdvanceAmount,

          guest_count,

          discount_applied,

          discount_amount,

          gst_enabled:
            gst_enabled !== false,

          // Admin / Manager can create
          // booking with past dates
          allowPastDates: true,
        });

      // ============================================================
      // 7. GUEST COUNT
      // ============================================================

      const requestedGuests = Math.max(
        1,
        Number(guest_count) || 1
      );

      if (
        requestedGuests >
        Number(
          amounts.room.capacity ||
            requestedGuests
        )
      ) {
        return res.status(400).json({
          error: `This room allows up to ${amounts.room.capacity} guests`,
        });
      }

      // ============================================================
      // 8. ADVANCE CANNOT EXCEED TOTAL
      //
      // Extra safety check
      // ============================================================

      if (
        normalizedAdvanceAmount >
        Number(amounts.totalAmount || 0)
      ) {
        return res.status(400).json({
          error:
            "Advance amount cannot exceed the full amount",
        });
      }

      // ============================================================
      // 9. ROOM AVAILABILITY
      // ============================================================

      const conflict =
        await findDateConflict(db, {
          room_id,
          check_in_date,
          check_out_date,
        });

      if (conflict) {
        return res.status(409).json({
          error: conflict,
        });
      }

      // ============================================================
      // 10. FIND / CREATE CUSTOMER
      // ============================================================

      const userId =
        await findOrCreateGuestUser(
          customer || {}
        );

      // ============================================================
      // 11. MANUAL PAYMENT ID
      // ============================================================

      const manualPaymentId =
        `${selectedPaymentMode.toUpperCase()}-${Date.now()}-${req.user.user_id}`;

      // ============================================================
      // 12. GST NUMBER
      // ============================================================

      const gstNumberRaw = String(
        customer?.gst_number || ""
      )
        .trim()
        .toUpperCase();

      if (
        gstNumberRaw &&
        !GSTIN_REGEX.test(gstNumberRaw)
      ) {
        return res.status(400).json({
          error:
            "Enter a valid 15-character GSTIN",
        });
      }

      const gstNumber =
        gstNumberRaw || null;

      // ============================================================
      // 13. CUSTOMER ADDRESS
      // ============================================================

      const customerAddress =
        String(
          customer?.customer_address ||
            customer?.address ||
            ""
        )
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 255) || null;

      // ============================================================
      // 14. INSERT BOOKING
      // ============================================================

      const [result] =
        await db.query(
          `
          INSERT INTO bookings (
            user_id,
            room_id,
            check_in_date,
            check_out_date,
            guest_count,

            total_price,
            taxable_amount,
            gst_amount,
            final_total,
            total_amount,

            discount_applied,
            discount_amount,

            advance_amount,
            advance_paid,
            balance_paid,
            remaining_amount,

            payment_status,
            payment_id,
            advance_payment_id,
            advance_order_id,

            payment_method,
            booking_source,

            vehicle_type,
            vehicle_price,
            vehicle_status,

            pickup_location,
            dropoff_location,

            gst_enabled,
            gst_number,

            customer_address,
            status
          )
          VALUES (
            ?, ?, ?, ?, ?,

            ?, ?, ?, ?, ?,

            ?, ?,

            ?, ?, ?, ?,

            ?, ?, ?, ?,

            ?, ?,

            ?, ?, ?,

            ?, ?,

            ?, ?,

            ?,
            'confirmed'
          )
          `,
          [
            // ------------------------------------------------------
            // BOOKING
            // ------------------------------------------------------

            userId,
            room_id,
            check_in_date,
            check_out_date,
            requestedGuests,

            // ------------------------------------------------------
            // AMOUNTS
            // ------------------------------------------------------

            amounts.roomSubtotal,
            amounts.taxableAmount,
            amounts.gstAmount,
            amounts.totalAmount,
            amounts.totalAmount,

            // ------------------------------------------------------
            // DISCOUNT
            // ------------------------------------------------------

            amounts.discountApplied
              ? 1
              : 0,

            amounts.discountAmount,

            // ------------------------------------------------------
            // ADVANCE
            //
            // IMPORTANT:
            // Use normalizedAdvanceAmount
            // ------------------------------------------------------

            normalizedAdvanceAmount,
            normalizedAdvanceAmount,

            // Balance paid initially 0
            0,

            // Remaining balance
            amounts.remainingAmount,

            // ------------------------------------------------------
            // PAYMENT
            // ------------------------------------------------------

            amounts.remainingAmount > 0
              ? "PARTIALLY_PAID"
              : "PAID",

            manualPaymentId,
            manualPaymentId,
            null,

            `${selectedPaymentMode} Advance`,

            // ------------------------------------------------------
            // BOOKING SOURCE
            // ------------------------------------------------------

            req.user.role === "admin"
              ? "ADMIN_MANUAL_ADVANCE"
              : "MANAGER_MANUAL_ADVANCE",

            // ------------------------------------------------------
            // VEHICLE
            // ------------------------------------------------------

            vehicle_type,
            0,

            vehicle_type === "none"
              ? "not_required"
              : "pending",

            // ------------------------------------------------------
            // LOCATIONS
            // ------------------------------------------------------

            pickup_location || null,
            dropoff_location || null,

            // ------------------------------------------------------
            // GST
            // ------------------------------------------------------

            amounts.gstEnabled
              ? 1
              : 0,

            gstNumber,

            // ------------------------------------------------------
            // ADDRESS
            // ------------------------------------------------------

            customerAddress,
          ]
        );

      // ============================================================
      // 15. BOOKING ID
      // ============================================================

      const bookingId =
        result.insertId;

      // freeze the room's GST rate onto this booking, before the invoice is
      // built from it
      await stampRoomGstRate(bookingId);

      // ============================================================
      // 16. SEND INVOICE EMAIL
      // ============================================================

      loadBookingForInvoice(
        bookingId
      )
        .then((booking) => {
          if (booking) {
            return sendAdvanceInvoiceEmail(
              booking
            );
          }
        })
        .catch((emailErr) => {
          console.error(
            "Manual booking invoice email error:",
            emailErr.message
          );
        });

      // ============================================================
      // 17. SUCCESS RESPONSE
      // ============================================================

      return res.status(201).json({
        message:
          "Booking confirmed with manual advance payment",

        booking_id:
          bookingId,

        totalAmount:
          amounts.totalAmount,

        discountApplied:
          amounts.discountApplied,

        discountAmount:
          amounts.discountAmount,

        discountedRoomAmount:
          amounts.discountedRoomAmount,

        // IMPORTANT
        // This will be 0 when Cash advance is empty
        advanceAmount:
          normalizedAdvanceAmount,

        advancePaid:
          normalizedAdvanceAmount,

        remainingAmount:
          amounts.remainingAmount,

        invoiceEmail:
          customer?.email || null,

        paymentMode:
          selectedPaymentMode,

        paymentStatus:
          amounts.remainingAmount > 0
            ? "PARTIALLY_PAID"
            : "PAID",

        bookingStatus:
          "CONFIRMED",
      });
    } catch (err) {
      console.error(
        "Manual advance booking error:",
        err
      );

      return res.status(
        err.status || 500
      ).json({
        error:
          err.message ||
          "Failed to confirm manual booking",
      });
    }
  }
);

app.post(
  "/api/admin/bookings/manual-advance-confirm",
  requireManager,
  async (req, res) => {
    try {
      const {
        room_id,
        check_in_date,
        check_out_date,
        guest_count,
        customer,
        vehicle_type = "none",
        advance_amount,
        payment_mode,
        discount_applied = false,
        discount_amount = 0,
        pickup_location,
        dropoff_location,
      } = req.body;

      if (!room_id || !check_in_date || !check_out_date) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (
        advance_amount === undefined ||
        advance_amount === null ||
        String(advance_amount).trim() === ""
      ) {
        return res.status(400).json({ error: "Advance amount is required" });
      }

      const selectedPaymentMode =
        MANUAL_ADVANCE_PAYMENT_MODES[
          String(payment_mode || "")
            .trim()
            .toLowerCase()
        ];
      if (!selectedPaymentMode) {
        return res
          .status(400)
          .json({ error: "Select Cash, Online or Other payment mode" });
      }

      const validVehicleTypes = ["none", "4-seater", "7-seater", "12-seater"];
      if (!validVehicleTypes.includes(vehicle_type)) {
        return res.status(400).json({ error: "Invalid vehicle type" });
      }

     const normalizedAdvanceAmount =
  advance_amount === undefined ||
  advance_amount === null ||
  String(advance_amount).trim() === ""
    ? 0
    : Number(advance_amount);

if (!Number.isFinite(normalizedAdvanceAmount) || normalizedAdvanceAmount < 0) {
  return res.status(400).json({
    error: "Enter a valid advance amount",
  });
}

const amounts = await calculateBookingAmounts({
  room_id,
  check_in_date,
  check_out_date,
  advance_amount: normalizedAdvanceAmount,
  guest_count,
  discount_applied,
  discount_amount,
  gst_enabled: req.body.gst_enabled !== false,
  allowPastDates: true,
});
      const requestedGuests = Math.max(1, Number(guest_count) || 1);
      if (requestedGuests > Number(amounts.room.capacity || requestedGuests)) {
        return res.status(400).json({
          error: `This room allows up to ${amounts.room.capacity} guests`,
        });
      }

      // This route had no availability check at all, so two members of staff
      // could sell the same room for the same nights, and a room blocked for
      // maintenance could still be booked from the admin screen.
      const conflict = await findDateConflict(db, {
        room_id,
        check_in_date,
        check_out_date,
      });
      if (conflict) {
        return res.status(409).json({ error: conflict });
      }

      const userId = await findOrCreateGuestUser(customer || {});
      const manualPaymentId = `${selectedPaymentMode.toUpperCase()}-${Date.now()}-${req.user.user_id}`;

      const gstNumberRaw = String(customer?.gst_number || "")
        .trim()
        .toUpperCase();
      if (gstNumberRaw && !GSTIN_REGEX.test(gstNumberRaw)) {
        return res
          .status(400)
          .json({ error: "Enter a valid 15-character GSTIN" });
      }
      const gstNumber = gstNumberRaw || null;

      // Optional billing address. Collapsed to single spaces so a pasted
      // multi-line address prints as one clean block on the invoice.
      const customerAddress =
        String(customer?.customer_address || customer?.address || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 255) || null;

      const [result] = await db.query(
        `INSERT INTO bookings (
    user_id, room_id, check_in_date, check_out_date, guest_count,
    total_price, taxable_amount, gst_amount, final_total, total_amount,
    discount_applied, discount_amount,
    advance_amount, advance_paid, balance_paid, remaining_amount,
    payment_status, payment_id, advance_payment_id, advance_order_id,
    payment_method, booking_source, vehicle_type, vehicle_price,
    vehicle_status, pickup_location, dropoff_location, gst_enabled, gst_number,
    customer_address, status
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'confirmed')`,
        [
          userId,
          room_id,
          check_in_date,
          check_out_date,
          requestedGuests,
          amounts.roomSubtotal,
          amounts.taxableAmount,
          amounts.gstAmount,
          amounts.totalAmount,
          amounts.totalAmount,
          amounts.discountApplied ? 1 : 0,
          amounts.discountAmount,
          amounts.advanceAmount,
          amounts.advanceAmount,
          0,
          amounts.remainingAmount,
          amounts.remainingAmount > 0 ? "PARTIALLY_PAID" : "PAID",
          manualPaymentId,
          manualPaymentId,
          null,
          `${selectedPaymentMode} Advance`,
          req.user.role === "admin"
            ? "ADMIN_MANUAL_ADVANCE"
            : "MANAGER_MANUAL_ADVANCE",
          vehicle_type,
          0,
          vehicle_type === "none" ? "not_required" : "pending",
          pickup_location || null,
          dropoff_location || null,
          amounts.gstEnabled ? 1 : 0,
          gstNumber,
          customerAddress,
        ],
      );

      const bookingId = result.insertId;
      // freeze the room's GST rate onto this booking, before the invoice is
      // built from it
      await stampRoomGstRate(bookingId);
      loadBookingForInvoice(bookingId)
        .then((booking) => booking && sendAdvanceInvoiceEmail(booking))
        .catch((emailErr) =>
          console.error(
            "Manual booking invoice email error:",
            emailErr.message,
          ),
        );

      res.status(201).json({
        message: "Booking confirmed with manual advance payment",
        booking_id: bookingId,
        totalAmount: amounts.totalAmount,
        discountApplied: amounts.discountApplied,
        discountAmount: amounts.discountAmount,
        discountedRoomAmount: amounts.discountedRoomAmount,
        advanceAmount: amounts.advanceAmount,
        advancePaid: amounts.advanceAmount,
        remainingAmount: amounts.remainingAmount,
        invoiceEmail: customer?.email,
        paymentMode: selectedPaymentMode,
        paymentStatus: amounts.remainingAmount > 0 ? "PARTIALLY_PAID" : "PAID",
        bookingStatus: "CONFIRMED",
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
);

// Adds a column if it is missing. The startup migration normally handles this,
// but it only runs at boot — if the server was not restarted after an update,
// writes to a missing column are silently dropped. Calling this from the routes
// that need the columns makes them self-healing.
const PAYMENT_TRACKING_COLUMNS = [
  "advance_payment_mode VARCHAR(40) DEFAULT NULL",
  "advance_paid_at DATETIME DEFAULT NULL",
  "balance_payment_mode VARCHAR(40) DEFAULT NULL",
  "balance_paid_at DATETIME DEFAULT NULL",
  "addon_payment_mode VARCHAR(40) DEFAULT NULL",
  "addon_paid_at DATETIME DEFAULT NULL",
  "checkout_discount_applied TINYINT DEFAULT 0",
  "checkout_discount_amount DECIMAL(10,2) DEFAULT 0",
  "checkout_discount_reason VARCHAR(255) DEFAULT NULL",
  "checkout_discount_at DATETIME DEFAULT NULL",
  "checkout_discount_by INT DEFAULT NULL",
  // Razorpay references for a balance settled online, so the payment can be
  // traced back from the booking without opening the Razorpay dashboard.
  "balance_payment_id VARCHAR(80) DEFAULT NULL",
  "balance_order_id VARCHAR(80) DEFAULT NULL",
];

let paymentColumnsChecked = false;
async function ensurePaymentColumns() {
  if (paymentColumnsChecked) return;
  for (const col of PAYMENT_TRACKING_COLUMNS) {
    try {
      await db.query(`ALTER TABLE bookings ADD COLUMN ${col}`);
      console.log(`✅ Added missing column: ${col.split(" ")[0]}`);
    } catch (e) {
      // already exists — expected on every call after the first
    }
  }
  paymentColumnsChecked = true;
}

/*
 * Reject a stay that overlaps an existing booking or a blocked date.
 *
 * POST /api/bookings does this inside a transaction, but the two admin
 * booking routes did not check at all — two members of staff could sell the
 * same room for the same nights, and a room blocked for maintenance could
 * still be booked from the admin screen.
 *
 * Pass a connection when the caller is inside a transaction so the SELECT
 * takes part in the same lock.
 */
async function findDateConflict(
  conn,
  { room_id, check_in_date, check_out_date, lock = false },
) {
  const [conflicts] = await conn.query(
    `SELECT booking_id
       FROM bookings
      WHERE room_id = ?
        AND status NOT IN ('cancelled','pending')
        AND check_in_date < ?
        AND check_out_date > ?
      LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [room_id, check_out_date, check_in_date],
  );
  if (conflicts.length) {
    return "Selected dates are already booked for this room";
  }

  const [blocked] = await conn.query(
    `SELECT blocked_date FROM room_blocked_dates
      WHERE room_id = ? AND blocked_date >= ? AND blocked_date < ? LIMIT 1`,
    [room_id, check_in_date, check_out_date],
  );
  if (blocked.length) {
    return "Room is blocked for one or more selected dates";
  }

  return null;
}

/*
 * What the guest still owes on a booking.
 *
 * Shared by the manual "Mark as Paid" route and by the online balance
 * payment routes below, so the amount Razorpay charges is always exactly the
 * amount the manual route would have recorded.
 */
function outstandingBalance(booking) {
  const currentBalancePaid = Number(booking.balance_paid || 0);
  const advancePaid = Number(booking.advance_paid || 0);

  // PRE-TAX DISCOUNT MODEL: a checkout discount removes both the discounted
  // amount and the GST that was charged on it, so its effect is discount x 1.18.
  const checkoutDiscountBase =
    Number(
      booking.checkout_discount_applied ? booking.checkout_discount_amount : 0,
    ) || 0;
  // ADDITIONAL: on a no-GST booking there is no tax to reverse, so a
  // discount reduces the balance one-for-one. Normal bookings are unchanged.
  const gstOff = isGstDisabled(booking);
  // PER-ROOM GST: a checkout discount comes off the ROOM, so the tax it
  // reverses is the room's rate — the one frozen onto this booking.
  const roomRate = roomGstFractionOf(booking);
  const checkoutDiscountImpact = gstOff
    ? Math.round(checkoutDiscountBase * 100) / 100
    : Math.round(checkoutDiscountBase * (1 + roomRate) * 100) / 100;

  const bookingDiscount =
    Number(booking.discount_applied ? booking.discount_amount : 0) || 0;
  const taxableFallback = Math.max(
    0,
    Number(booking.total_price || 0) -
      bookingDiscount +
      Number(booking.addon_charges || 0),
  );
  /*
   * PER-SERVICE GST in the fallback too: the room at GST_RATE, add-ons at
   * whatever addon_gst_amount says. That column is NULL only on a booking
   * written before it existed, and the fallback below is then the old flat
   * figure, so nothing historical shifts.
   */
  const fallbackRoomTaxable = Math.max(
    0,
    Number(booking.total_price || 0) - bookingDiscount,
  );
  const fallbackAddonGst =
    booking.addon_gst_amount != null
      ? Number(booking.addon_gst_amount)
      : // the LEGACY add-on rate, deliberately not the room's — add-ons on a
        // pre-feature booking were charged 12% whatever the room charges now
        (Number(booking.addon_charges || 0) * LEGACY_ADDON_GST_PERCENT) / 100;
  const roomWithGst = gstOff
    ? Math.round(taxableFallback * 100) / 100
    : Math.round(
        (taxableFallback + fallbackRoomTaxable * roomRate + fallbackAddonGst) *
          100,
      ) / 100;
  const totalAmount = Number(
    booking.total_amount || booking.final_total || roomWithGst,
  );

  // trust the stored column, but fall back to the derived figure when it is
  // stale. total_amount already has the checkout discount applied, so it must
  // not be subtracted a second time.
  const storedRemaining = Number(booking.remaining_amount || 0);
  const discountAlreadyInTotal = Number(booking.total_amount || 0) > 0;
  const derivedRemaining = Math.max(
    0,
    Math.round(
      (totalAmount -
        advancePaid -
        currentBalancePaid -
        (discountAlreadyInTotal ? 0 : checkoutDiscountImpact)) *
        100,
    ) / 100,
  );

  return {
    advancePaid,
    currentBalancePaid,
    totalAmount,
    remaining: storedRemaining > 0 ? storedRemaining : derivedRemaining,
  };
}

/*
 * ONLINE BALANCE — step 1: create the Razorpay order.
 *
 * The amount is computed server-side from the booking, never taken from the
 * request, so the browser cannot ask to be charged less than is owed.
 */
app.post(
  "/api/bookings/:id/balance-order",
  requireManager,
  async (req, res, next) => {
    try {
      await ensurePaymentColumns();

      const [rows] = await db.query(
        "SELECT * FROM bookings WHERE booking_id=?",
        [req.params.id],
      );

      if (!rows.length) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const booking = rows[0];

      if (booking.status === "cancelled") {
        return res.status(400).json({
          error: "Cannot collect payment on a cancelled booking",
        });
      }

      // -----------------------------
      // Same calculation as frontend
      // -----------------------------
      /*
       * PER-ROOM GST. This used to be a hardcoded `const GST_RATE = 0.12`
       * shadowing the module constant. It now reads the rate frozen onto this
       * booking, so a stay sold at 18% is charged the balance it actually
       * owes rather than 12% of it.
       */
      const GST_RATE = roomGstFractionOf(booking);

      const roomCharges = Number(booking.total_price || 0);

      const discountAmount =
        Number(
          booking.discount_applied
            ? booking.discount_amount
            : 0,
        ) || 0;

      const vehiclePrice = Number(booking.vehicle_price || 0);
      const addonTotal = Number(booking.addon_charges || 0);

      const taxableRoom = Math.max(
        0,
        Math.round((roomCharges - discountAmount) * 100) / 100,
      );

      const gstEnabled =
        Number(booking.gst_enabled ?? 1) !== 0;

      /*
       * PER-SERVICE GST: the room is taxed at GST_RATE, each add-on at its
       * own configured rate. addon_gst_amount is written by
       * recalcBookingTotals; it is NULL only on a booking last touched before
       * that column existed, and the fallback reproduces the old flat figure
       * exactly for those.
       */
      const addonGst =
        booking.addon_gst_amount != null
          ? Math.round(Number(booking.addon_gst_amount) * 100) / 100
          : // Deliberately the LEGACY add-on rate, not the room's. Add-ons on
            // a pre-feature booking were charged 12% whatever the room's rate
            // is today, and this fallback has to reproduce that figure.
            Math.round((addonTotal * LEGACY_ADDON_GST_PERCENT) / 100 * 100) / 100;

      const taxes =
        Math.round(
          (taxableRoom * GST_RATE + addonGst) * 100,
        ) / 100;

      const chargedTaxes = gstEnabled ? taxes : 0;

      const totalAmount = Math.max(
        0,
        Math.round(
          (
            taxableRoom +
            addonTotal +
            vehiclePrice +
            chargedTaxes
          ) * 100,
        ) / 100,
      );

      const advancePaid = Math.max(
        0,
        Number(booking.advance_paid) || 0,
      );

      const balancePaid = Math.max(
        0,
        Number(booking.balance_paid) || 0,
      );

      const alreadyPaid =
        Math.round(
          (advancePaid + balancePaid) * 100,
        ) / 100;

      const roomRemaining = Math.max(
        0,
        Math.round(
          (totalAmount - alreadyPaid) * 100,
        ) / 100,
      );

      // Checkout discount
      const checkoutDiscount = Math.min(
        Math.max(
          0,
          Number(booking.checkout_discount_amount) || 0,
        ),
        gstEnabled
          ? Math.round(
              (roomRemaining / (1 + GST_RATE)) * 100,
            ) / 100
          : roomRemaining,
      );

      const checkoutDiscountGst = gstEnabled
        ? Math.round(
            checkoutDiscount * GST_RATE * 100,
          ) / 100
        : 0;

      const checkoutDiscountTotalImpact =
        Math.round(
          (
            checkoutDiscount +
            checkoutDiscountGst
          ) * 100,
        ) / 100;

      const finalRoomRemaining = Math.max(
        0,
        Math.round(
          (
            roomRemaining -
            checkoutDiscountTotalImpact
          ) * 100,
        ) / 100,
      );

      // Unpaid addons — each at its own rate
      let unpaidAddonTotal = 0;
      let unpaidAddonGstRaw = 0;

      try {
        const unpaid = await getAddonTotals(req.params.id);
        unpaidAddonTotal = unpaid.unpaidTaxable;
        unpaidAddonGstRaw = unpaid.unpaidGst;
      } catch {
        unpaidAddonTotal = 0;
        unpaidAddonGstRaw = 0;
      }

      const unpaidAddonGst = gstEnabled ? unpaidAddonGstRaw : 0;

     const finalRemaining = Math.max(
  0,
  Math.round(finalRoomRemaining * 100) / 100
);

      if (finalRemaining <= 0) {
        return res.status(400).json({
          error: "Nothing left to pay",
        });
      }

      // -----------------------------
      // Razorpay amount = FINAL BALANCE
      // -----------------------------
      const order = await razorpay.orders.create({
        amount: Math.round(finalRemaining * 100),
        currency: "INR",
        receipt: `BAL-${req.params.id}-${Date.now()}`,
        notes: {
          booking_id: String(req.params.id),
          purpose: "balance",
          collected_by: String(req.user.user_id),
          final_amount: String(finalRemaining),
        },
      });

      res.json({
        razorpay_key: process.env.RAZORPAY_KEY_ID,
        order_id: order.id,
        currency: order.currency,
        amount: finalRemaining,
      });
    } catch (err) {
      next(err);
    }
  },
);

/*
 * ONLINE BALANCE — step 2: verify the signature, then settle the booking.
 *
 * Nothing is written until the signature checks out, so a failed or abandoned
 * payment can never mark a booking as paid.
 */
app.post(
  "/api/bookings/:id/balance-verify",
  requireManager,
  async (req, res, next) => {
    try {
      await ensurePaymentColumns();
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body || {};

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing payment details" });
      }

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: "Payment verification failed" });
      }

      const [rows] = await db.query(
        "SELECT * FROM bookings WHERE booking_id=?",
        [req.params.id],
      );
      if (!rows.length)
        return res.status(404).json({ error: "Booking not found" });
      const booking = rows[0];

      // The order must belong to THIS booking, otherwise a payment for one
      // stay could be replayed to settle another.
      const paidOrder = await razorpay.orders.fetch(razorpay_order_id);
      if (String(paidOrder.notes?.booking_id || "") !== String(req.params.id)) {
        return res
          .status(400)
          .json({ error: "This payment belongs to a different booking" });
      }

      // An order exists from the moment it is created. Only a paid one settles
      // a booking.
      if (paidOrder.status !== "paid") {
        return res
          .status(400)
          .json({ error: "This payment has not completed" });
      }

      /*
       * REPLAY PROTECTION.
       *
       * A double-click, a browser retry or a resent request would otherwise run
       * this handler twice and add the same money to balance_paid each time,
       * leaving the booking showing more collected than the guest ever paid.
       * The order id is recorded on the booking, so a repeat is recognised and
       * answered with the result of the first run.
       */
      if (
        String(booking.balance_order_id || "") === String(razorpay_order_id)
      ) {
        return res.json({
          message: "Balance already collected",
          balance_paid: Number(booking.balance_paid || 0),
          payment_id: booking.balance_payment_id,
          payment_status: "PAID",
          duplicate: true,
        });
      }

      const { currentBalancePaid } = outstandingBalance(booking);
      const amountPaid =
        Math.round((Number(paidOrder.amount) / 100) * 100) / 100;
      const newBalancePaid =
        Math.round((currentBalancePaid + amountPaid) * 100) / 100;

      await db.query(
        `UPDATE bookings
          SET balance_paid = ?,
              remaining_amount = 0,
              payment_status = 'PAID',
              balance_payment_mode = ?,
              balance_payment_id = ?,
              balance_order_id = ?,
              balance_paid_at = NOW(),
              advance_payment_mode = COALESCE(advance_payment_mode, payment_method),
              advance_paid_at = COALESCE(advance_paid_at, created_at)
        WHERE booking_id = ?`,
        [
          newBalancePaid,
          String(req.body?.payment_mode || "Online Payment").slice(0, 40),
          razorpay_payment_id,
          razorpay_order_id,
          req.params.id,
        ],
      );

      // the money lands on the folio as its own line
      await postFolioPayment(
        req.params.id,
        amountPaid,
        "Balance payment",
        String(req.body?.payment_mode || "Online Payment").slice(0, 40),
        razorpay_payment_id,
      );

      res.json({
        message: "Balance collected",
        balance_paid: newBalancePaid,
        amount_paid: amountPaid,
        payment_id: razorpay_payment_id,
        payment_status: "PAID",
      });
    } catch (err) {
      next(err);
    }
  },
);

app.patch(
  "/api/bookings/:id/balance-paid",
  requireManager,
  async (req, res) => {
    try {
      await ensurePaymentColumns();

      const [rows] = await db.query(
        "SELECT * FROM bookings WHERE booking_id=?",
        [req.params.id],
      );
      if (!rows.length)
        return res.status(404).json({ error: "Booking not found" });

      const booking = rows[0];

      // Same helper the online balance routes use, so a cash settlement and a
      // Razorpay settlement can never disagree about what was owed. This block
      // used to be a copy of that logic and had already started to drift.
      const { currentBalancePaid, remaining } = outstandingBalance(booking);
      const newBalancePaid =
        Math.round((currentBalancePaid + remaining) * 100) / 100;

      // how the balance was collected — the time is stamped by MySQL itself so
      // there is no driver or timezone conversion to get wrong
      const balanceMode = String(req.body?.payment_mode || "Cash").slice(0, 40);

      await db.query(
        `UPDATE bookings
          SET balance_paid = ?,
              remaining_amount = 0,
              payment_status = 'PAID',
              balance_payment_mode = ?,
              balance_paid_at = NOW(),
              advance_payment_mode = COALESCE(advance_payment_mode, payment_method),
              advance_paid_at = COALESCE(advance_paid_at, created_at)
        WHERE booking_id = ?`,
        [newBalancePaid, balanceMode, req.params.id],
      );

      // the money lands on the folio as its own line
      await postFolioPayment(req.params.id, remaining, "Balance payment", balanceMode);

      const [saved] = await db.query(
        `SELECT balance_paid, balance_payment_mode, balance_paid_at,
              advance_payment_mode, advance_paid_at
         FROM bookings WHERE booking_id=?`,
        [req.params.id],
      );
      const row = saved[0] || {};

      // if the timestamp came back null the column is missing — the migration
      // did not run, which almost always means the server was not restarted
      if (!row.balance_paid_at) {
        console.warn(
          `⚠ balance_paid_at did not persist for booking ${req.params.id}. ` +
            `Restart the backend so runMigrations() adds the split-payment columns.`,
        );
      }

      res.json({
        message: "Balance marked as paid",
        totalAmount: Number(booking.total_amount || booking.final_total || 0),
        advancePaid: Number(booking.advance_paid || 0),
        balancePaid: newBalancePaid,
        balancePaymentMode: row.balance_payment_mode || balanceMode,
        balancePaidAt: row.balance_paid_at || null,
        persisted: Boolean(row.balance_paid_at),
        remainingAmount: 0,
        paymentStatus: "PAID",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);
app.patch(
  "/api/bookings/:id/checkout-discount",
  requireManager,
  async (req, res, next) => {
    try {
      await ensurePaymentColumns();

      const [rows] = await db.query(
        "SELECT * FROM bookings WHERE booking_id=?",
        [req.params.id],
      );
      if (!rows.length)
        return res.status(404).json({ error: "Booking not found" });
      const booking = rows[0];

      if (booking.status === "cancelled") {
        return res
          .status(400)
          .json({
            error: "Cannot apply a checkout discount to a cancelled booking",
          });
      }

      const requestedDiscount =
        Math.round(Number(req.body?.checkout_discount_amount || 0) * 100) / 100;
      if (!Number.isFinite(requestedDiscount) || requestedDiscount < 0) {
        return res.status(400).json({ error: "Enter a valid discount amount" });
      }

      // PRE-TAX DISCOUNT MODEL (same as the booking-time discount).
      // The checkout discount reduces the room's taxable value, then GST is
      // recalculated on the lower amount. A Rs.500 discount therefore reduces
      // what the guest owes by Rs.500 x 1.18 = Rs.590, because the Rs.90 of GST
      // that was charged on that Rs.500 is no longer due.
      const roomSubtotal = Number(booking.total_price || 0);
      const originalDiscount =
        Number(booking.discount_applied ? booking.discount_amount : 0) || 0;
      const discountedRoomBase = Math.max(0, roomSubtotal - originalDiscount);

      // add-on charges are taxed too and are never touched by a room discount
      const addonCharges = Number(booking.addon_charges || 0);

      /*
       * PER-SERVICE GST: add-ons carry their own tax, so it can no longer be
       * derived from addonCharges here. Read the per-line total instead;
       * getAddonTotals falls back to the old flat rate for any line written
       * before the migration, so a legacy booking discounts exactly as before.
       */
      const addonGstTotal = (await getAddonTotals(req.params.id)).gst;

      // The discount can only wipe out the room's remaining taxable value.
      if (requestedDiscount > discountedRoomBase) {
        return res.status(400).json({
          error: `Checkout discount cannot exceed the room amount of Rs.${discountedRoomBase}`,
        });
      }

      const advancePaid = Number(booking.advance_paid || 0);
      const balancePaid = Number(booking.balance_paid || 0);

      // Recompute the whole bill from the original figures every time, so a
      // repeat call replaces the previous checkout discount instead of stacking.
      //
      // newRoomTaxable is the ROOM value only. The taxable_amount column means
      // "room value after discount" everywhere else — booking creation stores
      // base_price there — and every caller of roomTaxableValue() adds the
      // add-on total on top. Storing room+add-ons here made those callers count
      // the add-ons twice as soon as a checkout discount existed.
      const newRoomTaxable = Math.max(
        0,
        Math.round((discountedRoomBase - requestedDiscount) * 100) / 100,
      );
      const newTaxable =
        Math.round((newRoomTaxable + addonCharges) * 100) / 100;
      /*
       * PER-ROOM GST: the room at the rate frozen onto this booking, plus
       * each add-on at its own. Reading the rate from the booking (not the
       * room, and not a constant) means repricing the room later cannot move
       * the discount maths on a stay already sold.
       */
      const bookingRoomRate = roomGstFractionOf(booking);
      const newGst =
        Math.round((newRoomTaxable * bookingRoomRate + addonGstTotal) * 100) / 100;

      // ADDITIONAL: unchanged calculation above; the tax is dropped only for a
      // booking issued with GST off, so a discount there stays one-for-one.
      const gstOff = isGstDisabled(booking);
      const chargedGst = gstOff ? 0 : newGst;

      const newTotal = Math.round((newTaxable + chargedGst) * 100) / 100;

      // what the bill was before this discount, for the response/audit trail
      const baseTaxable =
        Math.round((discountedRoomBase + addonCharges) * 100) / 100;
      const baseTotal = gstOff
        ? Math.round(baseTaxable * 100) / 100
        : Math.round(
            (baseTaxable + discountedRoomBase * bookingRoomRate + addonGstTotal) * 100,
          ) / 100;
      const baseRemaining = Math.max(
        0,
        Math.round((baseTotal - advancePaid - balancePaid) * 100) / 100,
      );

      const discountGst = gstOff
        ? 0
        : Math.round(requestedDiscount * bookingRoomRate * 100) / 100;
      const discountTotalImpact =
        Math.round((requestedDiscount + discountGst) * 100) / 100;

      if (discountTotalImpact > baseRemaining) {
        return res.status(400).json({
          error: `Discount of Rs.${requestedDiscount} (Rs.${discountTotalImpact} with GST) exceeds the outstanding balance of Rs.${baseRemaining}`,
        });
      }

      const newRemaining = Math.max(
        0,
        Math.round((newTotal - advancePaid - balancePaid) * 100) / 100,
      );

      const reason = req.body?.reason
        ? String(req.body.reason).slice(0, 255)
        : null;
      const applied = requestedDiscount > 0;

      await db.query(
        `UPDATE bookings
          SET checkout_discount_applied = ?,
              checkout_discount_amount = ?,
              checkout_discount_reason = ?,
              checkout_discount_at = ?,
              checkout_discount_by = ?,
              taxable_amount = ?,
              addon_gst_amount = ?,
              gst_amount = ?,
              final_total = ?,
              total_amount = ?,
              remaining_amount = ?,
              payment_status = ?
        WHERE booking_id = ?`,
        [
          applied ? 1 : 0,
          requestedDiscount,
          applied ? reason : null,
          applied ? new Date() : null,
          applied ? req.user.user_id : null,
          // room-only, matching what booking creation stores in this column
          newRoomTaxable,
          gstOff ? 0 : addonGstTotal,
          chargedGst,
          newTotal,
          newTotal,
          newRemaining,
          newRemaining > 0 ? "PARTIALLY_PAID" : "PAID",
          req.params.id,
        ],
      );

      /*
       * Rebuild the folio from the columns just written.
       *
       * The checkout discount lands on `bookings` above, but the folio is a
       * separate set of rows and does not follow on its own. That gap did not
       * show while the printed bill was built from the booking's columns —
       * now that the GST invoice is built from the FOLIO, a folio missing
       * this line prints a bill without the discount and overcharges the
       * guest by the discount plus its tax.
       *
       * rebuildFolioFromColumns reads both discount columns and posts each as
       * its own line, so this is correct for applying AND for removing.
       */
      try {
        await rebuildFolioFromColumns(req.params.id);
      } catch (e) {
        // The booking's own columns are already correct, so the money is
        // right either way; only the per-night breakdown would be stale.
        console.error(
          `Folio rebuild after checkout discount failed for booking ${req.params.id}:`,
          e.message,
        );
      }

      res.json({
        message: applied
          ? "Checkout discount applied"
          : "Checkout discount removed",
        checkout_discount_applied: applied,
        checkout_discount_amount: requestedDiscount,
        checkout_discount_gst: discountGst,
        checkout_discount_total_impact: discountTotalImpact,
        roomTaxableAmount: newRoomTaxable,
        taxableAmount: newTaxable,
        gstAmount: chargedGst,
        totalAmount: newTotal,
        advancePaid,
        balancePaid,
        baseRemaining,
        remainingAmount: newRemaining,
        paymentStatus: newRemaining > 0 ? "PARTIALLY_PAID" : "PAID",
      });
    } catch (err) {
      next(err);
    }
  },
);
// ── shared check-in detail persistence ───────────────────────────────────────
// Creates the table on demand so a missed migration can never silently drop
// the guest list, and returns what was actually written so the caller can
// verify it landed.
async function saveCheckinDetails(bookingId, body = {}) {
  const {
    id_proof_type = null,
    id_proof_number = null,
    adults_count = null,
    children_count = null,
    payment_mode = null,
    guests = null,
  } = body || {};

  /*
   * Billing identity (GSTIN + address) is editable from the check-in and
   * check-out screen, not only at booking time — a guest very often asks for a
   * GST invoice at the desk, after the booking already exists.
   *
   * These two are handled apart from the COALESCE fields above because an
   * empty string here means "clear it", while `undefined` means "the caller
   * did not send this field, leave it alone". COALESCE cannot tell those
   * apart.
   */
  const hasGstField = body && body.gst_number !== undefined;
  const hasAddressField = body && body.customer_address !== undefined;

  let gstNumber = null;
  if (hasGstField) {
    const raw = String(body.gst_number || "")
      .trim()
      .toUpperCase();
    if (raw && !GSTIN_REGEX.test(raw)) {
      const err = new Error("Enter a valid 15-character GSTIN");
      err.status = 400;
      throw err;
    }
    gstNumber = raw || null;
  }

  let customerAddress = null;
  if (hasAddressField) {
    customerAddress =
      String(body.customer_address || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 255) || null;
  }

  await db.query(
    `CREATE TABLE IF NOT EXISTS booking_guests (
      guest_id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      guest_type VARCHAR(10) NOT NULL DEFAULT 'adult',
      name VARCHAR(120) NOT NULL,
      age INT DEFAULT NULL,
      gender VARCHAR(20) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (booking_id)
    )`,
  );

  await db.query(
    `UPDATE bookings
       SET id_proof_type        = COALESCE(?, id_proof_type),
           id_proof_number      = COALESCE(?, id_proof_number),
           adults_count         = COALESCE(?, adults_count),
           children_count       = COALESCE(?, children_count),
           checkin_payment_mode = COALESCE(?, checkin_payment_mode)
     WHERE booking_id = ?`,
    [
      id_proof_type,
      id_proof_number,
      adults_count,
      children_count,
      payment_mode,
      bookingId,
    ],
  );

  // Written separately so a blank value genuinely clears the field.
  if (hasGstField || hasAddressField) {
    const sets = [];
    const params = [];
    if (hasGstField) {
      sets.push("gst_number = ?");
      params.push(gstNumber);
    }
    if (hasAddressField) {
      sets.push("customer_address = ?");
      params.push(customerAddress);
    }
    params.push(bookingId);
    await db.query(
      `UPDATE bookings SET ${sets.join(", ")} WHERE booking_id = ?`,
      params,
    );
  }

  if (Array.isArray(guests)) {
    await db.query("DELETE FROM booking_guests WHERE booking_id=?", [
      bookingId,
    ]);
    for (const g of guests) {
      if (!g || !String(g.name || "").trim()) continue;
      const age =
        g.age === undefined || g.age === null || g.age === ""
          ? null
          : Number(g.age);
      await db.query(
        `INSERT INTO booking_guests (booking_id, guest_type, name, age, gender)
         VALUES (?,?,?,?,?)`,
        [
          bookingId,
          g.guest_type === "child" ? "child" : "adult",
          String(g.name).trim().slice(0, 120),
          Number.isFinite(age) ? age : null,
          g.gender || null,
        ],
      );
    }
  }

  const [guestRows] = await db.query(
    "SELECT * FROM booking_guests WHERE booking_id=? ORDER BY guest_id ASC",
    [bookingId],
  );
  return guestRows;
}

// One-off repair: bookings settled before the tracking columns existed have a
// balance amount but no mode or date. Fill those from the best evidence we have
// so the invoice and summary stop showing a dash.
app.patch(
  "/api/admin/backfill-payment-dates",
  requireAdmin,
  async (req, res) => {
    try {
      await ensurePaymentColumns();

      const [result] = await db.query(
        `UPDATE bookings
          SET balance_payment_mode = COALESCE(balance_payment_mode, checkin_payment_mode, payment_method),
              balance_paid_at      = COALESCE(balance_paid_at, actual_checkin, created_at),
              advance_payment_mode = COALESCE(advance_payment_mode, payment_method),
              advance_paid_at      = COALESCE(advance_paid_at, created_at)
        WHERE balance_paid > 0
          AND (balance_paid_at IS NULL OR balance_payment_mode IS NULL)`,
      );

      res.json({
        message: "Backfilled payment details on older bookings",
        updated: result.affectedRows,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.patch("/api/bookings/:id/checkin", requireAdmin, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const now = new Date();

    // save the guest details FIRST — if this fails we must not leave the
    // booking marked as checked in with no details behind it
    const guests = await saveCheckinDetails(bookingId, req.body);

    await db.query(
      "UPDATE bookings SET actual_checkin=?, status='confirmed' WHERE booking_id=?",
      [now, bookingId],
    );

    res.json({
      message: "Checked in successfully",
      actual_checkin: now,
      guests,
    });
  } catch (err) {
    // A bad GSTIN is the operator's typo, not a server fault — 400 so the
    // screen shows the real message instead of a generic failure.
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Save / update check-in details without triggering the check-in itself
app.put("/api/bookings/:id/checkin-details", requireAdmin, async (req, res) => {
  try {
    const guests = await saveCheckinDetails(req.params.id, req.body);
    res.json({ message: "Check-in details saved", guests });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.patch("/api/bookings/:id/checkout", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM bookings WHERE booking_id=?", [
      req.params.id,
    ]);
    if (!rows.length)
      return res.status(404).json({ error: "Booking not found" });
    const booking = rows[0];
    const now = new Date();
    const checkinTime = booking.actual_checkin
      ? new Date(booking.actual_checkin)
      : new Date(booking.check_in_date);
    const hoursSpent =
      Math.round(((now - checkinTime) / (1000 * 60 * 60)) * 100) / 100;
    const [addons] = await db.query(
      "SELECT SUM(amount) as total FROM booking_addons WHERE booking_id=?",
      [req.params.id],
    );
    await db.query(
      `UPDATE bookings SET actual_checkout=?, hours_spent=?, status='completed' WHERE booking_id=?`,
      [now, hoursSpent, req.params.id],
    );
    // recalc writes addon_charges, gst_amount, final_total, total_amount and
    // remaining_amount together — the old query left the last two stale
    const totals = await recalcBookingTotals(req.params.id);
    res.json({
      message: "Checked out successfully",
      actual_checkout: now,
      hours_spent: hoursSpent,
      addon_charges: totals.addonCharges,
      gst_amount: totals.gstAmount,
      final_total: totals.totalAmount,
      remaining_amount: totals.remainingAmount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  FOLIO — the guest's account for a stay
// ══════════════════════════════════════════════════════════════════════════════

/*
 * Read a stay's folio: every line posted to it, plus the totals derived from
 * those lines rather than from any stored column.
 *
 * A guest may read their own; staff may read any.
 */
app.get("/api/bookings/:id/folio", requireAuth, async (req, res) => {
  try {
    const [[owner]] = await db.query(
      "SELECT user_id FROM bookings WHERE booking_id=?",
      [req.params.id],
    );
    if (!owner) return res.status(404).json({ error: "Booking not found" });
    if (!ownsOrStaff(req, owner.user_id)) {
      return res.status(403).json({ error: "You can only view your own folio" });
    }

    const folio = await getFolio(req.params.id);

    // What the booking's columns say, so a screen can show both and any
    // disagreement is visible rather than silent.
    const [[bk]] = await db.query(
      "SELECT total_amount, final_total, remaining_amount, payment_status FROM bookings WHERE booking_id=?",
      [req.params.id],
    );
    const storedTotal = Number(bk?.total_amount ?? bk?.final_total ?? 0);

    res.json({
      booking_id: Number(req.params.id),
      items: folio.rows,
      totals: {
        roomTaxable: folio.roomTaxable,
        roomGst: folio.roomGst,
        addonTaxable: folio.addonTaxable,
        addonGst: folio.addonGst,
        vehicleTaxable: folio.vehicleTaxable,
        vehicleGst: folio.vehicleGst,
        discountTaxable: folio.discountTaxable,
        discountGst: folio.discountGst,
        taxableTotal: folio.taxableTotal,
        gstTotal: folio.gstTotal,
        grossTotal: folio.grossTotal,
        paid: folio.paid,
        balance: folio.balance,
      },
      gstByRate: folio.byRate,
      stored: {
        total_amount: storedTotal,
        remaining_amount: Number(bk?.remaining_amount || 0),
        payment_status: bk?.payment_status || null,
      },
      in_sync: Math.abs(folio.grossTotal - storedTotal) <= 0.02,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
 * Void a posted line.
 *
 * The line stays on the folio, marked, with a reason — a charge that simply
 * disappears makes the bill unauditable. A payment cannot be voided here: the
 * money has moved, and unwinding that is a refund, not an edit.
 */
app.patch(
  "/api/bookings/:id/folio/:itemId/void",
  requireAdmin,
  async (req, res) => {
    try {
      const [[item]] = await db.query(
        "SELECT * FROM booking_items WHERE item_id=? AND booking_id=?",
        [req.params.itemId, req.params.id],
      );
      if (!item) return res.status(404).json({ error: "Folio line not found" });
      if (Number(item.voided) === 1) {
        return res.status(400).json({ error: "This line is already voided" });
      }
      if (item.item_type === FOLIO.PAYMENT) {
        return res.status(400).json({
          error:
            "A payment cannot be voided — record a refund instead, so the money movement stays on the record",
        });
      }

      const reason = String(req.body?.reason || "Voided by admin").slice(0, 255);
      await db.query(
        "UPDATE booking_items SET voided=1, voided_at=NOW(), void_reason=? WHERE item_id=?",
        [reason, req.params.itemId],
      );

      /*
       * An ADDON line mirrors a booking_addons row, which is still what the
       * stored columns are computed from. Remove it there too, or the bill
       * and the folio immediately disagree — and the folio would be rebuilt
       * over the top of this void on the next recalc.
       */
      if (item.item_type === FOLIO.ADDON && item.source_addon_id) {
        await db.query(
          "DELETE FROM booking_addons WHERE addon_id=? AND booking_id=? AND paid=0",
          [item.source_addon_id, req.params.id],
        );
      }

      const totals = await recalcBookingTotals(req.params.id);
      const folio = await getFolio(req.params.id);
      res.json({
        message: "Line voided",
        totals,
        balance: folio.balance,
        grossTotal: folio.grossTotal,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

/*
 * Rebuild folios from the booking columns.
 *
 * The columns stay the authority, so this is the repair path when a folio has
 * drifted — and the way to run the backfill again after fixing whatever
 * caused a mismatch. Reports every booking whose ledger does not reconcile.
 */
app.post("/api/admin/folio/rebuild", requireAdmin, async (req, res) => {
  try {
    const one = req.body?.booking_id;
    const [ids] = one
      ? [[{ booking_id: Number(one) }]]
      : await db.query("SELECT booking_id FROM bookings ORDER BY booking_id ASC");

    let built = 0;
    const mismatches = [];
    for (const { booking_id } of ids) {
      try {
        const folio = await rebuildFolioFromColumns(booking_id);
        if (!folio) continue;
        built += 1;
        const [[bk]] = await db.query(
          "SELECT total_amount, final_total FROM bookings WHERE booking_id=?",
          [booking_id],
        );
        const stored = Number(bk.total_amount ?? bk.final_total ?? 0);
        if (stored > 0 && Math.abs(folio.grossTotal - stored) > 0.02) {
          mismatches.push({
            booking_id,
            folio: folio.grossTotal,
            stored,
            difference: round2(folio.grossTotal - stored),
          });
        }
      } catch (e) {
        mismatches.push({ booking_id, error: e.message });
      }
    }

    res.json({
      message: `Folio rebuilt for ${built} booking(s)`,
      built,
      mismatched: mismatches.length,
      mismatches: mismatches.slice(0, 100),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADD-ON GST CONFIGURATION  (addon_catalog)
//
//  The admin dashboard's "GST Configuration" screen drives these. Reading the
//  catalog is open to any staff member, because the manager's add-on picker
//  needs it; changing it is admin-only.
// ══════════════════════════════════════════════════════════════════════════════

/* Validate one catalog payload. Returns an error string, or null when fine. */
function validateCatalogInput({ name, gst_rate, default_amount }) {
  if (name !== undefined) {
    const n = String(name || "").trim();
    if (!n) return "Service name is required";
    if (n.length > 100) return "Service name must be 100 characters or fewer";
  }
  if (gst_rate !== undefined) {
    const r = Number(gst_rate);
    if (!Number.isFinite(r)) return "GST rate must be a number";
    // 0% is legitimate (an exempt service); above 28% is not a real GST slab.
    if (r < 0 || r > 28) return "GST rate must be between 0 and 28";
  }
  if (default_amount !== undefined && default_amount !== null && default_amount !== "") {
    const a = Number(default_amount);
    if (!Number.isFinite(a) || a < 0) return "Default amount must be 0 or more";
  }
  return null;
}

// Staff-facing list — active services only, for the add-on picker.
app.get("/api/addon-catalog", requireManager, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM addon_catalog WHERE is_active=1 ORDER BY sort_order ASC, name ASC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-facing list — includes deactivated services so they can be restored.
app.get("/api/admin/addon-catalog", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM addon_catalog ORDER BY sort_order ASC, name ASC",
    );
    // How many times each service has actually been charged. The dashboard
    // uses this to decide between deactivating and deleting.
    const [used] = await db.query(
      "SELECT catalog_id, COUNT(*) AS uses FROM booking_addons WHERE catalog_id IS NOT NULL GROUP BY catalog_id",
    );
    const useMap = new Map(used.map((u) => [Number(u.catalog_id), Number(u.uses)]));
    res.json(
      rows.map((r) => ({ ...r, times_charged: useMap.get(Number(r.catalog_id)) || 0 })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/addon-catalog", requireAdmin, async (req, res) => {
  try {
    const { name, gst_rate, hsn_sac, default_amount, sort_order } = req.body || {};
    const problem = validateCatalogInput({
      name,
      gst_rate: gst_rate ?? 5,
      default_amount,
    });
    if (problem) return res.status(400).json({ error: problem });

    const cleanName = String(name).trim();
    const [[clash]] = await db.query(
      "SELECT catalog_id, is_active FROM addon_catalog WHERE LOWER(name)=LOWER(?)",
      [cleanName],
    );
    if (clash) {
      return res.status(409).json({
        error: clash.is_active
          ? `"${cleanName}" already exists`
          : `"${cleanName}" exists but is deactivated — reactivate it instead`,
      });
    }

    const [r] = await db.query(
      `INSERT INTO addon_catalog (name, gst_rate, hsn_sac, default_amount, sort_order)
       VALUES (?,?,?,?,?)`,
      [
        cleanName,
        Number(gst_rate ?? 5),
        hsn_sac ? String(hsn_sac).trim().slice(0, 20) : null,
        default_amount === "" || default_amount == null ? null : Number(default_amount),
        Number(sort_order) || 0,
      ],
    );
    const [[created]] = await db.query(
      "SELECT * FROM addon_catalog WHERE catalog_id=?",
      [r.insertId],
    );
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
 * Edit a service.
 *
 * Changing gst_rate here affects the NEXT charge posted, never one already
 * posted — each order item carries its own snapshotted rate. That is
 * deliberate: a settled invoice must keep printing the tax the guest paid.
 */
app.patch("/api/admin/addon-catalog/:id", requireAdmin, async (req, res) => {
  try {
    const { name, gst_rate, hsn_sac, default_amount, is_active, sort_order } =
      req.body || {};
    const problem = validateCatalogInput({ name, gst_rate, default_amount });
    if (problem) return res.status(400).json({ error: problem });

    const [[existing]] = await db.query(
      "SELECT * FROM addon_catalog WHERE catalog_id=?",
      [req.params.id],
    );
    if (!existing) return res.status(404).json({ error: "Service not found" });

    if (name !== undefined) {
      const [[clash]] = await db.query(
        "SELECT catalog_id FROM addon_catalog WHERE LOWER(name)=LOWER(?) AND catalog_id<>?",
        [String(name).trim(), req.params.id],
      );
      if (clash)
        return res.status(409).json({ error: `"${String(name).trim()}" already exists` });
    }

    const next = {
      name: name !== undefined ? String(name).trim() : existing.name,
      gst_rate: gst_rate !== undefined ? Number(gst_rate) : existing.gst_rate,
      hsn_sac:
        hsn_sac !== undefined
          ? hsn_sac
            ? String(hsn_sac).trim().slice(0, 20)
            : null
          : existing.hsn_sac,
      default_amount:
        default_amount !== undefined
          ? default_amount === "" || default_amount == null
            ? null
            : Number(default_amount)
          : existing.default_amount,
      is_active:
        is_active !== undefined ? (Number(is_active) ? 1 : 0) : existing.is_active,
      sort_order:
        sort_order !== undefined ? Number(sort_order) || 0 : existing.sort_order,
    };

    await db.query(
      `UPDATE addon_catalog
          SET name=?, gst_rate=?, hsn_sac=?, default_amount=?, is_active=?, sort_order=?
        WHERE catalog_id=?`,
      [
        next.name,
        next.gst_rate,
        next.hsn_sac,
        next.default_amount,
        next.is_active,
        next.sort_order,
        req.params.id,
      ],
    );

    const [[updated]] = await db.query(
      "SELECT * FROM addon_catalog WHERE catalog_id=?",
      [req.params.id],
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
 * Remove a service.
 *
 * A service that has ever been charged is DEACTIVATED, not deleted — its rows
 * in booking_addons point at it, and deleting it would orphan the history
 * behind past invoices. One that has never been used is deleted outright.
 */
app.delete("/api/admin/addon-catalog/:id", requireAdmin, async (req, res) => {
  try {
    const [[existing]] = await db.query(
      "SELECT * FROM addon_catalog WHERE catalog_id=?",
      [req.params.id],
    );
    if (!existing) return res.status(404).json({ error: "Service not found" });

    const [[{ uses }]] = await db.query(
      "SELECT COUNT(*) AS uses FROM booking_addons WHERE catalog_id=?",
      [req.params.id],
    );

    if (Number(uses) > 0) {
      await db.query("UPDATE addon_catalog SET is_active=0 WHERE catalog_id=?", [
        req.params.id,
      ]);
      return res.json({
        message: `"${existing.name}" deactivated — it appears on ${uses} past charge(s), so its history is kept`,
        deactivated: true,
      });
    }

    await db.query("DELETE FROM addon_catalog WHERE catalog_id=?", [
      req.params.id,
    ]);
    res.json({ message: `"${existing.name}" removed`, deactivated: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADD-ONS
// ══════════════════════════════════════════════════════════════════════════════

/*
 * Post one charge to a booking — shared by the admin and manager routes so
 * the two can never compute a line differently.
 *
 * Accepts the old shape { label, amount } and the new one
 * { catalog_id, quantity, unit_price }. With the old shape quantity is 1 and
 * unit_price is the amount, so an existing caller behaves exactly as before
 * apart from now getting the configured rate instead of a flat 12%.
 */
async function insertAddonLine(bookingId, body) {
  const { catalog_id, label, amount, quantity, unit_price, gst_rate } = body || {};

  const qty = quantity == null || quantity === "" ? 1 : Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    const e = new Error("Quantity must be greater than zero");
    e.status = 400;
    throw e;
  }

  // unit_price when given, otherwise derive it from the legacy `amount`.
  const unit =
    unit_price != null && unit_price !== ""
      ? Number(unit_price)
      : Number(amount) / qty;
  if (!Number.isFinite(unit) || unit <= 0) {
    const e = new Error("Amount must be greater than zero");
    e.status = 400;
    throw e;
  }

  const resolved = await resolveAddonGstRate({ catalogId: catalog_id, label });

  const finalLabel = (label && String(label).trim()) || resolved.label;
  if (!finalLabel) {
    const e = new Error("label and amount required");
    e.status = 400;
    throw e;
  }

  /*
   * An explicit gst_rate in the request is honoured only as an override for a
   * one-off charge. It is still snapshotted onto the line like any other, so
   * it behaves identically from here on.
   */
  const rate =
    gst_rate != null && gst_rate !== "" && Number.isFinite(Number(gst_rate))
      ? Math.min(28, Math.max(0, Number(gst_rate)))
      : resolved.gstRate;

  const line = computeAddonLine({ quantity: qty, unitPrice: unit, gstRate: rate });

  const [r] = await db.query(
    `INSERT INTO booking_addons
       (booking_id, catalog_id, label, quantity, unit_price, gst_rate,
        taxable_amount, gst_amount, line_total, amount)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      bookingId,
      resolved.catalogId,
      finalLabel.slice(0, 100),
      line.quantity,
      line.unitPrice,
      line.gstRate,
      line.taxableAmount,
      line.gstAmount,
      line.lineTotal,
      // `amount` is kept equal to the taxable value so every existing
      // SUM(amount) query keeps returning what it always did.
      line.taxableAmount,
    ],
  );

  /*
   * Post the same charge to the folio.
   *
   * Appended here rather than left to the periodic rebuild so the line keeps
   * its own posting time and its own identity — that is what makes the folio
   * a record of what happened rather than a snapshot of what is currently
   * true. source_addon_id links it back to the booking_addons row so a later
   * removal can void exactly this line.
   */
  try {
    await postFolioLine(bookingId, {
      itemType: FOLIO.ADDON,
      label: finalLabel,
      catalogId: resolved.catalogId,
      sourceAddonId: r.insertId,
      serviceDate: new Date(),
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      gstRate: line.gstRate,
    });
  } catch (e) {
    // The folio must never stop a charge being taken; recalc will repair it.
    console.error("Folio post failed for add-on:", e.message);
  }

  return { addon_id: r.insertId, label: finalLabel, ...line };
}

/*
 * Reverse an add-on on the folio.
 *
 * VOID, not delete. A posted charge that simply vanishes leaves "where did
 * that go?" unanswerable, and a bill that can be silently edited is not a
 * bill anyone can audit. The line stays, marked, with a reason.
 */
async function voidAddonFolioLine(bookingId, addonId, reason = "Charge removed") {
  try {
    await db.query(
      `UPDATE booking_items
          SET voided = 1, voided_at = NOW(), void_reason = ?
        WHERE booking_id = ? AND source_addon_id = ? AND voided = 0`,
      [String(reason).slice(0, 255), bookingId, addonId],
    );
  } catch (e) {
    console.error("Folio void failed for add-on:", e.message);
  }
}

/*
 * Record money received as a folio line.
 *
 * Payments are lines like anything else, carried negative, so the balance is
 * just the sum of the folio and there is no second figure to keep in step.
 */
async function postFolioPayment(bookingId, amount, label, mode, reference = null) {
  const value = round2(amount);
  if (!(value > 0)) return;
  try {
    await postFolioLine(bookingId, {
      itemType: FOLIO.PAYMENT,
      label,
      flatAmount: value,
      paymentMode: mode || null,
      reference,
      serviceDate: new Date(),
    });
  } catch (e) {
    console.error("Folio payment post failed:", e.message);
  }
}

app.get("/api/bookings/:id/addons", requireAuth, async (req, res, next) => {
  try {
    const [[owner]] = await db.query(
      "SELECT user_id FROM bookings WHERE booking_id=?",
      [req.params.id],
    );
    if (!owner) return res.status(404).json({ error: "Booking not found" });
    if (!ownsOrStaff(req, owner.user_id)) {
      return res
        .status(403)
        .json({ error: "You can only view add-ons on your own booking" });
    }
    const [rows] = await db.query(
      "SELECT * FROM booking_addons WHERE booking_id=? ORDER BY created_at DESC",
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/bookings/:id/addons", requireAdmin, async (req, res) => {
  try {
    const { label, amount, catalog_id, unit_price } = req.body || {};
    if (!catalog_id && !label)
      return res.status(400).json({ error: "label and amount required" });
    if (!amount && !unit_price)
      return res.status(400).json({ error: "label and amount required" });
    const [[bk]] = await db.query(
      "SELECT status FROM bookings WHERE booking_id=?",
      [req.params.id],
    );
    if (!bk) return res.status(404).json({ error: "Booking not found" });
    if (bk.status === "cancelled")
      return res
        .status(400)
        .json({ error: "Cannot add charges to a cancelled booking" });

    const line = await insertAddonLine(req.params.id, req.body);

    // recalcBookingTotals rewrites addon_charges, addon_gst_amount,
    // gst_amount, final_total, total_amount AND remaining_amount together, so
    // no screen can read a stale figure after this call.
    const totals = await recalcBookingTotals(req.params.id);
    res.status(201).json({
      ...line,
      amount: line.taxableAmount,
      new_addon_total: totals.addonCharges,
      new_addon_gst: totals.addonGst,
      new_gst: totals.gstAmount,
      new_final_total: totals.totalAmount,
      new_remaining: totals.remainingAmount,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.delete(
  "/api/bookings/:id/addons/:addon_id",
  requireAdmin,
  async (req, res) => {
    try {
      const [[addon]] = await db.query(
        "SELECT paid FROM booking_addons WHERE addon_id=? AND booking_id=?",
        [req.params.addon_id, req.params.id],
      );
      if (!addon) return res.status(404).json({ error: "Add-on not found" });
      if (addon.paid === 1)
        return res.status(400).json({ error: "Cannot remove a paid add-on" });
      // void on the folio BEFORE the row goes, while the link still exists
      await voidAddonFolioLine(req.params.id, req.params.addon_id, "Charge removed by admin");
      // void on the folio BEFORE the row goes, while the link still exists
      await voidAddonFolioLine(req.params.id, req.params.addon_id, "Charge removed by manager");
      await db.query(
        "DELETE FROM booking_addons WHERE addon_id=? AND booking_id=?",
        [req.params.addon_id, req.params.id],
      );
      const [addons] = await db.query(
        "SELECT SUM(amount) as total FROM booking_addons WHERE booking_id=?",
        [req.params.id],
      );
      // one helper keeps total_amount and remaining_amount in step with
      // final_total; updating only the latter left the screens stale
      const totals = await recalcBookingTotals(req.params.id);
      res.json({
        message: "Addon removed",
        new_addon_total: totals.addonCharges,
        new_gst: totals.gstAmount,
        new_final_total: totals.totalAmount,
        new_remaining: totals.remainingAmount,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.patch(
  "/api/bookings/:id/addons/mark-paid",
  requireAdmin,
  async (req, res) => {
    try {
      const [[bk]] = await db.query(
        "SELECT status FROM bookings WHERE booking_id=?",
        [req.params.id],
      );
      if (!bk) return res.status(404).json({ error: "Booking not found" });
      if (bk.status === "cancelled")
        return res
          .status(400)
          .json({ error: "Cannot mark a cancelled booking as paid" });

      /*
       * BUGFIX: marking add-ons paid recorded no money.
       *
       * It set paid=1 and stamped the mode and date, but never credited
       * balance_paid — so the booking's stored remaining_amount still
       * contained the add-on total. The screens hid it by subtracting the
       * add-ons again in the UI ("allAddonsPaid ? 0 : remainingAmount"), but
       * the database and the screen disagreed, and anything reading the
       * columns directly — reports, a SQL query, the balance-order route —
       * saw money still owed that had in fact been collected.
       *
       * The money the guest actually hands over is the unpaid add-on lines
       * plus their GST, so that is what gets credited.
       */
      const beforePaid = await getAddonTotals(req.params.id);
      const settledNow = beforePaid.unpaidTotal;
      const unpaidCount = beforePaid.rows.filter(
        (r) => Number(r.paid) !== 1,
      ).length;

      await db.query(
        "UPDATE booking_addons SET paid=1 WHERE booking_id=? AND paid=0",
        [req.params.id],
      );

      // only stamp the mode/date when there was actually something to settle,
      // so a repeat call doesn't overwrite the original record
      if (unpaidCount > 0) {
        await ensurePaymentColumns();
        const mode = String(req.body?.payment_mode || "Cash").slice(0, 40);
        await db.query(
          `UPDATE bookings
              SET addon_payment_mode = ?,
                  addon_paid_at      = NOW(),
                  balance_paid       = ROUND(COALESCE(balance_paid,0) + ?, 2)
            WHERE booking_id = ?`,
          [mode, settledNow, req.params.id],
        );

        // the money lands on the folio as its own payment line
        await postFolioPayment(
          req.params.id,
          settledNow,
          "Add-on settlement",
          mode,
        );

        // recalc rewrites remaining_amount from the new balance_paid, so the
        // stored figure and the screen finally agree
        await recalcBookingTotals(req.params.id);
      }

      const [addons] = await db.query(
        "SELECT * FROM booking_addons WHERE booking_id=? ORDER BY created_at ASC",
        [req.params.id],
      );
      const [[fresh]] = await db.query(
        "SELECT total_amount, advance_paid, balance_paid, remaining_amount, payment_status FROM bookings WHERE booking_id=?",
        [req.params.id],
      );
      res.json({
        message: "Add-ons marked as paid",
        addons,
        amount_settled: settledNow,
        ...fresh,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);
// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [[{ total_rooms }]] = await db.query(
      "SELECT COUNT(*) AS total_rooms FROM rooms",
    );
    const [[{ total_bookings }]] = await db.query(
      "SELECT COUNT(*) AS total_bookings FROM bookings WHERE status NOT IN ('pending','cancelled')",
    );
    const [[{ total_users }]] = await db.query(
      "SELECT COUNT(*) AS total_users FROM users",
    );
    const [[{ total_revenue }]] = await db.query(
  `SELECT COALESCE(
     SUM(
       COALESCE(advance_paid, 0) +
       COALESCE(balance_paid, 0)
     ),
     0
   ) AS total_revenue
   FROM bookings
   WHERE status IN ('confirmed','completed')`,
);
    const [recent_bookings] = await db.query(
      `SELECT b.booking_id, u.name AS guest_name, r.room_type, b.check_in_date, b.check_out_date, b.total_price, b.final_total, b.status, b.actual_checkin, b.actual_checkout FROM bookings b JOIN users u ON b.user_id=u.user_id JOIN rooms r ON b.room_id=r.room_id WHERE b.status NOT IN ('pending') ORDER BY b.created_at DESC LIMIT 5`,
    );
    res.json({
      total_rooms,
      total_bookings,
      total_users,
      total_revenue,
      recent_bookings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT user_id,name,email,phone,role,created_at FROM users ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const [userRows] = await db.query(
      "SELECT user_id,name,email,phone,role,created_at FROM users WHERE user_id=?",
      [req.params.id],
    );
    if (!userRows.length)
      return res.status(404).json({ error: "User not found" });
    const [bookings] = await db.query(
      `SELECT b.*, r.room_type, r.room_number, r.price_per_night, r.image_url FROM bookings b JOIN rooms r ON b.room_id=r.room_id WHERE b.user_id=? AND b.status != 'pending' ORDER BY b.created_at DESC`,
      [req.params.id],
    );
    const [[{ total_spent }]] = await db.query(
      "SELECT COALESCE(SUM(COALESCE(final_total, total_price)),0) AS total_spent FROM bookings WHERE user_id=? AND status IN ('confirmed','completed')",
      [req.params.id],
    );
    res.json({ ...userRows[0], bookings, total_spent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/bookings", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, u.phone, r.room_type, r.room_number FROM bookings b JOIN users u ON b.user_id=u.user_id JOIN rooms r ON b.room_id=r.room_id WHERE b.status NOT IN ('pending') ORDER BY b.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/bookings/:id", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, u.phone, r.room_type, r.room_number, r.price_per_night, r.image_url FROM bookings b JOIN users u ON b.user_id=u.user_id JOIN rooms r ON b.room_id=r.room_id WHERE b.booking_id=?`,
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Booking not found" });
    const [addons] = await db.query(
      "SELECT * FROM booking_addons WHERE booking_id=? ORDER BY created_at ASC",
      [req.params.id],
    );
    const [guests] = await db.query(
      "SELECT * FROM booking_guests WHERE booking_id=? ORDER BY guest_id ASC",
      [req.params.id],
    );
    // addon_gst_summary lets the invoice print a rate-wise GST table without
    // re-deriving anything client side.
    const addonTotals = await getAddonTotals(req.params.id);
    res.json({
      ...rows[0],
      addons,
      guests,
      addon_gst_summary: addonTotals.byRate,
      addon_gst_total: addonTotals.gst,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/bookings/:id", requireAdmin, async (req, res) => {
  try {
    const [booking] = await db.query(
      `SELECT status, actual_checkin, actual_checkout,
              COALESCE(final_total, total_price, 0) AS revenue
         FROM bookings WHERE booking_id=?`,
      [req.params.id],
    );
    if (!booking.length)
      return res.status(404).json({ error: "Booking not found" });

    const bk = booking[0];

    // a guest who is still in the room must be checked out first, otherwise
    // the room silently frees up while it is actually occupied
    if (bk.actual_checkin && !bk.actual_checkout) {
      return res.status(400).json({
        error:
          "This guest is still checked in. Record check-out before deleting.",
      });
    }

    // revenue is a live SUM over the bookings table, so removing the row
    // removes its contribution automatically
    const removedRevenue =
      bk.status === "cancelled" ? 0 : Number(bk.revenue || 0);
    await db.query("DELETE FROM bookings WHERE booking_id=?", [req.params.id]);
    res.json({
      message: "Booking deleted successfully",
      removedRevenue,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   CREDIT NOTES — API

   The booking row is never written by anything in this block. A credit note
   is a separate document that references the invoice; correcting tax by
   editing the original would destroy the only record of what was actually
   charged and collected.
   ═══════════════════════════════════════════════════════════════════════ */

/*
 * The date the lower accommodation slab moved from 12% to 5%.
 *
 * Stays that ENDED before this were correctly charged 12% and are not
 * mis-billed — only stays supplied on or after it are candidates. The date of
 * supply for accommodation is the stay itself, so this filters on
 * check_out_date, not on when the booking was made or paid.
 */
const SLAB_CHANGE_DATE = "2025-09-22";

/*
 * Bookings whose frozen room GST rate does not match the slab their tariff
 * falls into, for stays on or after the rate change.
 *
 * This REPORTS, it does not decide. The rate a booking should have carried is
 * a question with real exceptions — an explicit per-room rate the admin set
 * deliberately, a stay straddling the change date — so every row comes back
 * with the figures and the admin chooses what to credit. Nothing is issued
 * automatically.
 */
app.get("/api/admin/gst/affected-bills", requireAdmin, async (req, res) => {
  try {
    const from = req.query.from || SLAB_CHANGE_DATE;

    const [rows] = await db.query(
      `SELECT b.booking_id, b.created_at, b.check_in_date, b.check_out_date,
              b.guest_count, b.taxable_amount, b.gst_amount, b.total_amount,
              b.final_total, b.room_gst_rate, b.gst_enabled, b.status,
              r.room_number, r.room_type, r.price_per_night, r.price_double,
              r.gst_rate AS room_configured_rate,
              u.name AS guest_name, u.email AS guest_email,
              cn.cn_number, cn.credit_note_id, cn.gst_credited
         FROM bookings b
         JOIN rooms r ON r.room_id = b.room_id
         LEFT JOIN users u ON u.user_id = b.user_id
         LEFT JOIN credit_notes cn
                ON cn.booking_id = b.booking_id AND cn.status = 'issued'
        WHERE b.check_out_date >= ?
          AND b.status NOT IN ('cancelled','pending')
          AND COALESCE(b.gst_enabled, 1) = 1
        ORDER BY b.check_out_date DESC, b.booking_id DESC`,
      [from],
    );

    const affected = [];
    let totalExcess = 0;
    let totalShortfall = 0;

    for (const b of rows) {
      const charged = b.room_gst_rate == null
        ? LEGACY_ROOM_GST_PERCENT
        : Number(b.room_gst_rate);

      // The slab the tariff actually supplied falls into.
      const nights = Math.max(
        1,
        Math.ceil(
          (new Date(b.check_out_date) - new Date(b.check_in_date)) / 86400000,
        ),
      );
      const taxable = Number(b.taxable_amount || 0);
      const perNight = nights > 0 ? taxable / nights : taxable;
      const expected = slabRateForTariff(perNight);

      if (charged === expected) continue;

      const gstCharged = round2((taxable * charged) / 100);
      const gstExpected = round2((taxable * expected) / 100);
      const difference = round2(gstCharged - gstExpected);

      /*
       * THE TWO DIRECTIONS ARE NOT THE SAME PROBLEM, and must never be
       * netted against each other.
       *
       * Over-collected (charged 12% where 5% was due): money taken from the
       * guest that was not owed. Corrected with a CREDIT NOTE, which is what
       * this feature issues.
       *
       * Under-collected (charged 12% where 18% was due — a suite over
       * Rs.7,500 billed at the old flat rate): tax that was owed and not
       * collected. That is a liability, not a refund, and it is corrected
       * with a DEBIT NOTE or supplementary invoice, which this system does
       * not issue. Showing one figure for both would hide it.
       */
      const overCollected = difference > 0;

      if (!b.cn_number) {
        if (overCollected) totalExcess = round2(totalExcess + difference);
        else totalShortfall = round2(totalShortfall + Math.abs(difference));
      }

      affected.push({
        booking_id: b.booking_id,
        invoice_no: invoiceNoFor(b),
        guest_name: b.guest_name,
        guest_email: b.guest_email,
        room_number: b.room_number,
        room_type: b.room_type,
        check_in_date: b.check_in_date,
        check_out_date: b.check_out_date,
        nights,
        taxable_amount: round2(taxable),
        per_night: round2(perNight),
        charged_rate: charged,
        expected_rate: expected,
        gst_charged: gstCharged,
        gst_expected: gstExpected,
        difference,
        direction: overCollected ? "over_collected" : "under_collected",
        // only an over-collection can be corrected here
        can_credit: overCollected,
        remedy: overCollected ? "credit_note" : "debit_note_required",
        // an explicit rate means somebody chose this deliberately — flagged,
        // not corrected, because the admin may have had a reason
        room_configured_rate: b.room_configured_rate,
        deliberate: b.room_configured_rate != null && b.room_configured_rate !== "",
        credit_note: b.cn_number || null,
        credit_note_id: b.credit_note_id || null,
        gst_credited: b.gst_credited == null ? null : Number(b.gst_credited),
      });
    }

    res.json({
      from,
      slab_change_date: SLAB_CHANGE_DATE,
      count: affected.length,
      // kept separate deliberately — see the comment above
      uncredited_excess: totalExcess,
      uncollected_shortfall: totalShortfall,
      shortfall_note:
        totalShortfall > 0
          ? "Some stays were charged LESS tax than was due. That is a liability, not a refund, and needs a debit note or supplementary invoice — this screen cannot issue one. Take these to your auditor."
          : null,
      bills: affected,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Issue a credit note against one booking. */
app.post("/api/admin/credit-notes", requireAdmin, async (req, res) => {
  try {
    const {
      booking_id,
      revised_rate,
      reason,
      issue_date,
    } = req.body || {};

    if (!booking_id) {
      return res.status(400).json({ error: "booking_id is required" });
    }
    if (revised_rate === undefined || revised_rate === null || revised_rate === "") {
      return res.status(400).json({ error: "revised_rate is required" });
    }

    const revised = Number(revised_rate);
    if (!Number.isFinite(revised) || revised < 0 || revised > 28) {
      return res.status(400).json({ error: "Revised rate must be between 0 and 28" });
    }

    const [[booking]] = await db.query(
      `SELECT b.*, r.room_number
         FROM bookings b JOIN rooms r ON r.room_id = b.room_id
        WHERE b.booking_id = ?`,
      [booking_id],
    );
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // One live note per booking. A second correction on the same bill is
    // almost always a double-credit by mistake; cancel the first if the
    // figures were wrong.
    const [[existing]] = await db.query(
      "SELECT cn_number FROM credit_notes WHERE booking_id = ? AND status = 'issued' LIMIT 1",
      [booking_id],
    );
    if (existing) {
      return res.status(409).json({
        error: `Booking already has credit note ${existing.cn_number}. Cancel it before issuing another.`,
      });
    }

    const charged = booking.room_gst_rate == null
      ? LEGACY_ROOM_GST_PERCENT
      : Number(booking.room_gst_rate);

    if (revised >= charged) {
      return res.status(400).json({
        error: `A credit note must reduce the tax. This bill was charged ${charged}%.`,
      });
    }

    const note = await issueCreditNote({
      bookingId: booking.booking_id,
      issueDate: issue_date || new Date().toISOString().slice(0, 10),
      reason: String(reason || "GST rate correction").slice(0, 255),
      taxableAmount: Number(booking.taxable_amount || 0),
      originalRate: charged,
      revisedRate: revised,
      originalInvoiceNo: invoiceNoFor(booking),
      originalInvoiceDate: booking.created_at
        ? new Date(booking.created_at).toISOString().slice(0, 10)
        : null,
      createdBy: req.user?.email || req.user?.name || `user:${req.user?.user_id}`,
    });

    res.status(201).json(note);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/* Every credit note issued, newest first. */
app.get("/api/admin/credit-notes", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT cn.*, b.check_in_date, b.check_out_date,
              r.room_number, u.name AS guest_name, u.email AS guest_email
         FROM credit_notes cn
         JOIN bookings b ON b.booking_id = cn.booking_id
         JOIN rooms r ON r.room_id = b.room_id
         LEFT JOIN users u ON u.user_id = b.user_id
        ORDER BY cn.fin_year DESC, cn.cn_seq DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
 * Cancel a credit note.
 *
 * The row stays and keeps its serial — removing it would put a gap in the
 * series, which is the first thing an auditor asks about. It is marked
 * cancelled so the booking can take a corrected note.
 */
app.post("/api/admin/credit-notes/:id/cancel", requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const [r] = await db.query(
      `UPDATE credit_notes
          SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = ?
        WHERE credit_note_id = ? AND status = 'issued'`,
      [String(reason || "Cancelled by admin").slice(0, 255), req.params.id],
    );
    if (!r.affectedRows) {
      return res
        .status(404)
        .json({ error: "No live credit note with that id" });
    }
    res.json({ message: "Credit note cancelled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
 * Credit notes as CSV, in the shape GSTR-1 table 9B wants.
 *
 * Deliberately a flat export rather than a filing integration: the figures
 * go to whoever files the return, and they decide what lands on it.
 */
app.get("/api/admin/credit-notes/export", requireAdmin, async (req, res) => {
  try {
    const { fin_year } = req.query;
    const [rows] = await db.query(
      `SELECT cn.*, u.name AS guest_name, b.gst_number AS customer_gst_number
         FROM credit_notes cn
         JOIN bookings b ON b.booking_id = cn.booking_id
         LEFT JOIN users u ON u.user_id = b.user_id
        ${fin_year ? "WHERE cn.fin_year = ?" : ""}
        ORDER BY cn.fin_year, cn.cn_seq`,
      fin_year ? [fin_year] : [],
    );

    const esc = (v) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = [
      "Credit Note No", "Credit Note Date", "Original Invoice No",
      "Original Invoice Date", "Recipient", "Recipient GSTIN",
      "Taxable Value", "Original Rate %", "Revised Rate %",
      "GST Originally Charged", "GST Now Due", "GST Credited",
      "Reason", "Status",
    ].join(",");

    const body = rows.map((r) => [
      r.cn_number,
      r.issue_date instanceof Date ? r.issue_date.toISOString().slice(0, 10) : r.issue_date,
      r.original_invoice_no,
      r.original_invoice_date instanceof Date
        ? r.original_invoice_date.toISOString().slice(0, 10)
        : r.original_invoice_date,
      r.guest_name,
      r.customer_gst_number,
      r.taxable_amount,
      r.original_rate,
      r.revised_rate,
      r.gst_original,
      r.gst_revised,
      r.gst_credited,
      r.reason,
      r.status,
    ].map(esc).join(","));

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="credit-notes${fin_year ? `-${fin_year}` : ""}.csv"`,
    );
    res.send([header, ...body].join("\n"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/rooms", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM rooms ORDER BY room_id ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/rooms", requireAdmin, async (req, res) => {
  try {
    const {
      room_number,
      room_type,
      price_per_night,
      price_double,
      capacity,
      description,
      image_url,
      gst_rate,
    } = req.body;
    if (!room_number || !room_type || !price_per_night)
      return res
        .status(400)
        .json({ error: "room_number, room_type, price_per_night required" });

    /*
     * PER-ROOM GST. Left empty, the column stays NULL and the room is taxed
     * at the 12% default, so a room added without touching the field behaves
     * exactly as rooms always have.
     */
    const roomGst =
      gst_rate === undefined || gst_rate === null || gst_rate === ""
        ? null
        : Number(gst_rate);
    if (roomGst !== null && (!Number.isFinite(roomGst) || roomGst < 0 || roomGst > 28)) {
      return res.status(400).json({ error: "GST rate must be between 0 and 28" });
    }

    /*
     * Optional CGST/SGST split at creation. Pair or nothing, same rule as the
     * update route: half a split leaves the room in a state where the total
     * cannot be derived. When given, the pair IS the rate and gst_rate is
     * written from their sum.
     */
    const blankRate = (v) => v === null || v === undefined || v === "";
    const cIn = req.body.cgst_rate;
    const sIn = req.body.sgst_rate;
    let roomCgst = null;
    let roomSgst = null;
    let effectiveGst = roomGst;

    if (!blankRate(cIn) || !blankRate(sIn)) {
      if (blankRate(cIn) || blankRate(sIn)) {
        return res.status(400).json({
          error: "Set CGST and SGST together, or leave both blank to split the total in half",
        });
      }
      roomCgst = Number(cIn);
      roomSgst = Number(sIn);
      const bad = (n) => !Number.isFinite(n) || n < 0 || n > 28;
      if (bad(roomCgst) || bad(roomSgst) || roomCgst + roomSgst > 28) {
        return res
          .status(400)
          .json({ error: "CGST and SGST must each be 0–28, and must not sum above 28" });
      }
      effectiveGst = round2(roomCgst + roomSgst);
    }

    const [r] = await db.query(
      "INSERT INTO rooms (room_number,room_type,price_per_night,price_double,capacity,description,image_url,gst_rate,cgst_rate,sgst_rate,is_available) VALUES (?,?,?,?,?,?,?,?,?,?,1)",
      [
        room_number,
        room_type,
        price_per_night,
        price_double === undefined || price_double === "" ? null : price_double,
        capacity || 2,
        description || null,
        image_url || null,
        effectiveGst,
        roomCgst,
        roomSgst,
      ],
    );
    res.status(201).json({ message: "Room added", room_id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/rooms/:id", requireAdmin, async (req, res) => {
  try {
    const {
      is_available,
      price_per_night,
      description,
      room_type,
      room_number,
      capacity,
      image_url,
    } = req.body;
    const fields = [];
    const values = [];
    if (is_available !== undefined) {
      fields.push("is_available=?");
      values.push(is_available);
    }
    if (price_per_night !== undefined) {
      fields.push("price_per_night=?");
      values.push(price_per_night);
    }
    if (req.body.price_double !== undefined) {
      fields.push("price_double=?");
      values.push(req.body.price_double === "" ? null : req.body.price_double);
    }
    if (description !== undefined) {
      fields.push("description=?");
      values.push(description);
    }
    if (room_type !== undefined) {
      fields.push("room_type=?");
      values.push(room_type);
    }
    if (room_number !== undefined) {
      fields.push("room_number=?");
      values.push(room_number);
    }
    if (capacity !== undefined) {
      fields.push("capacity=?");
      values.push(capacity);
    }
    if (image_url !== undefined) {
      fields.push("image_url=?");
      values.push(image_url);
    }
    /*
     * PER-ROOM GST.
     *
     * Changing this affects bookings made FROM NOW ON. Every existing booking
     * carries its own frozen room_gst_rate, so a stay already sold at 12%
     * keeps printing 12% even after this room moves to 18%.
     *
     * An empty string clears it back to the 12% default.
     */
    if (req.body.gst_rate !== undefined) {
      const raw = req.body.gst_rate;
      const parsed = raw === null || raw === "" ? null : Number(raw);
      if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 28)) {
        return res.status(400).json({ error: "GST rate must be between 0 and 28" });
      }
      fields.push("gst_rate=?");
      values.push(parsed);
    }
    /*
     * ── CGST / SGST split ──
     *
     * Optional. Sent as a pair or not at all: half a split is not a split,
     * and accepting one side would leave the room in a state where the total
     * cannot be derived. Clearing is done by sending both empty.
     *
     * When a pair is given it becomes the authority — gst_rate is written to
     * their sum in the same statement, so the two can never drift apart and
     * leave the room taxed at a figure the printed halves contradict.
     */
    const cgstIn = req.body.cgst_rate;
    const sgstIn = req.body.sgst_rate;
    if (cgstIn !== undefined || sgstIn !== undefined) {
      const blank = (v) => v === null || v === undefined || v === "";

      if (blank(cgstIn) !== blank(sgstIn)) {
        return res.status(400).json({
          error: "Set CGST and SGST together, or leave both blank to split the total in half",
        });
      }

      if (blank(cgstIn)) {
        fields.push("cgst_rate=?", "sgst_rate=?");
        values.push(null, null);
      } else {
        const c = Number(cgstIn);
        const s = Number(sgstIn);
        const bad = (n) => !Number.isFinite(n) || n < 0 || n > 28;
        if (bad(c) || bad(s)) {
          return res
            .status(400)
            .json({ error: "CGST and SGST must each be between 0 and 28" });
        }
        if (c + s > 28) {
          return res
            .status(400)
            .json({ error: "CGST + SGST cannot exceed 28%" });
        }
        fields.push("cgst_rate=?", "sgst_rate=?");
        values.push(c, s);

        /*
         * The pair wins over any gst_rate in the same request. Overwriting
         * the existing assignment rather than appending a second one keeps
         * the statement free of a duplicate column, which would otherwise
         * work only because MySQL happens to take the last.
         */
        const total = round2(c + s);
        const existing = fields.indexOf("gst_rate=?");
        if (existing >= 0) values[existing] = total;
        else {
          fields.push("gst_rate=?");
          values.push(total);
        }
      }
    }

    if (req.body.image2 !== undefined) {
      fields.push("image2=?");
      values.push(req.body.image2);
    }
    if (req.body.image3 !== undefined) {
      fields.push("image3=?");
      values.push(req.body.image3);
    }
    if (req.body.image4 !== undefined) {
      fields.push("image4=?");
      values.push(req.body.image4);
    }
    if (req.body.image5 !== undefined) {
      fields.push("image5=?");
      values.push(req.body.image5);
    }
    if (!fields.length)
      return res.status(400).json({ error: "No fields to update" });
    values.push(req.params.id);
    await db.query(
      `UPDATE rooms SET ${fields.join(",")} WHERE room_id=?`,
      values,
    );
    res.json({ message: "Room updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const BLOCK_REASONS = {
  maintenance: "Maintenance",
  cleaning: "Room Cleaning",
  service: "Service",
  bulk: "Bulk Booking",
  other: "Other",
};

app.post(
  "/api/admin/rooms/:id/blocked-dates",
  requireAdmin,
  async (req, res) => {
    try {
      const roomId = req.params.id;
      const dates = Array.isArray(req.body.dates) ? req.body.dates : [];
      const validDates = [...new Set(dates)]
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(String(date)))
        .sort();

      if (!validDates.length) {
        return res
          .status(400)
          .json({ error: "Select at least one valid date" });
      }

      const reasonKey = String(req.body.reason || "maintenance").toLowerCase();
      if (!BLOCK_REASONS[reasonKey]) {
        return res.status(400).json({ error: "Select a valid block reason" });
      }
      const reasonLabel = BLOCK_REASONS[reasonKey];
      const note = req.body.note ? String(req.body.note).slice(0, 255) : null;

      let bookingId = null;

      /*
       * A bulk booking is a real stay, not just a maintenance hold, so it gets
       * a booking row and shows up in the Bookings tab like any other. The
       * guest name is required; the rest is optional because these are usually
       * taken over the phone.
       */
      if (reasonKey === "bulk") {
        const guestName = String(req.body.guest_name || "").trim();
        if (!guestName) {
          return res
            .status(400)
            .json({
              error: "Guest or company name is required for a bulk booking",
            });
        }

        const [roomRows] = await db.query(
          "SELECT * FROM rooms WHERE room_id=?",
          [roomId],
        );
        if (!roomRows.length)
          return res.status(404).json({ error: "Room not found" });
        const room = roomRows[0];

        // the block covers each night; check-out is the morning after the last
        const checkIn = validDates[0];
        const lastNight = new Date(validDates[validDates.length - 1]);
        lastNight.setDate(lastNight.getDate() + 1);
        const checkOut = `${lastNight.getFullYear()}-${String(
          lastNight.getMonth() + 1,
        ).padStart(2, "0")}-${String(lastNight.getDate()).padStart(2, "0")}`;

        const nights = validDates.length;
        const guests = Math.max(1, Number(req.body.guest_count) || 1);
        const nightlyRate = resolveNightlyRate(room, guests);
        const roomSubtotal =
          req.body.total_amount !== undefined && req.body.total_amount !== ""
            ? Math.max(0, Number(req.body.total_amount))
            : nightlyRate * nights;
        /*
         * PER-ROOM GST — explicit room rate, else the slab for this tariff.
         *
         * The slab follows the per-night value of the supply, and a bulk
         * booking may carry an admin-entered total that overrides the room's
         * list price. So the rate is decided from what is actually being
         * charged per night, not from the room's headline tariff.
         */
        const effectiveNightly = nights > 0 ? roomSubtotal / nights : roomSubtotal;
        const gstAmount =
          Math.round(
            roomSubtotal * (roomRateForTariff(room, effectiveNightly) / 100) * 100,
          ) / 100;
        const totalAmount = Math.round((roomSubtotal + gstAmount) * 100) / 100;

        // reuse an account when the email is known, otherwise make a placeholder
        let userId;
        if (req.body.email) {
          userId = await findOrCreateGuestUser({
            name: guestName,
            email: req.body.email,
            phone: req.body.phone,
          });
        } else {
          const placeholderEmail = `bulk-${Date.now()}@vvgrandpark.local`;
          const hashed = await bcrypt.hash(
            crypto.randomBytes(12).toString("hex"),
            12,
          );
          const [u] = await db.query(
            "INSERT INTO users (name,email,password,phone,role) VALUES (?,?,?,?,'guest')",
            [guestName, placeholderEmail, hashed, req.body.phone || null],
          );
          userId = u.insertId;
        }

        const [result] = await db.query(
          `INSERT INTO bookings
          (user_id, room_id, check_in_date, check_out_date, guest_count,
           total_price, taxable_amount, gst_amount, final_total, total_amount,
           advance_paid, balance_paid, remaining_amount, payment_status,
           payment_method, booking_source, vehicle_type, vehicle_price,
           notes, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'confirmed')`,
          [
            userId,
            roomId,
            checkIn,
            checkOut,
            guests,
            roomSubtotal,
            roomSubtotal,
            gstAmount,
            totalAmount,
            totalAmount,
            0,
            0,
            totalAmount,
            "PENDING",
            "Bulk Booking",
            "BULK_BOOKING",
            "none",
            0,
            note || `Bulk booking — ${guestName}`,
          ],
        );
        bookingId = result.insertId;
        // freeze the room's GST rate onto this bulk booking
        await stampRoomGstRate(bookingId);
      }

      await db.query(
        `INSERT INTO room_blocked_dates
         (room_id, blocked_date, block_reason, block_note, booking_id)
       VALUES ${validDates.map(() => "(?,?,?,?,?)").join(",")}
       ON DUPLICATE KEY UPDATE
         block_reason = VALUES(block_reason),
         block_note   = VALUES(block_note),
         booking_id   = VALUES(booking_id)`,
        validDates.flatMap((date) => [
          roomId,
          date,
          reasonLabel,
          note,
          bookingId,
        ]),
      );

      res.json({
        message:
          reasonKey === "bulk"
            ? "Bulk booking created and dates blocked"
            : `Room dates blocked — ${reasonLabel}`,
        reason: reasonLabel,
        booking_id: bookingId,
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
);

app.delete(
  "/api/admin/rooms/:id/blocked-dates",
  requireAdmin,
  async (req, res) => {
    try {
      const dates = Array.isArray(req.body.dates) ? req.body.dates : [];
      const validDates = [...new Set(dates)].filter((date) =>
        /^\d{4}-\d{2}-\d{2}$/.test(String(date)),
      );
      if (!validDates.length) {
        return res.status(400).json({ error: "Select at least one date" });
      }
      // collect any bulk bookings tied to these dates before deleting the holds
      const [linked] = await db.query(
        `SELECT DISTINCT booking_id FROM room_blocked_dates
        WHERE room_id=? AND booking_id IS NOT NULL
          AND blocked_date IN (${validDates.map(() => "?").join(",")})`,
        [req.params.id, ...validDates],
      );

      await db.query(
        `DELETE FROM room_blocked_dates WHERE room_id=? AND blocked_date IN (${validDates
          .map(() => "?")
          .join(",")})`,
        [req.params.id, ...validDates],
      );

      // a bulk booking with no remaining blocked nights is no longer a stay
      let removedBookings = 0;
      for (const row of linked) {
        const [[stillHeld]] = await db.query(
          "SELECT COUNT(*) AS n FROM room_blocked_dates WHERE booking_id=?",
          [row.booking_id],
        );
        if (Number(stillHeld?.n || 0) === 0) {
          await db.query(
            "DELETE FROM bookings WHERE booking_id=? AND booking_source='BULK_BOOKING'",
            [row.booking_id],
          );
          removedBookings += 1;
        }
      }

      res.json({ message: "Room dates unblocked", removedBookings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.delete("/api/admin/rooms/:id", requireAdmin, async (req, res, next) => {
  try {
    // Never delete a room that still has live bookings — depending on the
    // foreign key those bookings would either vanish or the delete would fail
    // with a raw SQL error. Tell the admin what is blocking it instead.
    const [[active]] = await db.query(
      `SELECT COUNT(*) AS n FROM bookings
        WHERE room_id = ? AND status NOT IN ('cancelled')`,
      [req.params.id],
    );
    if (Number(active?.n || 0) > 0) {
      return res.status(409).json({
        error: `This room has ${active.n} booking(s). Mark it unavailable instead of deleting it.`,
      });
    }
    const [result] = await db.query("DELETE FROM rooms WHERE room_id=?", [
      req.params.id,
    ]);
    if (!result.affectedRows)
      return res.status(404).json({ error: "Room not found" });
    res.json({ message: "Room deleted" });
  } catch (err) {
    next(err);
  }
});

// ─── MANAGER ROUTES ───────────────────────────────────────────────────────────
app.post("/api/manager/login", loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });
    const [rows] = await db.query(
      "SELECT user_id,name,email,role,phone,password FROM users WHERE email=? AND role IN ('admin','manager')",
      [email],
    );
    if (!rows.length)
      return res
        .status(401)
        .json({ error: "Invalid credentials or not a manager account" });
    const user = rows[0];
    let passwordValid = false;
    if (user.password.startsWith("$2")) {
      passwordValid = await bcrypt.compare(password, user.password);
    } else {
      passwordValid = user.password === password;
      if (passwordValid) {
        const hashed = await bcrypt.hash(password, 12);
        await db.query("UPDATE users SET password=? WHERE user_id=?", [
          hashed,
          user.user_id,
        ]);
      }
    }
    if (!passwordValid)
      return res.status(401).json({ error: "Invalid credentials" });
    const { password: _, ...safeUser } = user;
    clearLoginAttempts(req);
    setAuthCookie(res, safeUser);
    res.json({ message: "Login successful", user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/manager/bookings", requireManager, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, u.phone, r.room_type, r.room_number FROM bookings b JOIN users u ON b.user_id=u.user_id JOIN rooms r ON b.room_id=r.room_id WHERE b.status NOT IN ('pending') ORDER BY b.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/manager/bookings/:id", requireManager, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, u.phone, r.room_type, r.room_number, r.price_per_night, r.image_url FROM bookings b JOIN users u ON b.user_id=u.user_id JOIN rooms r ON b.room_id=r.room_id WHERE b.booking_id=?`,
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Booking not found" });
    const [addons] = await db.query(
      "SELECT * FROM booking_addons WHERE booking_id=? ORDER BY created_at ASC",
      [req.params.id],
    );
    const addonTotals = await getAddonTotals(req.params.id);
    res.json({
      ...rows[0],
      addons,
      addon_gst_summary: addonTotals.byRate,
      addon_gst_total: addonTotals.gst,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch(
  "/api/manager/bookings/:id/vehicle",
  requireManager,
  async (req, res) => {
    try {
      const {
        vehicle_type,
        vehicle_price,
        vehicle_status,
        pickup_location,
        dropoff_location,
      } = req.body;
      const validTypes = ["4-seater", "7-seater", "12-seater"];
      const validStatuses = [
        "pending",
        "assigned",
        "picked_up",
        "completed",
        "cancelled",
      ];
      if (!validTypes.includes(vehicle_type))
        return res.status(400).json({ error: "Invalid vehicle type" });
      if (!validStatuses.includes(vehicle_status))
        return res.status(400).json({ error: "Invalid vehicle status" });
      if (!Number.isFinite(Number(vehicle_price)) || Number(vehicle_price) < 0)
        return res.status(400).json({ error: "Invalid vehicle price" });

      const [rows] = await db.query(
        "SELECT total_price, vehicle_price, addon_charges, room_gst_rate FROM bookings WHERE booking_id=? AND vehicle_type IS NOT NULL AND vehicle_type != 'none'",
        [req.params.id],
      );
      if (!rows.length)
        return res.status(404).json({ error: "Vehicle booking not found" });

      const roomSubtotal =
        Number(rows[0].total_price || 0) - Number(rows[0].vehicle_price || 0);
      const updatedSubtotal = roomSubtotal + Number(vehicle_price);
      // PER-ROOM GST: the rate frozen onto this booking.
      const gstAmount =
        Math.round(updatedSubtotal * roomGstFractionOf(rows[0]) * 100) / 100;
      // PER-SERVICE GST: add-ons are taxed at their own rates, not the room's.
      const vehicleAddonGst = (await getAddonTotals(req.params.id)).gst;
      const finalTotal =
        Math.round(
          (updatedSubtotal +
            gstAmount +
            Number(rows[0].addon_charges || 0) +
            vehicleAddonGst) *
            100,
        ) / 100;
      /*
       * BUGFIX: this wrote total_price, gst_amount and final_total but left
       * total_amount and remaining_amount untouched.
       *
       * Every screen and the invoice read total_amount and remaining_amount
       * FIRST, so after a vehicle charge was added or changed they kept
       * showing the old figure — the guest was quoted a balance that did not
       * include the vehicle, and "Remaining to Pay" was short by its value.
       * This is the exact failure recalcBookingTotals was written to prevent;
       * this route simply never called it.
       *
       * taxable_amount is cleared to NULL as part of the same write.
       * roomTaxableValue() prefers that column and it still held the
       * pre-vehicle value, so leaving it would make the recalc below
       * reproduce the stale total. With it NULL the helper derives the
       * taxable value from the freshly written total_price minus the
       * discounts, which is what it means.
       */
      await db.query(
        "UPDATE bookings SET vehicle_type=?, vehicle_price=?, vehicle_status=?, pickup_location=?, dropoff_location=?, total_price=?, gst_amount=?, final_total=?, taxable_amount=NULL WHERE booking_id=?",
        [
          vehicle_type,
          Number(vehicle_price),
          vehicle_status,
          pickup_location || null,
          dropoff_location || null,
          updatedSubtotal,
          gstAmount,
          finalTotal,
          req.params.id,
        ],
      );

      // brings total_amount and remaining_amount back in step with the rest
      await recalcBookingTotals(req.params.id);

      res.json({
        message: "Vehicle details updated",
        vehicle_price: Number(vehicle_price),
        vehicle_status,
        pickup_location,
        dropoff_location,
        final_total: finalTotal,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.patch(
  "/api/manager/bookings/:id/checkin",
  requireManager,
  async (req, res) => {
    try {
      const now = new Date();
      await db.query(
        "UPDATE bookings SET actual_checkin=?, status='confirmed' WHERE booking_id=?",
        [now, req.params.id],
      );
      res.json({ message: "Checked in successfully", actual_checkin: now });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.patch(
  "/api/manager/bookings/:id/checkout",
  requireManager,
  async (req, res) => {
    try {
      const [rows] = await db.query(
        "SELECT * FROM bookings WHERE booking_id=?",
        [req.params.id],
      );
      if (!rows.length)
        return res.status(404).json({ error: "Booking not found" });
      const booking = rows[0];
      const now = new Date();
      const checkinTime = booking.actual_checkin
        ? new Date(booking.actual_checkin)
        : new Date(booking.check_in_date);
      const hoursSpent =
        Math.round(((now - checkinTime) / (1000 * 60 * 60)) * 100) / 100;
      const [addons] = await db.query(
        "SELECT SUM(amount) as total FROM booking_addons WHERE booking_id=?",
        [req.params.id],
      );
      await db.query(
        `UPDATE bookings SET actual_checkout=?, hours_spent=?, status='completed' WHERE booking_id=?`,
        [now, hoursSpent, req.params.id],
      );
      const totals = await recalcBookingTotals(req.params.id);
      res.json({
        message: "Checked out successfully",
        actual_checkout: now,
        hours_spent: hoursSpent,
        addon_charges: totals.addonCharges,
        gst_amount: totals.gstAmount,
        final_total: totals.totalAmount,
        remaining_amount: totals.remainingAmount,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.post(
  "/api/manager/bookings/:id/addons",
  requireManager,
  async (req, res) => {
    try {
      const { label, amount, catalog_id, unit_price } = req.body || {};
      if (!catalog_id && !label)
        return res.status(400).json({ error: "label and amount required" });
      if (!amount && !unit_price)
        return res.status(400).json({ error: "label and amount required" });
      const [[bk]] = await db.query(
        "SELECT status FROM bookings WHERE booking_id=?",
        [req.params.id],
      );
      if (!bk) return res.status(404).json({ error: "Booking not found" });
      if (bk.status === "cancelled")
        return res
          .status(400)
          .json({ error: "Cannot add charges to a cancelled booking" });

      const line = await insertAddonLine(req.params.id, req.body);
      const totals = await recalcBookingTotals(req.params.id);
      res.status(201).json({
        ...line,
        amount: line.taxableAmount,
        new_addon_total: totals.addonCharges,
        new_addon_gst: totals.addonGst,
        new_gst: totals.gstAmount,
        new_final_total: totals.totalAmount,
        new_remaining: totals.remainingAmount,
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
);

app.delete(
  "/api/manager/bookings/:id/addons/:addon_id",
  requireManager,
  async (req, res) => {
    try {
      /*
       * Same guard the admin route has always had. It matters more now: the
       * manager screen was calling a mistyped URL ("/api/mana/..."), so this
       * route was never actually reached from the dashboard. With that typo
       * fixed, an unguarded delete would let a settled charge be removed and
       * leave the booking's total short of the money already collected.
       */
      const [[addon]] = await db.query(
        "SELECT paid FROM booking_addons WHERE addon_id=? AND booking_id=?",
        [req.params.addon_id, req.params.id],
      );
      if (!addon) return res.status(404).json({ error: "Add-on not found" });
      if (Number(addon.paid) === 1)
        return res.status(400).json({ error: "Cannot remove a paid add-on" });

      await db.query(
        "DELETE FROM booking_addons WHERE addon_id=? AND booking_id=?",
        [req.params.addon_id, req.params.id],
      );
      const [addons] = await db.query(
        "SELECT SUM(amount) as total FROM booking_addons WHERE booking_id=?",
        [req.params.id],
      );
      // one helper keeps total_amount and remaining_amount in step with
      // final_total; updating only the latter left the screens stale
      const totals = await recalcBookingTotals(req.params.id);
      res.json({
        message: "Addon removed",
        new_addon_total: totals.addonCharges,
        new_gst: totals.gstAmount,
        new_final_total: totals.totalAmount,
        new_remaining: totals.remainingAmount,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.get("/api/manager/reports", requireManager, async (req, res) => {
  try {
    const { type, start_date, end_date } = req.query;
    let startDate, endDate;
    const now = new Date();
    if (start_date && end_date) {
      startDate = start_date;
      endDate = end_date;
    } else if (type === "weekly") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now.setDate(diff));
      startDate = mon.toISOString().slice(0, 10);
      endDate = new Date().toISOString().slice(0, 10);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      endDate = new Date().toISOString().slice(0, 10);
    }
    const [bookings] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, u.phone, r.room_type, r.room_number FROM bookings b JOIN users u ON b.user_id=u.user_id JOIN rooms r ON b.room_id=r.room_id WHERE b.status NOT IN ('pending','cancelled') AND DATE(b.created_at) BETWEEN ? AND ? ORDER BY b.created_at ASC`,
      [startDate, endDate],
    );
    const [[summary]] = await db.query(
  `SELECT
     COUNT(*) AS total_bookings,
     SUM(
       COALESCE(advance_paid, 0) +
       COALESCE(balance_paid, 0)
     ) AS total_revenue,
     SUM(gst_amount) AS total_gst,
     SUM(COALESCE(addon_charges, 0)) AS total_addons,
     COUNT(CASE WHEN status='completed' THEN 1 END) AS completed,
     COUNT(CASE WHEN status='confirmed' THEN 1 END) AS confirmed
   FROM bookings
   WHERE status NOT IN ('pending','cancelled')
     AND DATE(created_at) BETWEEN ? AND ?`,
  [startDate, endDate],
);
    res.json({ bookings, summary, startDate, endDate, type: type || "custom" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/create-manager", requireAdmin, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email, password required" });
    const [ex] = await db.query("SELECT user_id FROM users WHERE email=?", [
      email,
    ]);
    if (ex.length)
      return res.status(409).json({ error: "Email already registered" });
    const hashed = await bcrypt.hash(password, 12);
    const [r] = await db.query(
      "INSERT INTO users (name,email,password,phone,role) VALUES (?,?,?,?,'manager')",
      [name, email, hashed, phone || null],
    );
    res
      .status(201)
      .json({ message: "Manager created successfully", user_id: r.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ERROR HANDLER ───────────────────────────────────────────────────────────
// Anything passed to next(err) lands here. Raw SQL messages name our tables
// and columns, which is a free map of the schema for anyone probing the API,
// so in production the client gets a generic message and the detail goes to
// the server log only.
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  console.error(`[${req.method} ${req.originalUrl}]`, err.message);
  if (status < 500) {
    return res.status(status).json({ error: err.message });
  }
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message,
  });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 VV Grand Park API running on http://localhost:${PORT}`),
);