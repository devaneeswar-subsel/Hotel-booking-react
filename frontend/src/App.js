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
import ManagerDashboard from "./ManagerDashboard";
import { XIcon, CheckIcon, BookingIcon, DownloadIcon } from "./Icons";

const API = process.env.REACT_APP_API_URL;
const GST_RATE = 0.18;

const apiFetch = (url, options = {}) =>
  fetch(`${API}${url}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

function Toast({ msg, type, onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 3500);
    return () => clearTimeout(t);
  }, [onHide]);
  return <div className={`toast ${type}`}>{msg}</div>;
}

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="cursor-pointer text-[1.6rem] transition-colors duration-150"
          style={{
            color: (hover || value) >= star ? "#C9A84C" : "#DEE2E6",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function WriteReviewModal({
  booking,
  user,
  onClose,
  showToast,
  onReviewSubmitted,
}) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return showToast("Please write a review", "error");

    setLoading(true);

    try {
      const res = await apiFetch("/api/reviews", {
        body: JSON.stringify({
          user_id: user.user_id,
          booking_id: booking.booking_id,
          room_id: booking.room_id,
          rating,
          review_text: text,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      showToast("Review submitted! Thank you 🙏", "success");
      onReviewSubmitted();
      onClose();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-bg">
      <div className="modal max-w-[460px]">
        <div className="modal-header">
          <h2>Write a Review</h2>

          <button className="modal-close" onClick={onClose}>
            <XIcon size={14} color="#495057" />
          </button>
        </div>

        <div className="modal-body">
          <div className="bg-[var(--gray-50)] rounded-lg px-[14px] py-3 mb-[18px]">
            <div className="text-[0.82rem] font-semibold text-[var(--navy)]">
              {booking.room_type}
            </div>

            <div className="text-[0.75rem] text-[var(--gray-400)] mt-[2px]">
              {booking.check_in_date?.slice(0, 10)} →{" "}
              {booking.check_out_date?.slice(0, 10)}
            </div>
          </div>

          <form onSubmit={submit}>
            <div className="form-group">
              <label>Your Rating</label>

              <StarRating value={rating} onChange={setRating} />
            </div>

            <div className="form-group">
              <label>Your Review</label>

              <textarea
                required
                rows={4}
                value={text}
                placeholder="Share your experience at VV Grand Park Residency..."
                onChange={(e) => setText(e.target.value)}
                className="
                  w-full
                  px-3
                  py-[10px]
                  rounded-lg
                  border-[1.5px]
                  border-[var(--gray-200)]
                  text-sm
                  resize-y
                  box-border
                  font-inherit
                "
              />
            </div>

            <button
              className="submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PaymentSuccess({ booking, onClose, onDownloadInvoice }) {
  const nights =
    booking.check_in_date && booking.check_out_date
      ? Math.ceil(
          (new Date(booking.check_out_date) - new Date(booking.check_in_date)) /
            86400000,
        )
      : 1;

  const basePrice = Number(booking.total_price || 0);

  const gst = Number(
    booking.gst_amount || Math.round(basePrice * GST_RATE * 100) / 100,
  );

  const total = Number(booking.final_total || basePrice + gst);

  return (
    <div className="modal-bg">
      <div className="modal max-w-[460px]">
        {/* Header */}
        <div className="bg-[var(--navy)] px-7 pt-8 pb-6 text-center rounded-t-[20px]">
          <div className="w-16 h-16 rounded-full bg-[rgba(45,154,110,0.2)] border-2 border-[#2D9A6E] flex items-center justify-center mx-auto mb-4">
            <CheckIcon size={28} color="#2D9A6E" />
          </div>

          <div className="font-[var(--font-display)] text-[1.4rem] font-semibold text-white mb-[6px]">
            Booking Confirmed!
          </div>

          <div className="text-[0.82rem] text-white/50">
            Payment successful — your room is reserved
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6">
          <div className="bg-[var(--gray-50)] rounded-[var(--radius-md)] px-[18px] py-4 mb-5">
            <div className="flex justify-between items-center mb-3">
              <span className="font-[var(--font-display)] text-base font-semibold text-[var(--navy)]">
                {booking.room_type}
              </span>

              <span className="bg-[#E8F8F0] text-[#2D9A6E] px-[10px] py-[3px] rounded-[3px] text-[0.65rem] font-bold uppercase">
                Confirmed
              </span>
            </div>

            {[
              { label: "Booking ID", val: `#${booking.booking_id}` },
              {
                label: "Check-in",
                val: booking.check_in_date?.slice(0, 10),
              },
              {
                label: "Check-out",
                val: booking.check_out_date?.slice(0, 10),
              },
              { label: "Nights", val: nights },
              {
                label: "Room Charges",
                val: `Rs.${basePrice.toLocaleString()}`,
              },
              {
                label: "GST (18%)",
                val: `Rs.${Math.round(gst).toLocaleString()}`,
              },
              {
                label: "Payment ID",
                val: booking.payment_id || "—",
              },
            ].map(({ label, val }) => (
              <div
                key={label}
                className="flex justify-between text-[0.82rem] py-[5px] border-t border-[var(--gray-200)]"
              >
                <span className="text-[var(--gray-400)]">{label}</span>

                <span className="font-semibold text-[var(--navy)]">
                  {val}
                </span>
              </div>
            ))}

            <div className="flex justify-between text-[0.95rem] pt-[10px] pb-1 border-t-[1.5px] border-[var(--navy)]">
              <span className="font-[var(--font-display)] font-semibold text-[var(--navy)]">
                Total Paid
              </span>

              <span className="font-[var(--font-display)] font-bold text-[1.1rem] text-[var(--navy)]">
                Rs.{Math.round(total).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Download Invoice */}
          <button
            onClick={onDownloadInvoice}
            className="
              w-full
              py-[13px]
              rounded-[var(--radius-sm)]
              bg-[var(--navy)]
              text-[var(--white)]
              font-[var(--font-body)]
              font-semibold
              text-[0.9rem]
              flex
              items-center
              justify-center
              gap-2
              mb-[10px]
              transition-colors
              duration-200
              hover:bg-[var(--gold)]
            "
          >
            <DownloadIcon size={15} color="currentColor" />
            Download Invoice (PDF)
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="
              w-full
              py-[11px]
              rounded-[var(--radius-sm)]
              bg-transparent
              text-[var(--gray-600)]
              border-[1.5px]
              border-[var(--gray-200)]
              font-[var(--font-body)]
              font-medium
              text-sm
              cursor-pointer
              transition-colors
              duration-200
            "
          >
            Back to Site
          </button>
        </div>
      </div>
    </div>
  );
}

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
              86400000
          )
        )
      : 0;

  const basePrice = room.price_per_night * nights;
  const gst = Math.round(basePrice * GST_RATE * 100) / 100;
  const total = basePrice + gst;

  async function handleSubmit(e) {
    e.preventDefault();
    if (nights <= 0) {
      showToast("Check-out must be after check-in!", "error");
      return;
    }
    setLoading(true);
    try {
      const orderRes = await apiFetch("/api/payment/create-order", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.user_id,
          room_id: room.room_id,
          ...form,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      const { booking_id, total_price, razorpay_order_id, razorpay_key, room_name } = orderData;

      const options = {
        key: razorpay_key,
        amount: Math.round(total_price * 100),
        currency: "INR",
        name: "VV Grand Park Residency",
        description: room_name,
        order_id: razorpay_order_id,
        prefill: { name: user.name, email: user.email, contact: user.phone || "" },
        theme: { color: "#0F1923" },
        modal: {
          ondismiss: async () => {
            await apiFetch("/api/payment/failed", {
              method: "POST",
              body: JSON.stringify({ booking_id }),
            });
            showToast("Payment cancelled.", "error");
            setLoading(false);
          },
        },
        handler: async (response) => {
          try {
            const verifyRes = await apiFetch("/api/payment/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_id,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error);
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
        await apiFetch("/api/payment/failed", {
          method: "POST",
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

  // downloadInvoice stays unchanged — no CSS involved
  async function downloadInvoice() { /* ... same as before ... */ }

  if (confirmedBooking)
    return (
      <PaymentSuccess
        booking={confirmedBooking}
        onClose={onClose}
        onDownloadInvoice={downloadInvoice}
      />
    );

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">

      {/* Modal card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-display text-base font-semibold text-navy">
            Book {room.room_type} — Room {room.room_number || room.room_id}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Date row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Check-in Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={form.check_in_date}
                  onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Check-out Date</label>
                <input
                  type="date"
                  required
                  min={form.check_in_date || new Date().toISOString().split("T")[0]}
                  value={form.check_out_date}
                  onChange={(e) => setForm({ ...form, check_out_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
                />
              </div>
            </div>

            {/* Guests */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Number of Guests</label>
              <input
                type="number"
                min="1"
                max={room.capacity || 4}
                value={form.guest_count}
                onChange={(e) => setForm({ ...form, guest_count: +e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
              />
            </div>

            {/* Price breakdown */}
            {nights > 0 && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-2">
                {[
                  {
                    label: `Rs.${Number(room.price_per_night).toLocaleString()} × ${nights} night${nights > 1 ? "s" : ""}`,
                    val: `Rs.${basePrice.toLocaleString()}`,
                  },
                  {
                    label: "GST (18%)",
                    val: `Rs.${Math.round(gst).toLocaleString()}`,
                  },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-semibold text-gray-700">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="font-display font-semibold text-navy">Total</span>
                  <strong className="font-display text-navy">
                    Rs.{Math.round(total).toLocaleString()}
                  </strong>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || nights <= 0}
              className="w-full flex items-center justify-center gap-2 bg-navy text-white font-semibold text-sm py-3 rounded-xl hover:bg-navy/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                "Opening Payment..."
              ) : (
                <>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                  </svg>
                  Pay Now — Rs.{nights > 0 ? Math.round(total).toLocaleString() : "0"}
                </>
              )}
            </button>

            {/* Security note */}
            <p className="flex items-center justify-center gap-1.5 text-[0.7rem] text-gray-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);

  const eyeBtn = (show, toggle) => (
    <button
      type="button"
      onClick={toggle}
      className="
        absolute
        right-3
        top-1/2
        -translate-y-1/2
        bg-transparent
        border-0
        cursor-pointer
        text-[var(--gray-400)]
        text-base
        p-0
      "
    >
      {show ? "🙈" : "👁️"}
    </button>
  );

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "login") {
        const res = await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: form.email,
            password: form.password,
          }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        onLogin(data.user);
        onClose();
      } else if (mode === "register") {
        const res = await apiFetch("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(form),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        setSuccess("Account created! Please sign in.");
        setMode("login");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-header">
          <h2>
            {mode === "login"
              ? "Welcome Back"
              : "Create Account"}
          </h2>

          <button
            className="modal-close"
            onClick={onClose}
          >
            <XIcon size={14} color="#495057" />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <p className="error-msg">
              {error}
            </p>
          )}

          {success && (
            <p className="bg-[#E8F8F0] text-[#2D9A6E] px-[14px] py-[10px] rounded-lg text-[0.85rem] mb-[14px] font-medium">
              {success}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="form-group">
                <label>Full Name</label>

                <input
                  required
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
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
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                  className="pr-10"
                />

                {eyeBtn(showPass, () =>
                  setShowPass(!showPass)
                )}
              </div>
            </div>

            {mode === "register" && (
              <div className="form-group">
                <label>
                  Phone Number
                  <span className="text-[#C0392B] ml-[3px]">
                    *
                  </span>
                </label>

                <input
                  required
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                  pattern="[0-9+\s\-]{7,15}"
                  title="Please enter a valid phone number"
                />
              </div>
            )}

            <button
              className="submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          {mode === "login" && (
            <div className="text-center mt-2">
              <span className="text-[0.78rem] text-[var(--gray-400)]">
                Forgot password? Contact hotel reception
              </span>
            </div>
          )}

          <div className="auth-switch">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setMode("register");
                    setError("");
                    setSuccess("");
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
                    setSuccess("");
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
function MyBookingsModal({ user, onClose, showToast }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewedBookings, setReviewedBookings] = useState([]);
  const [reviewBooking, setReviewBooking] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);

    Promise.all([
      apiFetch(`/api/bookings/user/${user.user_id}`)
        .then((r) => r.json())
        .catch(() => []),

      apiFetch(`/api/reviews/user/${user.user_id}`)
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([b, r]) => {
        setBookings(Array.isArray(b) ? b : []);
        setReviewedBookings(
          Array.isArray(r) ? r.map((x) => x.booking_id) : [],
        );
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      <div className="modal-bg">
        <div className="modal max-w-[600px]">
          <div className="modal-header">
            <h2>My Bookings</h2>

            <button className="modal-close" onClick={onClose}>
              <XIcon size={14} color="#495057" />
            </button>
          </div>

          <div className="modal-body max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="loader">
                Loading bookings...
              </div>
            ) : bookings.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">
                  <BookingIcon size={22} />
                </div>

                <p>No confirmed bookings yet.</p>
              </div>
            ) : (
              bookings.map((b) => (
                <div
                  className="booking-card flex-wrap gap-2"
                  key={b.booking_id}
                >
                  <img
                    src={
                      b.image_url ||
                      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=200"
                    }
                    alt={b.room_type}
                  />

                  <div className="booking-info flex-1">
                    <h4>{b.room_type}</h4>

                    <p>
                      {b.check_in_date?.slice(0, 10)} →{" "}
                      {b.check_out_date?.slice(0, 10)}
                    </p>

                    <p className="mt-[6px]">
                      <strong className="text-[var(--navy)] font-[var(--font-display)] text-[0.95rem]">
                        Rs.
                        {Number(
                          b.final_total || b.total_price,
                        ).toLocaleString()}
                      </strong>

                      <span className="ml-[10px]">
                        <span
                          className={`badge badge-${b.status}`}
                        >
                          {b.status}
                        </span>
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-[6px] items-end">
                    {b.status === "confirmed" && (
                      <div className="bg-[#FFF3CD] border border-[#FFC107] rounded-lg px-3 py-2 max-w-[200px] text-[0.72rem] text-[#856404] leading-[1.5]">
                        <div className="font-bold mb-[3px]">
                          Need to cancel?
                        </div>

                        <div>📞 +91 12345 67890</div>
                        <div>✉️ hello@vvgrandpark.com</div>
                      </div>
                    )}

                    {(b.status === "confirmed" ||
                      b.status === "completed") &&
                      !reviewedBookings.includes(
                        b.booking_id,
                      ) && (
                        <button
                          onClick={() =>
                            setReviewBooking(b)
                          }
                          className="
                            bg-[#0F1923]
                            text-[#E8D5A3]
                            border-0
                            rounded-md
                            px-[14px]
                            py-[6px]
                            text-[0.75rem]
                            font-semibold
                            cursor-pointer
                            font-inherit
                            flex
                            items-center
                            gap-[5px]
                          "
                        >
                          ★ Review
                        </button>
                      )}

                    {reviewedBookings.includes(
                      b.booking_id,
                    ) && (
                      <span className="text-[0.72rem] text-[#2D9A6E] font-semibold">
                        ✅ Reviewed
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {reviewBooking && (
        <WriteReviewModal
          booking={reviewBooking}
          user={user}
          onClose={() => setReviewBooking(null)}
          showToast={showToast}
          onReviewSubmitted={fetchData}
        />
      )}
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          if (data.user.role === "admin") {
            setShowAdmin(true);
            setShowManager(false);
          } else if (data.user.role === "manager") {
            setShowManager(true);
            setShowAdmin(false);
          }
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  function handleLogin(u) {
    setUser(u);
    showToast(`Welcome, ${u.name.split(" ")[0]}!`, "success");
    if (u.role === "admin") {
      setShowAdmin(true);
      setShowManager(false);
    } else if (u.role === "manager") {
      setShowManager(true);
      setShowAdmin(false);
    }
  }

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setShowBookings(false);
    setShowAdmin(false);
    setShowManager(false);
    showToast("Logged out successfully", "success");
  }

  if (authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1923]">
      <div className="text-center">
        <div className="font-['Playfair_Display'] text-[1.2rem] text-[#C9A84C] tracking-[2px] mb-3">
          VV GRAND PARK
        </div>

        <div className="text-[0.8rem] text-white/40">
          Loading...
        </div>
      </div>
    </div>
  );
}

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
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLogin={handleLogin}
        />
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

if (showManager && user?.role === "manager") {
  return (
    <>
      <ManagerDashboard
        managerUser={user}
        onLogout={handleLogout}
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

return (
  <div>
    <Hero
      user={user}
      onAuthClick={() => setShowAuth(true)}
      onLogout={handleLogout}
      onMyBookings={() =>
        user?.role === "admin"
          ? setShowAdmin(true)
          : user?.role === "manager"
            ? setShowManager(true)
            : setShowBookings(true)
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
      <AuthModal
        onClose={() => setShowAuth(false)}
        onLogin={handleLogin}
      />
    )}

    {bookingRoom && user && (
      <BookingModal
        room={bookingRoom}
        user={user}
        onClose={() => setBookingRoom(null)}
        showToast={showToast}
      />
    )}

    {showBookings &&
      user &&
      user.role !== "admin" &&
      user.role !== "manager" && (
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

    {user &&
      user.role !== "admin" &&
      user.role !== "manager" && (
        <button
          onClick={() => setShowBookings(true)}
          className="
            fixed
            bottom-7
            left-7
            z-[300]
            flex
            items-center
            gap-2
            rounded-[50px]
            bg-[var(--navy)]
            px-[22px]
            py-3
            text-[0.82rem]
            font-semibold
            text-[var(--white)]
            shadow-[0_6px_24px_rgba(15,25,35,0.3)]
            transition-all
            duration-200
            hover:bg-[var(--gold)]
          "
        >
          <BookingIcon
            size={15}
            color="var(--gold-light)"
          />
          My Bookings
        </button>
      )}
  </div>
);
}
