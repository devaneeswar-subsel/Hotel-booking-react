import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import Hero from "./Hero";
import Rooms from "./Rooms";
import CalendarSection from "./CalendarSection";
import NearbyAttractions from "./NearbyAttractions";
import Facilities from "./Facilities";
import Gallery from "./Gallery";
import Testimonials from "./Testimonials";
import Footer from "./Footer";
import LegalPolicy, { getLegalPolicyByPath } from "./LegalPolicy";
import RoomDetail from "./Roomdetail";
import CheckoutPage from "./pages/CheckoutPage";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import { XIcon, CheckIcon, BookingIcon, DownloadIcon } from "./Icons";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  ArrowRightIcon,
  MenuIcon,
} from "lucide-react";
const API = process.env.REACT_APP_API_URL;
const GST_RATE = 0.18;
function formatBookingId(booking) {
  const year = new Date(booking.created_at || Date.now()).getFullYear();
  return `${year}-${String(booking.booking_id).padStart(4, "0")}`;
}
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

            <button className="submit-btn" type="submit" disabled={loading}>
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
              { label: "Booking ID", val: `${booking.booking_id}` },
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

                <span className="font-semibold text-[var(--navy)]">{val}</span>
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

function BookingSuccessRoute() {
  let booking = null;
  try {
    booking = JSON.parse(
      sessionStorage.getItem("vvgrandpark_booking_success") || "null",
    );
  } catch {}

  return (
    <div className="min-h-screen bg-[#F7F5F0] px-6 py-16">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#2D9A6E] text-3xl text-[#2D9A6E]">
          ✓
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-[#0F1923]">
          Booking Confirmed!
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Payment successful. Your room is reserved.
        </p>
        {booking && (
          <div className="mt-6 space-y-2 border-t border-gray-100 pt-5 text-sm text-gray-600">
            <p>
              Booking ID:{" "}
              <strong className="text-[#0F1923]">#{booking.booking_id}</strong>
            </p>
            <p>
              {booking.room_type} · {booking.check_in_date?.slice(0, 10)} to{" "}
              {booking.check_out_date?.slice(0, 10)}
            </p>
            <p className="text-base font-bold text-[#0F1923]">
              Total paid: Rs.
              {Math.round(Number(booking.final_total || 0)).toLocaleString(
                "en-IN",
              )}
            </p>
          </div>
        )}
        <button
          onClick={() => window.location.assign("/")}
          className="mt-7 w-full rounded-xl bg-[#0F1923] py-3 text-sm font-semibold text-white"
        >
          Back to hotel
        </button>
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
  const [loading] = useState(false);
  const [confirmedBooking] = useState(null);
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

  // async function handleSubmit(e) {

  //   e.preventDefault();
  //   if (nights <= 0) {
  //     showToast("Check-out must be after check-in!", "error");
  //     return;
  //   }
  //   setLoading(true);
  //   try {
  //     const orderRes = await apiFetch("/api/payment/create-order", {
  //       method: "POST",
  //       body: JSON.stringify({
  //         user_id: user.user_id,
  //         room_id: room.room_id,
  //         ...form,
  //       }),
  //     });
  //     const orderData = await orderRes.json();
  //     if (!orderRes.ok) throw new Error(orderData.error);

  //     const {
  //       booking_id,
  //       total_price,
  //       razorpay_order_id,
  //       razorpay_key,
  //       room_name,
  //     } = orderData;

  //     const options = {
  //       key: razorpay_key,
  //       amount: Math.round(total_price * 100),
  //       currency: "INR",
  //       name: "VV Grand Park Residency",
  //       description: room_name,
  //       order_id: razorpay_order_id,
  //       prefill: {
  //         name: user.name,
  //         email: user.email,
  //         contact: user.phone || "",
  //       },
  //       theme: { color: "#0F1923" },
  //       modal: {
  //         ondismiss: async () => {
  //           await apiFetch("/api/payment/failed", {
  //             method: "POST",
  //             body: JSON.stringify({ booking_id }),
  //           });
  //           showToast("Payment cancelled.", "error");
  //           setLoading(false);
  //         },
  //       },
  //       handler: async (response) => {
  //         try {
  //           const verifyRes = await apiFetch("/api/payment/verify", {
  //             method: "POST",
  //             body: JSON.stringify({
  //               razorpay_order_id: response.razorpay_order_id,
  //               razorpay_payment_id: response.razorpay_payment_id,
  //               razorpay_signature: response.razorpay_signature,
  //               booking_id,
  //             }),
  //           });
  //           const verifyData = await verifyRes.json();
  //           if (!verifyRes.ok) throw new Error(verifyData.error);
  //           setConfirmedBooking(verifyData.booking);
  //         } catch (err) {
  //           showToast(err.message, "error");
  //         } finally {
  //           setLoading(false);
  //         }
  //       },
  //     };

  //     const rzp = new window.Razorpay(options);
  //     rzp.on("payment.failed", async (resp) => {
  //       await apiFetch("/api/payment/failed", {
  //         method: "POST",
  //         body: JSON.stringify({ booking_id }),
  //       });
  //       showToast(`Payment failed: ${resp.error.description}`, "error");
  //       setLoading(false);
  //     });
  //     rzp.open();
  //   } catch (err) {
  //     showToast(err.message, "error");
  //     setLoading(false);
  //   }
  // }
  //Greyout the dates that are already booked for the selected room. This is done by fetching the booked dates from the backend and storing them in the `bookedDates` state. The `useEffect` hook is used to load the booked dates whenever the `room.room_id` changes.
  function handleSubmit(e) {
    e.preventDefault();

    if (nights <= 0) {
      showToast("Check-out must be after check-in!", "error");
      return;
    }

    const checkoutData = {
      room,
      user,
      form,
      nights,
      basePrice,
      gst,
      roomTotal: total,
    };

    // refresh ஆனாலும் checkout data போகாமல் இருக்க
    sessionStorage.setItem(
      "vvgrandpark_checkout",
      JSON.stringify(checkoutData),
    );

    window.location.assign("/checkout");
  }
  const [occupiedNights, setOccupiedNights] = useState(new Set());

  useEffect(() => {
    async function loadBookedDates() {
      try {
        const res = await apiFetch(`/api/rooms/${room.room_id}/booked-dates`);
        const data = await res.json();

        const nights = new Set();
        data.forEach((booking) => {
          const start = new Date(booking.check_in_date);
          const end = new Date(booking.check_out_date);
          let current = new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate(),
          );
          const last = new Date(
            end.getFullYear(),
            end.getMonth(),
            end.getDate(),
          );
          // occupy nights from check-in up to (not including) check-out
          while (current < last) {
            nights.add(current.toDateString());
            current.setDate(current.getDate() + 1);
          }
        });

        setOccupiedNights(nights);
      } catch (err) {
        console.error(err);
      }
    }
    loadBookedDates();
  }, [room.room_id]);

  // downloadInvoice stays unchanged — no CSS involved
 async function downloadInvoice(booking) {
  if (!booking) return;
  const b = booking;
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
    doc.text("3/4/D, Thanjai Saalai, Thiruvarur - 610004", W / 2 + 8, 63);
    doc.text("+91 93849 82510 | vvgrandpark@gmail.com", W / 2 + 8, 69);

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
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.2);
    doc.line(L, y + 2.5, R, y + 2.5);
    y += 7;
    const terms = [
      "1. Valid photo ID must be presented at check-in.",
      "2. Check-in: 1:00 PM | Check-out: 11:00 AM.",
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
      "3/4/D, Thanjai Saalai, Thiruvarur - 610004",
      W / 2,
      footerY + 11,
      { align: "center" },
    );
    doc.text(
      "+91 93849 82510  |  vvgrandpark@gmail.com  |  vvgrandpark.com",
      W / 2,
      footerY + 17,
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
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;

    const [year, month, day] = dateStr.split("-");

    return new Date(Number(year), Number(month) - 1, Number(day));
  };
  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      {/* Modal card */}
      <div className="relative w-[92vw] max-w-md bg-white rounded-2xl shadow-2xl overflow-visible">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Check In */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">
                  Check-in Date
                </label>

                <DatePicker
                  selected={parseLocalDate(form.check_in_date)}
                  onChange={(date) =>
                    setForm({
                      ...form,
                      check_in_date: `${date.getFullYear()}-${String(
                        date.getMonth() + 1,
                      ).padStart(2, "0")}-${String(date.getDate()).padStart(
                        2,
                        "0",
                      )}`,
                      check_out_date: "",
                    })
                  }
                  minDate={new Date()}
                  filterDate={(date) =>
                    !occupiedNights.has(date.toDateString())
                  }
                  dateFormat="dd/MM/yyyy"
                  placeholderText="DD/MM/YYYY"
                  popperPlacement="bottom"
                  popperClassName="vv-calendar-popper"
                  calendarClassName="vv-calendar"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              {/* Check Out */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">
                  Check-out Date
                </label>

                <DatePicker
                  selected={parseLocalDate(form.check_out_date)}
                  onChange={(date) =>
                    setForm({
                      ...form,
                      check_out_date: `${date.getFullYear()}-${String(
                        date.getMonth() + 1,
                      ).padStart(2, "0")}-${String(date.getDate()).padStart(
                        2,
                        "0",
                      )}`,
                    })
                  }
                  minDate={
                    form.check_in_date
                      ? new Date(form.check_in_date)
                      : new Date()
                  }
                  filterDate={(date) => {
                    if (!form.check_in_date) return true;
                    const checkIn = parseLocalDate(form.check_in_date);
                    if (date <= checkIn) return false; // checkout must be after check-in
                    // every night from check-in to checkout-1 must be free
                    let night = new Date(checkIn);
                    while (night < date) {
                      if (occupiedNights.has(night.toDateString()))
                        return false;
                      night.setDate(night.getDate() + 1);
                    }
                    return true;
                  }}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="DD/MM/YYYY"
                  popperPlacement="bottom"
                  popperClassName="vv-calendar-popper"
                  calendarClassName="vv-calendar"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
            {/* Check-in / Check-out times notice */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5 text-gray-600">
                <span className="font-semibold text-navy">Check-in</span>
                <span className="text-gray-500">from 1:00 PM</span>
              </div>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center gap-1.5 text-gray-600">
                <span className="font-semibold text-navy">Check-out</span>
                <span className="text-gray-500">by 11:00 AM</span>
              </div>
            </div>

            {/* Guests */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Number of Guests
              </label>
              <input
                type="number"
                min="1"
                max={room.capacity || 4}
                value={form.guest_count}
                onChange={(e) =>
                  setForm({ ...form, guest_count: +e.target.value })
                }
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
                  <span className="font-body font-semibold text-navy">
                    Total
                  </span>
                  <strong className="font-body   text-navy">
                    Rs.{Math.round(total).toLocaleString()}
                  </strong>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={nights <= 0}
              className="w-full flex items-center justify-center gap-2 bg-navy text-white font-semibold text-sm py-3 rounded-xl hover:bg-navy/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Booking
            </button>

            {/* Security note */}
            <p className="flex items-center justify-center gap-1.5 text-[0.7rem] text-gray-400">
              <svg
                width="11"
                height="11"
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
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

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
  async function sendOtp(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("OTP sent to your email.");
      setMode("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: form.email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("OTP verified. Set your new password.");
      setMode("reset");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError("");
    if (newPass.length < 6)
      return setError("Password must be at least 6 characters");
    if (newPass !== confirmPass) return setError("Passwords don't match");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          otp,
          new_password: newPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Password reset! Please sign in.");
      setMode("login");
      setOtp("");
      setNewPass("");
      setConfirmPass("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
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
              : mode === "register"
                ? "Create Account"
                : mode === "forgot"
                  ? "Forgot Password"
                  : mode === "otp"
                    ? "Enter OTP"
                    : "Reset Password"}
          </h2>

          <button className="modal-close" onClick={onClose}>
            <XIcon size={14} color="#495057" />
          </button>
        </div>

        <div className="modal-body">
          {error && <p className="error-msg">{error}</p>}

          {success && (
            <p className="bg-[#E8F8F0] text-[#2D9A6E] px-[14px] py-[10px] rounded-lg text-[0.85rem] mb-[14px] font-medium">
              {success}
            </p>
          )}

          {(mode === "login" || mode === "register") && (
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

                  {eyeBtn(showPass, () => setShowPass(!showPass))}
                </div>
              </div>

              {mode === "register" && (
                <div className="form-group">
                  <label>
                    Phone Number
                    <span className="text-[#C0392B] ml-[3px]">*</span>
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

              <button className="submit-btn" type="submit" disabled={loading}>
                {loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </form>
          )}
          {mode === "forgot" && (
            <form onSubmit={sendOtp}>
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
              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}

          {mode === "otp" && (
            <form onSubmit={verifyOtp}>
              <div className="form-group">
                <label>Enter the 6-digit OTP sent to your email</label>
                <input
                  required
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={resetPassword}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                />
              </div>
              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
          {mode === "login" && (
            <div className="text-center mt-2">
              <button
                onClick={() => {
                  setMode("forgot");
                  setError("");
                  setSuccess("");
                }}
                className="text-[0.78rem] text-gold font-semibold hover:underline bg-transparent border-none cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}
          {(mode === "forgot" || mode === "otp" || mode === "reset") && (
            <div className="text-center mt-2">
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
                className="text-[0.78rem] text-gray-400 hover:underline bg-transparent border-none cursor-pointer"
              >
                ← Back to login
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
function BookingReceiptModal({ booking, onClose, onDownloadInvoice }) {
  const nights =
    booking.check_in_date && booking.check_out_date
      ? Math.max(
          1,
          Math.ceil(
            (new Date(booking.check_out_date) -
              new Date(booking.check_in_date)) /
              86400000,
          ),
        )
      : 1;
  const basePrice = Number(booking.total_price || 0);
  const gst = Number(booking.gst_amount || Math.round(basePrice * GST_RATE));
  const addonCharges = Number(booking.addon_charges || 0);
  const total = Number(booking.final_total || basePrice + gst);
  const statusPill =
    {
      confirmed: "bg-emerald-100 text-emerald-700",
      completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700",
    }[booking.status] || "bg-gray-100 text-gray-700";

  return (
    <div
      className="modal-bg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal max-w-[440px]">
        <div className="modal-header">
          <h2>Booking Details</h2>
          <button className="modal-close" onClick={onClose}>
            <XIcon size={14} color="#495057" />
          </button>
        </div>
        <div className="modal-body">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-[var(--font-display)] text-base font-semibold text-[var(--navy)]">
              {booking.room_type}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase ${statusPill}`}
            >
              {booking.status}
            </span>
          </div>

          <div className="bg-[var(--gray-50)] rounded-lg px-4 py-3">
            {[
              ["Booking ID", `#${booking.booking_id}`],
              [
                "Room",
                `${booking.room_type} (Room ${booking.room_number || booking.room_id})`,
              ],
              ["Check-in", booking.check_in_date?.slice(0, 10)],
              ["Check-out", booking.check_out_date?.slice(0, 10)],
              ["Nights", nights],
              ["Guests", booking.guest_count || 1],
              ["Room Charges", `Rs.${basePrice.toLocaleString("en-IN")}`],
              ...(addonCharges > 0
                ? [
                    [
                      "Add-on Charges",
                      `Rs.${addonCharges.toLocaleString("en-IN")}`,
                    ],
                  ]
                : []),
              ["GST (18%)", `Rs.${Math.round(gst).toLocaleString("en-IN")}`],
              ["Payment ID", booking.payment_id || "-"],
            ].map(([label, val]) => (
              <div
                key={label}
                className="flex justify-between border-t border-[var(--gray-200)] py-[6px] text-[0.82rem] first:border-t-0"
              >
                <span className="text-[var(--gray-400)]">{label}</span>
                <span className="font-semibold text-[var(--navy)]">{val}</span>
              </div>
            ))}
            <div className="flex justify-between border-t-[1.5px] border-[var(--navy)] pt-2.5 mt-1 text-[0.95rem]">
              <span className="font-[var(--font-display)] font-semibold text-[var(--navy)]">
                {booking.status === "cancelled" ? "Refunded" : "Total Paid"}
              </span>
              <span className="font-[var(--font-display)] text-[1.1rem] font-bold text-[var(--navy)]">
                Rs.{Math.round(total).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
            <div className="mt-4 flex gap-2">
  <button
    type="button"
    onClick={() => onDownloadInvoice?.(booking)}
    className="flex-1 rounded-lg bg-[var(--navy)] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
  >
    ↓ Download Invoice
  </button>
</div>

          {booking.status === "confirmed" && (
            <p className="mt-4 flex items-center gap-1.5 text-[0.78rem] text-[var(--gray-600)]">
              📞 To cancel, call{" "}
              <a
                href="tel:+919384982510"
                className="font-semibold text-blue-800"
              >
                +91 93849 82510
              </a>
            </p>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-[0.78rem] text-[var(--gray-600)]">
            Cancellation Policy: To cancel your room booking, please contact the
            hotel administration at least 48 hours before the scheduled check-in
            time.
          </p>
        
        </div>
      </div>
    </div>
  );
}
function MyBookings({
  user,
  onLogout,
  onAuthClick,
  onNavigateToRooms,
  showToast,
    onDownloadInvoice,
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewedBookings, setReviewedBookings] = useState([]);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [receiptBooking, setReceiptBooking] = useState(null);
const [visibleBookings, setVisibleBookings] = useState(5);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchData = useCallback(() => {
    if (!user?.user_id) return;

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
          Array.isArray(r)
            ? r.map((x) => x.booking_id)
            : [],  
        );
        setVisibleBookings(5);
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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

    const diff =
      (new Date(checkOut) - new Date(checkIn)) /
      (1000 * 60 * 60 * 24);

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

 const navLinks = [
  { label: "Home", id: "home", href: "/#home" },
  { label: "Rooms", id: "rooms", href: "/#rooms" },
  { label: "Facilities", id: "facilities", href: "/#facilities" },
  { label: "Gallery", id: "gallery", href: "/#gallery" },
  {
    label: "Nearby Attractions",
    id: "nearby-attractions",
    href: "/#nearby-attractions",
  },
  { label: "Contact", id: "contact", href: "/#contact" },
];
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };
   const handleSectionLink = (event, id) => {
  event.preventDefault();
  setMenuOpen(false);

  if (window.location.pathname === "/") {
    scrollTo(id);
    window.history.pushState(null, "", `/#${id}`);
  } else {
    window.location.assign(`/#${id}`);
  }
};
  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 3%",
          height: 68,
          background: scrolled ? "rgba(15,25,35,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.3)" : "none",
          transition: "all 0.3s ease",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        {/* Logo — flex-shrink: 0 so it never squishes */}
        <div
          onClick={() => {
  if (window.location.pathname === "/") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.location.assign("/");
  }
}}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <img
            src="/logo.png"
            alt="VV Grand Park"
            style={{ height: 38, width: 38, objectFit: "contain" }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1.1,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.88rem",
                fontWeight: 700,
                letterSpacing: 2,
                color: "#fff",
                whiteSpace: "nowrap",
              }}
            >
              VV GRAND PARK
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.52rem",
                letterSpacing: 3,
                color: "var(--gold-light)",
                whiteSpace: "nowrap",
              }}
            >
              RESIDENCY
            </span>
          </div>
        </div>

        {/* Desktop Links — centered, flex-shrink allowed */}
        <div
          className="hero-nav-links"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flex: "1 1 auto",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(event) => handleSectionLink(event, link.id)}
              style={{
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                padding: "4px 0",
                textDecoration: "none",
                transition: "color 0.3s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--gold-light)")}
              onMouseLeave={(e) =>
                (e.target.style.color = "rgba(255,255,255,0.75)")
              }
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Actions — flex-shrink: 0 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {user ? (
            <>
              <div
                className="hero-nav-actions"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "5px 10px",
                  fontSize: "0.78rem",
                  color: "#fff",
                  whiteSpace: "nowrap",
                }}
              >
                <UserIcon size={13} color="rgba(255,255,255,0.7)" />
                {user.name.split(" ")[0]}
              </div>
           <button
  className="hero-nav-actions"
  onClick={() => {
    if (user.role === "admin") {
      window.location.assign("/admin");
    } else {
      window.location.assign("/my-bookings");
    }
  }}
  style={{
    display: "flex",
    alignItems: "center",
    gap: 5,
    borderRadius: 6,
    padding: "6px 13px",
    fontSize: "0.75rem",
    fontWeight: 600,
    background:
      user.role === "admin"
        ? "var(--gold)"
        : "rgba(255,255,255,0.05)",
    color: user.role === "admin" ? "var(--navy)" : "#fff",
    border:
      user.role === "admin"
        ? "none"
        : "1px solid rgba(255,255,255,0.15)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  }}
>
  {user.role === "admin" ? (
    <SettingsIcon size={13} />
  ) : (
    <BookingIcon size={13} />
  )}

  {user.role === "admin" ? "Admin Panel" : "My Bookings"}
</button>
              <button
                className="hero-nav-actions"
                onClick={onLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  padding: "6px 10px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <LogOutIcon size={13} />
              </button>
            </>
          ) : (
            <button
              className="hero-nav-actions"
              onClick={onAuthClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 6,
                padding: "7px 18px",
                fontSize: "0.78rem",
                fontWeight: 500,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Sign In <ArrowRightIcon size={13} />
            </button>
          )}

          {/* Hamburger */}
          <button
            className="hero-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: 6,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {menuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU ── */}
      <div
        style={{
          position: "fixed",
          top: 68,
          left: 0,
          right: 0,
          zIndex: 40,
          background: "var(--navy)",
          maxHeight: menuOpen ? 500 : 0,
          overflow: "hidden",
          opacity: menuOpen ? 1 : 0,
          transition: "all 0.3s ease",
          borderTop: menuOpen ? "1px solid rgba(255,255,255,0.1)" : "none",
          padding: menuOpen ? "20px 6%" : "0 6%",
        }}
      >
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-display)",
            fontSize: "0.75rem",
            letterSpacing: 1,
            color: "var(--gold-light)",
            marginBottom: 12,
          }}
        >
          VV GRAND PARK RESIDENCY
        </span>
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={(event) => handleSectionLink(event, link.id)}
            style={{
              display: "block",
              padding: "12px 0",
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              textDecoration: "none",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {link.label}
          </a>
        ))}
        {user ? (
          <>
            <span
  onClick={() => {
    setMenuOpen(false);

    if (user.role === "admin") {
      window.location.assign("/admin");
    } else {
      window.location.assign("/my-bookings");
    }
  }}
  style={{
    display: "block",
    padding: "12px 0",
    fontSize: "0.9rem",
    color: "rgba(255,255,255,0.8)",
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  }}
>
  {user.role === "admin" ? "Admin Panel" : "My Bookings"}
</span>
            <span
              onClick={() => {
                onLogout();
                setMenuOpen(false);
              }}
              style={{
                display: "block",
                padding: "12px 0",
                fontSize: "0.9rem",
                color: "#fca5a5",
                cursor: "pointer",
              }}
            >
              Sign Out
            </span>
          </>
        ) : (
          <span
            onClick={() => {
              onAuthClick();
              setMenuOpen(false);
            }}
            style={{
              display: "block",
              padding: "12px 0",
              fontSize: "0.9rem",
              color: "var(--gold-light)",
              cursor: "pointer",
            }}
          >
            Sign In
          </span>
        )}
      </div>

      {/* =========================================================
          PAGE HERO
      ========================================================= */}

      <section
        className="pt-[68px]"
        style={{
          background:
            "linear-gradient(135deg,#0F1923 0%,#1C2B3A 100%)",
        }}
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-12 sm:py-16">
          <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#E8D5A3]">
            VV Grand Park Residency
          </p>

          <h1 className="m-0 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            My Bookings
          </h1>

          <p className="mt-2 max-w-xl text-sm sm:text-base text-white/50">
            View and manage your hotel reservations,
            booking details and reviews.
          </p>
        </div>
      </section>

      {/* =========================================================
          BOOKING CONTENT
      ========================================================= */}

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

        {/* Page heading */}

        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl sm:text-2xl font-bold text-[#0F1923]">
              Your Reservations
            </h2>

            {!loading && bookings.length > 0 && (
              <p className="mt-1 text-sm text-[#8A95A3]">
                {bookings.length} booking
                {bookings.length > 1 ? "s" : ""} total
              </p>
            )}
          </div>

          <button
            onClick={() => onNavigateToRooms?.()}
            className="self-start sm:self-auto rounded-xl bg-[#0F1923] px-4 py-2.5 text-sm font-bold text-[#E8D5A3] transition hover:opacity-90"
          >
            Browse Rooms →
          </button>
        </div>

        {/* Loading */}

        {loading ? (
          <div className="grid gap-4">
            <style>{`
              @keyframes shimmer {
                0% {
                  background-position: 200% 0;
                }
                100% {
                  background-position: -200% 0;
                }
              }
            `}</style>

            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex gap-4 rounded-2xl border border-[#EAECEF] bg-white p-4 shadow-sm"
              >
                <div
                  className="h-[110px] w-[110px] flex-shrink-0 rounded-xl"
                  style={{
                    background:
                      "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                    backgroundSize: "200% 100%",
                    animation:
                      "shimmer 1.4s infinite",
                  }}
                />

                <div className="flex flex-1 flex-col justify-center gap-3">
                  <div
                    className="h-3 w-1/2 rounded"
                    style={{
                      background:
                        "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                      backgroundSize: "200% 100%",
                      animation:
                        "shimmer 1.4s infinite",
                    }}
                  />

                  <div
                    className="h-3 w-3/4 rounded"
                    style={{
                      background:
                        "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                      backgroundSize: "200% 100%",
                      animation:
                        "shimmer 1.4s infinite",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (

          /* Empty state */

          <div className="rounded-2xl border border-[#EAECEF] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EEF1F5] to-[#E4E8EF] text-4xl">
              🏨
            </div>

            <h3 className="mt-5 text-lg font-bold text-[#1C2B3A]">
              No bookings yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#8A95A3]">
              Ready for your next stay? Browse our rooms
              and make a reservation.
            </p>

            <button
              onClick={() => onNavigateToRooms?.()}
              className="mt-5 rounded-xl bg-[#0F1923] px-6 py-3 text-sm font-bold text-[#E8D5A3] transition hover:opacity-90"
            >
              Browse Rooms →
            </button>
          </div>

        ) : (

          /* Booking cards */

          <div className="grid gap-4">

            {bookings.slice(0, visibleBookings).map((b) => {
              const cfg =
                statusConfig[b.status] ||
                statusConfig.pending;

              const nights = getNights(
                b.check_in_date,
                b.check_out_date,
              );

              const isReviewed =
                reviewedBookings.includes(
                  b.booking_id,
                );

              const canReview =
                (b.status === "confirmed" ||
                  b.status === "completed") &&
                !isReviewed;

              return (
                <div
                  key={b.booking_id}
                  className="group overflow-hidden rounded-2xl border border-[#EAECEF] bg-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-lg"
                >

                  {/* Main booking */}

                  <div
                    className="flex cursor-pointer"
                    onClick={() =>
                      setReceiptBooking(b)
                    }
                  >

                    {/* Image */}

                    <div className="relative w-[110px] sm:w-[180px] md:w-[210px] flex-shrink-0">
                      <img
                        src={
                          b.image_url ||
                          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500"
                        }
                        alt={b.room_type}
                        className="block h-full min-h-[150px] sm:min-h-[170px] w-full object-cover"
                      />

                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                        <span className="rounded-lg bg-black/70 px-3 py-1.5 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                          View Details →
                        </span>
                      </div>
                    </div>

                    {/* Info */}

                    <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">

                      <div>
                        <div className="flex items-start justify-between gap-3">

                          <div>
                            <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-[#8A95A3]">
                              Room
                            </p>

                            <h3 className="m-0 text-base sm:text-lg font-bold text-[#0F1923]">
                              {b.room_type}
                            </h3>

                            {b.room_number && (
                              <p className="mt-1 text-xs text-[#8A95A3]">
                                Room {b.room_number}
                              </p>
                            )}
                          </div>

                          <span
                            className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${cfg.pill}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                            />

                            {cfg.label}
                          </span>
                        </div>

                        {/* Dates */}

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <div className="rounded-lg bg-[#F0F3F7] px-3 py-2">
                            <p className="m-0 text-[0.62rem] uppercase tracking-wide text-[#8A95A3]">
                              Check-in
                            </p>

                            <p className="m-0 mt-0.5 text-xs font-bold text-[#3A4A5C]">
                              {formatDate(
                                b.check_in_date,
                              )}
                            </p>
                          </div>

                          <span className="text-[#B0B8C4]">
                            →
                          </span>

                          <div className="rounded-lg bg-[#F0F3F7] px-3 py-2">
                            <p className="m-0 text-[0.62rem] uppercase tracking-wide text-[#8A95A3]">
                              Check-out
                            </p>

                            <p className="m-0 mt-0.5 text-xs font-bold text-[#3A4A5C]">
                              {formatDate(
                                b.check_out_date,
                              )}
                            </p>
                          </div>

                          {nights && (
                            <span className="text-xs text-[#8A95A3]">
                              {nights} night
                              {nights > 1
                                ? "s"
                                : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price */}

                      <div className="mt-4 flex items-center justify-between">

                        <div>
                          <span className="text-xl font-extrabold text-[#0F1923]">
                            ₹
                            {Number(
                              b.final_total ||
                                b.total_price,
                            ).toLocaleString(
                              "en-IN",
                            )}
                          </span>

                          <span className="ml-1 text-xs text-[#8A95A3]">
                            total
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            onNavigateToRooms?.(
                              b.room_id,
                            );
                          }}
                          className="hidden sm:block text-xs font-semibold text-blue-700 hover:underline"
                        >
                          View room ↗
                        </button>

                      </div>
                    </div>
                  </div>

                  {/* Action footer */}

                  {(b.status === "confirmed" ||
                    canReview ||
                    isReviewed) && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F3F7] bg-[#FAFBFC] px-4 py-3">

                      {b.status === "confirmed" ? (
                        <p className="m-0 flex items-center gap-1.5 text-xs text-[#6B7785]">
                          <span>📞</span>

                          To cancel:

                          <a
                            href="tel:+919384982510"
                            className="font-semibold text-blue-800 no-underline"
                            onClick={(e) =>
                              e.stopPropagation()
                            }
                          >
                            +91 93849 82510
                          </a>
                        </p>
                      ) : (
                        <div />
                      )}

                      {canReview ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewBooking(b);
                          }}
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-[#0F1923] px-4 py-2 font-inherit text-xs font-bold text-[#E8D5A3] transition hover:opacity-85"
                        >
                          ★ Write a Review
                        </button>
                      ) : isReviewed ? (
                        <span className="text-xs font-bold text-emerald-600">
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
        {/* View More */}
        {!loading && bookings.length > visibleBookings && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() =>
                setVisibleBookings((prev) =>
                  Math.min(prev + 5, bookings.length)
                )
              }
              className="rounded-xl border border-[#D9DEE5] bg-white px-6 py-3 text-sm font-bold text-[#0F1923] shadow-sm transition hover:border-[#0F1923] hover:bg-[#0F1923] hover:text-[#E8D5A3]"
            >
              View More
            </button>
          </div>
        )}
      </main>


  <Footer/>


      {/* =========================================================
          REVIEW MODAL
      ========================================================= */}

      {reviewBooking && (
        <WriteReviewModal
          booking={reviewBooking}
          user={user}
          onClose={() => setReviewBooking(null)}
          showToast={showToast}
          onReviewSubmitted={fetchData}
        />
      )}

      {/* =========================================================
          RECEIPT MODAL
      ========================================================= */}

      {receiptBooking && (
  <BookingReceiptModal
    booking={receiptBooking}
    onClose={() => setReceiptBooking(null)}
    onDownloadInvoice={(booking) => {
      onDownloadInvoice?.(booking);
    }}
  />
)}
    </div>
  );
}

export default function App() {
  const legalPolicy = getLegalPolicyByPath(window.location.pathname);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(!legalPolicy);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [toast, setToast] = useState(null);
  const [availableRoomIds, setAvailableRoomIds] = useState(null);
    const [currentPath, setCurrentPath] = useState(
  window.location.pathname
);

  // null = no filter active, [] = none available, [1,2,3] = filter active
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);
  useEffect(() => {
    if (legalPolicy) return;

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

  }, [legalPolicy]);
async function downloadInvoice(booking) {
  if (!booking) return;

    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(booking.check_out_date) - new Date(booking.check_in_date)) /
          86400000,
      ),
    );
    const roomCharges = Number(booking.total_price || 0);
    const gst = Number(booking.gst_amount || Math.round(roomCharges * GST_RATE));
    const total = Number(booking.final_total || roomCharges + gst);
    const invNo = `INV-${formatBookingId(booking)}`;
    const guestName = booking.guest_name || user.name || "Guest";
    const fileGuest = guestName.replace(/\s+/g, "_");
    const displayDate = (value) =>
      value
        ? new Date(value).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "-";
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const textTop = (text, x, y, options = {}) => {
      doc.text(text, x, y + doc.getFontSize() * 0.72, options);
    };

    doc.setFillColor("#0F1923");
    doc.rect(0, 0, 595, 100, "F");

    doc.setTextColor("#C9A84C");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    textTop("VV GRAND PARK", 50, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    textTop("RESIDENCY", 50, 56);

    doc.setTextColor("#ffffff");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    textTop("INVOICE", 545, 30, { align: "right" });
    doc.setTextColor("#8B9298");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    textTop(invNo, 545, 56, { align: "right" });
    doc.setFontSize(9);
    textTop(
      new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      545,
      72,
      { align: "right" },
    );

    doc.setDrawColor("#C9A84C");
    doc.setLineWidth(1);
    doc.line(50, 115, 545, 115);

    doc.setTextColor("#868E96");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    textTop("BILL TO", 50, 130);
    doc.setTextColor("#0F1923");
    doc.setFontSize(13);
    textTop(guestName, 50, 145);
    doc.setTextColor("#495057");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    textTop(booking.email || user.email || "", 50, 162);
    if (booking.phone || user.phone) textTop(booking.phone || user.phone, 50, 175);

    doc.setTextColor("#868E96");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    textTop("FROM", 350, 130);
    doc.setTextColor("#0F1923");
    doc.setFontSize(13);
    textTop("VV Grand Park Residency", 350, 145);
    doc.setTextColor("#495057");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    textTop("3/4/D, Thanjai Saalai, Thiruvarur - 610004", 350, 162);
    textTop("+91 93849 82510 | vvgrandpark@gmail.com", 350, 175);

    const tableTop = 210;
    doc.setFillColor("#0F1923");
    doc.rect(50, tableTop, 495, 25, "F");
    doc.setTextColor("#C9A84C");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    textTop("DESCRIPTION", 60, tableTop + 8);
    textTop("DETAILS", 280, tableTop + 8);
    textTop("AMOUNT", 472.5, tableTop + 8, { align: "center" });

    const tableRows = [
      [
        `${booking.room_type || "Room"} - Room ${
          booking.room_number || booking.room_id
        }`,
        `${nights} night${nights > 1 ? "s" : ""}`,
        `Rs.${roomCharges.toLocaleString()}`,
      ],
      ["Check-in", displayDate(booking.check_in_date), "-"],
      ["Check-out", displayDate(booking.check_out_date), "-"],
      ["Guests", String(booking.guest_count || 1), "-"],
      ["Payment ID", booking.payment_id || "-", "-"],
    ];

    let y = tableTop + 30;
    tableRows.forEach((row, index) => {
      if (index % 2 === 0) {
        doc.setFillColor("#F8F9FA");
        doc.rect(50, y - 5, 495, 22, "F");
      }
      doc.setTextColor("#0F1923");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      textTop(row[0], 60, y);
      textTop(row[1], 280, y);
      textTop(row[2], 472.5, y, { align: "center" });
      y += 22;
    });

    y += 15;
    doc.setDrawColor("#E9ECEF");
    doc.setLineWidth(0.5);
    doc.line(50, y, 545, y);
    y += 15;

    [
      ["Room Charges", `Rs.${roomCharges.toLocaleString()}`],
      ["GST (18%)", `Rs.${Math.round(gst).toLocaleString()}`],
    ].forEach(([label, value]) => {
      doc.setTextColor("#868E96");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      textTop(label, 350, y);
      doc.setTextColor("#0F1923");
      doc.setFont("helvetica", "bold");
      textTop(value, 472.5, y, { align: "center" });
      y += 20;
    });

    y += 5;
    doc.setFillColor("#0F1923");
    doc.rect(350, y, 195, 36, "F");
    doc.setTextColor("#C9A84C");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    textTop("TOTAL PAID", 360, y + 12);
    doc.setTextColor("#ffffff");
    doc.setFontSize(14);
    textTop(`Rs.${Math.round(total).toLocaleString()}`, 472.5, y + 10, {
      align: "center",
    });

    y += 60;
    doc.setTextColor("#333333");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    textTop("TERMS & CONDITIONS", 50, y);
    doc.setDrawColor("#C9A84C");
    doc.setLineWidth(0.5);
    doc.line(50, y + 11, 545, y + 11);
    y += 18;

    const terms = [
      "1. A valid government-issued photo ID must be presented at check-in.",
      "2. Check-in time: 1:00 PM | Check-out time: 11:00 AM.",
      "3. Early check-in and late check-out are subject to availability and may incur additional charges.",
      "4. Pets, outside food and beverages, alcohol, and smoking are not permitted on the hotel premises.",
      "5. Cancellations must be made at least 48 hours before the scheduled check-in time to be eligible for a refund, subject to the applicable booking rate and cancellation policy.",
      "6. For no-shows or cancellations made within 48 hours of check-in, a cancellation charge equivalent to the first night's room tariff may apply, subject to the booking terms.",
      "7. Eligible refunds will be processed to the original payment method within 5-7 working days. The actual credit time may vary depending on the bank or payment provider.",
      "8. Personal and identification data is processed in accordance with applicable data protection and privacy laws for purposes including booking management, guest services, payment processing, security, and legal or regulatory compliance.",
      "9. Payments are securely processed through Razorpay and its payment partners. The hotel does not store full card details. Personal data is not sold to third parties.",
      "10. Full Terms & Conditions, Privacy Policy, and Cancellation Policy are available at: https://vvgrandpark.com/policies",
      "11. Please verify the booking dates, room type, guest count, tariff, and contact details shown on this invoice and report any discrepancy promptly.",
      "12. Vehicle pickup and drop-off requests are subject to availability, applicable charges, and separate confirmation by the hotel.",
      "13. Guests are responsible for room keys/cards and hotel property provided during their stay. Reasonable charges may apply for loss or damage caused during the stay.",
      "14. Hotel policies may be updated from time to time for legal, safety, or operational reasons. The terms applicable at the time of booking will generally apply to the reservation unless a change is required by applicable law or safety requirements.",
      "15. For booking assistance or invoice corrections, please contact the hotel as soon as possible and preferably before check-in.",
      "16. The room tariff does not include additional services or charges unless expressly included in the booking, including transport, minibar, laundry, unapproved extras, or charges for loss or damage to hotel property.",
      "17. Visitors are permitted only with hotel approval and may be required to provide valid identification in accordance with hotel policy and applicable law.",
      "18. All guests must comply with hotel quiet hours, safety instructions, and reasonable house rules during their stay.",
      "19. Lost-property claims will be handled in accordance with hotel records, hotel policy, and applicable law.",
      "20. This is an electronically generated invoice and does not require a physical signature where permitted under applicable law.",
    ];
    doc.setTextColor("#666666");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    const termColumnWidth = 245;
    const drawTermsColumn = (items, x, startY) => {
      let termY = startY;
      items.forEach((term) => {
        const lines = doc.splitTextToSize(term, termColumnWidth);
        lines.forEach((line, index) => {
          textTop(line, x, termY + index * 7, { maxWidth: termColumnWidth });
        });
        termY += Math.max(7, lines.length * 7) + 1.5;
      });
      return termY;
    };
    const termsEndY = Math.max(
      drawTermsColumn(terms.slice(0, 10), 50, y),
      drawTermsColumn(terms.slice(10), 300, y),
    );
    const footerY = Math.max(775, termsEndY + 22);

    doc.setDrawColor("#C9A84C");
    doc.setLineWidth(0.5);
    doc.line(50, footerY, 545, footerY);
    const footerCenter = 297.5;
    doc.setTextColor("#868E96");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    textTop("Thank you for choosing VV Grand Park Residency!", footerCenter, footerY + 10, {
      maxWidth: 495,
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    textTop("vvgrandpark.com  |  bookings@vvgrandpark.com", footerCenter, footerY + 24, {
      maxWidth: 495,
      align: "center",
    });
    textTop(
      "3/4/D, Thanjai Saalai, Thiruvarur - 610004  |  +91 93849 82510  |  vvgrandpark@gmail.com",
      footerCenter,
      footerY + 38,
      { maxWidth: 495, align: "center" },
    );

    doc.save(`${invNo}-${fileGuest}.pdf`);
  }
  useEffect(() => {
    if (legalPolicy || authLoading || !window.location.hash) return;

    const sectionId = decodeURIComponent(window.location.hash.slice(1));
    const timeout = setTimeout(() => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    return () => clearTimeout(timeout);
  }, [authLoading, legalPolicy]);

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

useEffect(() => {
  const handlePopState = () => {
    setCurrentPath(window.location.pathname);
  };

  window.addEventListener("popstate", handlePopState);

  return () => {
    window.removeEventListener("popstate", handlePopState);
  };
}, []);

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setShowBookings(false);
    setShowAdmin(false);
    setShowManager(false);
    showToast("Logged out successfully", "success");
  }
    // one place that decides where "My Bookings" goes, for every button
  const goToMyBookings = () => {
    if (user?.role === "admin") return window.location.assign("/admin");
    if (user?.role === "manager") return setShowManager(true);
    window.location.assign("/my-bookings");
  };

  if (legalPolicy) {
    return <LegalPolicy policy={legalPolicy} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1923]">
        <div className="text-center">
          <div className="font-['Playfair_Display'] text-[1.2rem] text-[#C9A84C] tracking-[2px] mb-3">
            VV GRAND PARK
          </div>

          <div className="text-[0.8rem] text-white/40">Loading...</div>
        </div>
      </div>
    );
  }

  if (window.location.pathname.startsWith("/booking-success/")) {
    return <BookingSuccessRoute />;
  }

  if (window.location.pathname === "/checkout") {
    return <CheckoutPage user={user} showToast={showToast} />;
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
          }}
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

  if (showManager && user?.role === "manager") {
    return (
      <>
        <ManagerDashboard managerUser={user} onLogout={handleLogout} />

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
if (currentPath === "/my-bookings") {
  return (
    <>
      <MyBookings
        user={user}
        onClose={() => setShowBookings(false)}
        showToast={showToast}
        onAuthClick={() => setShowAuth(true)}
        onLogout={handleLogout}
        onDownloadInvoice={downloadInvoice}
        onNavigateToRooms={(roomId) => {
          if (roomId) {
            apiFetch(`/api/rooms/${roomId}`)
              .then((r) => r.json())
              .then((room) => {
                if (room?.room_id) {
                  setSelectedRoom(room);
                }
              })
              .catch(() => {});
          } else {
            window.location.assign("/#rooms");
          }
        }}
      />

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

  return (
    <div style={{ overflowX: "hidden", width: "100%" }}>
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
        availableRoomIds={availableRoomIds} // ← add this
        onBookClick={(room) => setBookingRoom(room)}
        onCardClick={(room) => setSelectedRoom(room)}
        onAuthPrompt={() => setShowAuth(true)}
      />

      <CalendarSection
        onViewRooms={(ids) => {
          setAvailableRoomIds(ids);
          setTimeout(() => {
            document
              .getElementById("rooms")
              ?.scrollIntoView({ behavior: "smooth" });
          }, 300);
        }}
      />
      <NearbyAttractions />
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

      {/* {showBookings &&
        user &&
        user.role !== "admin" &&
        user.role !== "manager" && (
          <MyBookings
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
                  .getElementById("rooms")
                  ?.scrollIntoView({ behavior: "smooth" });
              }
            }}
          />
        )} */}

      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}

      {user && user.role !== "admin" && user.role !== "manager" && (
        <button
onClick={goToMyBookings}
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
          <BookingIcon size={15} color="var(--gold-light)" />
          My Bookings
        </button>
      )}
    </div>
  );
}
