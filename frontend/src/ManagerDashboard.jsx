import React, { useState, useEffect, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  XIcon,
  DownloadIcon,
  BookingIcon,
  BedIcon,
  CalendarIcon,
  ArrowRightIcon,
  UserIcon,
  CheckIcon,
  CreditCardIcon,
  GridIcon,
  TrendingUpIcon,
} from "./Icons";
import VehicleCustomers from "./Components/VehicleCustomers";
import AdminBookingForUsers from "./AdminBookingForUsers";
import { getPaginationItems } from "./pagination";


const API = process.env.REACT_APP_API_URL || "";
const GST_RATE = 0.18;

const apiFetch = (url, options = {}) =>
  fetch(`${API}${url}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

/* ── LIVE TIMER ── */
function formatLocalDate(date) {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = String(dateStr).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function buildOccupiedNights(bookings = []) {
  const nights = new Set();

  bookings.forEach((booking) => {
    const start = parseLocalDate(booking.check_in_date);
    const end = parseLocalDate(booking.check_out_date);
    if (!start || !end) return;

    const current = new Date(start);
    while (current < end) {
      nights.add(current.toDateString());
      current.setDate(current.getDate() + 1);
    }
  });

  return nights;
}

function isStayAvailable(checkIn, checkOut, occupiedNights) {
  if (!checkIn || !checkOut || checkOut <= checkIn) return false;

  const night = new Date(checkIn);
  while (night < checkOut) {
    if (occupiedNights.has(night.toDateString())) return false;
    night.setDate(night.getDate() + 1);
  }

  return true;
}

function LiveTimer({ checkinTime }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function update() {
      const diff = Math.floor((new Date() - new Date(checkinTime)) / 1000);
      if (diff < 0) {
        setElapsed("00:00:00");
        return;
      }
      const h = Math.floor(diff / 3600),
        m = Math.floor((diff % 3600) / 60),
        s = diff % 60;
      setElapsed(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [checkinTime]);

  return (
    <span className="font-mono text-[1.6rem] font-bold text-[#2D9A6E] tracking-[3px]">
      {elapsed}
    </span>
  );
}

/* ── BOOKING DETAIL MODAL ── */
function formatChartValue(value) {
  return (Number(value) || 0).toLocaleString("en-IN");
}

function ChartTooltip({ item, style }) {
  if (!item) return null;

  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-md bg-[#0F1923] px-2.5 py-1.5 text-left shadow-lg"
      style={style}
    >
      <div className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.8px] text-[#C9A84C]">
        {item.label}
      </div>
      <div className="whitespace-nowrap text-[11px] font-semibold leading-tight text-white">
        {formatChartValue(item.value)}
      </div>
    </div>
  );
}

function BarChart({ data, color = "#C9A84C", height = 64 }) {
  const [hovered, setHovered] = useState(null);

  if (!data || !data.length) return null;
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  const chartWidth = data.length * 28;

  return (
    <div
      className="relative"
      style={{ height }}
      onMouseLeave={() => setHovered(null)}
    >
      <ChartTooltip
        item={hovered}
        style={{
          left: hovered ? `${hovered.xPercent}%` : "0%",
          top: hovered ? `${hovered.top}px` : 0,
        }}
      />
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
        preserveAspectRatio="none"
      >
        {data.map((d, i) => {
          const value = Number(d.value) || 0;
          const barH = Math.max(4, (value / max) * (height - 16));
          const x = i * 28 + 4;
          const y = height - barH - 4;
          const label = d.label || `Item ${i + 1}`;

          return (
            <rect
              key={`${label}-${i}`}
              x={x}
              y={y}
              width={20}
              height={barH}
              rx={3}
              fill={color}
              opacity={hovered?.index === i ? 1 : 0.85}
              onMouseEnter={() =>
                setHovered({
                  index: i,
                  label,
                  value,
                  xPercent: ((x + 10) / chartWidth) * 100,
                  top: Math.max(0, Math.min(height - 32, y - 30)),
                })
              }
            >
              <title>{`${label}: ${formatChartValue(value)}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

function LineChart({ data, color = "#C9A84C", height = 80 }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  const w = 280;
  const pad = 8;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const value = Number(d.value) || 0;
    const y = pad + (1 - value / max) * (height - pad * 2);
    return {
      x,
      y,
      value,
      label: d.label || `Item ${i + 1}`,
      point: `${x},${y}`,
    };
  });
  const filled = [
    ...pts.map((pt) => pt.point),
    `${w - pad},${height - pad}`,
    `${pad},${height - pad}`,
  ].join(" ");

  return (
    <div
      className="relative"
      style={{ height }}
      onMouseLeave={() => setHovered(null)}
    >
      <ChartTooltip
        item={hovered}
        style={{
          left: hovered ? `${hovered.xPercent}%` : "0%",
          top: hovered ? `${hovered.top}px` : 0,
        }}
      />
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="managerLineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={filled} fill="url(#managerLineGradient)" />
        <polyline
          points={pts.map((pt) => pt.point).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((pt, i) => (
          <g key={`${pt.label}-${i}`}>
            <circle cx={pt.x} cy={pt.y} r="3" fill={color} />
            <circle
              cx={pt.x}
              cy={pt.y}
              r="9"
              fill="transparent"
              onMouseEnter={() =>
                setHovered({
                  index: i,
                  label: pt.label,
                  value: pt.value,
                  xPercent: (pt.x / w) * 100,
                  top: Math.max(0, Math.min(height - 32, pt.y - 30)),
                })
              }
            >
              <title>{`${pt.label}: ${formatChartValue(pt.value)}`}</title>
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}

function DonutChart({ confirmed, cancelled, completed, size = 100 }) {
  const [hovered, setHovered] = useState(null);
  const rawTotal = confirmed + cancelled + completed;
  const total = rawTotal || 1;
  const r = 28;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const segments = [
    { label: "Confirmed", val: confirmed, color: "#2D9A6E" },
    { label: "Cancelled", val: cancelled, color: "#C0392B" },
    { label: "Completed", val: completed, color: "#2471A3" },
  ];
  let offset = 0;
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      onMouseLeave={() => setHovered(null)}
    >
      <ChartTooltip
        item={hovered}
        style={{
          left: hovered ? `${hovered.xPercent}%` : "0%",
          top: hovered ? `${hovered.top}px` : 0,
        }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#F1F3F5"
          strokeWidth="10"
        />
        {segments.map(({ label, val, color }) => {
          const value = Number(val) || 0;
          const dash = (value / total) * circ;
          const startOffset = offset;
          const middleAngle =
            -90 + ((startOffset + dash / 2) / circ) * 360;
          const rad = (middleAngle * Math.PI) / 180;
          const tooltipX = cx + Math.cos(rad) * r;
          const tooltipY = cy + Math.sin(rad) * r;
          const el = (
            <circle
              key={label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={hovered?.label === label ? "12" : "10"}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-startOffset}
              className="cursor-pointer transition-all"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: `${cx}px ${cy}px`,
              }}
              onMouseEnter={() =>
                setHovered({
                  label,
                  value,
                  xPercent: (tooltipX / size) * 100,
                  top: Math.max(0, Math.min(size - 32, tooltipY - 30)),
                })
              }
            >
              <title>{`${label}: ${formatChartValue(value)}`}</title>
            </circle>
          );
          offset += dash;
          return el;
        })}
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#0F1923"
          pointerEvents="none"
        >
          {rawTotal}
        </text>
      </svg>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "#0F1923",
  chartData,
  chartType = "bar",
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-[#E9ECEF] bg-white px-[22px] py-5 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="mb-[6px] text-[0.65rem] font-bold uppercase tracking-[1.5px] text-[#868E96]">
            {label}
          </div>
          <div className="font-body text-[1.5rem] font-semibold leading-none text-[#0F1923]">
            {value}
          </div>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: accent }}
        >
          <Icon size={18} color="#fff" />
        </div>
      </div>
      {chartData && chartType === "bar" && (
        <BarChart data={chartData} color="#C9A84C" height={52} />
      )}
      {chartData && chartType === "line" && (
        <LineChart data={chartData} color="#C9A84C" height={52} />
      )}
    </div>
  );
}

function BookingDetailModal({ bookingId, onClose, showToast, onRefresh }) {



  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addonLabel, setAddonLabel] = useState("");
  const [addonAmount, setAddonAmount] = useState("");
  const [addonLoading, setAddonLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Online");

  const PRESET_ADDONS = [
    "Food & Beverages",
    "Laundry",
    "Extra Bed",
    "Room Service",
  ];
  const PAYMENT_MODES = ["Cash", "UPI", "Card", "Online", "Bank Transfer"];

  const fetchBooking = () => {
    setLoading(true);
    apiFetch(`/api/manager/bookings/${bookingId}`)
      .then((r) => r.json())
      .then(setBooking)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]); // eslint-disable-line

  async function handleCheckin() {
    const res = await apiFetch(`/api/manager/bookings/${bookingId}/checkin`, {
      method: "PATCH",
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, "error");
    showToast("Guest checked in!", "success");
    fetchBooking();
    onRefresh();
  }

  async function handleCheckout() {
    if (!window.confirm("Confirm checkout? This will calculate final bill."))
      return;
    const res = await apiFetch(`/api/manager/bookings/${bookingId}/checkout`, {
      method: "PATCH",
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, "error");
    showToast(
      `Checked out! Total: Rs.${Number(data.final_total).toLocaleString()}`,
      "success",
    );
    fetchBooking();
    onRefresh();
  }

  async function addAddon() {
    if (!addonLabel || !addonAmount)
      return showToast("Enter label and amount", "error");
    setAddonLoading(true);
    const res = await apiFetch(`/api/manager/bookings/${bookingId}/addons`, {
      method: "POST",
      body: JSON.stringify({ label: addonLabel, amount: +addonAmount }),
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, "error");
    showToast(`Added: ${addonLabel} — Rs.${addonAmount}`, "success");
    setAddonLabel("");
    setAddonAmount("");
    setAddonLoading(false);
    fetchBooking();
    onRefresh();
  }

  async function markAddonsPaid() {
    const res = await apiFetch(`/api/manager/bookings/${bookingId}/addons/mark-paid`, {
      method: "PATCH",
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, "error");
    showToast("Add-ons marked as paid", "success");
    fetchBooking();
    onRefresh();
  }

  async function markBalancePaid() {
    if (!booking?.actual_checkin) {
      return showToast("Record check-in before collecting balance", "error");
    }
    setBalanceLoading(true);
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/balance-paid`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to mark balance paid");
      showToast("Remaining balance marked as paid", "success");
      fetchBooking();
      onRefresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBalanceLoading(false);
    }
  }

  async function removeAddon(addonId) {
    await apiFetch(`/api/mana/bookings/${bookingId}/addons/${addonId}`, {
      method: "DELETE",
    });
    showToast("Addon removed", "success");
    fetchBooking();
    onRefresh();
  }

  async function printInvoice() {
    if (!booking) return;
    const b = booking;
    const selectedPaymentMode = paymentMode;
    const addonsForPdf = b.addons || [];
    const isAddonPaid =
      addonsForPdf.length > 0 && addonsForPdf.every((a) => a.paid === 1);
    const isCancelled = b.status === "cancelled";
    const ci = b.actual_checkin
      ? new Date(b.actual_checkin).toLocaleString("en-IN")
      : b.check_in_date?.slice(0, 10);
    const co = b.actual_checkout
      ? new Date(b.actual_checkout).toLocaleString("en-IN")
      : b.check_out_date?.slice(0, 10);
    const nights =
      b.check_in_date && b.check_out_date
        ? Math.ceil(
            (new Date(b.check_out_date) - new Date(b.check_in_date)) / 86400000,
          )
        : 1;
  const basePrice = Number(b.total_price || 0);
  


const roomGstPdf =
  Math.round(basePrice * GST_RATE * 100) / 100;

const roomTotalPdf =
  Math.round((basePrice + roomGstPdf) * 100) / 100;

const advancePaidPdf = Number(b.advance_paid || 0);
const balancePaidPdf = Number(b.balance_paid || 0);

const paymentTotalPdf = Number(
  b.total_amount || b.final_total || roomTotalPdf
);

// Room booking remaining balance
const roomRemainingPdf = Math.max(
  0,
  Math.round(
    (paymentTotalPdf - advancePaidPdf - balancePaidPdf) * 100
  ) / 100
);

// Add-ons
const addonTotalPdf = Number(b.addon_charges || 0);

const addonGstPdf =
  Math.round(addonTotalPdf * GST_RATE * 100) / 100;

// Only unpaid add-ons
const unpaidAddonTotalPdf =
  (b.addons || [])
    .filter((addon) => addon.paid !== 1)
    .reduce(
      (sum, addon) => sum + Number(addon.amount || 0),
      0
    );

const unpaidAddonGstPdf =
  Math.round(unpaidAddonTotalPdf * GST_RATE * 100) / 100;

// Final remaining amount
const remainingPdf = Math.round(
  (roomRemainingPdf +
    unpaidAddonTotalPdf +
    unpaidAddonGstPdf) *
    100
) / 100;

// Grand total
const grandTotalPdf = Math.round(
  (paymentTotalPdf + addonTotalPdf + addonGstPdf) *
    100
) / 100;
    const invNo = `INV-${String(b.booking_id).padStart(5, "0")}`;
    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    const L = 18;
    const R = W - 18;

    doc.setFillColor(15, 25, 35);
    doc.rect(0, 0, W, 32, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(17);
    doc.setTextColor(201, 168, 76);
    doc.text("VV GRAND PARK", L, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(180, 160, 100);
    doc.text("RESIDENCY", L, 19);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text("INVOICE", R, 13, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 140, 120);
    doc.text(invNo, R, 20, { align: "right" });
    doc.text(`Date: ${today}`, R, 27, { align: "right" });

    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.4);
    doc.line(L, 37, R, 37);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(134, 142, 150);
    doc.text("BILL TO", L, 44);
    doc.text("FROM", W / 2 + 8, 44);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 25, 35);
    doc.text(b.guest_name || "Guest", L, 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(73, 80, 87);
    doc.text(b.email || "", L, 57);
    if (b.phone) doc.text(b.phone, L, 63);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 25, 35);
    doc.text("VV Grand Park Residency", W / 2 + 8, 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(73, 80, 87);
    doc.text("vvgrandpark.com", W / 2 + 8, 57);
    doc.text("3/4/D, Thanjai Saalai, Thiruvarur - 610004", W / 2 + 8, 63);
    doc.text("+91 93849 82510 | vvgrandpark@gmail.com", W / 2 + 8, 69);

    const tableTop = 76;
    doc.setFillColor(15, 25, 35);
    doc.rect(L, tableTop, W - 36, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(201, 168, 76);
    doc.text("DESCRIPTION", L + 4, tableTop + 5.5);
    doc.text("DETAILS", 108, tableTop + 5.5);
    doc.text("AMOUNT", R, tableTop + 5.5, { align: "right" });

    const rows = [
      {
        desc: `${b.room_type} — Room ${b.room_number || b.room_id}`,
        detail: `${nights} night${nights > 1 ? "s" : ""}`,
        amount: `Rs.${basePrice.toLocaleString()}`,
      },
      { desc: "Check-in", detail: ci, amount: "—" },
      { desc: "Check-out", detail: co, amount: "—" },
      ...(b.hours_spent
        ? [
            {
              desc: "Hours Stayed",
              detail: `${b.hours_spent} hrs`,
              amount: "—",
            },
          ]
        : []),
      { desc: "Guests", detail: `${b.guest_count || 1}`, amount: "—" },
    ];

    let y = tableTop + 13;
    rows.forEach((row, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(L, y - 5, W - 36, 8, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(15, 25, 35);
      doc.text(row.desc, L + 4, y);
      doc.setTextColor(80, 80, 80);
      doc.text(String(row.detail), 108, y);
      doc.text(row.amount, R, y, { align: "right" });
      y += 8;
    });

    if (b.addons && b.addons.length > 0) {
      y += 2;
      doc.setFillColor(235, 235, 235);
      doc.rect(L, y - 4, W - 36, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text("ADD-ON CHARGES", L + 4, y + 1);
      y += 8;
      b.addons.forEach((addon, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(L, y - 5, W - 36, 8, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(15, 25, 35);
        doc.text(addon.label, L + 4, y);
        doc.setTextColor(80, 80, 80);
        doc.text(
          new Date(addon.created_at).toLocaleDateString("en-IN"),
          108,
          y,
        );
        doc.text(`Rs.${Number(addon.amount).toLocaleString()}`, R, y, {
          align: "right",
        });
        y += 8;
      });
    }

    y += 5;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(L, y, R, y);
    y += 5;
    const SX = W - 90;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.text("BOOKING PAYMENT — ALREADY PAID", L, y + 1);
    y += 6;
    [
      { label: "Room Charges", val: `Rs.${basePrice.toLocaleString()}` },
      {
        label: "GST (18%)",
        val: `Rs.${Math.round(roomGstPdf).toLocaleString()}`,
      },
    ].forEach(({ label, val }) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(label, SX, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(val, R, y, { align: "right" });
      y += 6;
    });
    doc.setFillColor(...(isCancelled ? [252, 232, 232] : [232, 248, 240]));
    doc.rect(SX - 1, y - 4, R - SX + 3, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...(isCancelled ? [192, 57, 43] : [45, 154, 110]));
    doc.text(
      isCancelled ? "Refunded (Cancelled)" : "Amount Already Paid",
      SX,
      y + 1,
    );
 doc.text(
  `Rs.${Math.round(
    advancePaidPdf + balancePaidPdf
  ).toLocaleString()}`,
  R,
  y + 1,
  {
    align: "right",
  }
);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.text("ADD-ON CHARGES", L, y + 1);
    y += 6;
    [
      { label: "Add-on Charges", val: `Rs.${addonTotalPdf.toLocaleString()}` },
      {
        label: "GST on Add-ons (18%)",
        val: `Rs.${Math.round(addonGstPdf).toLocaleString()}`,
      },
    ].forEach(({ label, val }) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(label, SX, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(val, R, y, { align: "right" });
      y += 6;
    });
    const remBg = isAddonPaid ? [232, 248, 240] : [255, 248, 220];
    const remTxt = isAddonPaid ? [45, 154, 110] : [180, 120, 20];
    doc.setFillColor(...remBg);
    doc.rect(SX - 1, y - 4, R - SX + 3, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...remTxt);
    doc.text(isAddonPaid ? "Add-ons Paid" : "Remaining to Pay", SX, y + 1);
    doc.text(`Rs.${Math.round(remainingPdf).toLocaleString()}`, R, y + 1, {
      align: "right",
    });
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Payment Mode: ${selectedPaymentMode}   Status: ${isAddonPaid ? "PAID" : "PENDING"}`,
      SX,
      y,
    );
    y += 8;

    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.5);
    doc.line(SX - 1, y - 1, R, y - 1);
    doc.setFillColor(15, 25, 35);
    doc.roundedRect(SX - 1, y + 1, R - SX + 3, 14, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(201, 168, 76);
    doc.text("GRAND TOTAL", (SX - 1 + R) / 2, y + 6.5, { align: "center" });
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(
      isCancelled ? "Rs.0" : `Rs.${Math.round(grandTotalPdf).toLocaleString()}`,
      (SX - 1 + R) / 2,
      y + 13,
      { align: "center" },
    );

    // Terms & Conditions
    y += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("TERMS & CONDITIONS", L, y);
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.2);
    doc.line(L, y + 2.5, R, y + 2.5);
    y += 6;

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
      "14. Hotel policies may be updated from time to time for legal, safety, or operational reasons. The terms applicable at the time of booking will generally apply unless a change is required by applicable law or safety requirements.",
      "15. For booking assistance or invoice corrections, please contact the hotel as soon as possible and preferably before check-in.",
      "16. The room tariff does not include additional services or charges unless expressly included in the booking, including transport, minibar, laundry, unapproved extras, or damage to hotel property.",
      "17. Visitors are permitted only with hotel approval and may be required to provide valid identification.",
      "18. All guests must comply with hotel quiet hours, safety instructions, and reasonable house rules during their stay.",
      "19. Lost-property claims will be handled in accordance with hotel records, hotel policy, and applicable law.",
      "20. This is an electronically generated invoice and does not require a physical signature where permitted under applicable law.",
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.6);
    doc.setTextColor(120, 120, 120);

    const colWidth = (R - L - 6) / 2;
    const drawColumn = (items, x, startY) => {
      let colY = startY;
      items.forEach((term) => {
        const lines = doc.splitTextToSize(term, colWidth);
        doc.text(lines, x, colY);
        colY += lines.length * 3.1 + 1;
      });
      return colY;
    };

    const leftEndY = drawColumn(terms.slice(0, 10), L, y);
    const rightEndY = drawColumn(terms.slice(10), L + colWidth + 6, y);
    y = Math.max(leftEndY, rightEndY);

    const footerY = Math.max(282, y + 6);
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.3);
    doc.line(L, footerY, R, footerY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(134, 142, 150);
    doc.text(
      "Thank you for choosing VV Grand Park Residency. We look forward to welcoming you again.",
      W / 2,
      footerY + 5,
      { align: "center" },
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
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

    if (isCancelled) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.18 }));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(60);
      doc.setTextColor(192, 57, 43);
      doc.text("CANCELLED", W / 2, 160, {
        align: "center",
        angle: 30,
      });
      doc.restoreGraphicsState();
    }

    doc.autoPrint();
