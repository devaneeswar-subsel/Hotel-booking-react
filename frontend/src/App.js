import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

import Hero from "./Hero";
import Rooms from "./Rooms";
import CalendarSection from "./CalendarSection";
import Facilities from "./Facilities";
import Gallery from "./Gallery";
import Testimonials from "./Testimonials";
import Footer from "./Footer";
import RoomDetail from "./Roomdetail";
const API = "http://localhost:5000";

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 3200);
    return () => clearTimeout(t);
  }, [onHide]);
  return <div className={`toast ${type}`}>{msg}</div>;
}

// ─── BOOKING MODAL (used by both guests AND admin) ────────────────────────────
function BookingModal({ room, user, onClose, showToast }) {
  const [form, setForm] = useState({
    check_in_date: "",
    check_out_date: "",
    guest_count: 1,
  });
  const [loading, setLoading] = useState(false);

  const nights =
    form.check_in_date && form.check_out_date
      ? Math.max(
          0,
          Math.ceil(
            (new Date(form.check_out_date) - new Date(form.check_in_date)) /
              86400000,
          ),
        )
      : 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (nights <= 0) {
      showToast("Check-out must be after check-in!", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          room_id: room.room_id,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(
        `Booking confirmed! Total: Rs.${Number(data.total_price).toLocaleString()}`,
        "success",
      );
      onClose();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-bg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>
            Book {room.room_type} — Room {room.room_number || room.room_id}
          </h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Check-in Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={form.check_in_date}
                  onChange={(e) =>
                    setForm({ ...form, check_in_date: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Check-out Date</label>
                <input
                  type="date"
                  required
                  min={
                    form.check_in_date || new Date().toISOString().split("T")[0]
                  }
                  value={form.check_out_date}
                  onChange={(e) =>
                    setForm({ ...form, check_out_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label>Number of Guests</label>
              <input
                type="number"
                min="1"
                max={room.capacity || 4}
                value={form.guest_count}
                onChange={(e) =>
                  setForm({ ...form, guest_count: +e.target.value })
                }
              />
            </div>
            {nights > 0 && (
              <div className="price-summary">
                <span>
                  Rs.{Number(room.price_per_night).toLocaleString()} × {nights}{" "}
                  night{nights > 1 ? "s" : ""}
                </span>
                <strong>
                  Rs.{(room.price_per_night * nights).toLocaleString()}
                </strong>
              </div>
            )}
            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? "Confirming..." : "Confirm Booking"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function AuthModal({ onClose, onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url =
        mode === "login" ? `${API}/api/auth/login` : `${API}/api/auth/register`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (mode === "login") {
        onLogin(data.user);
        onClose();
      } else {
        setMode("login");
        setError("Registered! Please login.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-bg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {error && <p className="error-msg">{error}</p>}
          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  required
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            {mode === "register" && (
              <div className="form-group">
                <label>Phone (optional)</label>
                <input
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            )}
            <button className="submit-btn" type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Login"
                  : "Register"}
            </button>
          </form>
          <div className="auth-switch">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MY BOOKINGS MODAL (guests) ───────────────────────────────────────────────
function MyBookingsModal({ user, onClose, showToast }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/bookings/user/${user.user_id}`)
      .then((r) => r.json())
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [user]);

  async function cancelBooking(id) {
    try {
      const res = await fetch(`${API}/api/bookings/${id}/cancel`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookings((b) =>
        b.map((x) => (x.booking_id === id ? { ...x, status: "cancelled" } : x)),
      );
      showToast("Booking cancelled", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  return (
    <div
      className="modal-bg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "580px" }}>
        <div className="modal-header">
          <h2>My Bookings</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div
          className="modal-body"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          {loading ? (
            <div className="loader">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <p>No bookings yet.</p>
            </div>
          ) : (
            bookings.map((b) => (
              <div className="booking-card" key={b.booking_id}>
                <img
                  src={
                    b.image_url ||
                    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=200"
                  }
                  alt={b.room_type}
                />
                <div className="booking-info">
                  <h4>{b.room_type}</h4>
                  <p>
                    {b.check_in_date?.slice(0, 10)} →{" "}
                    {b.check_out_date?.slice(0, 10)}
                  </p>
                  <p style={{ marginTop: "4px" }}>
                    <strong>Rs.{Number(b.total_price).toLocaleString()}</strong>
                    &nbsp;&nbsp;
                    <span className={`badge badge-${b.status}`}>
                      {b.status}
                    </span>
                  </p>
                </div>
                {b.status === "confirmed" && (
                  <button
                    className="cancel-btn"
                    onClick={() => cancelBooking(b.booking_id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function AdminDashboard({ adminUser, onClose, showToast, fullPage = false }) {
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingRoom, setBookingRoom] = useState(null); // admin books a room

  // Load all data on mount
  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/admin/stats`).then((r) => r.json()),
      fetch(`${API}/api/admin/bookings`).then((r) => r.json()),
      fetch(`${API}/api/rooms`).then((r) => r.json()),
      fetch(`${API}/api/admin/users`)
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([s, b, r, u]) => {
        setStats(s);
        setBookings(Array.isArray(b) ? b : []);
        setRooms(Array.isArray(r) ? r : []);
        setUsers(Array.isArray(u) ? u : []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function cancelBooking(id) {
    try {
      const res = await fetch(`${API}/api/bookings/${id}/cancel`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookings((b) =>
        b.map((x) => (x.booking_id === id ? { ...x, status: "cancelled" } : x)),
      );
      showToast("Booking cancelled", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function toggleRoom(roomId, currentStatus) {
    try {
      const res = await fetch(`${API}/api/admin/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: currentStatus ? 0 : 1 }),
      });
      if (!res.ok) throw new Error("Failed");
      setRooms((r) =>
        r.map((x) =>
          x.room_id === roomId
            ? { ...x, is_available: currentStatus ? 0 : 1 }
            : x,
        ),
      );
      showToast(`Room ${currentStatus ? "disabled" : "enabled"}`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  function downloadInvoice(b) {
    const checkIn = b.check_in_date?.slice(0, 10);
    const checkOut = b.check_out_date?.slice(0, 10);
    const nights =
      checkIn && checkOut
        ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000)
        : 1;
    const lines = [
      "================================================",
      "          GLAMOUR HOTEL — INVOICE               ",
      "================================================",
      `Invoice No   : INV-${String(b.booking_id).padStart(5, "0")}`,
      `Date         : ${new Date().toLocaleDateString("en-IN")}`,
      "------------------------------------------------",
      "GUEST DETAILS",
      `Name         : ${b.guest_name}`,
      `Email        : ${b.email}`,
      "------------------------------------------------",
      "BOOKING DETAILS",
      `Room Type    : ${b.room_type}`,
      `Check-in     : ${checkIn}`,
      `Check-out    : ${checkOut}`,
      `Nights       : ${nights}`,
      `Guests       : ${b.guest_count}`,
      `Status       : ${b.status?.toUpperCase()}`,
      "------------------------------------------------",
      "PAYMENT SUMMARY",
      `Price/Night  : Rs.${Math.round(Number(b.total_price) / nights).toLocaleString()}`,
      `Nights       : ${nights}`,
      `Total Amount : Rs.${Number(b.total_price).toLocaleString()}`,
      "================================================",
      "     Thank you for choosing GLAMOUR HOTEL!      ",
      "================================================",
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice-INV${String(b.booking_id).padStart(5, "0")}-${(b.guest_name || "guest").replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs = ["stats", "bookings", "rooms", "users", "book a room"];

  const content = (
    <>
      {/* TAB NAV */}
      <div className="tab-nav" style={{ marginBottom: "28px" }}>
        {tabs.map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
            style={{ textTransform: "capitalize" }}
          >
            {t === "stats" && "📊 "}
            {t === "bookings" && "🎫 "}
            {t === "rooms" && "🏨 "}
            {t === "users" && "👥 "}
            {t === "book a room" && "➕ "}
            {t}
          </button>
        ))}
      </div>

      <div>
        {loading ? (
          <div className="loader">Loading dashboard...</div>
        ) : (
          <>
            {/* ── STATS TAB ── */}
            {tab === "stats" && stats && (
              <div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="label">Total Rooms</div>
                    <div className="value">{stats.total_rooms}</div>
                  </div>
                  <div className="stat-card">
                    <div className="label">Total Bookings</div>
                    <div className="value">{stats.total_bookings}</div>
                  </div>
                  <div className="stat-card">
                    <div className="label">Total Users</div>
                    <div className="value">{stats.total_users}</div>
                  </div>
                  <div className="stat-card">
                    <div className="label">Total Revenue</div>
                    <div className="value" style={{ fontSize: "1.3rem" }}>
                      Rs.{Number(stats.total_revenue).toLocaleString()}
                    </div>
                  </div>
                </div>

                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1rem",
                    marginBottom: "16px",
                    marginTop: "8px",
                  }}
                >
                  Recent Bookings
                </h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Guest</th>
                        <th>Room</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.recent_bookings || []).map((b) => (
                        <tr key={b.booking_id}>
                          <td>#{b.booking_id}</td>
                          <td>{b.guest_name}</td>
                          <td>{b.room_type}</td>
                          <td>{b.check_in_date?.slice(0, 10)}</td>
                          <td>{b.check_out_date?.slice(0, 10)}</td>
                          <td>Rs.{Number(b.total_price).toLocaleString()}</td>
                          <td>
                            <span className={`badge badge-${b.status}`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── ALL BOOKINGS TAB ── */}
            {tab === "bookings" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <span
                    style={{ fontSize: "0.875rem", color: "var(--c-muted)" }}
                  >
                    {bookings.length} total bookings
                  </span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Guest</th>
                        <th>Email</th>
                        <th>Room</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        <th>Guests</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.booking_id}>
                          <td>#{b.booking_id}</td>
                          <td style={{ fontWeight: 600 }}>{b.guest_name}</td>
                          <td
                            style={{
                              color: "var(--c-muted)",
                              fontSize: "0.8rem",
                            }}
                          >
                            {b.email}
                          </td>
                          <td>{b.room_type}</td>
                          <td>{b.check_in_date?.slice(0, 10)}</td>
                          <td>{b.check_out_date?.slice(0, 10)}</td>
                          <td>{b.guest_count}</td>
                          <td style={{ fontWeight: 600 }}>
                            Rs.{Number(b.total_price).toLocaleString()}
                          </td>
                          <td>
                            <span className={`badge badge-${b.status}`}>
                              {b.status}
                            </span>
                          </td>
                          <td
                            style={{
                              display: "flex",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            {b.status === "confirmed" && (
                              <button
                                className="cancel-btn"
                                style={{
                                  fontSize: "0.72rem",
                                  padding: "4px 10px",
                                }}
                                onClick={() => cancelBooking(b.booking_id)}
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => downloadInvoice(b)}
                              style={{
                                fontSize: "0.72rem",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                border: "1.5px solid var(--c-teal)",
                                color: "var(--c-teal)",
                                background: "none",
                                cursor: "pointer",
                                fontFamily: "var(--font-body)",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              ⬇ Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── ROOMS TAB ── */}
            {tab === "rooms" && (
              <div>
                <div
                  style={{
                    marginBottom: "16px",
                    fontSize: "0.875rem",
                    color: "var(--c-muted)",
                  }}
                >
                  {rooms.length} rooms total — toggle availability below
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Room No.</th>
                        <th>Type</th>
                        <th>Price/Night</th>
                        <th>Capacity</th>
                        <th>Available</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((r) => (
                        <tr key={r.room_id}>
                          <td style={{ fontWeight: 600 }}>
                            #{r.room_number || r.room_id}
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: "#EEF0FF",
                                color: "var(--c-primary)",
                              }}
                            >
                              {r.room_type}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            Rs.{Number(r.price_per_night).toLocaleString()}
                          </td>
                          <td>👤 {r.capacity || 2}</td>
                          <td>
                            <span
                              className={`badge ${r.is_available ? "badge-confirmed" : "badge-cancelled"}`}
                            >
                              {r.is_available ? "Available" : "Disabled"}
                            </span>
                          </td>
                          <td style={{ display: "flex", gap: "8px" }}>
                            <button
                              className="cancel-btn"
                              style={{
                                fontSize: "0.75rem",
                                padding: "4px 10px",
                                borderColor: r.is_available
                                  ? "var(--c-accent)"
                                  : "var(--c-teal)",
                                color: r.is_available
                                  ? "var(--c-accent)"
                                  : "var(--c-teal)",
                              }}
                              onClick={() =>
                                toggleRoom(r.room_id, r.is_available)
                              }
                            >
                              {r.is_available ? "Disable" : "Enable"}
                            </button>
                            <button
                              className="book-btn"
                              style={{
                                width: "auto",
                                padding: "4px 14px",
                                fontSize: "0.75rem",
                                marginTop: 0,
                              }}
                              onClick={() => setBookingRoom(r)}
                            >
                              Book
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── USERS TAB ── */}
            {tab === "users" && (
              <div>
                <div
                  style={{
                    marginBottom: "16px",
                    fontSize: "0.875rem",
                    color: "var(--c-muted)",
                  }}
                >
                  {users.length} registered users
                </div>
                {users.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">👥</div>
                    <p>
                      No users found. Add GET /api/admin/users to your server.js
                    </p>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Role</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.user_id}>
                            <td>#{u.user_id}</td>
                            <td style={{ fontWeight: 600 }}>{u.name}</td>
                            <td
                              style={{
                                color: "var(--c-muted)",
                                fontSize: "0.8rem",
                              }}
                            >
                              {u.email}
                            </td>
                            <td>{u.phone || "—"}</td>
                            <td>
                              <span
                                className={`badge ${u.role === "admin" ? "badge-confirmed" : "badge-completed"}`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td
                              style={{
                                color: "var(--c-muted)",
                                fontSize: "0.8rem",
                              }}
                            >
                              {u.created_at?.slice(0, 10)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── BOOK A ROOM TAB ── */}
            {tab === "book a room" && (
              <div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--c-muted)",
                    marginBottom: "20px",
                  }}
                >
                  Admin booking — select any available room below and click
                  Book.
                </p>
                <div className="rooms-grid">
                  {rooms
                    .filter((r) => r.is_available)
                    .map((r) => (
                      <div className="room-card" key={r.room_id}>
                        <div className="room-card-img">
                          <img
                            src={
                              r.image_url ||
                              "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600"
                            }
                            alt={r.room_type}
                          />
                          <div className="room-type-badge">{r.room_type}</div>
                        </div>
                        <div className="room-card-body">
                          <h3>Room {r.room_number || r.room_id}</h3>
                          <p>{r.description || "Premium hotel room."}</p>
                          <div className="room-card-footer">
                            <div className="room-price">
                              Rs.{Number(r.price_per_night).toLocaleString()}{" "}
                              <span>/night</span>
                            </div>
                            <div className="room-capacity">
                              👤 {r.capacity || 2}
                            </div>
                          </div>
                          <button
                            className="book-btn"
                            onClick={() => setBookingRoom(r)}
                          >
                            Book this Room
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  return fullPage ? (
    <div>
      {content}
      {bookingRoom && (
        <BookingModal
          room={bookingRoom}
          user={adminUser}
          onClose={() => setBookingRoom(null)}
          showToast={(msg, type) => {
            showToast(msg, type);
            setBookingRoom(null);
            fetch(`${API}/api/admin/bookings`)
              .then((r) => r.json())
              .then(setBookings);
            fetch(`${API}/api/admin/stats`)
              .then((r) => r.json())
              .then(setStats);
          }}
        />
      )}
    </div>
  ) : (
    <div
      className="modal-bg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        style={{
          maxWidth: "900px",
          width: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          className="modal-header"
          style={{ background: "var(--c-dark)", borderRadius: "16px 16px 0 0" }}
        >
          <h2 style={{ color: "#fff", fontFamily: "var(--font-display)" }}>
            Admin Dashboard
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            style={{ color: "#fff" }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: "24px" }}>{content}</div>
      </div>
      {bookingRoom && (
        <BookingModal
          room={bookingRoom}
          user={adminUser}
          onClose={() => setBookingRoom(null)}
          showToast={(msg, type) => {
            showToast(msg, type);
            setBookingRoom(null);
            fetch(`${API}/api/admin/bookings`)
              .then((r) => r.json())
              .then(setBookings);
            fetch(`${API}/api/admin/stats`)
              .then((r) => r.json())
              .then(setStats);
          }}
        />
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);

  function handleLogin(u) {
    setUser(u);
    showToast(`Welcome, ${u.name.split(" ")[0]}!`, "success");
    // Auto-open admin dashboard if admin logs in
    if (u.role === "admin") {
      setTimeout(() => setShowAdmin(true), 600);
    }
  }

  function handleLogout() {
    setUser(null);
    setShowBookings(false);
    setShowAdmin(false);
    showToast("Logged out successfully", "success");
  }

  // ── ROOM DETAIL PAGE ──────────────────────────────────────────────────────
  if (selectedRoom) {
    return (
      <>
        <RoomDetail
          room={selectedRoom}
          user={user}
          onBack={() => setSelectedRoom(null)}
          onBook={(room) => setBookingRoom(room)}
          onAuthPrompt={() => setShowAuth(true)}
        />
        {bookingRoom && user && (
          <BookingModal
            room={bookingRoom}
            user={user}
            onClose={() => setBookingRoom(null)}
            showToast={showToast}
          />
        )}
        {showAuth && (
          <AuthModal onClose={() => setShowAuth(false)} onLogin={handleLogin} />
        )}
        {toast && (
          <Toast
            msg={toast.msg}
            type={toast.type}
            onHide={() => setToast(null)}
          />
        )}
      </>
    );
  }

  // ── ADMIN PAGE (full page) ──────────────────────────────────────────────────
  if (showAdmin && user?.role === "admin") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--c-bg)",
          fontFamily: "var(--font-body)",
        }}
      >
        {/* Admin Navbar */}
        <div
          style={{
            background: "var(--c-dark)",
            padding: "0 2rem",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.5px",
            }}
          >
            ⚙️ GLAMOUR — Admin Panel
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}
            >
              Logged in as {user.name}
            </span>
            <button
              onClick={() => setShowAdmin(false)}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                padding: "8px 18px",
                borderRadius: "8px",
                fontFamily: "var(--font-body)",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              ← Back to Site
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: "var(--c-accent)",
                border: "none",
                color: "#fff",
                padding: "8px 18px",
                borderRadius: "8px",
                fontFamily: "var(--font-body)",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Admin Content */}
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
          <AdminDashboard
            adminUser={user}
            onClose={() => setShowAdmin(false)}
            showToast={showToast}
            fullPage={true}
          />
        </div>

        {toast && (
          <Toast
            msg={toast.msg}
            type={toast.type}
            onHide={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  // ── MAIN SITE ──────────────────────────────────────────────────────────────
  return (
    <div>
      <Hero
        user={user}
        onAuthClick={() => setShowAuth(true)}
        onLogout={handleLogout}
        onMyBookings={() =>
          user?.role === "admin" ? setShowAdmin(true) : setShowBookings(true)
        }
      />

      <Rooms
        user={user}
        onBookClick={(room) => setBookingRoom(room)}
        onCardClick={(room) => setSelectedRoom(room)}
        onAuthPrompt={() => setShowAuth(true)}
      />

      <CalendarSection />
      <Facilities />
      <Gallery />
      <Testimonials />
      <Footer />

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onLogin={handleLogin} />
      )}

      {bookingRoom && user && (
        <BookingModal
          room={bookingRoom}
          user={user}
          onClose={() => setBookingRoom(null)}
          showToast={showToast}
        />
      )}

      {showBookings && user && user.role !== "admin" && (
        <MyBookingsModal
          user={user}
          onClose={() => setShowBookings(false)}
          showToast={showToast}
        />
      )}

      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}

      {user && user.role !== "admin" && (
        <button
          onClick={() => setShowBookings(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            left: "24px",
            zIndex: 300,
            background: "var(--c-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "30px",
            padding: "12px 20px",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(108,99,255,0.4)",
          }}
        >
          🎫 My Bookings
        </button>
      )}
    </div>
  );
}
