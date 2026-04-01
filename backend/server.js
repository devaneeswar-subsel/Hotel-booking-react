const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// ─── DB CONNECTION POOL ───────────────────────────────────────────────────────
const db = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "Deva@15032002", // ← your MySQL password
  database: "hotel_db",
  waitForConnections: true,
  connectionLimit: 10,
});

// ─── RAZORPAY INSTANCE ────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: "rzp_test_SXon2zuA5nekOo",
  key_secret: "NZEKP2AIBvxru16wzQW4UOcW",
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "VV Grand Park Residency API 🚀", status: "OK" });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ error: "name, email and password are required" });
    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE email = ?",
      [email],
    );
    if (existing.length > 0)
      return res.status(409).json({ error: "Email already registered" });
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, 'guest')",
      [name, email, password, phone || null],
    );
    res.status(201).json({
      message: "User registered successfully",
      user_id: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Registration failed", details: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });
    const [rows] = await db.query(
      "SELECT user_id, name, email, role FROM users WHERE email = ? AND password = ?",
      [email, password],
    );
    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });
    res.json({ message: "Login successful", user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ROOMS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.get("/api/rooms", async (req, res) => {
  try {
    const { type, min_price, max_price, check_in, check_out } = req.query;
    let query = "SELECT * FROM rooms WHERE is_available = 1";
    const params = [];
    if (type) {
      query += " AND room_type = ?";
      params.push(type);
    }
    if (min_price) {
      query += " AND price_per_night >= ?";
      params.push(Number(min_price));
    }
    if (max_price) {
      query += " AND price_per_night <= ?";
      params.push(Number(max_price));
    }
    if (check_in && check_out) {
      query += ` AND room_id NOT IN (
        SELECT room_id FROM bookings
        WHERE status NOT IN ('cancelled','pending')
          AND check_in_date < ? AND check_out_date > ?
      )`;
      params.push(check_out, check_in);
    }
    const [rooms] = await db.query(query, params);
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to fetch rooms", details: err.message });
  }
});

app.get("/api/rooms/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM rooms WHERE room_id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Room not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to fetch room", details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PAYMENT ROUTES (Razorpay)
// ══════════════════════════════════════════════════════════════════════════════

// STEP 1 — Create Razorpay order + save booking as PENDING
// POST /api/payment/create-order
// Body: { user_id, room_id, check_in_date, check_out_date, guest_count }
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { user_id, room_id, check_in_date, check_out_date, guest_count } =
      req.body;
    if (!user_id || !room_id || !check_in_date || !check_out_date)
      return res.status(400).json({
        error: "user_id, room_id, check_in_date, check_out_date are required",
      });

    // Get room details
    const [roomRows] = await db.query(
      "SELECT * FROM rooms WHERE room_id = ? AND is_available = 1",
      [room_id],
    );
    if (roomRows.length === 0)
      return res.status(404).json({ error: "Room not found or unavailable" });
    const room = roomRows[0];

    // Check date conflicts — exclude pending & cancelled
    const [conflicts] = await db.query(
      `SELECT booking_id FROM bookings
       WHERE room_id = ? AND status NOT IN ('cancelled', 'pending')
         AND check_in_date < ? AND check_out_date > ?`,
      [room_id, check_out_date, check_in_date],
    );
    if (conflicts.length > 0)
      return res
        .status(409)
        .json({ error: "Room already booked for these dates" });

    // Calculate total price
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    if (nights <= 0)
      return res
        .status(400)
        .json({ error: "check_out_date must be after check_in_date" });
    const total_price = nights * room.price_per_night;

    // Save booking as PENDING (not confirmed yet — awaits payment)
    const [result] = await db.query(
      `INSERT INTO bookings (user_id, room_id, check_in_date, check_out_date, guest_count, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
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

    // Create Razorpay order (amount in paise = total_price * 100)
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
      razorpay_key: "rzp_test_SXon2zuA5nekOo",
      room_name: `${room.room_type} — Room ${room.room_number || room_id}`,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to create order", details: err.message });
  }
});

// STEP 2 — Verify Razorpay payment signature + confirm booking
// POST /api/payment/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id }
app.post("/api/payment/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", "NZEKP2AIBvxru16wzQW4UOcW")
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      // Payment signature mismatch — mark booking as cancelled
      await db.query(
        "UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?",
        [booking_id],
      );
      return res
        .status(400)
        .json({ error: "Payment verification failed. Booking cancelled." });
    }

    // Signature valid — confirm booking and save payment ID
    await db.query(
      "UPDATE bookings SET status = 'confirmed', payment_id = ? WHERE booking_id = ?",
      [razorpay_payment_id, booking_id],
    );

    // Return full booking details for invoice
    const [rows] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, u.phone,
              r.room_type, r.room_number, r.price_per_night, r.image_url
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.booking_id = ?`,
      [booking_id],
    );

    res.json({
      success: true,
      message: "Payment verified. Booking confirmed!",
      booking: rows[0],
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Verification failed", details: err.message });
  }
});

// STEP 3 — Payment failed — cancel the pending booking
// POST /api/payment/failed
app.post("/api/payment/failed", async (req, res) => {
  try {
    const { booking_id } = req.body;
    await db.query(
      "UPDATE bookings SET status = 'cancelled' WHERE booking_id = ? AND status = 'pending'",
      [booking_id],
    );
    res.json({ message: "Booking cancelled due to payment failure." });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to cancel booking", details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  BOOKINGS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.get("/api/bookings/user/:user_id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, r.room_type, r.price_per_night, r.image_url
       FROM bookings b
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.user_id = ? AND b.status != 'pending'
       ORDER BY b.created_at DESC`,
      [req.params.user_id],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to fetch bookings", details: err.message });
  }
});

app.patch("/api/bookings/:id/cancel", async (req, res) => {
  try {
    const [result] = await db.query(
      "UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?",
      [req.params.id],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Booking not found" });
    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Cancellation failed", details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.get("/api/admin/stats", async (req, res) => {
  try {
    const [[{ total_rooms }]] = await db.query(
      "SELECT COUNT(*) AS total_rooms FROM rooms",
    );
    const [[{ total_bookings }]] = await db.query(
      "SELECT COUNT(*) AS total_bookings FROM bookings WHERE status != 'pending'",
    );
    const [[{ total_users }]] = await db.query(
      "SELECT COUNT(*) AS total_users FROM users",
    );
    const [[{ total_revenue }]] = await db.query(
      "SELECT COALESCE(SUM(total_price), 0) AS total_revenue FROM bookings WHERE status = 'confirmed'",
    );
    const [recent_bookings] = await db.query(
      `SELECT b.booking_id, u.name AS guest_name, r.room_type,
              b.check_in_date, b.check_out_date, b.total_price, b.status
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.status != 'pending'
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
    res
      .status(500)
      .json({ error: "Failed to fetch stats", details: err.message });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT user_id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to fetch users", details: err.message });
  }
});

app.get("/api/admin/bookings", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, r.room_type
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.status != 'pending'
       ORDER BY b.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to fetch bookings", details: err.message });
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
      return res.status(400).json({
        error: "room_number, room_type, price_per_night are required",
      });
    const [result] = await db.query(
      `INSERT INTO rooms (room_number, room_type, price_per_night, capacity, description, image_url, is_available)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        room_number,
        room_type,
        price_per_night,
        capacity || 2,
        description || null,
        image_url || null,
      ],
    );
    res
      .status(201)
      .json({ message: "Room added successfully", room_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add room", details: err.message });
  }
});

app.patch("/api/admin/rooms/:id", async (req, res) => {
  try {
    const { is_available, price_per_night, description } = req.body;
    const fields = [];
    const values = [];
    if (is_available !== undefined) {
      fields.push("is_available = ?");
      values.push(is_available);
    }
    if (price_per_night) {
      fields.push("price_per_night = ?");
      values.push(price_per_night);
    }
    if (description) {
      fields.push("description = ?");
      values.push(description);
    }
    if (fields.length === 0)
      return res.status(400).json({ error: "No fields to update" });
    values.push(req.params.id);
    await db.query(
      `UPDATE rooms SET ${fields.join(", ")} WHERE room_id = ?`,
      values,
    );
    res.json({ message: "Room updated successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to update room", details: err.message });
  }
});

app.delete("/api/admin/rooms/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM rooms WHERE room_id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Room not found" });
    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to delete room", details: err.message });
  }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 VV Grand Park API running on http://localhost:${PORT}`);
});
