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
import { XIcon, CheckIcon, BookingIcon, DownloadIcon } from "./Icons";

const API = process.env.REACT_APP_API_URL;
const GST_RATE = 0.18;

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 3500);
    return () => clearTimeout(t);
  }, [onHide]);
  return <div className={`toast ${type}`}>{msg}</div>;
}

// ─── STAR RATING INPUT ────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          style={{
            cursor: "pointer",
            fontSize: "1.6rem",
            color: (hover || value) >= star ? "#C9A84C" : "#DEE2E6",
            transition: "color 0.15s",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ─── WRITE REVIEW MODAL ───────────────────────────────────────────────────────
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
      const res = await fetch(`${API}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2>Write a Review</h2>
          <button className="modal-close" onClick={onClose}>
            <XIcon size={14} color="#495057" />
          </button>
        </div>
        <div className="modal-body">
          <div
            style={{
              background: "var(--gray-50)",
              borderRadius: 8,
              padding: "12px 14px",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--navy)",
              }}
            >
              {booking.room_type}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--gray-400)",
                marginTop: 2,
              }}
            >
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
                placeholder="Share your experience at VV Grand Park Residency..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1.5px solid var(--gray-200)",
                  fontFamily: "inherit",
                  fontSize: "0.875rem",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
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
  const basePrice = Number(booking.total_price || 0);
  const gst = Number(
    booking.gst_amount || Math.round(basePrice * GST_RATE * 100) / 100,
  );
  const total = Number(booking.final_total || basePrice + gst);

  return (
    <div className="modal-bg">
      <div className="modal" style={{ maxWidth: "460px" }}>
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
              {
                label: "Room Charges",
                val: `Rs.${basePrice.toLocaleString()}`,
              },
              {
                label: "GST (18%)",
                val: `Rs.${Math.round(gst).toLocaleString()}`,
              },
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
                Rs.{Math.round(total).toLocaleString()}
              </span>
            </div>
          </div>
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
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--gold)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--navy)")
            }
          >
            <DownloadIcon size={15} color="currentColor" /> Download Invoice
            (PDF)
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

  async function downloadInvoice() {
    if (!confirmedBooking) return;
    const b = confirmedBooking;
    const ci = b.check_in_date?.slice(0, 10);
    const co = b.check_out_date?.slice(0, 10);
    const base = Number(b.total_price || 0);
    const gstAmt = Number(
      b.gst_amount || Math.round(base * GST_RATE * 100) / 100,
    );
    const finalT = Number(b.final_total || base + gstAmt);
    const invNo = `INV-${String(b.booking_id).padStart(5, "0")}`;
    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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
    doc.text("+91 12345 67890 | GSTIN: 33AAAAA0000A1Z5", W / 2 + 10, 84);
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
        amount: `Rs.${base.toLocaleString()}`,
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
    y += 8;
    [
      { label: "Room Charges", val: `Rs.${base.toLocaleString()}` },
      { label: "GST (18%)", val: `Rs.${Math.round(gstAmt).toLocaleString()}` },
    ].forEach(({ label, val }) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(73, 80, 87);
      doc.text(label, W - 90, y);
      doc.setTextColor(15, 25, 35);
      doc.setFont("helvetica", "bold");
      doc.text(val, W - 18, y, { align: "right" });
      y += 9;
    });
    y += 2;
    doc.setFillColor(15, 25, 35);
    doc.roundedRect(W - 80, y - 6, 62, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(201, 168, 76);
    doc.text("TOTAL PAID", W - 49, y + 1, { align: "center" });
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(`Rs.${Math.round(finalT).toLocaleString()}`, W - 49, y + 9, {
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
    <div className="modal-bg">
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
              <div
                style={{
                  background: "var(--gray-50)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 16,
                }}
              >
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
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.82rem",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: "var(--gray-400)" }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.9rem",
                    borderTop: "1px solid var(--gray-200)",
                    paddingTop: 8,
                    marginTop: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      color: "var(--navy)",
                    }}
                  >
                    Total
                  </span>
                  <strong
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--navy)",
                    }}
                  >
                    Rs.{Math.round(total).toLocaleString()}
                  </strong>
                </div>
              </div>
            )}
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
                  {nights > 0 ? Math.round(total).toLocaleString() : "0"}
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
    otp: "",
    new_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const eyeBtn = (show, toggle) => (
    <button
      type="button"
      onClick={toggle}
      style={{
        position: "absolute",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--gray-400)",
        fontSize: "1rem",
        padding: 0,
      }}
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
        const res = await fetch(`${API}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onLogin(data.user);
        onClose();
      } else if (mode === "register") {
        const res = await fetch(`${API}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSuccess("Account created! Please sign in.");
        setMode("login");
      } else if (mode === "forgot") {
        const res = await fetch(`${API}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSuccess("OTP sent to your email! Check inbox.");
        setMode("verify");
      } else if (mode === "verify") {
        const res = await fetch(`${API}/api/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, otp: form.otp }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSuccess("OTP verified! Set your new password.");
        setMode("reset");
      } else if (mode === "reset") {
        if (form.new_password.length < 6)
          throw new Error("Password must be at least 6 characters");
        const res = await fetch(`${API}/api/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            otp: form.otp,
            new_password: form.new_password,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSuccess("Password reset! Please sign in.");
        setMode("login");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    login: "Welcome Back",
    register: "Create Account",
    forgot: "Forgot Password",
    verify: "Enter OTP",
    reset: "New Password",
  };

  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-header">
          <h2>{titles[mode]}</h2>
          <button className="modal-close" onClick={onClose}>
            <XIcon size={14} color="#495057" />
          </button>
        </div>
        <div className="modal-body">
          {error && <p className="error-msg">{error}</p>}
          {success && (
            <p
              style={{
                background: "#E8F8F0",
                color: "#2D9A6E",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: "0.85rem",
                marginBottom: 14,
                fontWeight: 500,
              }}
            >
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
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            )}
            {["login", "register", "forgot", "verify"].includes(mode) && (
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  readOnly={mode === "verify"}
                  style={
                    mode === "verify"
                      ? { background: "#f8f9fa", color: "#868E96" }
                      : {}
                  }
                />
              </div>
            )}
            {(mode === "login" || mode === "register") && (
              <div className="form-group">
                <label>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    style={{ paddingRight: 40 }}
                  />
                  {eyeBtn(showPass, () => setShowPass(!showPass))}
                </div>
              </div>
            )}
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
            {mode === "verify" && (
              <div className="form-group">
                <label>Enter OTP (sent to your email)</label>
                <input
                  required
                  placeholder="6-digit OTP"
                  maxLength={6}
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value })}
                  style={{
                    fontSize: "1.4rem",
                    letterSpacing: "8px",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                />
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--gray-400)",
                    marginTop: 6,
                  }}
                >
                  OTP valid for 10 minutes
                </div>
              </div>
            )}
            {mode === "reset" && (
              <div className="form-group">
                <label>New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    placeholder="Minimum 6 characters"
                    value={form.new_password}
                    onChange={(e) =>
                      setForm({ ...form, new_password: e.target.value })
                    }
                    style={{ paddingRight: 40 }}
                  />
                  {eyeBtn(showNewPass, () => setShowNewPass(!showNewPass))}
                </div>
              </div>
            )}
            <button className="submit-btn" type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : mode === "register"
                    ? "Create Account"
                    : mode === "forgot"
                      ? "Send OTP"
                      : mode === "verify"
                        ? "Verify OTP"
                        : "Reset Password"}
            </button>
          </form>
          {mode === "login" && (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button
                onClick={() => {
                  setMode("forgot");
                  setError("");
                  setSuccess("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--gold)",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textDecoration: "underline",
                }}
              >
                Forgot password?
              </button>
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
            ) : mode === "register" ? (
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
            ) : (
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
              >
                ← Back to Sign In
              </button>
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
  const [reviewedBookings, setReviewedBookings] = useState([]);
  const [reviewBooking, setReviewBooking] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/bookings/user/${user.user_id}`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${API}/api/reviews/user/${user.user_id}`)
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

  return (
    <>
      <div className="modal-bg">
        <div className="modal" style={{ maxWidth: "600px" }}>
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
                <div
                  className="booking-card"
                  key={b.booking_id}
                  style={{ flexWrap: "wrap", gap: 8 }}
                >
                  <img
                    src={
                      b.image_url ||
                      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=200"
                    }
                    alt={b.room_type}
                  />
                  <div className="booking-info" style={{ flex: 1 }}>
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
                        Rs.
                        {Number(
                          b.final_total || b.total_price,
                        ).toLocaleString()}
                      </strong>
                      <span style={{ marginLeft: "10px" }}>
                        <span className={`badge badge-${b.status}`}>
                          {b.status}
                        </span>
                      </span>
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      alignItems: "flex-end",
                    }}
                  >
                    {b.status === "confirmed" && (
                      <div
                        style={{
                          background: "#FFF3CD",
                          border: "1px solid #FFC107",
                          borderRadius: 8,
                          padding: "8px 12px",
                          maxWidth: 200,
                          fontSize: "0.72rem",
                          color: "#856404",
                          lineHeight: 1.5,
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 3 }}>
                          Need to cancel?
                        </div>
                        <div>📞 +91 12345 67890</div>
                        <div>✉️ hello@vvgrandpark.com</div>
                      </div>
                    )}
                    {(b.status === "confirmed" || b.status === "completed") &&
                      !reviewedBookings.includes(b.booking_id) && (
                        <button
                          onClick={() => setReviewBooking(b)}
                          style={{
                            background: "#0F1923",
                            color: "#E8D5A3",
                            border: "none",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          ★ Review
                        </button>
                      )}
                    {reviewedBookings.includes(b.booking_id) && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "#2D9A6E",
                          fontWeight: 600,
                        }}
                      >
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

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // ✅ FIX: Load user from localStorage on startup — persists across refresh
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("vvgp_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [bookingRoom, setBookingRoom] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);

  // ✅ FIX: Save user to localStorage on login
  function handleLogin(u) {
    setUser(u);
    localStorage.setItem("vvgp_user", JSON.stringify(u));
    showToast(`Welcome, ${u.name.split(" ")[0]}!`, "success");
    if (u.role === "admin") setTimeout(() => setShowAdmin(true), 500);
  }

  // ✅ FIX: Remove user from localStorage on logout
  function handleLogout() {
    setUser(null);
    localStorage.removeItem("vvgp_user");
    setShowBookings(false);
    setShowAdmin(false);
    showToast("Logged out successfully", "success");
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
          <BookingIcon size={15} color="var(--gold-light)" /> My Bookings
        </button>
      )}
    </div>
  );
}
