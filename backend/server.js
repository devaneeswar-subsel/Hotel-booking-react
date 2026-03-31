const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// ─── DB CONNECTION POOL ───────────────────────────────────────────────────────
const db = mysql.createPool({
  host: "localhost",
  user: "root", // ← change to your MySQL user
  password: "Deva@15032002", // ← change to your MySQL password
  database: "hotel_db", // ← change to your database name
  waitForConnections: true,
  connectionLimit: 10,
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Hotel Booking API 🚀", status: "OK" });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Register a new user
// POST /api/auth/register
// Body: { name, email, password, phone }
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ error: "name, email and password are required" });

    // Check if email already exists
    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE email = ?",
      [email],
    );
    if (existing.length > 0)
      return res.status(409).json({ error: "Email already registered" });

    // NOTE: In production, hash the password with bcrypt before saving
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

// Login
// POST /api/auth/login
// Body: { email, password }
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });

    // NOTE: In production, compare hashed password with bcrypt
    const [rows] = await db.query(
      "SELECT user_id, name, email, role FROM users WHERE email = ? AND password = ?",
      [email, password],
    );

    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    // NOTE: In production, return a JWT token instead of raw user data
    res.json({ message: "Login successful", user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ROOMS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Get all rooms (with optional filters)
// GET /api/rooms?type=Deluxe&min_price=1000&max_price=5000&check_in=2025-08-01&check_out=2025-08-05
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

    // Exclude rooms that are already booked in the given date range
    if (check_in && check_out) {
      query += `
        AND room_id NOT IN (
          SELECT room_id FROM bookings
          WHERE status != 'cancelled'
            AND check_in_date  < ?
            AND check_out_date > ?
        )
      `;
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

// Get a single room by ID
// GET /api/rooms/:id
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
//  BOOKINGS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Create a booking
// POST /api/bookings
// Body: { user_id, room_id, check_in_date, check_out_date, guest_count }
app.post("/api/bookings", async (req, res) => {
  try {
    const { user_id, room_id, check_in_date, check_out_date, guest_count } =
      req.body;
    if (!user_id || !room_id || !check_in_date || !check_out_date)
      return res.status(400).json({
        error: "user_id, room_id, check_in_date, check_out_date are required",
      });

    // Check room exists and is available
    const [roomRows] = await db.query(
      "SELECT * FROM rooms WHERE room_id = ? AND is_available = 1",
      [room_id],
    );
    if (roomRows.length === 0)
      return res.status(404).json({ error: "Room not found or unavailable" });

    const room = roomRows[0];

    // Check for date conflicts
    const [conflicts] = await db.query(
      `SELECT booking_id FROM bookings
       WHERE room_id = ? AND status != 'cancelled'
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

    const [result] = await db.query(
      `INSERT INTO bookings (user_id, room_id, check_in_date, check_out_date, guest_count, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        user_id,
        room_id,
        check_in_date,
        check_out_date,
        guest_count || 1,
        total_price,
      ],
    );

    res.status(201).json({
      message: "Booking confirmed!",
      booking_id: result.insertId,
      total_price,
      nights,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Booking failed", details: err.message });
  }
});

// Get all bookings for a user
// GET /api/bookings/user/:user_id
app.get("/api/bookings/user/:user_id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, r.room_type, r.price_per_night, r.image_url
       FROM bookings b
       JOIN rooms r ON b.room_id = r.room_id
       WHERE b.user_id = ?
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

// Cancel a booking
// PATCH /api/bookings/:id/cancel
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

// Get dashboard stats
// GET /api/admin/stats
app.get("/api/admin/stats", async (req, res) => {
  try {
    const [[{ total_rooms }]] = await db.query(
      "SELECT COUNT(*) AS total_rooms FROM rooms",
    );
    const [[{ total_bookings }]] = await db.query(
      "SELECT COUNT(*) AS total_bookings FROM bookings",
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
       ORDER BY b.created_at DESC
       LIMIT 5`,
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

// Get all users (admin view)
// GET /api/admin/users
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

// Get all bookings (admin view)
// GET /api/admin/bookings
app.get("/api/admin/bookings", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, r.room_type
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN rooms r ON b.room_id = r.room_id
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

// Add a new room (admin)
// POST /api/admin/rooms
// Body: { room_number, room_type, price_per_night, capacity, description, image_url }
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

// Update room availability (admin)
// PATCH /api/admin/rooms/:id
// Body: { is_available }
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

// Delete a room (admin)
// DELETE /api/admin/rooms/:id
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
  console.log(`🚀 Hotel API running on http://localhost:${PORT}`);
});