const pdfBlob = doc.output("blob");
const pdfUrl = URL.createObjectURL(pdfBlob);

const printWindow = window.open(pdfUrl, "_blank");

if (!printWindow) {
  showToast("Please allow pop-ups to print the invoice.", "error");
  URL.revokeObjectURL(pdfUrl);
  return;
}

setTimeout(() => {
  URL.revokeObjectURL(pdfUrl);
}, 60000);
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center bg-navy/70 backdrop-blur-sm">
        <div className="bg-white rounded-2xl px-10 py-8 text-gray-400 text-sm">
          Loading booking details...
        </div>
      </div>
    );

  if (!booking) return null;

  const basePrice = Number(booking.total_price);
  const roomGst = Math.round(basePrice * GST_RATE * 100) / 100;
  const alreadyPaid = Math.round((basePrice + roomGst) * 100) / 100;
  const addonTotal = Number(booking.addon_charges || 0);
  const addonGst = Math.round(addonTotal * GST_RATE * 100) / 100;
  const remainingAmount = Math.round((addonTotal + addonGst) * 100) / 100;
  const finalTotal = Math.round((alreadyPaid + remainingAmount) * 100) / 100;
  const isCancelled = booking.status === "cancelled";
  const addonsList = booking.addons || [];
  const hasUnpaidAddons = addonsList.some((a) => a.paid !== 1);
  const allAddonsPaid = addonsList.length > 0 && !hasUnpaidAddons;
  const paymentTotalAmount = Number(
    booking.total_amount || booking.final_total || alreadyPaid || 0,
  );
