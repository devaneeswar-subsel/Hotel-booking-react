import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

import Hero from "./Hero";
import Rooms from "./Rooms";
import CalendarSection from "./CalendarSection";
import Facilities from "./Facilities";
import Gallery from "./Gallery";
import Testimonials from "./Testimonials";
import Footer from "./Footer";

const API = "http://localhost:5000";

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 3200);
    return () => clearTimeout(t);
  }, [onHide]);
  return <div className={`toast ${type}`}>{msg}</div>;
}

// ─── BOOKING MODAL ────────────────────────────────────────────────────────────
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
          <h2>Book {room.room_type}</h2>
          <button className="modal-close" onClick={onClose}>
            x
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
                  Rs.{Number(room.price_per_night).toLocaleString()} x {nights}{" "}
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
            x
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
                placeholder="..."
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

// ─── MY BOOKINGS MODAL ────────────────────────────────────────────────────────
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
            x
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
              <div className="empty-icon">No bookings yet</div>
              <p>Book a room to get started!</p>
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
                    {b.check_in_date?.slice(0, 10)} to{" "}
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

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);

  function handleLogin(u) {
    setUser(u);
    showToast(`Welcome back, ${u.name.split(" ")[0]}!`, "success");
  }

  function handleLogout() {
    setUser(null);
    setShowBookings(false);
    showToast("Logged out successfully", "success");
  }

  return (
    <div>
      <Hero
        user={user}
        onAuthClick={() => setShowAuth(true)}
        onLogout={handleLogout}
        onMyBookings={() => setShowBookings(true)}
      />

      <Rooms
        user={user}
        onBookClick={(room) => setBookingRoom(room)}
        onAuthPrompt={() => setShowAuth(true)}
      />

      <CalendarSection />
      <Facilities />
      <Gallery />
      <Testimonials />
      <Footer />

      {/* MODALS */}
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

      {showBookings && user && (
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

      {/* My Bookings floating button */}
      {user && (
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
          My Bookings
        </button>
      )}
    </div>
  );
}
