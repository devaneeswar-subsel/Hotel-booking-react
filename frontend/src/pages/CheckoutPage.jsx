import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  BedIcon,
  CalendarIcon,
  CarIcon,
  CheckIcon,
  DownloadIcon,
  MoonIcon,
  ShieldIcon,
  UserIcon,
} from "../Icons";

const API = process.env.REACT_APP_API_URL;
const GST_RATE = 0.18;
const VEHICLES = [
  {
    id: "4-seater",
    name: "4-seater Sedan",
    seats: 4,
    description: "Comfortable for small groups",
  },
  {
    id: "7-seater",
    name: "7-seater SUV",
    seats: 7,
    description: "Extra space for families",
  },
  {
    id: "12-seater",
    name: "12-seater Van",
    seats: 12,
    description: "Ideal for larger groups",
  },
];
const NO_VEHICLE_ID = "none";
const FALLBACK_ROOM_IMAGE =
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200";

const apiFetch = (url, options = {}) =>
  fetch(`${API}${url}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
function formatBookingId(booking) {
  const year = new Date(booking.created_at || Date.now()).getFullYear();
  return `${year}-${String(booking.booking_id).padStart(4, "0")}`;
}
function LockIcon({ size = 15, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v2" />
    </svg>
  );
}

function InfoIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function formatAmount(amount) {
  return `Rs.${Math.round(Number(amount) || 0).toLocaleString("en-IN")}`;
}

function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatStayDate(dateStr) {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr || "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PaymentLogo({ children, className = "" }) {
  return (
    <div
      className={`flex h-8 min-w-[56px] items-center justify-center rounded-md border border-[#E4DED2] bg-white px-2 text-[0.72rem] font-extrabold leading-none text-[#111820] shadow-[0_4px_14px_rgba(15,25,35,0.05)] ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

function StayMetric({ icon, label, value }) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-4">
      <span className="text-[#07111B]">{icon}</span>
      <span className="text-[0.92rem] font-medium text-[#1C232B]">{label}</span>
      <strong className="text-[0.92rem] font-bold text-[#050A0F]">{value}</strong>
    </div>
  );
}

function StayRow({ icon, label, value }) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-4">
      <span className="text-[#07111B]">{icon}</span>
      <span className="text-[0.92rem] font-medium text-[#1C232B]">{label}</span>
      <strong className="text-right text-[0.92rem] font-bold text-[#050A0F]">
        {value}
      </strong>
    </div>
  );
}

function VehicleOption({ item, active, onChange }) {
  const isNoVehicle = item.id === NO_VEHICLE_ID;

  return (
    <label
      className={`grid min-h-[74px] cursor-pointer grid-cols-[22px_46px_minmax(0,1fr)] items-center gap-3 rounded-[9px] border px-3.5 py-3 transition ${
        active
          ? "border-[#C98216] bg-white shadow-[0_0_0_1px_rgba(201,130,22,0.18)]"
          : "border-[#E1DED7] bg-white hover:border-[#CFC7BA]"
      }`}
    >
      <input
        type="radio"
        name="vehicle"
        value={item.id}
        checked={active}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
      />
      <span
        className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border ${
          active ? "border-[#C98216]" : "border-[#9CA3AA]"
        }`}
        aria-hidden="true"
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-[#C98216]" />}
      </span>
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          active ? "bg-[#FFF1DF] text-[#C98216]" : "bg-[#F4F4F3] text-[#07111B]"
        }`}
        aria-hidden="true"
      >
        <CarIcon size={22} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[0.88rem] font-bold text-[#050A0F]">
          {item.name}
        </span>
        <span className="block text-[0.78rem] font-bold text-[#050A0F]">
          {isNoVehicle ? "Continue without booking" : `Up to ${item.seats} seats`}
        </span>
        <span className="block text-[0.76rem] text-[#525B65]">
          {isNoVehicle ? "any vehicle" : item.description}
        </span>
      </span>
    </label>
  );
}