const advancePaidAmount = Number(booking.advance_paid || 0);
const balancePaidAmount = Number(booking.balance_paid || 0);
const storedPaymentRemaining = Number(booking.remaining_amount || 0);

const normalizedPaymentStatus = String(
  booking.payment_status || "",
).toUpperCase();

const calculatedPaymentRemaining = Math.max(
  0,
  Math.round(
    (paymentTotalAmount - advancePaidAmount - balancePaidAmount) * 100,
  ) / 100,
);

const advanceRemainingAmount =
  normalizedPaymentStatus === "PAID"
    ? 0
    : storedPaymentRemaining > 0
      ? storedPaymentRemaining
      : calculatedPaymentRemaining;
const rawPaymentStatus =
  normalizedPaymentStatus ||
  (advanceRemainingAmount > 0 ? "PARTIALLY_PAID" : "PAID");
  const paymentStatusLabel =
    rawPaymentStatus === "PARTIALLY_PAID"
      ? "Partially Paid"
      : rawPaymentStatus.charAt(0).toUpperCase() +
        rawPaymentStatus.slice(1).toLowerCase();
  const hasAdvancePayment =
    advancePaidAmount > 0 ||
    balancePaidAmount > 0 ||
    advanceRemainingAmount > 0 ||
    rawPaymentStatus === "PARTIALLY_PAID";
 const receivedBookingAmount =
  normalizedPaymentStatus === "PAID"
    ? paymentTotalAmount
    : hasAdvancePayment
      ? advancePaidAmount + balancePaidAmount
      : alreadyPaid;
  const advancePaymentMode = (() => {
    const method = String(booking.payment_method || "").trim();
    if (/cash/i.test(method)) return "Cash";
    if (/online|razorpay/i.test(method)) return "Online";
    if (/upi/i.test(method)) return "UPI";
    if (/card/i.test(method)) return "Card";
    if (/bank/i.test(method)) return "Bank Transfer";
    return method.replace(/\s*advance$/i, "") || paymentMode;
  })();
