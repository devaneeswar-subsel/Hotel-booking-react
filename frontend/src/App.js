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
        method: "POST",
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
  async function downloadInvoice() {
    if (!confirmedBooking) return;
    const b = confirmedBooking;
    const nights =
      b.check_in_date && b.check_out_date
        ? Math.ceil(
            (new Date(b.check_out_date) - new Date(b.check_in_date)) / 86400000,
          )
        : 1;
    const basePrice = Number(b.total_price);
    const gst = Math.round(basePrice * 0.18 * 100) / 100;
    const total = Math.round((basePrice + gst) * 100) / 100;
    const invNo = `INV-${String(b.booking_id).padStart(5, "0")}`;
    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210,
      L = 18,
      R = W - 18;

    // Header
    doc.setFillColor(15, 25, 35);
    doc.rect(0, 0, W, 32, "F");
    doc.setFont("times", "bold").setFontSize(17).setTextColor(201, 168, 76);
    doc.text("VV GRAND PARK", L, 13);
    doc
      .setFont("helvetica", "normal")
      .setFontSize(7)
      .setTextColor(180, 160, 100);
    doc.text("RESIDENCY", L, 19);
    doc
      .setFont("helvetica", "bold")
      .setFontSize(17)
      .setTextColor(255, 255, 255);
    doc.text("INVOICE", R, 13, { align: "right" });
    doc
      .setFont("helvetica", "normal")
      .setFontSize(8)
      .setTextColor(150, 140, 120);
    doc.text(invNo, R, 20, { align: "right" });
    doc.text(`Date: ${today}`, R, 27, { align: "right" });

    // Divider
    doc.setDrawColor(201, 168, 76).setLineWidth(0.4).line(L, 37, R, 37);

    // Bill To / From
    doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(134, 142, 150);
    doc.text("BILL TO", L, 44);
    doc.text("FROM", W / 2 + 8, 44);
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(15, 25, 35);
    doc.text(b.guest_name || "Guest", L, 51);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(73, 80, 87);
    doc.text(b.email || "", L, 57);
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(15, 25, 35);
    doc.text("VV Grand Park Residency", W / 2 + 8, 51);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(73, 80, 87);
    doc.text("vvgrandpark.com", W / 2 + 8, 57);
    doc.text("vvgrandpark.hotel@gmail.com", W / 2 + 8, 63);

    // Table header
    const tableTop = 76;
    doc.setFillColor(15, 25, 35).rect(L, tableTop, W - 36, 8, "F");
    doc
      .setFont("helvetica", "bold")
      .setFontSize(7.5)
      .setTextColor(201, 168, 76);
    doc.text("DESCRIPTION", L + 4, tableTop + 5.5);
    doc.text("DETAILS", 108, tableTop + 5.5);
    doc.text("AMOUNT", R, tableTop + 5.5, { align: "right" });

    // Rows
    const rows = [
      {
        desc: `${b.room_type} — Room ${b.room_number || b.room_id}`,
        detail: `${nights} night${nights > 1 ? "s" : ""}`,
        amount: `Rs.${basePrice.toLocaleString()}`,
      },
      {
        desc: "Check-in",
        detail: new Date(b.check_in_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        amount: "—",
      },
      {
        desc: "Check-out",
        detail: new Date(b.check_out_date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        amount: "—",
      },
      { desc: "Guests", detail: `${b.guest_count || 1}`, amount: "—" },
      { desc: "Payment ID", detail: b.payment_id || "—", amount: "—" },
    ];

    let y = tableTop + 13;
    rows.forEach((row, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 249, 250).rect(L, y - 5, W - 36, 8, "F");
      }
      doc
        .setFont("helvetica", "normal")
        .setFontSize(8)
        .setTextColor(15, 25, 35);
      doc.text(row.desc, L + 4, y);
      doc.setTextColor(80, 80, 80);
      doc.text(String(row.detail), 108, y);
      doc.text(row.amount, R, y, { align: "right" });
      y += 8;
    });

    // Summary
    y += 10;
    doc.setDrawColor(220, 220, 220).setLineWidth(0.3).line(L, y, R, y);
    y += 8;
    const SX = W - 90;
    [
      { label: "Room Charges", val: `Rs.${basePrice.toLocaleString()}` },
      { label: "GST (18%)", val: `Rs.${Math.round(gst).toLocaleString()}` },
    ].forEach(({ label, val }) => {
      doc
        .setFont("helvetica", "normal")
        .setFontSize(8)
        .setTextColor(110, 110, 110);
      doc.text(label, SX, y);
      doc.setFont("helvetica", "bold").setTextColor(30, 30, 30);
      doc.text(val, R, y, { align: "right" });
      y += 7;
    });

    // Total box
    y += 3;
    doc
      .setFillColor(15, 25, 35)
      .roundedRect(SX - 1, y, R - SX + 3, 14, 2, 2, "F");
    doc
      .setFont("helvetica", "bold")
      .setFontSize(7.5)
      .setTextColor(201, 168, 76);
    doc.text("TOTAL PAID", (SX - 1 + R) / 2, y + 5.5, { align: "center" });
    doc.setFontSize(11).setTextColor(255, 255, 255);
    doc.text(
      `Rs.${Math.round(total).toLocaleString()}`,
      (SX - 1 + R) / 2,
      y + 12,
      { align: "center" },
    );

    // Terms
    y += 22;
    doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(80, 80, 80);
    doc.text("TERMS & CONDITIONS", L, y);
    y += 5;
    const terms = [
      "1. Valid photo ID must be presented at check-in.",
      "2. Check-in: 12:00 PM | Check-out: 11:00 AM.",
      "3. Early check-in/late check-out subject to availability.",
      "4. Pets, outside food, and smoking are not permitted.",
      "5. Cancellations must be made 24 hours prior to check-in for a refund.",
    ];
    doc
      .setFont("helvetica", "normal")
      .setFontSize(6.5)
      .setTextColor(120, 120, 120);
    terms.forEach((t) => {
      doc.text(t, L, y);
      y += 5;
    });

    // Footer
    const footerY = 282;
    doc
      .setDrawColor(201, 168, 76)
      .setLineWidth(0.3)
      .line(L, footerY, R, footerY);
    doc
      .setFont("helvetica", "italic")
      .setFontSize(8)
      .setTextColor(134, 142, 150);
    doc.text(
      "Thank you for choosing VV Grand Park Residency!",
      W / 2,
      footerY + 5,
      { align: "center" },
    );
    doc.setFont("helvetica", "normal").setFontSize(7.5);
    doc.text(
      "vvgrandpark.com  |  vvgrandpark.hotel@gmail.com",
      W / 2,
      footerY + 11,
      { align: "center" },
    );

    doc.save(`${invNo}-${(b.guest_name || "guest").replace(/\s+/g, "_")}.pdf`);
  }

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
function MyBookingsModal({ user, onClose, showToast, onNavigateToRooms }) {
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
        setReviewedBookings(Array.isArray(r) ? r.map((x) => x.booking_id) : []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusConfig = {
    confirmed: {
      pill: "bg-emerald-100 text-emerald-800",
      dot: "bg-emerald-500",
      label: "Confirmed",
    },
    completed: {
      pill: "bg-blue-100 text-blue-800",
      dot: "bg-blue-500",
      label: "Completed",
    },
    cancelled: {
      pill: "bg-red-100 text-red-700",
      dot: "bg-red-500",
      label: "Cancelled",
    },
    pending: {
      pill: "bg-yellow-100 text-yellow-800",
      dot: "bg-yellow-400",
      label: "Pending",
    },
  };

  const getNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      {/* ── Overlay ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(10,16,24,0.65)] backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* ── Modal shell ── */}
        <div className="relative w-full max-w-[640px] max-h-[88vh] flex flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl ring-1 ring-white/10">

          {/* ── Header ── */}
          <div className="relative flex-shrink-0 bg-gradient-to-br from-[#0F1923] to-[#1C2B3A] px-5 sm:px-7 pt-5 sm:pt-6 pb-5">
            {/* Decorative glow */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-44 rounded-tr-[20px] bg-[radial-gradient(ellipse_at_top_right,rgba(232,213,163,0.12)_0%,transparent_70%)]" />

            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[#E8D5A3] opacity-80">
                  VV Grand Park
                </p>
                <h2 className="m-0 text-xl sm:text-[1.45rem] font-bold tracking-tight text-white">
                  My Bookings
                </h2>
                {!loading && (
                  <p className="mt-1 text-[0.78rem] text-white/40">
                    {bookings.length === 0
                      ? "No bookings yet"
                      : `${bookings.length} booking${bookings.length > 1 ? "s" : ""} total`}
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-white/[0.12] bg-white/[0.08] text-[1.1rem] leading-none text-white/60 transition-colors hover:bg-white/[0.15]"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto bg-[#F7F8FA] p-3 sm:p-4">
            {loading ? (
              /* Shimmer skeletons */
              <div className="flex flex-col gap-3">
                <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex gap-3 sm:gap-3.5 rounded-[14px] border border-[#EAECEF] bg-white p-3 sm:p-4"
                  >
                    <div
                      className="h-[80px] w-[80px] sm:h-[88px] sm:w-[88px] flex-shrink-0 rounded-[10px]"
                      style={{
                        background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.4s infinite",
                      }}
                    />
                    <div className="flex flex-1 flex-col gap-2 justify-center">
                      {[["55%", "0s"], ["75%", "0.1s"], ["40%", "0.2s"]].map(
                        ([w, delay], idx) => (
                          <div
                            key={idx}
                            className="h-3 rounded"
                            style={{
                              width: w,
                              background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                              backgroundSize: "200% 100%",
                              animation: `shimmer 1.4s ${delay} infinite`,
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : bookings.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#EEF1F5] to-[#E4E8EF] text-[1.8rem]">
                  🏨
                </div>
                <p className="m-0 text-base font-bold text-[#1C2B3A]">
                  No bookings yet
                </p>
                <p className="m-0 max-w-[240px] text-[0.82rem] leading-relaxed text-[#8A95A3]">
                  Ready for your next stay? Browse our rooms and make a reservation.
                </p>
                <button
                  onClick={() => { onClose(); onNavigateToRooms?.(); }}
                  className="mt-2 cursor-pointer rounded-[10px] border-0 bg-[#0F1923] px-[22px] py-2.5 font-inherit text-[0.82rem] font-bold text-[#E8D5A3] transition-opacity hover:opacity-85"
                >
                  Browse Rooms →
                </button>
              </div>
            ) : (
              /* Booking cards */
              <div className="flex flex-col gap-3">
                {bookings.map((b) => {
                  const cfg = statusConfig[b.status] || statusConfig.pending;
                  const nights = getNights(b.check_in_date, b.check_out_date);
                  const isReviewed = reviewedBookings.includes(b.booking_id);
                  const canReview =
                    (b.status === "confirmed" || b.status === "completed") && !isReviewed;

                  return (
                    <div
                      key={b.booking_id}
                      className="group overflow-hidden rounded-[14px] border border-[#EAECEF] bg-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-lg"
                    >
                      {/* ── Clickable room section ── */}
                      <div
                        className="flex cursor-pointer"
                        onClick={() => { onClose(); onNavigateToRooms?.(b.room_id); }}
                        title="View this room"
                      >
                        {/* Room image */}
                        <div className="relative w-[100px] sm:w-[120px] flex-shrink-0">
                          <img
                            src={
                              b.image_url ||
                              "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=300"
                            }
                            alt={b.room_type}
                            className="block h-full min-h-[100px] sm:min-h-[110px] w-full object-cover"
                          />
                          {/* Hover overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(15,25,35,0)] transition-colors duration-200 group-hover:bg-[rgba(15,25,35,0.35)]">
                            <span className="rounded-lg bg-[rgba(15,25,35,0.7)] px-2.5 py-1 text-[0.72rem] font-bold text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                              View Room →
                            </span>
                          </div>
                        </div>

                        {/* Info block */}
                        <div className="flex-1 px-3 sm:px-4 py-3 sm:py-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="m-0 text-[0.88rem] sm:text-[0.92rem] font-bold leading-snug text-[#0F1923]">
                              {b.room_type}
                            </h4>
                            {/* Status pill */}
                            <span
                              className={`inline-flex flex-shrink-0 items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-[3px] text-[0.65rem] sm:text-[0.68rem] font-bold tracking-wide ${cfg.pill}`}
                            >
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </div>

                          {/* Dates */}
                          <div className="mt-2 flex flex-wrap items-center gap-1 sm:gap-1.5">
                            <span className="rounded-[7px] bg-[#F0F3F7] px-2 sm:px-2.5 py-1 text-[0.68rem] sm:text-[0.72rem] font-semibold text-[#3A4A5C]">
                              {formatDate(b.check_in_date)}
                            </span>
                            <span className="text-[0.75rem] text-[#B0B8C4]">→</span>
                            <span className="rounded-[7px] bg-[#F0F3F7] px-2 sm:px-2.5 py-1 text-[0.68rem] sm:text-[0.72rem] font-semibold text-[#3A4A5C]">
                              {formatDate(b.check_out_date)}
                            </span>
                            {nights && (
                              <span className="text-[0.68rem] sm:text-[0.7rem] text-[#8A95A3]">
                                · {nights}n
                              </span>
                            )}
                          </div>

                          {/* Price + hint */}
                          <div className="mt-2 sm:mt-2.5 flex items-center justify-between">
                            <div>
                              <span className="text-[0.98rem] sm:text-[1.05rem] font-extrabold tracking-tight text-[#0F1923]">
                                ₹{Number(b.final_total || b.total_price).toLocaleString("en-IN")}
                              </span>
                              {nights && (
                                <span className="ml-1 text-[0.68rem] sm:text-[0.7rem] text-[#8A95A3]">total</span>
                              )}
                            </div>
                            <span className="hidden sm:inline text-[0.7rem] text-[#C4CAD4]">View room ↗</span>
                          </div>
                        </div>
                      </div>

                      {/* ── Action footer ── */}
                      {(b.status === "confirmed" || canReview || isReviewed) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0F3F7] bg-[#FAFBFC] px-3 sm:px-3.5 py-2.5">
                          {b.status === "confirmed" ? (
                            <p className="m-0 flex items-center gap-1.5 text-[0.68rem] sm:text-[0.71rem] text-[#6B7785]">
                              <span className="text-sm">📞</span>
                              To cancel:{" "}
                              <a
                                href="tel:+911234567890"
                                className="font-semibold text-blue-800 no-underline"
                              >
                                +91 12345 67890
                              </a>
                            </p>
                          ) : (
                            <div />
                          )}

                          {canReview ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setReviewBooking(b); }}
                              className="flex flex-shrink-0 cursor-pointer items-center gap-[5px] rounded-lg border-0 bg-[#0F1923] px-3 sm:px-4 py-[6px] sm:py-[7px] font-inherit text-[0.72rem] sm:text-[0.74rem] font-bold text-[#E8D5A3] transition-opacity hover:opacity-85"
                            >
                              ★ Write a Review
                            </button>
                          ) : isReviewed ? (
                            <span className="flex flex-shrink-0 items-center gap-1 text-[0.72rem] font-bold text-emerald-600">
                              ✅ Review submitted
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
const [availableRoomIds, setAvailableRoomIds] = useState(null);
// null = no filter active, [] = none available, [1,2,3] = filter active
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
      onBook={(room) => {
  setSelectedRoom(null);
  setBookingRoom(room);
}}
      onAuthPrompt={() => {
        setSelectedRoom(null);
        setShowAuth(true);
      }}/>

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
  availableRoomIds={availableRoomIds}          // ← add this
  onBookClick={(room) => setBookingRoom(room)}
  onCardClick={(room) => setSelectedRoom(room)}
  onAuthPrompt={() => setShowAuth(true)}
/>

    <CalendarSection
  onViewRooms={(ids) => {
    setAvailableRoomIds(ids);
    setTimeout(() => {
      document
        .getElementById("rooms-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  }}
/>
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
     onNavigateToRooms={(roomId) => {
  setShowBookings(false);
  if (roomId) {
    apiFetch(`/api/rooms/${roomId}`)
      .then((r) => r.json())
      .then((room) => {
        if (room?.room_id) setSelectedRoom(room);
      })
      .catch(() => {});
  } else {
    document
      .getElementById("rooms-section")
      ?.scrollIntoView({ behavior: "smooth" });
  }
}}
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