export default function CheckoutPage({ user, showToast }) {
  const [checkout, setCheckout] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(NO_VEHICLE_ID);
  const [loading, setLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("vvgrandpark_checkout");
      setCheckout(stored ? JSON.parse(stored) : null);
    } catch {
      setCheckout(null);
    }
  }, []);

  const pricing = useMemo(() => {
    const subtotal = Number(checkout?.basePrice || 0);
    const storedGst = Number(checkout?.gst);
    const storedTotal = Number(checkout?.roomTotal);
    const gst =
      Number.isFinite(storedGst) && storedGst > 0
        ? storedGst
        : subtotal * GST_RATE;
    const total =
      Number.isFinite(storedTotal) && storedTotal > 0
        ? storedTotal
        : subtotal + gst;

    return {
      subtotal,
      gst,
      total: Math.round(total),
    };
  }, [checkout]);

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign("/");
  }

  async function handlePayment() {
    if (!checkout || !user || !window.Razorpay) {
      showToast?.("Checkout is unavailable. Please try again.", "error");
      return;
    }

    setLoading(true);
    let bookingId;
    try {
      const orderRes = await apiFetch("/api/payment/create-order", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.user_id,
          room_id: checkout.room.room_id,
          ...checkout.form,
          vehicle_type: selectedVehicle,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Unable to create order");
      }

      bookingId = orderData.booking_id;
      const options = {
        key: orderData.razorpay_key,
        amount: Math.round(Number(orderData.total_price) * 100),
        currency: "INR",
        name: "VV Grand Park Residency",
        description: `${checkout.room.room_type} booking`,
        order_id: orderData.razorpay_order_id,
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone || "",
        },
        theme: { color: "#0F1923" },
        modal: {
          ondismiss: async () => {
            if (bookingId) {
              await apiFetch("/api/payment/failed", {
                method: "POST",
                body: JSON.stringify({ booking_id: bookingId }),
              });
            }
            setLoading(false);
            showToast?.("Payment cancelled.", "error");
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
                booking_id: bookingId,
                vehicle_type: selectedVehicle,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed");
            }
            sessionStorage.removeItem("vvgrandpark_checkout");
            sessionStorage.setItem(
              "vvgrandpark_booking_success",
              JSON.stringify(verifyData.booking),
            );
            setConfirmedBooking(verifyData.booking);
            setLoading(false);
          } catch (error) {
            showToast?.(error.message || "Payment failed", "error");
            setLoading(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (response) => {
        // Don't cancel the booking here — Razorpay lets the user retry
        // on the same order. Only show an error message.
        showToast?.(
          `Payment failed: ${response.error?.description || "Please try again."}`,
          "error",
        );
      });
      razorpay.open();
    } catch (error) {
      console.error(error);
      showToast?.(error.message || "Payment failed", "error");
      setLoading(false);
    }
  }

  async function downloadInvoice() {
    if (!confirmedBooking) return;
    const booking = confirmedBooking;
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

  if (!checkout) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F6F1] px-6 text-center font-[var(--font-body)]">
        <div className="rounded-[16px] border border-[#E4DED2] bg-white px-8 py-9 shadow-[0_16px_48px_rgba(15,25,35,0.08)]">
          <h1 className="font-[var(--font-display)] text-2xl font-semibold text-[#0F1923]">
            No booking details found
          </h1>
          <button
            onClick={() => window.location.assign("/")}
            className="mt-5 rounded-[8px] bg-[#07111B] px-5 py-3 text-sm font-semibold text-white"
          >
            Return to hotel
          </button>
        </div>
      </main>
    );
  }

  const room = checkout.room || {};
  const form = checkout.form || {};
  const roomNumber = room.room_number || room.room_id || "-";
  const guestCount = form.guest_count || 1;
  const nights = checkout.nights || 1;
  const vehicleOptions = [
    {
      id: NO_VEHICLE_ID,
      name: "I don't need a vehicle",
      seats: 0,
      description: "",
    },
    ...VEHICLES,
  ];

  return (
    <main className="min-h-screen bg-[#F8F6F1] px-4 py-5 font-[var(--font-body)] text-[#050A0F] sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1150px]">
        <header className="mb-5 flex min-h-8 items-center justify-between">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 text-[0.95rem] font-bold text-[#050A0F] transition hover:text-[#C98216]"
            aria-label="Back to booking"
          >
            <ArrowLeftIcon size={18} />
            <span>Back to booking</span>
          </button>
        </header>

        <div className="space-y-4">
          <section className="grid overflow-hidden rounded-[16px] border border-[#E4DED2] bg-white shadow-[0_15px_42px_rgba(15,25,35,0.08)] lg:grid-cols-[1fr_1fr]">
            <div className="h-[260px] overflow-hidden sm:h-[320px] lg:h-[340px]">
              <img
                src={room.image_url || FALLBACK_ROOM_IMAGE}
                alt={`${room.room_type || "Hotel"} room`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center px-6 py-7 sm:px-8 lg:px-9">
              <p className="text-[0.72rem] font-bold uppercase text-[#C98216]">
                Your stay
              </p>
              <h1 className="mt-1 font-[var(--font-display)] text-[2rem] font-bold leading-tight text-[#050A0F] sm:text-[2.2rem]">
                {room.room_type || "Room"}
              </h1>
              <div className="my-5 h-px bg-[#D8D3CA]" />
              <div className="grid gap-5 border-b border-[#D8D3CA] pb-5 sm:grid-cols-2 sm:gap-10">
                <StayMetric
                  icon={<BedIcon size={19} />}
                  label="Room"
                  value={roomNumber}
                />
                <StayMetric
                  icon={<UserIcon size={19} />}
                  label="Guests"
                  value={guestCount}
                />
              </div>
              <div className="mt-5 grid gap-4">
                <StayRow
                  icon={<CalendarIcon size={19} />}
                  label="Check-in"
                  value={formatStayDate(form.check_in_date)}
                />
                <StayRow
                  icon={<CalendarIcon size={19} />}
                  label="Check-out"
                  value={formatStayDate(form.check_out_date)}
                />
                <StayRow
                  icon={<MoonIcon size={19} />}
                  label="Nights"
                  value={nights}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[16px] border border-[#E4DED2] bg-white px-6 py-5 shadow-[0_15px_42px_rgba(15,25,35,0.06)] sm:px-7 lg:px-8">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_350px]">
              <div className="min-w-0">
                <h2 className="font-[var(--font-display)] text-[1.65rem] font-bold leading-tight text-[#050A0F]">
                  Simple checkout details
                </h2>
                <p className="mt-2 text-[0.82rem] leading-6 text-[#3F4851]">
                  Vehicle selection is only a reminder for hotel staff. Any
                  vehicle pricing will be confirmed by the hotel admin
                  separately.
                </p>

                <div className="mt-5">
                  <h3 className="text-[0.94rem] font-bold text-[#050A0F]">
                    Local Pickup &amp; Drop Reminder
                  </h3>
                  <p className="mt-1 text-[0.86rem] leading-6 text-[#3F4851]">
                    Local pickup/drop may have additional charges. For travel or
                    outstation trips, please contact the hotel admin for
                    pricing.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {vehicleOptions.map((item) => (
                    <VehicleOption
                      key={item.id}
                      item={item}
                      active={selectedVehicle === item.id}
                      onChange={setSelectedVehicle}
                    />
                  ))}
                </div>

                <div className="mt-3 flex gap-3 rounded-[9px] border border-[#E5D2B8] bg-[#FFF6EA] px-3.5 py-3 text-[0.86rem] leading-6 text-[#1F252B]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C98216] text-white">
                    <InfoIcon size={14} />
                  </span>
                  <p>
                    <strong>Note:</strong> In case of 2 adults and 1 child
                    (below 5 years), the child's food is{" "}
                    <strong className="text-[#C98216]">complimentary.</strong>{" "}
                    Please inform the hotel staff during check-in.
                  </p>
                </div>
              </div>

              <aside className="rounded-[14px] border border-[#E1DED7] bg-white px-6 py-6 lg:self-start">
                <h3 className="text-[1rem] font-bold text-[#050A0F]">
                  Payment summary
                </h3>
                <div className="mt-5 h-px bg-[#D8D3CA]" />
                <div className="mt-5 space-y-5 text-[0.88rem]">
                  <div className="flex items-center justify-between gap-4 text-[#525B65]">
                    <span>Room subtotal</span>
                    <span>{formatAmount(pricing.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-[#525B65]">
                    <span>GST (18%)</span>
                    <span>{formatAmount(pricing.gst)}</span>
                  </div>
                </div>
                <div className="my-6 h-px bg-[#D8D3CA]" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[0.95rem] font-bold text-[#050A0F]">
                    Final payable
                  </span>
                  <strong className="font-[var(--font-display)] text-[1.35rem] font-bold text-[#050A0F]">
                    {formatAmount(pricing.total)}
                  </strong>
                </div>
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="mt-6 flex h-[58px] w-full items-center justify-center rounded-[7px] bg-[#07111B] px-5 text-[1rem] font-bold text-white shadow-[0_10px_22px_rgba(7,17,27,0.2)] transition hover:bg-[#142131] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Opening secure payment..."
                    : `Pay ${formatAmount(pricing.total)}`}
                </button>
                <div className="mt-6 flex items-center justify-center gap-2 text-[0.82rem] font-medium text-[#5D6670]">
                  <LockIcon size={14} />
                  <span>Secure payment</span>
                </div>
              </aside>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-[16px] border border-[#E4DED2] bg-white px-6 py-4 shadow-[0_10px_30px_rgba(15,25,35,0.04)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-[#FBF8F2] text-[#07111B]">
                <ShieldIcon size={29} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[0.92rem] font-bold text-[#050A0F]">
                  Your payment is secure and encrypted.
                </h2>
                <p className="mt-1 text-[0.82rem] text-[#525B65]">
                  We use industry-standard security to protect your information.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <PaymentLogo className="text-[#123E9C]">VISA</PaymentLogo>
              <PaymentLogo>
                <span className="relative flex h-5 w-9 items-center">
                  <span className="absolute left-0 h-5 w-5 rounded-full bg-[#EB001B]" />
                  <span className="absolute right-0 h-5 w-5 rounded-full bg-[#F79E1B] opacity-90" />
                </span>
              </PaymentLogo>
              <PaymentLogo>
                <span className="italic">UPI</span>
              </PaymentLogo>
              <PaymentLogo>
                <span className="flex items-center gap-0.5">
                  <span className="h-4 w-1.5 rounded bg-[#4285F4]" />
                  <span className="h-4 w-1.5 rounded bg-[#EA4335]" />
                  <span className="h-4 w-1.5 rounded bg-[#FBBC05]" />
                  <span className="h-4 w-1.5 rounded bg-[#34A853]" />
                </span>
              </PaymentLogo>
            </div>
          </section>
        </div>

        {confirmedBooking && (
          <div className="modal-bg">
            <div className="modal max-w-[460px]">
              <div className="rounded-t-[20px] bg-[#0F1923] px-7 pb-6 pt-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#2D9A6E] bg-[rgba(45,154,110,0.2)] text-[#2D9A6E]">
                  <CheckIcon size={34} />
                </div>
                <div className="font-[var(--font-display)] text-[1.4rem] font-semibold text-white">
                  Booking Confirmed!
                </div>
                <div className="mt-1.5 text-[0.82rem] text-white/50">
                  Payment successful - your room is reserved
                </div>
              </div>
              <div className="px-7 py-6">
                <div className="mb-5 rounded-xl bg-[#F8F9FA] px-[18px] py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-[var(--font-display)] text-base font-semibold text-[#0F1923]">
                      {confirmedBooking.room_type || room.room_type}
                    </span>
                    <span className="rounded-[3px] bg-[#E8F8F0] px-2.5 py-[3px] text-[0.65rem] font-bold uppercase text-[#2D9A6E]">
                      Confirmed
                    </span>
                  </div>
                  {[
                    ["Booking ID", `${formatBookingId(confirmedBooking)}`],
                    ["Check-in", confirmedBooking.check_in_date?.slice(0, 10)],
                    [
                      "Check-out",
                      confirmedBooking.check_out_date?.slice(0, 10),
                    ],
                    ["Nights", nights],
                    [
                      "Room Charges",
                      formatAmount(confirmedBooking.total_price),
                    ],
                    ["GST (18%)", formatAmount(confirmedBooking.gst_amount)],
                    ["Payment ID", confirmedBooking.payment_id || "-"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between border-t border-[#E9ECEF] py-[5px] text-[0.82rem]"
                    >
                      <span className="text-[#ADB5BD]">{label}</span>
                      <span className="font-semibold text-[#0F1923]">
                        {value}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t-[1.5px] border-[#0F1923] pb-1 pt-2.5 text-[0.95rem]">
                    <span className="font-[var(--font-display)] font-semibold text-[#0F1923]">
                      Total Paid
                    </span>
                    <span className="font-[var(--font-display)] text-[1.1rem] font-bold text-[#0F1923]">
                      {formatAmount(confirmedBooking.final_total)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={downloadInvoice}
                  className="mb-2.5 flex w-full items-center justify-center gap-2 rounded bg-[#0F1923] py-[13px] text-[0.9rem] font-semibold text-white transition hover:bg-[#C9A84C]"
                >
                  <DownloadIcon size={16} />
                  Download Invoice (PDF)
                </button>
                <button
                  onClick={() => window.location.assign("/")}
                  className="w-full rounded border border-[#E9ECEF] bg-transparent py-[11px] text-sm font-medium text-[#6C757D]"
                >
                  Back to Site
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