const bookingPaidLabel =
  normalizedPaymentStatus === "PAID"
    ? `Amount Paid (${advancePaymentMode})`
    : hasAdvancePayment
      ? `Amount Paid (${advancePaymentMode})`
      : "Amount Already Paid";
  const totalRemainingToPay = Math.round(
    ((hasAdvancePayment ? advanceRemainingAmount : 0) +
      (allAddonsPaid ? 0 : remainingAmount)) *
      100,
  ) / 100;
  const allPaymentsSettled = totalRemainingToPay <= 0;
  const formatMoney = (value) =>
    `Rs.${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

  const paymentIcons = {
    Cash: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
      </svg>
    ),
    UPI: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
      </svg>
    ),
    Card: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
      </svg>
    ),
    Online: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" />
      </svg>
    ),
    "Bank Transfer": (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.5 2L2 7v2h19V7L11.5 2zM4 10v7H2v2h20v-2h-2v-7h-2v7h-4v-7h-2v7H8v-7H4z" />
      </svg>
    ),
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-navy/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        {/* ── Header ── */}
        <div className="bg-navy px-7 py-5 flex items-center justify-between shrink-0">
          <div>
            <div className="font-body text-[1.05rem] font-semibold text-white">
              Booking #{booking.booking_id} — {booking.guest_name}
            </div>
            <div className="text-xs text-white/45 mt-0.5">
              {booking.room_type} · {booking.check_in_date?.slice(0, 10)} →{" "}
              {booking.check_out_date?.slice(0, 10)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <XIcon size={14} color="#fff" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5">
          {/* ── Check-in / Check-out cards ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Check-in */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-[0.62rem] font-bold text-gray-400 tracking-widest uppercase mb-2">
                Check-in
              </div>
              {booking.actual_checkin ? (
                <div className="text-[0.82rem] text-emerald-600 font-semibold">
                  ✅ {new Date(booking.actual_checkin).toLocaleString("en-IN")}
                </div>
              ) : (
                <button
                  onClick={handleCheckin}
                  disabled={booking.status === "cancelled"}
                  className="bg-emerald-600 text-white text-[0.8rem] font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ▶ Record Check-in
                </button>
              )}
            </div>

            {/* Check-out */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-[0.62rem] font-bold text-gray-400 tracking-widest uppercase mb-2">
                Check-out
              </div>
              {booking.actual_checkout ? (
                <div>
                  <div className="text-[0.82rem] text-blue-600 font-semibold">
                    ✅{" "}
                    {new Date(booking.actual_checkout).toLocaleString("en-IN")}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Duration: {booking.hours_spent}h
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={
                    !booking.actual_checkin || booking.status === "cancelled"
                  }
                  className={`text-white text-[0.8rem] font-semibold px-4 py-2 rounded-md transition-colors
                    ${
                      booking.actual_checkin
                        ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                        : "bg-gray-300 cursor-not-allowed"
                    }`}
                >
                  ⏹ Record Check-out
                </button>
              )}
            </div>
          </div>

          {hasAdvancePayment && (
            <div className="bg-white rounded-xl border border-gold/30 px-5 py-4 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-display text-[0.9rem] font-semibold text-navy">
                  Payment Details
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.8px] ${
                    rawPaymentStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {paymentStatusLabel}
                </span>
              </div>
              {[
                ["Total Amount", paymentTotalAmount],
                [bookingPaidLabel, advancePaidAmount],
                ...(balancePaidAmount > 0
                  ? [["Balance Paid", balancePaidAmount]]
                  : []),
                ["Remaining Balance", advanceRemainingAmount],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-t border-gray-100 py-2 text-[0.86rem]"
                >
                  <span className="text-gray-500">{label}</span>
                  <span className="font-bold text-navy">
                    {formatMoney(value)}
                  </span>
                </div>
              ))}
              {advanceRemainingAmount > 0 && (
  <button
  onClick={markBalancePaid}
  disabled={
    balanceLoading ||
    advanceRemainingAmount <= 0 ||
    !booking.actual_checkin ||
    booking.status === "cancelled"
  }
  title={
    advanceRemainingAmount <= 0
      ? "Room amount is already fully paid"
      : !booking.actual_checkin
        ? "Record check-in before collecting balance"
        : ""
  }
  className={`mt-3 w-full rounded-md px-4 py-2.5 text-[0.84rem] font-bold transition ${
    advanceRemainingAmount <= 0
      ? "bg-emerald-100 text-emerald-600 cursor-not-allowed"
      : "bg-gold text-navy hover:bg-gold/90"
  } disabled:cursor-not-allowed disabled:opacity-70`}
>
  {balanceLoading
    ? "Updating..."
    : advanceRemainingAmount <= 0
      ? "✓ Balance Paid"
      : `Collect Balance ${formatMoney(advanceRemainingAmount)}`}
</button>
              )}
            </div>
          )}

          {/* ── Add-on Charges ── */}
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="font-display text-[0.9rem] font-semibold text-navy mb-4">
              Add-on Charges
            </div>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESET_ADDONS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAddonLabel(preset)}
                  className={`px-3 py-1 rounded-full text-[0.72rem] font-semibold border-[1.5px] transition-colors
                    ${
                      addonLabel === preset
                        ? "bg-navy text-gold border-navy"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Input row */}
            <div className="flex gap-2 flex-wrap mb-3">
              <input
                value={addonLabel}
                onChange={(e) => setAddonLabel(e.target.value)}
                disabled={isCancelled}
                placeholder="Label (e.g. Airport Transfer)"
                className="flex-[2_1_140px] px-3 py-2 rounded-md border-[1.5px] border-gray-200 text-[0.82rem] focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <input
                value={addonAmount}
                onChange={(e) => setAddonAmount(e.target.value)}
                disabled={isCancelled}
                placeholder="Amount ₹"
                type="number"
                className="flex-[1_1_80px] px-3 py-2 rounded-md border-[1.5px] border-gray-200 text-[0.82rem] focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={addAddon}
                disabled={addonLoading || isCancelled}
                className="bg-gold text-white px-4 py-2 rounded-md text-[0.82rem] font-semibold whitespace-nowrap hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add
              </button>
            </div>

            {/* Addon list */}
            {booking.addons && booking.addons.length > 0 ? (
              <div className="space-y-1.5">
                {booking.addons.map((addon) => (
                  <div
                    key={addon.addon_id}
                    className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-gray-200"
                  >
                    <span className="text-[0.82rem] text-navy">
                      {addon.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[0.85rem] font-bold text-navy">
                        Rs.{Number(addon.amount).toLocaleString()}
                      </span>
                      {!isCancelled && addon.paid !== 1 && (
                        <button
                          onClick={() => removeAddon(addon.addon_id)}
                          className="text-red-600 text-[0.72rem] font-bold hover:text-red-700 transition-colors"
                        >
                          ✕
                        </button>
                      )}
                      {addon.paid === 1 && (
                        <span className="text-[0.62rem] font-bold text-emerald-600 uppercase tracking-wide">
                          Paid
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[0.78rem] text-gray-400 text-center py-2.5">
                No add-ons yet
              </div>
            )}
          </div>

          {/* ── Payment Mode ── */}
          <div className="bg-gray-50 rounded-xl px-5 py-4">
            <div className="text-[0.72rem] font-bold text-gray-400 tracking-widest uppercase mb-3">
              Payment Mode
            </div>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_MODES.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[0.78rem] font-semibold border-2 transition-all
                    ${
                      paymentMode === mode
                        ? "bg-navy text-gold border-navy"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                >
                  {paymentIcons[mode]}
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* ── Bill Summary ── */}
          <div className="bg-navy rounded-xl px-5 py-5">
            <div className="font-display text-[0.9rem] font-semibold text-gold mb-4">
              Bill Summary
            </div>
            {isCancelled && (
              <div className="mb-4 rounded-md bg-red-500/15 border border-red-500/30 px-3 py-2">
                <span className="text-[0.82rem] font-bold text-red-400">
                  Booking Cancelled — Payment Refunded
                </span>
              </div>
            )}

            {/* Already paid section */}
            <div className="mb-3">
              <div className="text-[0.6rem] font-bold text-white/30 tracking-[1.5px] uppercase mb-2">
                {hasAdvancePayment
                  ? "Booking Payment"
                  : "Booking Payment (Already Paid)"}
              </div>
              {[
                {
                  label: "Room Charges",
                  val: `Rs.${basePrice.toLocaleString()}`,
                },
                {
                  label: "GST (18%)",
                  val: `Rs.${Math.round(roomGst).toLocaleString()}`,
                },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="flex justify-between text-[0.82rem] py-1 border-b border-white/5"
                >
                  <span className="text-white/45">{label}</span>
                  <span className="text-white/70 font-semibold">{val}</span>
                </div>
              ))}
              <div
                className={`flex justify-between items-center mt-2 rounded-md px-2.5 py-1.5 border ${isCancelled ? "bg-red-500/15 border-red-500/30" : "bg-emerald-600/15 border-emerald-600/30"}`}
              >
                <span
                  className={`text-[0.82rem] font-bold ${isCancelled ? "text-red-400" : "text-emerald-500"}`}
                >
                  {isCancelled
                    ? "Refunded (Cancelled)"
                    : bookingPaidLabel}
                </span>
                <span
                  className={`text-[0.95rem] font-bold ${isCancelled ? "text-red-400 line-through" : "text-emerald-500"}`}
                >
                  Rs.{Math.round(receivedBookingAmount).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-white/10 my-3" />

            {/* Add-ons section */}
            <div className="mb-3">
              <div className="text-[0.6rem] font-bold text-white/30 tracking-[1.5px] uppercase mb-2">
                Add-on Charges
              </div>
              {[
                {
                  label: "Add-on Charges",
                  val: `Rs.${addonTotal.toLocaleString()}`,
                },
                {
                  label: "GST on Add-ons (18%)",
                  val: `Rs.${Math.round(addonGst).toLocaleString()}`,
                },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="flex justify-between text-[0.82rem] py-1 border-b border-white/5"
                >
                  <span className="text-white/45">{label}</span>
                  <span className="text-white/70 font-semibold">{val}</span>
                </div>
              ))}
              <div
                className={`flex justify-between items-center mt-2 rounded-md px-2.5 py-1.5 border transition-all
                  ${
                    allPaymentsSettled
                      ? "bg-emerald-600/15 border-emerald-600/30"
                      : "bg-gold/10 border-gold/25"
                  }`}
              >
                <div>
                  <div
                    className={`text-[0.82rem] font-display  font-bold ${allPaymentsSettled ? "text-emerald-500" : "text-gold"}`}
                  >
                    {allPaymentsSettled ? "All Paid" : "Remaining Amount to Pay"}
                  </div>
                  <div className="text-[0.68rem] font-display text-white/35 mt-0.5">
                    {allPaymentsSettled
                      ? `Received via ${paymentMode}`
                      : `via ${paymentMode}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {allPaymentsSettled && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="#10b981"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                  <span
                    className={`text-[1.1rem] font-bold font-body ${allPaymentsSettled ? "text-emerald-500" : "text-gold"}`}
                  >
                    Rs.{Math.round(totalRemainingToPay).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gold/30 my-3" />

            {/* Grand total */}
            <div className="flex justify-between items-center">
              <span className="font-body font-bold text-gold text-[1rem]">
                Grand Total
              </span>
              <span className="font-body font-bold text-white text-[1.4rem]">
                {isCancelled
                  ? "Rs.0"
                  : `Rs.${Math.round(finalTotal).toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-2.5">
    <button
  onClick={printInvoice}
  className="flex-1 flex items-center justify-center gap-1 py-3 bg-navy text-gold text-[0.82rem] font-semibold rounded-lg hover:bg-navy/90 transition-colors"
>
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
  Print Invoice
</button>

            <button
              onClick={markAddonsPaid}
              disabled={addonTotal === 0 || isCancelled || !hasUnpaidAddons}
              title={
                addonTotal === 0 ? "No add-on charges to mark as paid" : ""
              }
              className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-lg text-[0.88rem] font-bold transition-all
                                ${
                                  allAddonsPaid
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : addonTotal > 0 && !isCancelled
                                      ? "bg-gold text-navy hover:bg-gold/90"
                                      : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                                }`}
            >
              {allAddonsPaid ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Add-ons Paid
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                  </svg>
                  Mark as Paid
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ── MANAGER BOOKING FORM ── */
function ManagerBookingForm({
  room,
  managerUser,
  onClose,
  showToast,
  onSuccess,
}) {
  const [form, setForm] = useState({
    check_in_date: "",
    check_out_date: "",
    guest_count: 1,
  });
  const [loading, setLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [occupiedNights, setOccupiedNights] = useState(new Set());

  useEffect(() => {
    let active = true;

    async function loadBookedDates() {
      setCalendarLoading(true);

      try {
        const res = await apiFetch(`/api/rooms/${room.room_id}/booked-dates`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load calendar");

        if (active) setOccupiedNights(buildOccupiedNights(data));
      } catch (err) {
        console.error(err);
        if (active) {
          setOccupiedNights(new Set());
          showToast("Unable to load booked dates", "error");
        }
      } finally {
        if (active) setCalendarLoading(false);
      }
    }

    loadBookedDates();

    return () => {
      active = false;
    };
  }, [room.room_id, showToast]);

  const checkInDate = parseLocalDate(form.check_in_date);
  const checkOutDate = parseLocalDate(form.check_out_date);

  const nights =
    checkInDate && checkOutDate
      ? Math.max(
          0,
          Math.ceil((checkOutDate - checkInDate) / 86400000)
        )
      : 0;

  const basePrice = room.price_per_night * nights;
  const gst = Math.round(basePrice * GST_RATE * 100) / 100;
  const total = basePrice + gst;

  async function submit(e) {
    e.preventDefault();
    if (nights <= 0) {
      showToast("Check-out must be after check-in!", "error");
      return;
    }
    if (!isStayAvailable(checkInDate, checkOutDate, occupiedNights)) {
      showToast("Selected dates are already booked", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          user_id: managerUser.user_id,
          room_id: room.room_id,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(
        `Booking confirmed! Rs.${Number(data.total_price).toLocaleString()}`,
        "success"
      );
      onSuccess();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleCheckInChange(date) {
    const nextCheckIn = date ? formatLocalDate(date) : "";

    setForm((prev) => {
      const currentCheckOut = parseLocalDate(prev.check_out_date);
      const keepCheckOut =
        date && currentCheckOut
          ? isStayAvailable(date, currentCheckOut, occupiedNights)
          : false;

      return {
        ...prev,
        check_in_date: nextCheckIn,
        check_out_date: keepCheckOut ? prev.check_out_date : "",
      };
    });
  }

  function handleCheckOutChange(date) {
    setForm((prev) => ({
      ...prev,
      check_out_date: date ? formatLocalDate(date) : "",
    }));
  }

  const inputClass =
    "w-full px-[13px] py-[10px] rounded-md border-[1.5px] border-[#E9ECEF] text-sm text-[#212529] focus:outline-none";
  const labelClass =
    "block text-[0.65rem] font-bold text-[#868E96] mb-1.5 tracking-[0.8px] uppercase";

  return (
    <form onSubmit={submit} className="px-6 py-5">
      {/* Date Fields Grid */}
      <div className="grid grid-cols-1 gap-3.5 mb-3.5">
        <div>
          <label className={labelClass}>Check-in</label>
          <DatePicker
            required
            selected={checkInDate}
            onChange={handleCheckInChange}
            minDate={new Date()}
            filterDate={(date) =>
              !occupiedNights.has(date.toDateString())
            }
            dateFormat="dd/MM/yyyy"
            placeholderText="DD/MM/YYYY"
            popperPlacement="bottom"
            popperClassName="vv-calendar-popper"
            calendarClassName="vv-calendar"
            disabled={loading || calendarLoading}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Check-out</label>
          <DatePicker
            required
            selected={checkOutDate}
            onChange={handleCheckOutChange}
            minDate={checkInDate || new Date()}
            filterDate={(date) =>
              isStayAvailable(checkInDate, date, occupiedNights)
            }
            dateFormat="dd/MM/yyyy"
            placeholderText={checkInDate ? "DD/MM/YYYY" : "Select check-in first"}
            popperPlacement="bottom"
            popperClassName="vv-calendar-popper"
            calendarClassName="vv-calendar"
            disabled={!checkInDate || loading || calendarLoading}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mb-3.5 flex items-center justify-between rounded-md border border-[#E9ECEF] bg-[#F8F9FA] px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 text-[#495057]">
          <span className="font-semibold text-[#0F1923]">Check-in</span>
          <span className="text-[#868E96]">from 1:00 PM</span>
        </div>
        <div className="h-4 w-px bg-[#E9ECEF]" />
        <div className="flex items-center gap-1.5 text-[#495057]">
          <span className="font-semibold text-[#0F1923]">Check-out</span>
          <span className="text-[#868E96]">by 11:00 AM</span>
        </div>
      </div>

      {/* Guest Field */}
      <div className="mb-3.5">
        <label className={labelClass}>Guests</label>
        <input
          type="number"
          min={1}
          max={room.capacity || 4}
          className={inputClass}
          value={form.guest_count}
          onChange={(e) => setForm({ ...form, guest_count: +e.target.value })}
        />
      </div>

      {/* Pricing Breakdown */}
      {nights > 0 && (
        <div className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-md px-3.5 py-3 mb-3.5">
          {[
            {
              label: `Rs.${Number(room.price_per_night).toLocaleString()} × ${nights} night${nights > 1 ? "s" : ""}`,
              val: `Rs.${basePrice.toLocaleString()}`,
            },
            { label: "GST (18%)", val: `Rs.${gst.toLocaleString()}` },
          ].map(({ label, val }) => (
            <div
              key={label}
              className="flex justify-between text-[0.82rem] mb-1"
            >
              <span className="text-[#868E96]">{label}</span>
              <span className=" font-body font-semibold">{val}</span>
            </div>
          ))}

          <div className="flex justify-between text-[0.9rem] border-t border-[#E9ECEF] pt-2 mt-1">
            <span className="font-body font-semibold text-[#0F1923]">
              Total
            </span>
            <strong className="font-body text-[#0F1923]">
              Rs.{Math.round(total).toLocaleString()}
            </strong>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || calendarLoading}
        className="w-full p-3 bg-[#0F1923] text-white border-none rounded-md font-inherit font-semibold text-[0.9rem] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
      >
        <CheckIcon size={15} color="#fff" />
        {calendarLoading
          ? "Loading calendar..."
          : loading
            ? "Confirming..."
            : "Confirm Booking"}
      </button>
    </form>
  );
}

/* ── REPORTS TAB ── */
function ReportsTab({ showToast }) {
  const [reportType, setReportType] = useState("weekly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // PAGINATION
  // =====================================================
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const totalRecords = reportData?.bookings?.length || 0;

  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords / ITEMS_PER_PAGE)
  );

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedBookings =
    reportData?.bookings?.slice(startIndex, endIndex) || [];

  // =====================================================
  // FETCH REPORT
  // =====================================================
  const fetchReport = useCallback(async () => {
    setLoading(true);

    try {
      let url = `/api/manager/reports?type=${reportType}`;

      if (reportType === "custom" && customStart && customEnd) {
        url = `/api/manager/reports?start_date=${customStart}&end_date=${customEnd}`;
      }

      const res = await apiFetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setReportData(data);

      // Always start from page 1 after generating a report
      setCurrentPage(1);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [
    reportType,
    customStart,
    customEnd,
    showToast,
  ]);

  useEffect(() => {
    fetchReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // =====================================================
  // REPORT TYPE CHANGE
  // =====================================================
  const handleReportTypeChange = (type) => {
    // Clear custom dates when leaving Custom
    if (type !== "custom") {
      setCustomStart("");
      setCustomEnd("");
    }

    // Reset pagination
    setCurrentPage(1);

    setReportType(type);
  };

  // =====================================================
  // PAGINATION HANDLERS
  // =====================================================
  const goToPage = (page) => {
    const safePage = Math.min(
      Math.max(page, 1),
      totalPages
    );

    setCurrentPage(safePage);

    // Scroll to table smoothly
    window.requestAnimationFrame(() => {
      const tableElement =
        document.getElementById("reports-bookings-table");

      if (tableElement) {
        tableElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  };

  // =====================================================
  // PDF DOWNLOAD
  // =====================================================
  async function downloadReport() {
    if (!reportData) return;

    const { jsPDF } = await import("jspdf");

    // A4 LANDSCAPE
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "landscape",
    });

    const W = 297;
    const H = 210;

    const marginX = 12;
    const tableWidth = W - marginX * 2;

    // ===================================================
    // PDF COLORS
    // ===================================================
    const navy = [15, 25, 35];
    const gold = [201, 168, 76];
    const lightGray = [248, 249, 250];
    const textDark = [15, 25, 35];
    const textGray = [134, 142, 150];

    // ===================================================
    // PDF HEADER
    // ===================================================
    const drawPdfHeader = () => {
      doc.setFillColor(...navy);
      doc.rect(0, 0, W, 38, "F");

      // Hotel name
      doc.setFont("times", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...gold);
      doc.text("VV GRAND PARK", marginX, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 160, 100);
      doc.text("RESIDENCY", marginX, 22);

      // Report title
      const reportTitle =
        reportType === "weekly"
          ? "WEEKLY REPORT"
          : reportType === "monthly"
            ? "MONTHLY REPORT"
            : "CUSTOM REPORT";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);

      doc.text(
        reportTitle,
        W - marginX,
        15,
        {
          align: "right",
        }
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 170, 150);

      doc.text(
        `Period: ${reportData.startDate} to ${reportData.endDate}`,
        W - marginX,
        22,
        {
          align: "right",
        }
      );

      doc.text(
        `Generated: ${new Date().toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
          }
        )}`,
        W - marginX,
        29,
        {
          align: "right",
        }
      );

      // Gold line
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.5);
      doc.line(
        marginX,
        45,
        W - marginX,
        45
      );
    };

    // ===================================================
    // SUMMARY CARDS
    // ===================================================
    const s = reportData.summary;

    const summaryY = 51;

    const summaryBoxes = [
      {
        label: "Total Bookings",
        val: String(
          s.total_bookings || 0
        ),
      },
      {
        label: "Confirmed",
        val: String(
          s.confirmed || 0
        ),
      },
      {
        label: "Completed",
        val: String(
          s.completed || 0
        ),
      },
      {
        label: "Total Revenue",
        val: `Rs.${Number(
          s.total_revenue || 0
        ).toLocaleString()}`,
      },
    ];

    summaryBoxes.forEach((box, i) => {
      const boxWidth = 62;
      const boxGap = 6;

      const x =
        marginX +
        i * (boxWidth + boxGap);

      doc.setFillColor(...lightGray);

      doc.roundedRect(
        x,
        summaryY,
        boxWidth,
        22,
        3,
        3,
        "F"
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...textGray);

      doc.text(
        box.label,
        x + boxWidth / 2,
        summaryY + 8,
        {
          align: "center",
        }
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...textDark);

      doc.text(
        box.val,
        x + boxWidth / 2,
        summaryY + 17,
        {
          align: "center",
        }
      );
    });

    // ===================================================
    // GST / ADDON INFO
    // ===================================================
    const infoY = summaryY + 30;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(73, 80, 87);

    doc.text(
      `Total GST Collected: Rs.${Number(
        s.total_gst || 0
      ).toLocaleString()}`,
      marginX,
      infoY
    );

    doc.text(
      `Total Add-on Revenue: Rs.${Number(
        s.total_addons || 0
      ).toLocaleString()}`,
      marginX,
      infoY + 7
    );

    // ===================================================
    // PDF TABLE COLUMN CONFIGURATION
    // ===================================================
    const columns = [
      {
        key: "no",
        label: "#",
        width: 10,
        align: "center",
      },
      {
        key: "guest",
        label: "Guest",
        width: 42,
        align: "left",
      },
      {
        key: "room",
        label: "Room",
        width: 28,
        align: "left",
      },
      {
        key: "checkIn",
        label: "Check-in",
        width: 27,
        align: "center",
      },
      {
        key: "checkOut",
        label: "Check-out",
        width: 27,
        align: "center",
      },
      {
        key: "base",
        label: "Base",
        width: 24,
        align: "right",
      },
      {
        key: "addons",
        label: "Addons",
        width: 24,
        align: "right",
      },
      {
        key: "gst",
        label: "GST",
        width: 22,
        align: "right",
      },
      {
        key: "total",
        label: "Total",
        width: 28,
        align: "right",
      },
      {
        key: "status",
        label: "Status",
        width: 25,
        align: "center",
      },
    ];

    // Make sure widths exactly fit table
    const widthDifference =
      tableWidth -
      columns.reduce(
        (sum, col) => sum + col.width,
        0
      );

    if (widthDifference !== 0) {
      columns[1].width += widthDifference;
    }

    // ===================================================
    // DRAW TABLE HEADER
    // ===================================================
    const drawTableHeader = (y) => {
      const headerHeight = 11;

      doc.setFillColor(...navy);

      doc.rect(
        marginX,
        y,
        tableWidth,
        headerHeight,
        "F"
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...gold);

      let x = marginX;

      columns.forEach((column) => {
        let textX;

        if (column.align === "left") {
          textX = x + 2;
        } else if (column.align === "right") {
          textX = x + column.width - 2;
        } else {
          textX =
            x + column.width / 2;
        }

        doc.text(
          column.label,
          textX,
          y + 7,
          {
            align:
              column.align === "right"
                ? "right"
                : column.align === "center"
                  ? "center"
                  : "left",
          }
        );

        x += column.width;
      });

      return y + headerHeight + 5;
    };

    // ===================================================
    // DRAW FOOTER
    // ===================================================
    const drawFooter = () => {
      const footerY = H - 10;

      doc.setDrawColor(...gold);
      doc.setLineWidth(0.3);

      doc.line(
        marginX,
        footerY - 5,
        W - marginX,
        footerY - 5
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...textGray);

      doc.text(
        "VV Grand Park Residency — Confidential Report",
        W / 2,
        footerY,
        {
          align: "center",
        }
      );
    };

    // ===================================================
    // INITIAL PAGE
    // ===================================================
    drawPdfHeader();

    let tableY = drawTableHeader(
      infoY + 18
    );

    // ===================================================
    // PDF BOOKINGS
    // ===================================================
    reportData.bookings.forEach(
      (b, index) => {
        const rowHeight = 10;

        // New page before row
        if (
          tableY + rowHeight >
          H - 20
        ) {
          drawFooter();

          doc.addPage();

          drawPdfHeader();

          tableY =
            drawTableHeader(51);
        }

        // Alternating background
        if (index % 2 === 0) {
          doc.setFillColor(
            ...lightGray
          );

          doc.rect(
            marginX,
            tableY - 7,
            tableWidth,
            rowHeight,
            "F"
          );
        }

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(7);

        doc.setTextColor(
          ...textDark
        );

        // -----------------------------------------------
        // DATA
        // -----------------------------------------------
        let guestName =
          b.guest_name || "—";

        if (guestName.length > 25) {
          guestName =
            guestName.substring(0, 24) +
            "…";
        }

        let roomType =
          b.room_type || "—";

        if (roomType.length > 16) {
          roomType =
            roomType.substring(0, 15) +
            "…";
        }

        const checkIn =
          b.check_in_date
            ? b.check_in_date.slice(
                0,
                10
              )
            : "—";

        const checkOut =
          b.check_out_date
            ? b.check_out_date.slice(
                0,
                10
              )
            : "—";

        const baseAmount =
          Number(
            b.total_price || 0
          );

        const addonAmount =
          Number(
            b.addon_charges || 0
          );

        const gstAmount =
          Number(
            b.gst_amount || 0
          );

        const totalAmount =
          Number(
            b.final_total ||
              b.total_price ||
              0
          );

        const status = (
          b.status || "—"
        ).toUpperCase();

        // -----------------------------------------------
        // STATUS COLOR
        // -----------------------------------------------
        const statusColor = {
          CONFIRMED: [
            45,
            154,
            110,
          ],
          COMPLETED: [
            36,
            113,
            163,
          ],
          CANCELLED: [
            192,
            57,
            43,
          ],
        }[status] || [
          134,
          142,
          150,
        ];

        // -----------------------------------------------
        // DRAW CELLS
        // -----------------------------------------------
        let x = marginX;

        columns.forEach(
          (column) => {
            let value = "";
            let align =
              column.align;

            switch (column.key) {
              case "no":
                value = String(
                  b.booking_id ?? "—"
                );
                break;

              case "guest":
                value = guestName;
                break;

              case "room":
                value = roomType;
                break;

              case "checkIn":
                value = checkIn;
                break;

              case "checkOut":
                value = checkOut;
                break;

              case "base":
                value = `Rs.${baseAmount.toLocaleString()}`;
                break;

              case "addons":
                value = `Rs.${addonAmount.toLocaleString()}`;
                break;

              case "gst":
                value = `Rs.${gstAmount.toLocaleString()}`;
                break;

              case "total":
                value = `Rs.${totalAmount.toLocaleString()}`;
                break;

              case "status":
                value = status;

                if (value.length > 10) {
                  value =
                    value.substring(
                      0,
                      9
                    ) + "…";
                }
                break;

              default:
                value = "—";
            }

            // Status color
            if (
              column.key ===
              "status"
            ) {
              doc.setTextColor(
                ...statusColor
              );
            } else if (
              column.key ===
              "total"
            ) {
              doc.setFont(
                "helvetica",
                "bold"
              );
              doc.setTextColor(
                ...textDark
              );
            } else if (
              column.key ===
              "guest"
            ) {
              doc.setFont(
                "helvetica",
                "bold"
              );
              doc.setTextColor(
                ...textDark
              );
            } else {
              doc.setFont(
                "helvetica",
                "normal"
              );
              doc.setTextColor(
                ...textDark
              );
            }

            let textX;

            if (align === "left") {
              textX = x + 2;
            } else if (
              align === "right"
            ) {
              textX =
                x +
                column.width -
                2;
            } else {
              textX =
                x +
                column.width / 2;
            }

            doc.text(
              value,
              textX,
              tableY,
              {
                align:
                  align === "right"
                    ? "right"
                    : align ===
                        "center"
                      ? "center"
                      : "left",
              }
            );

            x += column.width;
          }
        );

        tableY += rowHeight;
      }
    );

    // ===================================================
    // GRAND TOTAL
    // ===================================================
    if (
      tableY + 20 >
      H - 20
    ) {
      drawFooter();

      doc.addPage();

      drawPdfHeader();

      tableY =
        drawTableHeader(51);
    }

    tableY += 4;

    doc.setDrawColor(...gold);
    doc.setLineWidth(0.4);

    doc.line(
      marginX,
      tableY,
      W - marginX,
      tableY
    );

    tableY += 7;

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(9);

    doc.setTextColor(
      ...textDark
    );

    doc.text(
      "GRAND TOTAL REVENUE",
      marginX,
      tableY
    );

    doc.setTextColor(...gold);

    doc.text(
      `Rs.${Number(
        s.total_revenue || 0
      ).toLocaleString()}`,
      W - marginX,
      tableY,
      {
        align: "right",
      }
    );

    // Footer on final page
    drawFooter();

    // ===================================================
    // SAVE PDF
    // ===================================================
    const reportTitle =
      reportType === "weekly"
        ? "WEEKLY_REPORT"
        : reportType === "monthly"
          ? "MONTHLY_REPORT"
          : "CUSTOM_REPORT";

    doc.save(
      `VVGrandPark_${reportTitle}_${reportData.startDate}_to_${reportData.endDate}.pdf`
    );
  }

  // =====================================================
  // UI CLASSES
  // =====================================================
  const customLabelClass =
    "text-[0.62rem] font-bold text-[#868E96] mb-1 tracking-[0.8px] uppercase";

  const customInputClass =
    "p-2 rounded-md border-[1.5px] border-[#E9ECEF] text-[0.82rem] font-inherit focus:outline-none text-[#212529]";

  const thClass =
    "px-3 py-2.5 !text-center text-[0.6rem] font-bold text-[#868E96] uppercase tracking-[1px] border-b-[1.5px] border-[#E9ECEF] bg-[#F8F9FA] whitespace-nowrap";

  return (
    <div>
      {/* =================================================
          CONFIGURATION
      ================================================= */}
      <div className="bg-white rounded-[14px] px-[22px] py-5 border border-[#E9ECEF] mb-5">
        <div className="font-body text-[1rem] font-semibold text-[#0F1923] mb-4">
          Generate Report
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          {[
            "weekly",
            "monthly",
            "custom",
          ].map((type) => (
            <button
              key={type}
              onClick={() =>
                handleReportTypeChange(
                  type
                )
              }
              className={`px-5 py-2 rounded-md border-[1.5px] text-[0.82rem] font-semibold cursor-pointer font-inherit capitalize transition-colors duration-150 ${
                reportType === type
                  ? "border-[#0F1923] bg-[#0F1923] text-white"
                  : "border-[#E9ECEF] bg-white text-[#495057]"
              }`}
            >
              {type}
            </button>
          ))}

          {reportType === "custom" && (
            <>
              <div className="flex flex-col">
                <div
                  className={
                    customLabelClass
                  }
                >
                  Start Date
                </div>

                <input
                  type="date"
                  value={customStart}
                  onChange={(e) =>
                    setCustomStart(
                      e.target.value
                    )
                  }
                  className={
                    customInputClass
                  }
                />
              </div>

              <div className="flex flex-col">
                <div
                  className={
                    customLabelClass
                  }
                >
                  End Date
                </div>

                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) =>
                    setCustomEnd(
                      e.target.value
                    )
                  }
                  className={
                    customInputClass
                  }
                />
              </div>
            </>
          )}

          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-5 py-[9px] rounded-md bg-[#C9A84C] text-white border-none text-[0.82rem] font-semibold cursor-pointer font-inherit disabled:opacity-70"
          >
            {loading
              ? "Loading..."
              : "Generate"}
          </button>
        </div>
      </div>

      {/* =================================================
          REPORT DISPLAY
      ================================================= */}
      {reportData && (
        <>
          {/* KEY METRICS */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 mb-5">
            {[
              {
                label:
                  "Total Bookings",
                val:
                  reportData.summary
                    .total_bookings ||
                  0,
                color:
                  "border-l-[#2471A3]",
              },
              {
                label:
                  "Total Revenue",
                val: `Rs.${Number(
                  reportData.summary
                    .total_revenue ||
                    0
                ).toLocaleString()}`,
                color:
                  "border-l-[#C9A84C]",
              },
              {
                label:
                  "GST Collected",
                val: `Rs.${Number(
                  reportData.summary
                    .total_gst || 0
                ).toLocaleString()}`,
                color:
                  "border-l-[#2D9A6E]",
              },
              {
                label:
                  "Add-on Revenue",
                val: `Rs.${Number(
                  reportData.summary
                    .total_addons ||
                    0
                ).toLocaleString()}`,
                color:
                  "border-l-[#9B59B6]",
              },
              {
                label: "Confirmed",
                val:
                  reportData.summary
                    .confirmed || 0,
                color:
                  "border-l-[#2D9A6E]",
              },
              {
                label: "Completed",
                val:
                  reportData.summary
                    .completed || 0,
                color:
                  "border-l-[#2471A3]",
              },
            ].map(
              ({
                label,
                val,
                color,
              }) => (
                <div
                  key={label}
                  className={`bg-white border border-[#E9ECEF] border-l-4 ${color} px-[18px] py-4 rounded-xl`}
                >
                  <div className="text-[0.62rem] font-bold text-[#868E96] tracking-[1px] uppercase mb-1.5">
                    {label}
                  </div>

                  <div className="font-body text-[1.4rem] font-semibold text-[#0F1923]">
                    {val}
                  </div>
                </div>
              )
            )}
          </div>

          {/* PDF DOWNLOAD */}
          <div className="mb-5">
            <button
              onClick={downloadReport}
              className="px-7 py-3 bg-[#0F1923] text-[#C9A84C] border-none rounded-md font-inherit font-bold text-[0.9rem] cursor-pointer flex items-center gap-2"
            >
              <DownloadIcon
                size={16}
                color="#C9A84C"
              />

              Download{" "}
              {reportType
                .charAt(0)
                .toUpperCase() +
                reportType.slice(1)}{" "}
              Report PDF
            </button>
          </div>

          {/* =================================================
              TABLE
          ================================================= */}
          <div
            id="reports-bookings-table"
            className="bg-white rounded-[14px] px-[22px] py-5 border border-[#E9ECEF]"
          >
            <div className="font-body text-[1rem] font-semibold text-[#0F1923] mb-4">
              Bookings (
              {reportData.startDate} →{" "}
              {reportData.endDate}
              )

              <span className="text-[0.78rem] font-normal text-[#868E96] ml-2">
                ({totalRecords} records)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1000px]">
                <thead>
                  <tr>
                    {[
                      "#",
                      "Guest",
                      "Room",
                      "Check-in",
                      "Check-out",
                      "Base",
                      "Addons",
                      "GST",
                      "Total",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className={
                          thClass
                        }
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {totalRecords === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-[30px] text-center text-[#868E96] text-[0.85rem]"
                      >
                        No bookings in
                        this period
                      </td>
                    </tr>
                  ) : (
                    paginatedBookings.map(
                      (b) => (
                        <tr
                          key={
                            b.booking_id
                          }
                          className="border-t border-[#F1F3F5]"
                        >
                          <td className="px-3 py-2.5 text-center text-[0.75rem] text-[#868E96]">
                            #{b.booking_id}
                          </td>

                          <td className="px-3 py-2.5 text-center text-[0.82rem] font-semibold text-[#0F1923] whitespace-nowrap">
                            {b.guest_name}
                          </td>

                          <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#495057]">
                            {b.room_type}
                          </td>

                          <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#495057] whitespace-nowrap">
                            {b.check_in_date?.slice(
                              0,
                              10
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#495057] whitespace-nowrap">
                            {b.check_out_date?.slice(
                              0,
                              10
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#495057] whitespace-nowrap">
                            Rs.
                            {Number(
                              b.total_price ||
                                0
                            ).toLocaleString()}
                          </td>

                          <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#C9A84C] font-semibold whitespace-nowrap">
                            Rs.
                            {Number(
                              b.addon_charges ||
                                0
                            ).toLocaleString()}
                          </td>

                          <td className="px-3 py-2.5 text-center text-[0.78rem] text-[#868E96] whitespace-nowrap">
                            Rs.
                            {Number(
                              b.gst_amount ||
                                0
                            ).toLocaleString()}
                          </td>

                          <td className="px-3 py-2.5 text-center text-[0.85rem] font-bold text-[#0F1923] whitespace-nowrap">
                            Rs.
                            {Number(
                              b.final_total ||
                                b.total_price ||
                                0
                            ).toLocaleString()}
                          </td>

                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-[3px] text-[0.6rem] font-bold uppercase tracking-wide ${
                                b.status ===
                                "confirmed"
                                  ? "bg-[#E8F8F0] text-[#2D9A6E]"
                                  : b.status ===
                                      "cancelled"
                                    ? "bg-[#FDECEA] text-[#C0392B]"
                                    : "bg-[#EAF2FB] text-[#2471A3]"
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>

                {totalRecords > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#0F1923]">
                      <td
                        colSpan={8}
                        className="px-3 py-2.5 font-body font-bold text-[#0F1923] text-[0.85rem]"
                      >
                        TOTAL REVENUE
                      </td>

                      <td
                        colSpan={2}
                        className="px-3 py-2.5 font-body font-bold text-[#C9A84C] text-[1rem] text-center"
                      >
                        Rs.
                        {Number(
                          reportData.summary
                            .total_revenue ||
                            0
                        ).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* =================================================
                PAGINATION
            ================================================= */}
            {totalRecords > ITEMS_PER_PAGE && (
              <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-[#E9ECEF]">
                {/* Showing text */}
                <div className="text-[0.75rem] text-[#868E96]">
                  Showing{" "}
                  <span className="font-semibold text-[#495057]">
                    {startIndex + 1}
                  </span>{" "}
                  -{" "}
                  <span className="font-semibold text-[#495057]">
                    {Math.min(
                      endIndex,
                      totalRecords
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-[#495057]">
                    {totalRecords}
                  </span>{" "}
                  records
                </div>

                {/* Pagination controls */}
                <div className="flex items-center gap-1">
                  {/* Previous */}
                  <button
                    type="button"
                    disabled={
                      currentPage === 1
                    }
                    onClick={() =>
                      goToPage(
                        currentPage - 1
                      )
                    }
                    className={`min-w-[34px] h-[34px] px-2 rounded-md border text-[0.75rem] font-semibold transition ${
                      currentPage === 1
                        ? "border-[#E9ECEF] bg-[#F8F9FA] text-[#CED4DA] cursor-not-allowed"
                        : "border-[#E9ECEF] bg-white text-[#495057] hover:bg-[#F8F9FA] cursor-pointer"
                    }`}
                  >
                    ‹
                  </button>

                  {/* Page numbers */}
                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, i) => i + 1
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() =>
                        goToPage(page)
                      }
                      className={`min-w-[34px] h-[34px] px-2 rounded-md border text-[0.75rem] font-semibold transition ${
                        currentPage === page
                          ? "border-[#0F1923] bg-[#0F1923] text-white"
                          : "border-[#E9ECEF] bg-white text-[#495057] hover:bg-[#F8F9FA] cursor-pointer"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Next */}
                  <button
                    type="button"
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onClick={() =>
                      goToPage(
                        currentPage + 1
                      )
                    }
                    className={`min-w-[34px] h-[34px] px-2 rounded-md border text-[0.75rem] font-semibold transition ${
                      currentPage ===
                      totalPages
                        ? "border-[#E9ECEF] bg-[#F8F9FA] text-[#CED4DA] cursor-not-allowed"
                        : "border-[#E9ECEF] bg-white text-[#495057] hover:bg-[#F8F9FA] cursor-pointer"
                    }`}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN MANAGER DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
export default function ManagerDashboard({ managerUser, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookingPage, setBookingPage] = useState(1);
  const itemsPerPage = 10;
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/manager/bookings").then((r) => r.json()),
      apiFetch("/api/rooms").then((r) => r.json()),
    ])
      .then(([b, r]) => {
        setBookings(Array.isArray(b) ? b : []);
        setRooms(Array.isArray(r) ? r : []);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  const filteredBookings = bookings.filter(
    (b) =>
      !searchTerm ||
      b.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.room_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
const totalPages = Math.ceil(
  filteredBookings.length / itemsPerPage
);

const paginatedBookings = filteredBookings.slice(
  (bookingPage - 1) * itemsPerPage,
  bookingPage * itemsPerPage
);
  const checkedInBookings = bookings.filter(
    (b) => b.actual_checkin && !b.actual_checkout && b.status === "confirmed"
  );
  const dateKey = (value = new Date()) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const paidBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed"
  );
  const totalRevenue = paidBookings.reduce(
    (sum, b) => sum + Number(b.final_total || b.total_price || 0),
    0
  );
  const last7 = Array(7)
    .fill(0)
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = dateKey(d);
      return {
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
        value: bookings.filter((b) => dateKey(b.check_in_date) === key).length,
      };
    });
  const revenueByRoom = Object.entries(
    paidBookings.reduce((acc, booking) => {
      const key = booking.room_type || "Room";
      acc[key] = (acc[key] || 0) + Number(booking.final_total || booking.total_price || 0);
      return acc;
    }, {})
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const roomAvailabilityData = [
    {
      label: "Open",
      value: rooms.filter((r) => Number(r.is_available) !== 0).length,
    },
    {
      label: "Blocked",
      value: rooms.filter((r) => Number(r.is_available) === 0).length,
    },
  ];
  const recentBookings = [...bookings]
    .sort(
      (a, b) =>
        new Date(b.created_at || b.check_in_date || 0) -
        new Date(a.created_at || a.check_in_date || 0)
    )
    .slice(0, 5);

  const tabs = [
    { id: "overview", label: "Overview", icon: GridIcon },
    { id: "bookings", label: "Bookings", icon: BookingIcon },
    { id: "vehicles", label: "Vehicle Customers", icon: BookingIcon },
    { id: "checkins", label: "Check-in Details", icon: BedIcon },
    { id: "book", label: "New Booking", icon: CalendarIcon },
    { id: "reports", label: "Reports", icon: DownloadIcon },
  ];
  useEffect(() => {
    setBookingPage((page) =>
      Math.min(Math.max(page, 1), Math.max(totalPages, 1)),
    );
  }, [totalPages]);

  const SIDEBAR_W = 210;

  const SidebarContent = () => (
    <>
      {/* Header / Logo Section */}
      <div className="flex items-center gap-[10px] border border-[#0F1923] px-5 py-6">
        <img
          src="/logo.png"
          alt="VV"
          className="h-9 w-9 object-contain brightness-110 mix-blend-screen"
        />
        <div className="flex flex-col leading-[1.15]">
          <span className="font-['Playfair_Display',serif] text-[0.85rem] font-bold tracking-[1.5px] text-white">
            VV GRAND PARK
          </span>
          <span className="font-['Playfair_Display',serif] text-[0.55rem] tracking-[2.5px] text-[#C9A84C]">
            RESIDENCY
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4">
        <div className="px-5 pb-[10px] pt-1.5 text-[0.6rem] uppercase tracking-[2px] text-white/25">
          Manager
        </div>
        {tabs.map(({ id, label, icon: TabIcon }) => {
          const isActive = tab === id;
          return (
            <div
              key={id}
              onClick={() => {
                setBookingRoom(null);
                setTab(id);
                setSidebarOpen(false);
              }}
              className={`flex cursor-pointer items-center gap-[10px] px-5 py-[11px] text-[0.82rem] transition-all duration-150 border-l-[2.5px] ${
                isActive
                  ? "bg-[#C9A84C]/10 border-[#C9A84C] text-[#C9A84C] font-semibold"
                  : "bg-transparent border-transparent text-white/50 font-normal"
              }`}
            >
              <TabIcon
                size={15}
                color={isActive ? "#C9A84C" : "rgba(255,255,255,0.4)"}
              />
              {label}
              {id === "checkins" && checkedInBookings.length > 0 && (
                <span className="ml-auto rounded-[10px] bg-[#2D9A6E] px-[7px] py-[1px] text-[0.6rem] font-bold text-white">
                  {checkedInBookings.length}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer / User Profile & Sign Out */}
      <div className="border-t border-white/5 px-5 py-4">
        <div className="mb-3 flex items-center gap-[10px]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C]/20">
            <UserIcon size={14} color="#C9A84C" />
          </div>
          <div>
            <div className="text-[0.78rem] font-semibold text-white">
              {managerUser?.name}
            </div>
            <div className="text-[0.65rem] uppercase tracking-[0.5px] text-white/35">
              Manager
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] border border-white/10 bg-white/5 px-3 py-[9px] font-inherit text-[0.78rem] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowRightIcon size={13} color="rgba(255,255,255,0.5)" /> Sign Out
        </button>
      </div>
    </>
  );

  const tabLabels = {
    overview: "Overview",
    bookings: "Bookings",
    vehicles: "Vehicle Customers",
    checkins: "Check-in Details",
    book: "New Booking",
    admin_booking_for_users: "Admin Booking for User",
    reports: "Reports",
  };

  // Suppress unused variable warning — SIDEBAR_W is kept for layout reference
  void SIDEBAR_W;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-['Plus_Jakarta_Sans',system-ui,sans-serif]">
      {/* Desktop Sidebar */}
      <div className="admin-sidebar-desktop fixed bottom-0 left-0 top-0 z-[100] hidden md:flex w-[210px] flex-col border-r border-[#0F1923] bg-[#0F1923]">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[200]">
          {/* Backdrop / Overlay */}
          <div
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          {/* Sidebar Content Panel */}
          <div className="absolute bottom-0 left-0 top-0 flex w-[210px] flex-col bg-[#0F1923]">
            <SidebarContent />
          </div>
        </div>
      )}
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#2D9A6E]" />
      <div className="min-h-screen md:ml-[210px]">
        {/* Topbar (fixed) */}
        <div className="bg-[#0F1923] px-5 h-16 flex items-center justify-between border-b border-[rgba(201,168,76,0.12)] fixed top-0 left-0 right-0 md:left-[210px] z-[99]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="admin-hamburger flex md:hidden flex-col gap-[5px] bg-transparent border-0 cursor-pointer px-2 py-1"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-[22px] h-[2px] bg-[#C9A84C] rounded"
              />
            ))}
          </button>

          <div>
            <div className="font-serif text-xs md:text-[1.05rem] font-semibold text-white">
              {tabLabels[tab]}
            </div>

            <div className="text-[0.72rem] text-white/35 mt-[1px]">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>

          <div className="text-[0.72rem] text-white/40 bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.2)] px-3 py-[5px] rounded-md">
            Manager Portal
          </div>
        </div>

        <div className="p-5 pt-20 md:pt-16">
          {tab === "overview" && (
            <>
              <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 max-sm:grid-cols-2 max-[480px]:grid-cols-1">
                <StatCard
                  label="Total Rooms"
                  value={rooms.length}
                  icon={BedIcon}
                  accent="#0F1923"
                  chartData={roomAvailabilityData}
                />
                <StatCard
                  label="Total Bookings"
                  value={bookings.length}
                  icon={BookingIcon}
                  accent="#2471A3"
                  chartData={last7}
                />
                <StatCard
                  label="Active Check-ins"
                  value={checkedInBookings.length}
                  icon={UserIcon}
                  accent="#2D9A6E"
                  chartData={[
                    { label: "Confirmed", value: confirmed },
                    { label: "Completed", value: completed },
                    { label: "Cancelled", value: cancelled },
                  ]}
                />
                <StatCard
                  label="Total Revenue"
                  value={`Rs.${Number(totalRevenue).toLocaleString("en-IN")}`}
                  icon={CreditCardIcon}
                  accent="#C9A84C"
                  chartData={revenueByRoom}
                />
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="mb-0.5 text-[0.65rem] uppercase tracking-[1.5px] text-[#868E96]">
                        Bookings This Week
                      </div>
                      <div className="font-body text-[1.4rem] font-semibold text-[#0F1923]">
                        {last7.reduce((sum, item) => sum + item.value, 0)}
                      </div>
                    </div>
                    <TrendingUpIcon size={18} color="#C9A84C" />
                  </div>
                  <LineChart data={last7} color="#C9A84C" height={80} />
                  <div className="mt-1.5 flex justify-between">
                    {last7.map((d) => (
                      <div key={d.label} className="text-center text-[0.6rem] text-[#868E96]">
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="mb-0.5 text-[0.65rem] uppercase tracking-[1.5px] text-[#868E96]">
                        Revenue by Room
                      </div>
                      <div className="font-body text-[1.4rem] font-semibold text-[#0F1923]">
                        Rs.{Number(totalRevenue).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <CreditCardIcon size={18} color="#C9A84C" />
                  </div>
                  {revenueByRoom.length > 0 ? (
                    <>
                      <BarChart data={revenueByRoom} color="#0F1923" height={72} />
                      <div className="mt-1.5 flex justify-between">
                        {revenueByRoom.map((d) => (
                          <div key={d.label} className="text-center text-[0.58rem] text-[#868E96]">
                            {d.label.slice(0, 3)}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="py-6 text-center text-[0.82rem] text-[#868E96]">
                      No revenue data yet
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
                  <div className="text-[0.65rem] uppercase tracking-[1.5px] text-[#868E96]">
                    Booking Status
                  </div>
                  <DonutChart
                    confirmed={confirmed}
                    cancelled={cancelled}
                    completed={completed}
                    size={100}
                  />
                  <div className="flex w-full flex-col gap-2">
                    {[
                      { label: "Confirmed", val: confirmed, color: "#2D9A6E" },
                      { label: "Completed", val: completed, color: "#2471A3" },
                      { label: "Cancelled", val: cancelled, color: "#C0392B" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex items-center justify-between text-[0.78rem]">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                          <span className="text-[#495057]">{label}</span>
                        </div>
                        <span className="font-bold text-[#0F1923]">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
                <div className="mb-4 flex items-center justify-between">
                  <div className="font-serif text-[1rem] font-semibold text-[#0F1923]">
                    Recent Bookings
                  </div>
                  <button
                    onClick={() => setTab("bookings")}
                    className="flex items-center gap-1 border-0 bg-transparent text-[0.78rem] font-semibold text-[#C9A84C]"
                  >
                    View all <ArrowRightIcon size={12} color="#C9A84C" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse">
                    <thead>
                      <tr>
                        {["#", "Guest", "Room", "Check-in", "Total", "Status"].map((h) => (
                          <th key={h} className="border-b border-[#E9ECEF] bg-[#F8F9FA] px-3 py-3 text-left text-[0.62rem] uppercase tracking-[1px] text-[#868E96]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-[#868E96]">
                            No bookings yet
                          </td>
                        </tr>
                      ) : (
                        recentBookings.map((b) => (
                          <tr
                            key={b.booking_id}
                            className="cursor-pointer border-t border-[#F1F3F5] hover:bg-[#F8F9FA]"
                            onClick={() => setSelectedBookingId(b.booking_id)}
                          >
                            <td className="px-3 py-3 text-[0.78rem] text-[#868E96]">#{b.booking_id}</td>
                            <td className="px-3 py-3 text-[0.85rem] font-semibold text-[#0F1923]">{b.guest_name}</td>
                            <td className="px-3 py-3 text-[0.82rem] text-[#495057]">{b.room_type}</td>
                            <td className="px-3 py-3 text-[0.82rem] text-[#495057]">{b.check_in_date?.slice(0, 10)}</td>
                            <td className="px-3 py-3 text-[0.85rem] font-bold text-[#0F1923]">
                              Rs.{Number(b.final_total || b.total_price || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-block rounded-[3px] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${
                                  b.status === "confirmed"
                                    ? "bg-[#E8F8F0] text-[#2D9A6E]"
                                    : b.status === "cancelled"
                                      ? "bg-[#FDECEA] text-[#C0392B]"
                                      : "bg-[#EAF2FB] text-[#2471A3]"
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === "vehicles" && (
            <VehicleCustomers
              bookings={bookings}
              apiFetch={apiFetch}
              onRefresh={fetchAll}
              showToast={showToast}
            />
          )}

          {tab === "bookings" && (
            <div className="bg-white rounded-[14px] px-[22px] py-5 border border-[#E9ECEF]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <div>
                  <div className="font-body text-[1rem] font-semibold text-[#0F1923]">
                    All Bookings ({bookings.length})
                  </div>
                  <div className="text-[0.78rem] font-normal text-[#868E96]">
                    {new Date().toLocaleDateString("en-IN")}
                  </div>
                </div>

                <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    value={searchTerm}
                    onChange={(e) => {
  setSearchTerm(e.target.value);
  setBookingPage(1);
}}
                    placeholder="Search guest, room..."
                    className="px-3 py-2 rounded-md border border-[#E9ECEF] text-[0.9rem] w-full sm:w-[320px]"
                  />
                  <button
  onClick={fetchAll}
  className="px-4 py-2 bg-[#0F1923] text-white rounded-md w-full sm:w-auto transition-all duration-300 hover:bg-[#C9A84C] hover:text-black hover:-translate-y-[1px]"
>
  Refresh
</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr>
                      {[
                        "#",
                        "Guest",
                        "Room",
                        "Check-in",
                        "Check-out",
                        "Total",
                        "Status",
                        "Action",
                      ].map((h) => (
                        <th key={h} className="text-[0.62rem] text-[#868E96] text-left px-3 py-3 uppercase tracking-[1px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-[#868E96]">
                          No bookings found
                        </td>
                      </tr>
                    ) : (
                      paginatedBookings.map((b) => (
                        <tr key={b.booking_id} className="border-t border-[#F1F3F5]">
                          <td className="px-3 py-3 text-[0.82rem] text-[#868E96]">#{b.booking_id}</td>
                          <td className="px-3 py-3 font-semibold text-[#0F1923]">{b.guest_name}</td>
                          <td className="px-3 py-3 text-[0.82rem] text-[#495057]">{b.room_type}</td>
                          <td className="px-3 py-3 text-[0.82rem] text-[#495057]">{b.check_in_date?.slice(0, 10)}</td>
                          <td className="px-3 py-3 text-[0.82rem] text-[#495057]">{b.check_out_date?.slice(0, 10)}</td>
                          <td className="px-3 py-3 text-[0.85rem] font-bold text-[#0F1923]">Rs.{Number(b.final_total || b.total_price || 0).toLocaleString()}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-[3px] text-[0.6rem] font-bold uppercase tracking-wide ${b.status === "confirmed" ? "bg-[#E8F8F0] text-[#2D9A6E]" : b.status === "cancelled" ? "bg-[#FDECEA] text-[#C0392B]" : "bg-[#EAF2FB] text-[#2471A3]"}`}>{b.status}</span>
                          </td>
                          <td className="px-3 py-3">
                            <button
  onClick={() => setSelectedBookingId(b.booking_id)}
  className="px-3 py-1 bg-[#0F1923] text-white rounded-md transition-all duration-300 hover:bg-[#C9A84C] hover:text-black hover:-translate-y-[1px]"
>
  Details
</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
{totalPages > 1 && (
  <div className="mt-5 pt-4 border-t border-[#E9ECEF]">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      
      {/* Showing Count */}
      <p className="text-xs sm:text-sm text-[#868E96] text-center sm:text-left">
        Showing {(bookingPage - 1) * itemsPerPage + 1} -
        {Math.min(
          bookingPage * itemsPerPage,
          filteredBookings.length
        )}{" "}
        of {filteredBookings.length}
      </p>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
        
        <button
          onClick={() =>
            setBookingPage((p) => Math.max(p - 1, 1))
          }
          disabled={bookingPage === 1}
          className="px-3 py-2 border rounded-lg text-xs sm:text-sm disabled:opacity-50"
        >
          Previous
        </button>

        {getPaginationItems(
          bookingPage,
          totalPages
        ).map((item) =>
          item?.type === "ellipsis" ? (
            <span
              key={item.key}
              className="px-2 text-gray-400 text-sm"
            >
              ...
            </span>
          ) : (
            <button
              key={`page-${item}`}
              onClick={() => setBookingPage(item)}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm flex items-center justify-center ${
                bookingPage === item
                  ? "bg-[#0F1923] text-white"
                  : "border border-[#E9ECEF] bg-white"
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          onClick={() =>
            setBookingPage((p) =>
              Math.min(p + 1, totalPages)
            )
          }
          disabled={bookingPage === totalPages}
          className="px-3 py-2 border rounded-lg text-xs sm:text-sm disabled:opacity-50"
        >
          Next
        </button>

      </div>
    </div>
  </div>
)}
            </div>
          )}

          {tab === "checkins" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <div className="font-serif text-[1.05rem] font-semibold text-[#0F1923]">Currently Checked-in Guests</div>
                  <div className="text-sm text-[#868E96] mt-1">{checkedInBookings.length} guests currently on premises</div>
                </div>
               <button
  onClick={fetchAll}
  className="px-4 py-2 bg-[#0F1923] text-white rounded-md w-full sm:w-auto transition-all duration-300 hover:bg-[#C9A84C] hover:text-black hover:-translate-y-[1px]"
>
  Refresh
</button>
              </div>

              {checkedInBookings.length === 0 ? (
                <div className="bg-white rounded-[14px] p-6 border border-[#E9ECEF]">No active check-ins</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                  {checkedInBookings.map((b) => (
                    <div key={b.booking_id} className="bg-white rounded-[14px] shadow-sm overflow-hidden">
                      <div className="bg-[#0F1923] px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#C9A84C] flex items-center justify-center text-white font-bold">{(b.guest_name || "?").charAt(0)}</div>
                          <div>
                            <div className="text-sm font-semibold text-white">{b.guest_name}</div>
                            <div className="text-[0.68rem] text-white/60">Booking #{b.booking_id}</div>
                          </div>
                        </div>
                        <div className="text-[0.72rem] bg-[#2D9A6E] text-white px-3 py-1 rounded-full font-semibold">LIVE</div>
                      </div>

                      <div className="bg-[#EAF8F0] text-center py-5">
                        <div className="text-[0.68rem] text-[#2D9A6E] uppercase tracking-[1px]">Time Spent on Premises</div>
                        <div className="mt-3"><LiveTimer checkinTime={b.actual_checkin || b.check_in_date} /></div>
                        <div className="text-[0.75rem] text-[#868E96] mt-2">Checked in: {b.actual_checkin ? new Date(b.actual_checkin).toLocaleString("en-IN") : b.check_in_date}</div>
                      </div>

                      <div className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-2 text-[0.82rem] text-[#495057]">
                          <div className="text-sm text-[#868E96]">Room</div>
                          <div className="font-semibold text-[#0F1923]">{b.room_type} · {b.room_number || b.room_id}</div>

                          <div className="text-sm text-[#868E96]">Scheduled Check-in</div>
                          <div className="text-[#495057]">{b.check_in_date?.slice(0, 10)}</div>

                          <div className="text-sm text-[#868E96]">Scheduled Check-out</div>
                          <div className="text-[#495057]">{b.check_out_date?.slice(0, 10)}</div>

                          <div className="text-sm text-[#868E96]">Guests</div>
                          <div className="font-semibold text-[#0F1923]">{b.guest_count || 1} person</div>

                          <div className="text-sm text-[#868E96]">Room Charges</div>
                          <div className="font-semibold text-[#0F1923]">Rs.{Number(b.total_price || 0).toLocaleString()}</div>
                        </div>

                        <div className="mt-4">
                          <button onClick={() => setSelectedBookingId(b.booking_id)} className="w-full bg-[#0F1923] text-[#C9A84C] px-4 py-2 rounded-md font-semibold">View Details & Checkout →</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "admin_booking_for_users" && bookingRoom && (
            <AdminBookingForUsers
              room={bookingRoom}
              apiFetch={apiFetch}
              showToast={showToast}
              onBack={() => {
                setBookingRoom(null);
                setTab("book");
              }}
              onSuccess={(bookingId) => {
                setBookingRoom(null);
                fetchAll();
                setSelectedBookingId(bookingId);
                setTab("bookings");
              }}
            />
          )}

      {tab === "book" && (
            <div>
              <div className="font-display text-[1rem] font-semibold text-navy mb-5">
                New Booking — Select a Room
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
                {rooms
                  .filter((r) => Number(r.is_available) !== 0)
                  .map((r) => (
                    <div
                      key={r.room_id}
                      className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-[0_1px_4px_rgba(15,25,35,0.05)]"
                    >
                      <div className="h-[140px] overflow-hidden">
                        <img
                          src={
                            r.image_url ||
                            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500"
                          }
                          alt={r.room_type}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="px-4 py-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="bg-navy text-[#E8D5A3] px-2 py-0.5 rounded text-[0.62rem] font-bold tracking-[1px] uppercase">
                            {r.room_type}
                          </span>
                          <span className="text-[0.72rem] text-gray-400">
                            👥 {r.capacity || 2}
                          </span>
                        </div>
                        <div className="font-body text-[0.95rem] font-semibold text-navy mb-0.5">
                          Room {r.room_number || r.room_id}
                        </div>
                        <div className="text-[0.78rem] text-gray-400 mb-3">
                          {r.description || "Premium hotel room"}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-body text-[1rem] font-semibold text-navy">
                              Rs.{Number(r.price_per_night).toLocaleString()}{" "}
                              <span className="text-[0.65rem] font-body font-normal text-gray-400">
                                /night
                              </span>
                            </div>
                            <div className="text-[0.62rem] font-body text-red-500">
                              +18% GST
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setBookingRoom(r);
                              setTab("admin_booking_for_users");
                            }}
                            className="bg-[#0f1923] text-white border-none rounded-md px-3.5 py-1.5 text-[0.75rem] font-semibold cursor-pointer transition-all hover:bg-[#c9a84c] hover:text-black hover:-translate-y-[1px]"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {tab === "reports" && <ReportsTab showToast={showToast} />}
        </div>
      </div>

      {/* Modals */}
      {selectedBookingId && (
        <BookingDetailModal
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          showToast={showToast}
          onRefresh={fetchAll}
        />
      )}

      {bookingRoom && tab === "legacy_booking_modal" && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-[rgba(15,25,35,0.7)] backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-[440px] bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.2)] overflow-hidden max-h-[90vh] flex flex-col">

            <div className="px-[26px] py-5 border-b border-[#E9ECEF] flex items-center justify-between shrink-0">
              <div className="font-serif text-[1.1rem] font-semibold text-[#0F1923]">
                Book {bookingRoom.room_type} — Room{" "}
                {bookingRoom.room_number || bookingRoom.room_id}
              </div>

              <button
                onClick={() => setBookingRoom(null)}
                className="w-[30px] h-[30px] rounded-full bg-[#F1F3F5] flex items-center justify-center"
              >
                <XIcon size={14} color="#495057" />
              </button>
            </div>

            <div className="overflow-y-auto">
              <ManagerBookingForm
                room={bookingRoom}
                managerUser={managerUser}
                onClose={() => setBookingRoom(null)}
                showToast={showToast}
                onSuccess={() => {
                  setBookingRoom(null);
                  fetchAll();
                }}
              />
            </div>

          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed left-1/2 top-6 z-[9999] -translate-x-1/2 text-white px-5 py-3 rounded-[10px] text-[0.85rem] font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.2)] ${
            toast.type === "error"
              ? "bg-[#C0392B]"
              : "bg-[#2D9A6E]"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
