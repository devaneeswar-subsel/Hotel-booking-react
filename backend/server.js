const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Resend } = require("resend"); 
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
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

app.use(express.json());
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
      "notes TEXT DEFAULT NULL",
    ];
    for (const col of cols) {
      try {
        await db.query(`ALTER TABLE bookings ADD COLUMN ${col}`);
      } catch (e) {}
    }
    await db.query(
      `CREATE TABLE IF NOT EXISTS booking_addons (addon_id INT AUTO_INCREMENT PRIMARY KEY, booking_id INT NOT NULL, label VARCHAR(100) NOT NULL, amount DECIMAL(10,2) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE)`,
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

    // ✅ Send via Resend (works on Railway)
    const { error } = await resend.emails.send({
      from: "VV Grand Park Residency <onboarding@resend.dev>",
      to: email,
      subject: "Password Reset OTP — VV Grand Park Residency",
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e9ecef"><div style="background:#0F1923;padding:28px 32px;text-align:center"><h1 style="color:#C9A84C;font-size:1.4rem;margin:0;letter-spacing:2px">VV GRAND PARK</h1><p style="color:rgba(255,255,255,0.5);font-size:0.75rem;margin:4px 0 0;letter-spacing:3px">RESIDENCY</p></div><div style="padding:32px;text-align:center;background:#fff"><h2 style="color:#0F1923;margin-bottom:8px">Password Reset OTP</h2><p style="color:#868E96;font-size:0.9rem;margin-bottom:24px">Hello ${users[0].name}, use this OTP to reset your password. Valid for <strong>10 minutes</strong>.</p><div style="background:#0F1923;border-radius:12px;padding:20px 32px;display:inline-block;margin-bottom:24px"><span style="font-size:2.5rem;font-weight:700;color:#C9A84C;letter-spacing:8px">${otp}</span></div><p style="color:#C0392B;font-size:0.8rem">Do not share this OTP with anyone.</p></div><div style="background:#0F1923;padding:16px;text-align:center"><p style="color:rgba(255,255,255,0.3);font-size:0.72rem;margin:0">VV Grand Park Residency · hello@vvgrandpark.com</p></div></div>`,
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
      q += ` AND room_id NOT IN (SELECT room_id FROM bookings WHERE status NOT IN ('cancelled','pending') AND check_in_date<? AND check_out_date>?)`;
      p.push(check_out, check_in);
    }
    const [rooms] = await db.query(q, p);
    res.json(rooms);
  } catch (err) {
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
    const { user_id, room_id, check_in_date, check_out_date, guest_count } =
      req.body;
    if (!user_id || !room_id || !check_in_date || !check_out_date)
      return res.status(400).json({ error: "Missing required fields" });
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
    const base_price = nights * room.price_per_night;
    const gst_amount = Math.round(base_price * GST_RATE * 100) / 100;
    const total_price = Math.round((base_price + gst_amount) * 100) / 100;
    const [result] = await db.query(
      `INSERT INTO bookings (user_id,room_id,check_in_date,check_out_date,guest_count,total_price,gst_amount,final_total,status) VALUES (?,?,?,?,?,?,?,?,'pending')`,
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
      gst_amount,
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

app.post("/api/payment/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id,
    } = req.body;
    const expected = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET || "NZEKP2AIBvxru16wzQW4UOcW",
      )
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
    if (expected !== razorpay_signature) {
      await db.query(
        "UPDATE bookings SET status='cancelled' WHERE booking_id=?",
        [booking_id],
      );
      return res.status(400).json({ error: "Payment verification failed." });
    }
    await db.query(
      "UPDATE bookings SET status='confirmed', payment_id=? WHERE booking_id=?",
      [razorpay_payment_id, booking_id],
    );
    const [rows] = await db.query(
      `SELECT b.*, u.name AS guest_name, u.email, u.phone, r.room_type, r.room_number, r.price_per_night, r.image_url FROM bookings b JOIN users u ON b.user_id=u.user_id JOIN rooms r ON b.room_id=r.room_id WHERE b.booking_id=?`,
      [booking_id],
    );
    res.json({
      success: true,
      message: "Payment verified. Booking confirmed!",
      booking: rows[0],
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

app.patch("/api/bookings/:id/cancel", requireAuth, async (req, res) => {
  try {
    const [result] = await db.query(
      "UPDATE bookings SET status='cancelled' WHERE booking_id=?",
      [req.params.id],
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: "Booking not found" });
    res.json({ message: "Booking cancelled successfully" });
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
    const base_price = nights * room.price_per_night;
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

app.patch("/api/bookings/:id/checkin", requireAdmin, async (req, res) => {
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
    res.json({ ...rows[0], addons });
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

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 VV Grand Park API running on http://localhost:${PORT}`),
);
