const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://hotel-booking-react-dusky.vercel.app",
      "https://hotel-booking-react-lbet51wg6-devaneeswar-subels-projects.vercel.app",
    ],
  }),
);
app.use(express.json());

// ─── DB (Railway URL or individual vars or local fallback) ───────────────────
let db;
if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
  // Railway provides a full connection URL
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
    password: process.env.MYSQLPASSWORD || "Deva@15032002",
    database: process.env.MYSQLDATABASE || "hotel_db",
    port: Number(process.env.MYSQLPORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
  });
}

// ─── RAZORPAY (env vars with fallback) ───────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SXon2zuA5nekOo",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "NZEKP2AIBvxru16wzQW4UOcW",
});

// ─── HEALTH ───────────────────────────────────────────────────────────────────
app.get("/", (req, res) =>
  res.json({ message: "VV Grand Park Residency API", status: "OK" }),
);

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════════════════════

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email, password required" });
    const [ex] = await db.query("SELECT user_id FROM users WHERE email=?", [
      email,
    ]);
    if (ex.length)
      return res.status(409).json({ error: "Email already registered" });
    const [r] = await db.query(
      "INSERT INTO users (name,email,password,phone,role) VALUES (?,?,?,?,'guest')",
      [name, email, password, phone || null],
    );
    res
      .status(201)
      .json({ message: "Registered successfully", user_id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });
    const [rows] = await db.query(
      "SELECT user_id,name,email,role,phone FROM users WHERE email=? AND password=?",
      [email, password],
    );
    if (!rows.length)
      return res.status(401).json({ error: "Invalid credentials" });
    res.json({ message: "Login successful", user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ROOMS
// ══════════════════════════════════════════════════════════════════════════════

app.get("/api/rooms", async (req, res) => {
  try {
    const { type, min_price, max_price, check_in, check_out } = req.query;
    let q = "SELECT * FROM rooms WHERE is_available=1";
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
      q += ` AND room_id NOT IN (
        SELECT room_id FROM bookings
        WHERE status NOT IN ('cancelled','pending')
          AND check_in_date<? AND check_out_date>?)`;
      p.push(check_out, check_in);
    }
    const [rooms] = await db.query(q, p);
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PAYMENT (Razorpay)
// ══════════════════════════════════════════════════════════════════════════════

// STEP 1 — Create Razorpay order + save booking as PENDING
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { user_id, room_id, check_in_date, check_out_date, guest_count } =
      req.body;
    if (!user_id || !room_id || !check_in_date || !check_out_date)
      return res.status(400).json({
        error: "user_id, room_id, check_in_date, check_out_date required",
      });

    const [roomRows] = await db.query(
      "SELECT * FROM rooms WHERE room_id=? AND is_available=1",
      [room_id],
    );
    if (!roomRows.length)
      return res.status(404).json({ error: "Room not found or unavailable" });
    const room = roomRows[0];

    const [conflicts] = await db.query(
      `SELECT booking_id FROM bookings
       WHERE room_id=? AND status NOT IN ('cancelled','pending')
         AND check_in_date<? AND check_out_date>?`,
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

    const total_price = nights * room.price_per_night;

    const [result] = await db.query(
      `INSERT INTO bookings (user_id,room_id,check_in_date,check_out_date,guest_count,total_price,status)
       VALUES (?,?,?,?,?,?,'pending')`,
      [
        user_id,
        room_id,
        check_in_date,
        check_out_date,
        guest_count || 1,
        total_price,
      ],
    );
    const booking_id = result.insertId;

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total_price * 100),
      currency: "INR",
      receipt: `booking_${booking_id}`,
      notes: {
        booking_id: String(booking_id),
        user_id: String(user_id),
        room_id: String(room_id),
      },
    });

    res.status(201).json({
      booking_id,
      total_price,
      nights,
      razorpay_order_id: razorpayOrder.id,
      razorpay_key: process.env.RAZORPAY_KEY_ID || "rzp_test_SXon2zuA5nekOo",
      room_name: `${room.room_type} — Room ${room.room_number || room_id}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// STEP 2 — Verify payment signature + confirm booking
app.post("/api/payment/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET || "NZEKP2AIBvxru16wzQW4UOcW",
      )
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      await db.query(
        "UPDATE bookings SET status='cancelled' WHERE booking_id=?",
        [booking_id],
      );
      return res
        .status(400)
        .json({ error: "Payment verification failed. Booking cancelled." });
    }

    await db.query(
      "UPDATE bookings SET status='confirmed', payment_id=? WHERE booking_id=?",
      [razorpay_payment_id, booking_id],
    );

    const [rows] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, u.phone,
              r.room_type, r.room_number, r.price_per_night, r.image_url
       FROM bookings b
       JOIN users u ON b.user_id=u.user_id
       JOIN rooms r ON b.room_id=r.room_id
       WHERE b.booking_id=?`,
      [booking_id],
    );

    res.json({
      success: true,
      message: "Payment verified. Booking confirmed!",
      booking: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// STEP 3 — Payment failed — cancel pending booking
app.post("/api/payment/failed", async (req, res) => {
  try {
    const { booking_id } = req.body;
    await db.query(
      "UPDATE bookings SET status='cancelled' WHERE booking_id=? AND status='pending'",
      [booking_id],
    );
    res.json({ message: "Booking cancelled due to payment failure." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  BOOKINGS
// ══════════════════════════════════════════════════════════════════════════════

app.get("/api/bookings/user/:user_id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, r.room_type, r.price_per_night, r.image_url
       FROM bookings b
       JOIN rooms r ON b.room_id=r.room_id
       WHERE b.user_id=? AND b.status != 'pending'
       ORDER BY b.created_at DESC`,
      [req.params.user_id],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/bookings/:id/cancel", async (req, res) => {
  try {
    const [result] = await db.query(
      "UPDATE bookings SET status='cancelled' WHERE booking_id=?",
      [req.params.id],
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: "Booking not found" });
    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN
// ══════════════════════════════════════════════════════════════════════════════

app.get("/api/admin/stats", async (req, res) => {
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
      "SELECT COALESCE(SUM(total_price),0) AS total_revenue FROM bookings WHERE status='confirmed'",
    );
    const [recent_bookings] = await db.query(
      `SELECT b.booking_id, u.name AS guest_name, r.room_type,
              b.check_in_date, b.check_out_date, b.total_price, b.status
       FROM bookings b
       JOIN users u ON b.user_id=u.user_id
       JOIN rooms r ON b.room_id=r.room_id
       WHERE b.status NOT IN ('pending')
       ORDER BY b.created_at DESC LIMIT 5`,
    );
    res.json({
      total_rooms,
      total_bookings,
      total_users,
      total_revenue,
      recent_bookings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT user_id,name,email,phone,role,created_at FROM users ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/bookings", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, r.room_type, r.room_number
       FROM bookings b
       JOIN users u ON b.user_id=u.user_id
       JOIN rooms r ON b.room_id=r.room_id
       WHERE b.status NOT IN ('pending')
       ORDER BY b.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/rooms", async (req, res) => {
  try {
    const {
      room_number,
      room_type,
      price_per_night,
      capacity,
      description,
      image_url,
    } = req.body;
    if (!room_number || !room_type || !price_per_night)
      return res
        .status(400)
        .json({ error: "room_number, room_type, price_per_night required" });
    const [r] = await db.query(
      "INSERT INTO rooms (room_number,room_type,price_per_night,capacity,description,image_url,is_available) VALUES (?,?,?,?,?,?,1)",
      [
        room_number,
        room_type,
        price_per_night,
        capacity || 2,
        description || null,
        image_url || null,
      ],
    );
    res.status(201).json({ message: "Room added", room_id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/rooms/:id", async (req, res) => {
  try {
    const {
      is_available,
      price_per_night,
      description,
      room_type,
      room_number,
      capacity,
    } = req.body;
    const fields = [];
    const values = [];
    if (is_available !== undefined) {
      fields.push("is_available=?");
      values.push(is_available);
    }
    if (price_per_night) {
      fields.push("price_per_night=?");
      values.push(price_per_night);
    }
    if (description) {
      fields.push("description=?");
      values.push(description);
    }
    if (room_type) {
      fields.push("room_type=?");
      values.push(room_type);
    }
    if (room_number) {
      fields.push("room_number=?");
      values.push(room_number);
    }
    if (capacity) {
      fields.push("capacity=?");
      values.push(capacity);
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/rooms/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM rooms WHERE room_id=?", [req.params.id]);
    res.json({ message: "Room deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 VV Grand Park API running on http://localhost:${PORT}`);
});
