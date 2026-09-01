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
      if (
        !origin ||
        ALLOWED_ORIGINS.some((o) => origin.startsWith(o)) ||
        origin.includes("vercel.app")
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

// ─── CLOUDINARY ───────────────────────────────────────────────────────────────
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.post("/api/upload", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });
    const result = await cloudinary.uploader.upload(image, {
      folder: "vvgrandpark/rooms",
      transformation: [{ width: 1200, crop: "limit" }, { quality: "auto" }],
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// ─── JWT ─────────────────────────────────────────────────────────────────────
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

// ─── AUTO MIGRATE ────────────────────────────────────────────────────────────
async function runMigrations() {
  try {
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
    ];
    for (const col of cols) {
      try {
        await db.query(`ALTER TABLE bookings ADD COLUMN ${col}`);
      } catch (e) {}
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

    // client renamed this room type
    try {
      await db.query(
        "UPDATE rooms SET room_type='Deluxe Room' WHERE room_type='Standard AC Room'",
      );
    } catch (e) {}
    await db.query(
      `CREATE TABLE IF NOT EXISTS booking_addons (addon_id INT AUTO_INCREMENT PRIMARY KEY, booking_id INT NOT NULL, label VARCHAR(100) NOT NULL, amount DECIMAL(10,2) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE)`,
    );
    try {
      await db.query(
        "ALTER TABLE booking_addons ADD COLUMN paid TINYINT DEFAULT 0",
      );
    } catch (e) {}
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
const GST_RATE = 0.18;
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

function resolveAdvanceAmount(totalAmount, advanceAmount) {
  const defaultAdvanceAmount = Math.floor(totalAmount * ADVANCE_RATE);
  if (
    advanceAmount === undefined ||
    advanceAmount === null ||
    advanceAmount === ""
  ) {
    return defaultAdvanceAmount;
  }

  const requestedAdvance = Math.round(Number(advanceAmount) * 100) / 100;
  if (!Number.isFinite(requestedAdvance) || requestedAdvance <= 0) {
    const err = new Error("Enter a valid advance amount");
    err.status = 400;
    throw err;
  }
  if (requestedAdvance > totalAmount) {
    const err = new Error("Advance amount cannot exceed full amount");
    err.status = 400;
    throw err;
  }
  return requestedAdvance;
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

// Nightly rate for a room at a given occupancy.
// Rooms with price_double set charge that rate from 2 adults upward; rooms
// without it charge price_per_night at every occupancy, exactly as before.
function resolveNightlyRate(room, guestCount) {
  const single = Number(room.price_per_night || 0);
  const double = Number(room.price_double || 0);
  const guests = Math.max(1, Number(guestCount) || 1);
  if (guests >= 2 && double > 0) return double;
  return single;
}

async function calculateBookingAmounts({
  room_id,
  check_in_date,
  check_out_date,
  advance_amount,
  guest_count,
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

  const nightlyRate = resolveNightlyRate(room, guest_count);
  const roomSubtotal = nightlyRate * nights;
  const gstAmount = Math.round(roomSubtotal * GST_RATE * 100) / 100;
  const totalAmount = Math.round((roomSubtotal + gstAmount) * 100) / 100;
  const advanceAmount = resolveAdvanceAmount(totalAmount, advance_amount);
  const remainingAmount =
    Math.round(Math.max(0, totalAmount - advanceAmount) * 100) / 100;

  return {
    room,
    nights,
    nightlyRate,
    roomSubtotal,
    gstAmount,
    totalAmount,
    advanceAmount,
    remainingAmount,
  };
}

async function findOrCreateGuestUser({ name, email, phone }) {
  const normalizedName = String(name || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const rawPhone = String(phone || "").trim();
  if (!normalizedName || !normalizedEmail || !rawPhone) {
    const err = new Error("Customer name, email and phone are required");
    err.status = 400;
    throw err;
  }
  if (!CUSTOMER_NAME_PATTERN.test(normalizedName)) {
    const err = new Error("Customer name must contain letters only");
    err.status = 400;
    throw err;
  }
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
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
    "SELECT user_id, role FROM users WHERE email=? LIMIT 1",
    [normalizedEmail],
  );
  if (existing.length) {
    if (existing[0].role !== "guest") {
      const err = new Error("Use a guest/customer email address");
      err.status = 400;
      throw err;
    }
    await db.query("UPDATE users SET name=?, phone=? WHERE user_id=?", [
      normalizedName,
      normalizedPhone,
      existing[0].user_id,
    ]);
    return existing[0].user_id;
  }

  const randomPassword = crypto.randomBytes(12).toString("hex");
  const hashed = await bcrypt.hash(randomPassword, 12);
  const [result] = await db.query(
    "INSERT INTO users (name,email,password,phone,role) VALUES (?,?,?,?,'guest')",
    [normalizedName, normalizedEmail, hashed, normalizedPhone],
  );
  return result.insertId;
}

app.get("/api/customers/lookup", requireManager, async (req, res) => {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }

    const [rows] = await db.query(
      "SELECT user_id, name, email, phone, role FROM users WHERE email=? LIMIT 1",
      [email],
    );
    if (!rows.length) return res.json({ exists: false });

    const user = rows[0];
    if (user.role !== "guest") {
      return res
        .status(400)
        .json({ error: "Use a guest/customer email address" });
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
  "Check-in time: 1:00 PM | Check-out time: 11:00 AM.",
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
    doc.fillColor("#C9A84C").font("Helvetica").fontSize(10).text("RESIDENCY", 50, 54);
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("INVOICE", 395, 28, { align: "right" });
    doc.fillColor("#AAB2BA").font("Helvetica").fontSize(9).text(invNo, 395, 54, {
      align: "right",
    });

    doc.moveTo(50, 115).lineTo(545, 115).strokeColor("#C9A84C").lineWidth(1).stroke();

    doc.fillColor("#868E96").font("Helvetica-Bold").fontSize(8).text("BILL TO", 50, 132);
    doc
      .fillColor("#0F1923")
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(booking.guest_name || "Guest", 50, 148);
    doc.fillColor("#495057").font("Helvetica").fontSize(9).text(booking.email || "", 50, 166);
    if (booking.phone) doc.text(booking.phone, 50, 180);

    doc.fillColor("#868E96").font("Helvetica-Bold").fontSize(8).text("FROM", 350, 132);
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
      .text("+91 93849 82510", 350, 194);

    const tableTop = 230;
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
      ["GST (18%)", gstAmount],
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
        .text(formatInvoiceMoney(amount), 430, y, { width: 110, align: "right" });
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
    doc.text(
      INVOICE_TERMS.map((term, i) => `${i + 1}. ${term}`).join("   "),
      50,
      y,
      { width: 495, align: "justify" },
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
      .text("Thank you for choosing VV Grand Park Residency!", 50, footerY + 10, {
        width: 495,
        align: "center",
      });
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(
        "3/4/D, Thanjai Saalai, Thiruvarur - 610004  |  +91 93849 82510  |  vvgrandpark.com",
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
            <p style="margin:20px 0 0;color:#868E96;font-size:12px;text-align:center;">VV Grand Park Residency | +91 93849 82510 | vvgrandpark@gmail.com</p>
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

app.post("/api/auth/login", async (req, res) => {
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
    const [users] = await db.query(
      "SELECT user_id, name FROM users WHERE email=?",
      [email],
    );
    if (!users.length)
      return res
        .status(404)
        .json({ error: "No account found with this email" });
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
    res.json({ message: "OTP sent to your email" });
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
    const [rows] = await db.query(
      "SELECT * FROM password_otps WHERE email=? AND otp=? AND used=0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [email, otp],
    );
    if (!rows.length)
      return res.status(400).json({ error: "Invalid or expired OTP" });
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
    const [rows] = await db.query(
      "SELECT * FROM password_otps WHERE email=? AND otp=? AND used=0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [email, otp],
    );
    if (!rows.length)
      return res.status(400).json({ error: "Invalid or expired OTP" });
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
      "SELECT room_id, room_number, room_type, price_per_night, price_double, capacity, description, image_url, is_available, created_at FROM rooms WHERE is_available=1";
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

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
});
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
    const { user_id, booking_id, room_id, rating, review_text } = req.body;
    if (!user_id || !booking_id || !room_id || !rating || !review_text)
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

app.get("/api/reviews/user/:user_id", requireAuth, async (req, res) => {
  try {
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
    const gst_amount = Math.round(room_subtotal * GST_RATE * 100) / 100;
    const total_price = Math.round((room_subtotal + gst_amount) * 100) / 100;
    const [result] = await db.query(
      `INSERT INTO bookings (user_id,room_id,check_in_date,check_out_date,guest_count,total_price,gst_amount,final_total,vehicle_type,vehicle_price,status) VALUES (?,?,?,?,?,?,?,?,?,?, 'pending')`,
      [
        user_id,
        room_id,
        check_in_date,
        check_out_date,
        guest_count || 1,
        room_subtotal,
        gst_amount,
        total_price,
        vehicle_type,
        vehicle_price,
      ],
    );
    const booking_id = result.insertId;
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
      await db.query(
        "UPDATE bookings SET status='cancelled' WHERE booking_id=?",
        [booking_id],
      );
      return res.status(400).json({ error: "Payment verification failed." });
    }
    const [ownedBooking] = await db.query(
      "SELECT booking_id, status FROM bookings WHERE booking_id=? AND user_id=? AND status IN ('pending','cancelled')",
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
    await db.query(
      "UPDATE bookings SET status='confirmed', payment_id=? WHERE booking_id=?",
      [razorpay_payment_id, booking_id],
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
          booking.gst_amount || Math.round(basePrice * GST_RATE * 100) / 100,
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
          if (booking.phone) doc.text(booking.phone, 50, 175);
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
            .text("+91 93849 82510 | vvgrandpark@gmail.com", 350, 175);

          const tableTop = 210;
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
            ["GST (18%)", `Rs.${Math.round(gst).toLocaleString()}`],
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
              "3/4/D, Thanjai Saalai, Thiruvarur - 610004  |  +91 93849 82510  |  vvgrandpark@gmail.com",
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
                  GST (18%)
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
            3/4/D, Thanjai Saalai, Thiruvarur - 610004 · +91 93849 82510 · vvgrandpark@gmail.com
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

app.post("/api/payment/failed", async (req, res) => {
  try {
    await db.query(
      "UPDATE bookings SET status='cancelled' WHERE booking_id=? AND status='pending'",
      [req.body.booking_id],
    );
    res.json({ message: "Booking cancelled." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  BOOKINGS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/bookings/user/:user_id", requireAuth, async (req, res) => {
  try {
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
    if (!canManageBookings && Number(booking.user_id) !== Number(req.user.user_id)) {
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

app.post("/api/bookings", requireAuth, async (req, res) => {
  try {
    const { user_id, room_id, check_in_date, check_out_date, guest_count } =
      req.body;
    if (!user_id || !room_id || !check_in_date || !check_out_date)
      return res.status(400).json({ error: "Missing required fields" });
    const [roomRows] = await db.query("SELECT * FROM rooms WHERE room_id=?", [
      room_id,
    ]);
    if (!roomRows.length)
      return res.status(404).json({ error: "Room not found" });
    const room = roomRows[0];
    const nights = Math.ceil(
      (new Date(check_out_date) - new Date(check_in_date)) / 86400000,
    );
    if (nights <= 0) return res.status(400).json({ error: "Invalid dates" });
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
      return res.status(409).json({
        error: "Selected dates are already booked for this room",
      });
    }
    const base_price = nights * resolveNightlyRate(room, guest_count);
    const gst_amount = Math.round(base_price * GST_RATE * 100) / 100;
    const total_price = Math.round((base_price + gst_amount) * 100) / 100;
    const [result] = await db.query(
      `INSERT INTO bookings (user_id,room_id,check_in_date,check_out_date,guest_count,total_price,gst_amount,final_total,status) VALUES (?,?,?,?,?,?,?,?,'confirmed')`,
      [
        user_id,
        room_id,
        check_in_date,
        check_out_date,
        guest_count || 1,
        base_price,
        gst_amount,
        total_price,
      ],
    );
    res.status(201).json({
      message: "Booking confirmed",
      booking_id: result.insertId,
      total_price,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/bookings/advance-order", requireManager, async (req, res) => {
  try {
    const { room_id, check_in_date, check_out_date, advance_amount } = req.body;
    if (!room_id || !check_in_date || !check_out_date)
      return res.status(400).json({ error: "Missing required fields" });

    const amounts = await calculateBookingAmounts({
      room_id,
      check_in_date,
      check_out_date,
      advance_amount,
      guest_count: req.body.guest_count,
    });
    const requestedGuests = Math.max(1, Number(req.body.guest_count) || 1);
    if (requestedGuests > Number(amounts.room.capacity || requestedGuests)) {
      return res.status(400).json({
        error: `This room allows up to ${amounts.room.capacity} guests`,
      });
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
});

app.post("/api/admin/bookings/advance-confirm", requireManager, async (req, res) => {
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
    } = req.body;

    if (
      !room_id ||
      !check_in_date ||
      !check_out_date ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const validVehicleTypes = ["none", "4-seater", "7-seater", "12-seater"];
    if (!validVehicleTypes.includes(vehicle_type)) {
      return res.status(400).json({ error: "Invalid vehicle type" });
    }

    const amounts = await calculateBookingAmounts({
      room_id,
      check_in_date,
      check_out_date,
      advance_amount,
      guest_count,
    });
    const requestedGuests = Math.max(1, Number(guest_count) || 1);
    if (requestedGuests > Number(amounts.room.capacity || requestedGuests)) {
      return res.status(400).json({
        error: `This room allows up to ${amounts.room.capacity} guests`,
      });
    }

    const paidOrder = await razorpay.orders.fetch(razorpay_order_id);
    const orderNotes = paidOrder.notes || {};
    if (
      String(orderNotes.room_id || "") !== String(room_id) ||
      orderNotes.check_in_date !== check_in_date ||
      orderNotes.check_out_date !== check_out_date
    ) {
      return res
        .status(400)
        .json({ error: "Paid order does not match this booking" });
    }
    if (Number(paidOrder.amount) !== Math.round(amounts.advanceAmount * 100)) {
      return res
        .status(400)
        .json({ error: "Advance amount does not match paid order" });
    }

    const userId = await findOrCreateGuestUser(customer || {});

    const [result] = await db.query(
      `INSERT INTO bookings (
        user_id, room_id, check_in_date, check_out_date, guest_count,
        total_price, gst_amount, final_total, total_amount,
        advance_amount, advance_paid, balance_paid, remaining_amount,
        payment_status, payment_id, advance_payment_id, advance_order_id,
        payment_method, booking_source, vehicle_type, vehicle_price,
        vehicle_status, pickup_location, dropoff_location, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'confirmed')`,
      [
        userId,
        room_id,
        check_in_date,
        check_out_date,
        requestedGuests,
        amounts.roomSubtotal,
        amounts.gstAmount,
        amounts.totalAmount,
        amounts.totalAmount,
        amounts.advanceAmount,
        amounts.advanceAmount,
        0,
        amounts.remainingAmount,
        amounts.remainingAmount > 0 ? "PARTIALLY_PAID" : "PAID",
        razorpay_payment_id,
        razorpay_payment_id,
        razorpay_order_id,
        "Razorpay Advance",
        req.user.role === "admin" ? "ADMIN_ADVANCE" : "MANAGER_ADVANCE",
        vehicle_type,
        0,
        vehicle_type === "none" ? "not_required" : "pending",
        pickup_location || null,
        dropoff_location || null,
      ],
    );

    const bookingId = result.insertId;
    loadBookingForInvoice(bookingId)
      .then((booking) => booking && sendAdvanceInvoiceEmail(booking))
      .catch((emailErr) =>
        console.error("Advance booking invoice email error:", emailErr.message),
      );

    res.status(201).json({
      message: "Booking confirmed with advance payment",
      booking_id: bookingId,
      totalAmount: amounts.totalAmount,
      advanceAmount: amounts.advanceAmount,
      advancePaid: amounts.advanceAmount,
      remainingAmount: amounts.remainingAmount,
      paymentStatus: amounts.remainingAmount > 0 ? "PARTIALLY_PAID" : "PAID",
      bookingStatus: "CONFIRMED",
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

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
          String(payment_mode || "").trim().toLowerCase()
        ];
      if (!selectedPaymentMode) {
        return res
          .status(400)
          .json({ error: "Select Cash or Online payment mode" });
      }

      const validVehicleTypes = ["none", "4-seater", "7-seater", "12-seater"];
      if (!validVehicleTypes.includes(vehicle_type)) {
        return res.status(400).json({ error: "Invalid vehicle type" });
      }

      const amounts = await calculateBookingAmounts({
        room_id,
        check_in_date,
        check_out_date,
        advance_amount,
        guest_count,
      });
      const requestedGuests = Math.max(1, Number(guest_count) || 1);
      if (requestedGuests > Number(amounts.room.capacity || requestedGuests)) {
        return res.status(400).json({
          error: `This room allows up to ${amounts.room.capacity} guests`,
        });
      }

      const userId = await findOrCreateGuestUser(customer || {});
      const manualPaymentId = `${selectedPaymentMode.toUpperCase()}-${Date.now()}-${req.user.user_id}`;

      const [result] = await db.query(
        `INSERT INTO bookings (
          user_id, room_id, check_in_date, check_out_date, guest_count,
          total_price, gst_amount, final_total, total_amount,
          advance_amount, advance_paid, balance_paid, remaining_amount,
          payment_status, payment_id, advance_payment_id, advance_order_id,
          payment_method, booking_source, vehicle_type, vehicle_price,
          vehicle_status, pickup_location, dropoff_location, status
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'confirmed')`,
        [
          userId,
          room_id,
          check_in_date,
          check_out_date,
          requestedGuests,
          amounts.roomSubtotal,
          amounts.gstAmount,
          amounts.totalAmount,
          amounts.totalAmount,
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
        ],
      );

      const bookingId = result.insertId;
      loadBookingForInvoice(bookingId)
        .then((booking) => booking && sendAdvanceInvoiceEmail(booking))
        .catch((emailErr) =>
          console.error("Manual booking invoice email error:", emailErr.message),
        );

      res.status(201).json({
        message: "Booking confirmed with manual advance payment",
        booking_id: bookingId,
        totalAmount: amounts.totalAmount,
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

app.patch("/api/bookings/:id/balance-paid", requireManager, async (req, res) => {
  try {
    await ensurePaymentColumns();

    const [rows] = await db.query("SELECT * FROM bookings WHERE booking_id=?", [
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: "Booking not found" });

    const booking = rows[0];
    const currentBalancePaid = Number(booking.balance_paid || 0);
    const advancePaid = Number(booking.advance_paid || 0);

    // total the guest owes for the room booking
    const roomWithGst =
      Math.round(Number(booking.total_price || 0) * (1 + GST_RATE) * 100) / 100;
    const totalAmount = Number(
      booking.total_amount || booking.final_total || roomWithGst,
    );

    // trust the stored column, but fall back to the derived figure when it is
    // stale (e.g. advance-only bookings that never wrote remaining_amount)
    const storedRemaining = Number(booking.remaining_amount || 0);
    const derivedRemaining = Math.max(
      0,
      Math.round((totalAmount - advancePaid - currentBalancePaid) * 100) / 100,
    );
    const remaining = storedRemaining > 0 ? storedRemaining : derivedRemaining;
    const newBalancePaid = currentBalancePaid + remaining;

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
});

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

  if (Array.isArray(guests)) {
    await db.query("DELETE FROM booking_guests WHERE booking_id=?", [bookingId]);
    for (const g of guests) {
      if (!g || !String(g.name || "").trim()) continue;
      const age =
        g.age === undefined || g.age === null || g.age === "" ? null : Number(g.age);
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
app.patch("/api/admin/backfill-payment-dates", requireAdmin, async (req, res) => {
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
});

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
    res.status(500).json({ error: err.message });
  }
});

// Save / update check-in details without triggering the check-in itself
app.put("/api/bookings/:id/checkin-details", requireAdmin, async (req, res) => {
  try {
    const guests = await saveCheckinDetails(req.params.id, req.body);
    res.json({ message: "Check-in details saved", guests });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const addonTotal = Number(addons[0]?.total || 0);
    const subtotal = Number(booking.total_price) + addonTotal;
    const gstAmount = Math.round(subtotal * GST_RATE * 100) / 100;
    const finalTotal = Math.round((subtotal + gstAmount) * 100) / 100;
    await db.query(
      `UPDATE bookings SET actual_checkout=?, hours_spent=?, addon_charges=?, gst_amount=?, final_total=?, status='completed' WHERE booking_id=?`,
      [now, hoursSpent, addonTotal, gstAmount, finalTotal, req.params.id],
    );
    res.json({
      message: "Checked out successfully",
      actual_checkout: now,
      hours_spent: hoursSpent,
      addon_charges: addonTotal,
      gst_amount: gstAmount,
      final_total: finalTotal,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADD-ONS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/bookings/:id/addons", requireAuth, async (req, res) => {
  try {
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
    const { label, amount } = req.body;
    if (!label || !amount)
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
    const [r] = await db.query(
      "INSERT INTO booking_addons (booking_id, label, amount) VALUES (?,?,?)",
      [req.params.id, label, amount],
    );
    const [addons] = await db.query(
      "SELECT SUM(amount) as total FROM booking_addons WHERE booking_id=?",
      [req.params.id],
    );
    const addonTotal = Number(addons[0]?.total || 0);
    const [bookingRows] = await db.query(
      "SELECT * FROM bookings WHERE booking_id=?",
      [req.params.id],
    );
    const booking = bookingRows[0];
    const subtotal = Number(booking.total_price) + addonTotal;
    const gstAmount = Math.round(subtotal * GST_RATE * 100) / 100;
    const finalTotal = Math.round((subtotal + gstAmount) * 100) / 100;
    await db.query(
      "UPDATE bookings SET addon_charges=?, gst_amount=?, final_total=? WHERE booking_id=?",
      [addonTotal, gstAmount, finalTotal, req.params.id],
    );
    res.status(201).json({
      addon_id: r.insertId,
      label,
      amount,
      new_addon_total: addonTotal,
      new_gst: gstAmount,
      new_final_total: finalTotal,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      await db.query(
        "DELETE FROM booking_addons WHERE addon_id=? AND booking_id=?",
        [req.params.addon_id, req.params.id],
      );
      const [addons] = await db.query(
        "SELECT SUM(amount) as total FROM booking_addons WHERE booking_id=?",
        [req.params.id],
      );
      const addonTotal = Number(addons[0]?.total || 0);
      const [bookingRows] = await db.query(
        "SELECT * FROM bookings WHERE booking_id=?",
        [req.params.id],
      );
      const booking = bookingRows[0];
      const subtotal = Number(booking.total_price) + addonTotal;
      const gstAmount = Math.round(subtotal * GST_RATE * 100) / 100;
      const finalTotal = Math.round((subtotal + gstAmount) * 100) / 100;
      await db.query(
        "UPDATE bookings SET addon_charges=?, gst_amount=?, final_total=? WHERE booking_id=?",
        [addonTotal, gstAmount, finalTotal, req.params.id],
      );
      res.json({
        message: "Addon removed",
        new_addon_total: addonTotal,
        new_final_total: finalTotal,
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

      const [[unpaid]] = await db.query(
        "SELECT COUNT(*) AS n FROM booking_addons WHERE booking_id=? AND paid=0",
        [req.params.id],
      );

      await db.query(
        "UPDATE booking_addons SET paid=1 WHERE booking_id=? AND paid=0",
        [req.params.id],
      );

      // only stamp the mode/date when there was actually something to settle,
      // so a repeat call doesn't overwrite the original record
      if (Number(unpaid?.n || 0) > 0) {
        await ensurePaymentColumns();
        const mode = String(req.body?.payment_mode || "Cash").slice(0, 40);
        await db.query(
          "UPDATE bookings SET addon_payment_mode=?, addon_paid_at=NOW() WHERE booking_id=?",
          [mode, req.params.id],
        );
      }

      const [addons] = await db.query(
        "SELECT * FROM booking_addons WHERE booking_id=? ORDER BY created_at ASC",
        [req.params.id],
      );
      res.json({ message: "Add-ons marked as paid", addons });
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
      "SELECT COALESCE(SUM(COALESCE(final_total, total_price)),0) AS total_revenue FROM bookings WHERE status IN ('confirmed','completed')",
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
    res.json({ ...rows[0], addons, guests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/bookings/:id", requireAdmin, async (req, res) => {
  try {
    const [booking] = await db.query(
      "SELECT status FROM bookings WHERE booking_id=?",
      [req.params.id],
    );
    if (!booking.length)
      return res.status(404).json({ error: "Booking not found" });
    if (booking[0].status !== "cancelled")
      return res
        .status(400)
        .json({ error: "Only cancelled bookings can be deleted" });
    await db.query("DELETE FROM bookings WHERE booking_id=?", [req.params.id]);
    res.json({ message: "Booking deleted successfully" });
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
    } = req.body;
    if (!room_number || !room_type || !price_per_night)
      return res
        .status(400)
        .json({ error: "room_number, room_type, price_per_night required" });
    const [r] = await db.query(
      "INSERT INTO rooms (room_number,room_type,price_per_night,price_double,capacity,description,image_url,is_available) VALUES (?,?,?,?,?,?,?,1)",
      [
        room_number,
        room_type,
        price_per_night,
        price_double === undefined || price_double === "" ? null : price_double,
        capacity || 2,
        description || null,
        image_url || null,
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
      values.push(
        req.body.price_double === "" ? null : req.body.price_double,
      );
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

app.delete("/api/admin/rooms/:id", requireAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM rooms WHERE room_id=?", [req.params.id]);
    res.json({ message: "Room deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MANAGER ROUTES ───────────────────────────────────────────────────────────
app.post("/api/manager/login", async (req, res) => {
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
    res.json({ ...rows[0], addons });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/manager/bookings/:id/vehicle", requireManager, async (req, res) => {
  try {
    const {
      vehicle_type,
      vehicle_price,
      vehicle_status,
      pickup_location,
      dropoff_location,
    } = req.body;
    const validTypes = ["4-seater", "7-seater", "12-seater"];
    const validStatuses = ["pending", "assigned", "picked_up", "completed", "cancelled"];
    if (!validTypes.includes(vehicle_type))
      return res.status(400).json({ error: "Invalid vehicle type" });
    if (!validStatuses.includes(vehicle_status))
      return res.status(400).json({ error: "Invalid vehicle status" });
    if (!Number.isFinite(Number(vehicle_price)) || Number(vehicle_price) < 0)
      return res.status(400).json({ error: "Invalid vehicle price" });

    const [rows] = await db.query(
      "SELECT total_price, vehicle_price, addon_charges FROM bookings WHERE booking_id=? AND vehicle_type IS NOT NULL AND vehicle_type != 'none'",
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Vehicle booking not found" });

    const roomSubtotal = Number(rows[0].total_price || 0) - Number(rows[0].vehicle_price || 0);
    const updatedSubtotal = roomSubtotal + Number(vehicle_price);
    const gstAmount = Math.round(updatedSubtotal * GST_RATE * 100) / 100;
    const finalTotal = Math.round((updatedSubtotal + gstAmount + Number(rows[0].addon_charges || 0) * (1 + GST_RATE)) * 100) / 100;
    await db.query(
      "UPDATE bookings SET vehicle_type=?, vehicle_price=?, vehicle_status=?, pickup_location=?, dropoff_location=?, total_price=?, gst_amount=?, final_total=? WHERE booking_id=?",
      [vehicle_type, Number(vehicle_price), vehicle_status, pickup_location || null, dropoff_location || null, updatedSubtotal, gstAmount, finalTotal, req.params.id],
    );
    res.json({ message: "Vehicle details updated", vehicle_price: Number(vehicle_price), vehicle_status, pickup_location, dropoff_location, final_total: finalTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
      const addonTotal = Number(addons[0]?.total || 0);
      const subtotal = Number(booking.total_price) + addonTotal;
      const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
      const finalTotal = Math.round((subtotal + gstAmount) * 100) / 100;
      await db.query(
        `UPDATE bookings SET actual_checkout=?, hours_spent=?, addon_charges=?, gst_amount=?, final_total=?, status='completed' WHERE booking_id=?`,
        [now, hoursSpent, addonTotal, gstAmount, finalTotal, req.params.id],
      );
      res.json({
        message: "Checked out successfully",
        actual_checkout: now,
        hours_spent: hoursSpent,
        final_total: finalTotal,
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
      const { label, amount } = req.body;
      if (!label || !amount)
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
      const [r] = await db.query(
        "INSERT INTO booking_addons (booking_id, label, amount) VALUES (?,?,?)",
        [req.params.id, label, amount],
      );
      const [addons] = await db.query(
        "SELECT SUM(amount) as total FROM booking_addons WHERE booking_id=?",
        [req.params.id],
      );
      const addonTotal = Number(addons[0]?.total || 0);
      const [bookingRows] = await db.query(
        "SELECT * FROM bookings WHERE booking_id=?",
        [req.params.id],
      );
      const booking = bookingRows[0];
      const subtotal = Number(booking.total_price) + addonTotal;
      const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
      const finalTotal = Math.round((subtotal + gstAmount) * 100) / 100;
      await db.query(
        "UPDATE bookings SET addon_charges=?, gst_amount=?, final_total=? WHERE booking_id=?",
        [addonTotal, gstAmount, finalTotal, req.params.id],
      );
      res.status(201).json({
        addon_id: r.insertId,
        label,
        amount,
        new_addon_total: addonTotal,
        new_final_total: finalTotal,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.delete(
  "/api/manager/bookings/:id/addons/:addon_id",
  requireManager,
  async (req, res) => {
    try {
      await db.query(
        "DELETE FROM booking_addons WHERE addon_id=? AND booking_id=?",
        [req.params.addon_id, req.params.id],
      );
      const [addons] = await db.query(
        "SELECT SUM(amount) as total FROM booking_addons WHERE booking_id=?",
        [req.params.id],
      );
      const addonTotal = Number(addons[0]?.total || 0);
      const [bookingRows] = await db.query(
        "SELECT * FROM bookings WHERE booking_id=?",
        [req.params.id],
      );
      const booking = bookingRows[0];
      const subtotal = Number(booking.total_price) + addonTotal;
      const gstAmount = Math.round(subtotal * 0.18 * 100) / 100;
      const finalTotal = Math.round((subtotal + gstAmount) * 100) / 100;
      await db.query(
        "UPDATE bookings SET addon_charges=?, gst_amount=?, final_total=? WHERE booking_id=?",
        [addonTotal, gstAmount, finalTotal, req.params.id],
      );
      res.json({
        message: "Addon removed",
        new_addon_total: addonTotal,
        new_final_total: finalTotal,
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
      `SELECT COUNT(*) as total_bookings, SUM(COALESCE(final_total, total_price)) as total_revenue, SUM(gst_amount) as total_gst, SUM(COALESCE(addon_charges, 0)) as total_addons, COUNT(CASE WHEN status='completed' THEN 1 END) as completed, COUNT(CASE WHEN status='confirmed' THEN 1 END) as confirmed FROM bookings WHERE status NOT IN ('pending','cancelled') AND DATE(created_at) BETWEEN ? AND ?`,
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

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 VV Grand Park API running on http://localhost:${PORT}`),
);