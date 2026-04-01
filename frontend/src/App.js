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
import AdminDashboard from "./AdminDashboard";
import {
  XIcon,
  CheckIcon,
  BookingIcon,
  DownloadIcon,
  ArrowRightIcon,
} from "./Icons";

const API = "http://localhost:5000";

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 3500);
    return () => clearTimeout(t);
  }, [onHide]);
  return <div className={`toast ${type}`}>{msg}</div>;
}

// ─── PAYMENT SUCCESS SCREEN ───────────────────────────────────────────────────
function PaymentSuccess({ booking, onClose, onDownloadInvoice }) {
  const nights =
    booking.check_in_date && booking.check_out_date
      ? Math.ceil(
          (new Date(booking.check_out_date) - new Date(booking.check_in_date)) /
            86400000,
        )
      : 1;

  return (
    <div className="modal-bg">
      <div className="modal" style={{ maxWidth: "460px" }}>
        {/* Success Header */}
        <div
          style={{
            background: "var(--navy)",
            padding: "32px 28px 24px",
            textAlign: "center",
            borderRadius: "20px 20px 0 0",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(45,154,110,0.2)",
              border: "2px solid #2D9A6E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <CheckIcon size={28} color="#2D9A6E" />
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.4rem",
              fontWeight: 600,
              color: "#fff",
              marginBottom: 6,
            }}
          >
            Booking Confirmed!
          </div>
          <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>
            Payment successful — your room is reserved
          </div>
        </div>

        {/* Booking Details */}
        <div style={{ padding: "24px 28px" }}>
          <div
            style={{
              background: "var(--gray-50)",
              borderRadius: "var(--radius-md)",
              padding: "16px 18px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "var(--navy)",
                }}
              >
                {booking.room_type}
              </span>
              <span
                style={{
                  background: "#E8F8F0",
                  color: "#2D9A6E",
                  padding: "3px 10px",
                  borderRadius: 3,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Confirmed
              </span>
            </div>
            {[
              { label: "Booking ID", val: `#${booking.booking_id}` },
              { label: "Check-in", val: booking.check_in_date?.slice(0, 10) },
              { label: "Check-out", val: booking.check_out_date?.slice(0, 10) },
              { label: "Nights", val: nights },
              { label: "Payment ID", val: booking.payment_id || "—" },
            ].map(({ label, val }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.82rem",
                  padding: "5px 0",
                  borderTop: "1px solid var(--gray-200)",
                }}
              >
                <span style={{ color: "var(--gray-400)" }}>{label}</span>
                <span style={{ fontWeight: 600, color: "var(--navy)" }}>
                  {val}
                </span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.95rem",
                padding: "10px 0 4px",
                borderTop: "1.5px solid var(--navy)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  color: "var(--navy)",
                }}
              >
                Total Paid
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  color: "var(--navy)",
                  fontSize: "1.1rem",
                }}
              >
                Rs.{Number(booking.total_price).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <button
            onClick={onDownloadInvoice}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "var(--radius-sm)",
              background: "var(--navy)",
              color: "var(--white)",
              border: "none",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 10,
              transition: "all 0.22s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--gold)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--navy)")
            }
          >
            <DownloadIcon size={15} color="currentColor" />
            Download Invoice (PDF)
          </button>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              color: "var(--gray-600)",
              border: "1.5px solid var(--gray-200)",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Back to Site
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BOOKING MODAL WITH RAZORPAY ──────────────────────────────────────────────
function BookingModal({ room, user, onClose, showToast }) {
  const [form, setForm] = useState({
    check_in_date: "",
    check_out_date: "",
    guest_count: 1,
  });
  const [loading, setLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

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
      // STEP 1 — Create Razorpay order + pending booking on backend
      const orderRes = await fetch(`${API}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.user_id,
          room_id: room.room_id,
          ...form,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      const {
        booking_id,
        total_price,
        razorpay_order_id,
        razorpay_key,
        room_name,
      } = orderData;

      // STEP 2 — Open Razorpay checkout
      const options = {
        key: razorpay_key,
        amount: Math.round(total_price * 100),
        currency: "INR",
        name: "VV Grand Park Residency",
        description: room_name,
        order_id: razorpay_order_id,
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone || "",
        },
        theme: { color: "#0F1923" },
        modal: {
          ondismiss: async () => {
            // User closed the modal without paying — cancel pending booking
            await fetch(`${API}/api/payment/failed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ booking_id }),
            });
            showToast("Payment cancelled. Booking was not confirmed.", "error");
            setLoading(false);
          },
        },
        handler: async (response) => {
          // STEP 3 — Verify payment on backend
          try {
            const verifyRes = await fetch(`${API}/api/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_id,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error);
            // STEP 4 — Show success screen with confirmed booking
            setConfirmedBooking(verifyData.booking);
          } catch (err) {
            showToast(err.message, "error");
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", async (resp) => {
        await fetch(`${API}/api/payment/failed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id }),
        });
        showToast(`Payment failed: ${resp.error.description}`, "error");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      showToast(err.message, "error");
      setLoading(false);
    }
  }

  // Download invoice after successful payment
  async function downloadInvoice() {
    if (!confirmedBooking) return;
    const b = confirmedBooking;
    const ci = b.check_in_date?.slice(0, 10);
    const co = b.check_out_date?.slice(0, 10);
    const nights =
      ci && co ? Math.ceil((new Date(co) - new Date(ci)) / 86400000) : 1;
    const invNo = `INV-${String(b.booking_id).padStart(5, "0")}`;
    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const pricePer = Math.round(Number(b.total_price) / nights);

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;

    doc.setFillColor(15, 25, 35);
    doc.rect(0, 0, W, 42, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(201, 168, 76);
    doc.text("VV GRAND PARK", 18, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(180, 160, 100);
    doc.text("RESIDENCY", 18, 25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("INVOICE", W - 18, 20, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 140, 120);
    doc.text(invNo, W - 18, 27, { align: "right" });
    doc.text(`Date: ${today}`, W - 18, 33, { align: "right" });

    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.5);
    doc.line(18, 48, W - 18, 48);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(134, 142, 150);
    doc.text("BILL TO", 18, 58);
    doc.text("FROM", W / 2 + 10, 58);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 25, 35);
    doc.text(b.guest_name || user.name, 18, 66);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(73, 80, 87);
    doc.text(b.email || user.email, 18, 72);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 25, 35);
    doc.text("VV Grand Park Residency", W / 2 + 10, 66);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(73, 80, 87);
    doc.text("123 Palace Road, Chennai", W / 2 + 10, 72);
    doc.text("hello@vvgrandpark.com", W / 2 + 10, 78);
    doc.text("+91 12345 67890", W / 2 + 10, 84);

    const tableTop = 98;
    doc.setFillColor(15, 25, 35);
    doc.rect(18, tableTop, W - 36, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(201, 168, 76);
    doc.text("DESCRIPTION", 24, tableTop + 7);
    doc.text("DETAILS", 110, tableTop + 7);
    doc.text("AMOUNT", W - 18, tableTop + 7, { align: "right" });

    const rows = [
      {
        desc: `${b.room_type} — Room ${b.room_number || b.room_id}`,
        detail: `${ci} → ${co}`,
        amount: `Rs.${pricePer.toLocaleString()} × ${nights} night${nights > 1 ? "s" : ""}`,
      },
      {
        desc: "Guest Count",
        detail: `${b.guest_count || 1} guest${(b.guest_count || 1) > 1 ? "s" : ""}`,
        amount: "—",
      },
      { desc: "Payment ID", detail: b.payment_id || "—", amount: "—" },
      { desc: "Booking Reference", detail: invNo, amount: "—" },
    ];

    let y = tableTop + 18;
    rows.forEach((row, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(18, y - 6, W - 36, 10, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(15, 25, 35);
      doc.text(row.desc, 24, y);
      doc.setTextColor(73, 80, 87);
      doc.text(row.detail, 110, y);
      doc.text(row.amount, W - 18, y, { align: "right" });
      y += 12;
    });

    y += 4;
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.3);
    doc.line(18, y, W - 18, y);
    y += 10;
    doc.setFillColor(15, 25, 35);
    doc.roundedRect(W - 80, y - 6, 62, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(201, 168, 76);
    doc.text("TOTAL PAID", W - 49, y + 1, { align: "center" });
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(`Rs.${Number(b.total_price).toLocaleString()}`, W - 49, y + 9, {
      align: "center",
    });

    y += 28;
    doc.setFillColor(45, 154, 110);
    doc.roundedRect(18, y - 5, 36, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("CONFIRMED", 36, y + 2, { align: "center" });

    const footerY = 272;
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.4);
    doc.line(18, footerY, W - 18, footerY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(134, 142, 150);
    doc.text(
      "Thank you for choosing VV Grand Park Residency. We look forward to welcoming you again.",
      W / 2,
      footerY + 7,
      { align: "center" },
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      "www.vvgrandpark.com  |  hello@vvgrandpark.com  |  +91 12345 67890",
      W / 2,
      footerY + 13,
      { align: "center" },
    );

    doc.save(
      `${invNo}-${(b.guest_name || user.name).replace(/\s+/g, "_")}.pdf`,
    );
  }

  // Show success screen after payment
  if (confirmedBooking) {
    return (
      <PaymentSuccess
        booking={confirmedBooking}
        onClose={onClose}
        onDownloadInvoice={downloadInvoice}
      />
    );
  }

  return (
    <div
      className="modal-bg"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>
            Book {room.room_type} — Room {room.room_number || room.room_id}
          </h2>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            <XIcon size={14} color="#495057" />
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

            {/* Pay with Razorpay */}
            <button
              className="submit-btn"
              type="submit"
              disabled={loading || nights <= 0}
              style={{ opacity: nights <= 0 ? 0.5 : 1 }}
            >
              {loading ? (
                "Opening Payment..."
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                  </svg>
                  Pay Now — Rs.
                  {nights > 0
                    ? (room.price_per_night * nights).toLocaleString()
                    : "0"}
                </>
              )}
            </button>

            <p
              style={{
                textAlign: "center",
                fontSize: "0.72rem",
                color: "var(--gray-400)",
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Secured by Razorpay · UPI, Cards, Net Banking accepted
            </p>
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
        setError("Registered successfully! Please login.");
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
            <XIcon size={14} color="#495057" />
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
                  ? "Sign In"
                  : "Create Account"}
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
                  Sign in
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
            <XIcon size={14} color="#495057" />
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
              <div className="empty-icon">
                <BookingIcon size={22} />
              </div>
              <p>No confirmed bookings yet.</p>
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
                  <p style={{ marginTop: "6px" }}>
                    <strong
                      style={{
                        color: "var(--navy)",
                        fontFamily: "var(--font-display)",
                        fontSize: "0.95rem",
                      }}
                    >
                      Rs.{Number(b.total_price).toLocaleString()}
                    </strong>
                    <span style={{ marginLeft: "10px" }}>
                      <span className={`badge badge-${b.status}`}>
                        {b.status}
                      </span>
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
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);

  function handleLogin(u) {
    setUser(u);
    showToast(`Welcome, ${u.name.split(" ")[0]}!`, "success");
    if (u.role === "admin") setTimeout(() => setShowAdmin(true), 500);
  }

  function handleLogout() {
    setUser(null);
    setShowBookings(false);
    setShowAdmin(false);
    showToast("Logged out successfully", "success");
  }

  // ── ROOM DETAIL PAGE ────────────────────────────────────────────────────────
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

  // ── ADMIN PAGE ──────────────────────────────────────────────────────────────
  if (showAdmin && user?.role === "admin") {
    return (
      <>
        <AdminDashboard
          adminUser={user}
          onClose={() => setShowAdmin(false)}
          showToast={showToast}
          fullPage={true}
        />
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

  // ── MAIN SITE ───────────────────────────────────────────────────────────────
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
            bottom: "28px",
            left: "28px",
            zIndex: 300,
            background: "var(--navy)",
            color: "var(--white)",
            border: "none",
            borderRadius: "50px",
            padding: "12px 22px",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "0.82rem",
            cursor: "pointer",
            boxShadow: "0 6px 24px rgba(15,25,35,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <BookingIcon size={15} color="var(--gold-light)" />
          My Bookings
        </button>
      )}
    </div>
  );
}
