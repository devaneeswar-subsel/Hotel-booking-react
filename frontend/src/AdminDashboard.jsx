import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUpIcon,
  BedIcon,
  UsersIcon,
  BookingIcon,
  CreditCardIcon,
  CalendarIcon,
  CheckIcon,
  XIcon,
  DownloadIcon,
  UserIcon,
  SearchIcon,
  ArrowRightIcon,
  GridIcon,
} from "./Icons";

const API = process.env.REACT_APP_API_URL;
const GST_RATE = 0.18;

const apiFetch = (url, options = {}) =>
  fetch(`${API}${url}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

/* ── LIVE TIMER ── */
function LiveTimer({ checkinTime }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      const start = new Date(checkinTime);
      const diff = Math.floor((now - start) / 1000);

      if (diff < 0) {
        setElapsed("00:00:00");
        return;
      }

      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;

      setElapsed(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    }

    update();

    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [checkinTime]);

  return (
    <span className="font-mono text-[1.6rem] font-bold text-[#2D9A6E] tracking-[3px]">
      {elapsed}
    </span>
  );
}

/* ── CHARTS ── */
function BarChart({ data, color = "#C9A84C", height = 64 }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${data.length * 28} ${height}`}
      preserveAspectRatio="none"
    >
      {data.map((d, i) => {
        const barH = Math.max(4, (d.value / max) * (height - 16));
        return (
          <g key={i}>
            <rect
              x={i * 28 + 4}
              y={height - barH - 4}
              width={20}
              height={barH}
              rx={3}
              fill={color}
              opacity={0.85}
            />
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data, color = "#C9A84C", height = 80 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 280;
  const pad = 8;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - d.value / max) * (height - pad * 2);
    return `${x},${y}`;
  });
  const filled = [
    ...pts,
    `${w - pad},${height - pad}`,
    `${pad},${height - pad}`,
  ].join(" ");
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={filled} fill="url(#lg)" />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(",").map(Number);
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

function DonutChart({ confirmed, cancelled, completed, size = 80 }) {
  const total = confirmed + cancelled + completed || 1;
  const r = 28;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const segments = [
    { val: confirmed, color: "#2D9A6E" },
    { val: cancelled, color: "#C0392B" },
    { val: completed, color: "#2471A3" },
  ];
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#F1F3F5"
        strokeWidth="10"
      />
      {segments.map(({ val, color }, i) => {
        const dash = (val / total) * circ;
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: `${cx}px ${cy}px`,
            }}
          />
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
      >
        {total}
      </text>
    </svg>
  );
}

/* ── STAT CARD ── */
function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  chartData,
  chartType = "bar",
  accent,
}) {
  return (
    <div className="bg-white rounded-2xl px-[22px] py-5 border border-[#E9ECEF] shadow-[0_1px_4px_rgba(15,25,35,0.05)] flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[0.65rem] font-bold  tracking-[1.5px] uppercase text-[#868E96] mb-[6px]">
            {label}
          </div>

          <div className="font-['Playfair_Display'] text-[1.5rem] font-semibold text-[#0F1923] leading-none">
            {value}
          </div>

          {trend && (
            <div
              className={`mt-[5px] flex items-center gap-1 text-[0.72rem] ${
                trend > 0 ? "text-[#2D9A6E]" : "text-[#C0392B]"
              }`}
            >
              <TrendingUpIcon
                size={11}
                color={trend > 0 ? "#2D9A6E" : "#C0392B"}
              />

              {trend > 0 ? "+" : ""}
              {trend}% this month
            </div>
          )}
        </div>

        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: accent || "#F1F3F5",
          }}
        >
          <Icon
            size={18}
            color={accent ? "#fff" : "#0F1923"}
          />
        </div>
      </div>

      {chartData && chartType === "bar" && (
        <BarChart
          data={chartData}
          color="#C9A84C"
          height={52}
        />
      )}

      {chartData && chartType === "line" && (
        <LineChart
          data={chartData}
          color="#C9A84C"
          height={52}
        />
      )}
    </div>
  );
}

/* ── CANCEL WARNING MODAL ── */
function CancelWarningModal({ booking, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-[rgba(15,25,35,0.8)] p-4 backdrop-blur-md">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        {/* Header */}
        <div className="flex items-center gap-3 bg-red-700 px-6 py-5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
            <span className="text-xl">⚠️</span>
          </div>

          <div>
            <h2 className="font-serif text-base font-semibold text-white">
              Cancel Booking?
            </h2>
            <p className="mt-0.5 text-xs text-white/70">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-5 rounded-xl bg-gray-50 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-900">
              #{booking.booking_id} — {booking.guest_name}
            </div>

            {[
              { label: "Room", val: booking.room_type },
              {
                label: "Check-in",
                val: booking.check_in_date?.slice(0, 10),
              },
              {
                label: "Check-out",
                val: booking.check_out_date?.slice(0, 10),
              },
              {
                label: "Total",
                val: `₹${Number(
                  booking.final_total || booking.total_price
                ).toLocaleString("en-IN")}`,
              },
            ].map(({ label, val }) => (
              <div
                key={label}
                className="flex justify-between border-t border-gray-200 py-1 text-xs"
              >
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-slate-900">{val}</span>
              </div>
            ))}
          </div>

          <p className="mb-5 text-sm leading-relaxed text-gray-600">
            Are you sure you want to cancel this booking? The guest will need
            to be notified separately.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium transition hover:bg-gray-50"
            >
              Keep Booking
            </button>

            <button
              onClick={onConfirm}
              className="flex-1 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Yes, Cancel It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ── USER DETAIL MODAL ── */
function UserDetailModal({ userId, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[rgba(15,25,35,0.7)]">
        <div className="rounded-2xl bg-white px-10 py-10 text-gray-500 shadow-lg">
          Loading user details...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[rgba(15,25,35,0.7)] p-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-7 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500/20">
              <span className="font-serif text-[1.4rem] font-bold text-amber-500">
                {user.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>

            <div>
              <h2 className="font-serif text-lg font-semibold text-white">
                {user.name}
              </h2>

              <p className="mt-0.5 text-xs text-white/50">{user.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <XIcon size={14} className="text-white" />
          </button>
        </div>

        {/* User Summary */}
        <div className="grid grid-cols-1 gap-3 border-b border-gray-200 px-7 py-5 md:grid-cols-2">
          {[
            {
              label: "Phone",
              val: user.phone || "—",
            },
            {
              label: "Role",
              val: user.role?.toUpperCase(),
            },
            {
              label: "Joined",
              val: user.created_at?.slice(0, 10),
            },
            {
              label: "Total Spent",
              val: `₹${Number(
                user.total_spent || 0
              ).toLocaleString("en-IN")}`,
            },
          ].map(({ label, val }) => (
            <div
              key={label}
              className="rounded-xl bg-gray-50 p-4"
            >
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {label}
              </div>

              <div className="text-sm font-semibold text-slate-900">
                {val}
              </div>
            </div>
          ))}
        </div>

        {/* Booking History */}
        <div className="flex-1 overflow-y-auto px-7 py-5">
          <h3 className="mb-4 font-serif text-base font-semibold text-slate-900">
            Booking History ({user.bookings?.length || 0})
          </h3>

          {!user.bookings || user.bookings.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No bookings yet
            </div>
          ) : (
            <div className="space-y-3">
              {user.bookings.map((b) => (
                <div
                  key={b.booking_id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <span className="rounded bg-slate-900 px-2 py-1 text-[10px] font-bold tracking-wider text-amber-200">
                        {b.room_type}
                      </span>

                      <span className="ml-2 text-xs text-gray-500">
                        #{b.booking_id}
                      </span>
                    </div>

                    <span
                      className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                        b.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : b.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <div>
                      <span className="text-gray-500">Check-in: </span>
                      {b.check_in_date?.slice(0, 10)}
                    </div>

                    <div>
                      <span className="text-gray-500">Check-out: </span>
                      {b.check_out_date?.slice(0, 10)}
                    </div>

                    <div>
                      <span className="text-gray-500">Total: </span>
                      <strong>
                        ₹
                        {Number(
                          b.final_total || b.total_price
                        ).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// export default UserDetailModal;
/* ── BOOKING DETAIL MODAL ── */
function BookingDetailModal({ bookingId, onClose, showToast, onRefresh }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addonLabel, setAddonLabel] = useState("");
  const [addonAmount, setAddonAmount] = useState("");
  const [addonLoading, setAddonLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Online");
  const [addonPaid, setAddonPaid] = useState(false);

  const PRESET_ADDONS = ["Food & Beverages", "Laundry", "Spa/Massage", "Extra Bed", "Room Service"];
  const PAYMENT_MODES = ["Cash", "UPI", "Card", "Online", "Bank Transfer"];

  const fetchBooking = () => {
    setLoading(true);
    apiFetch(`/api/admin/bookings/${bookingId}`)
      .then((r) => r.json())
      .then(setBooking)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]); // eslint-disable-line

  async function handleCheckin() {
    const res = await apiFetch(`/api/bookings/${bookingId}/checkin`, { method: "PATCH" });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, "error");
    showToast("Guest checked in!", "success");
    fetchBooking();
    onRefresh();
  }

  async function handleCheckout() {
    if (!window.confirm("Confirm checkout? This will calculate final bill.")) return;
    const res = await apiFetch(`/api/bookings/${bookingId}/checkout`, { method: "PATCH" });
    const data = await res.json();
    if (!res.ok) return showToast(data.error, "error");
    showToast(`Checked out! Total: Rs.${Number(data.final_total).toLocaleString()}`, "success");
    fetchBooking();
    onRefresh();
  }

  async function addAddon() {
    if (!addonLabel || !addonAmount) return showToast("Enter label and amount", "error");
    setAddonLoading(true);
    const res = await apiFetch(`/api/bookings/${bookingId}/addons`, {
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

  async function removeAddon(addonId) {
    await apiFetch(`/api/bookings/${bookingId}/addons/${addonId}`, { method: "DELETE" });
    showToast("Addon removed", "success");
    fetchBooking();
    onRefresh();
  }

  async function downloadInvoice() {
    // ... unchanged PDF generation logic ...
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
            <div className="font-display text-[1.05rem] font-semibold text-white">
              Booking #{booking.booking_id} — {booking.guest_name}
            </div>
            <div className="text-xs text-white/45 mt-0.5">
              {booking.room_type} · {booking.check_in_date?.slice(0, 10)} → {booking.check_out_date?.slice(0, 10)}
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
                    ✅ {new Date(booking.actual_checkout).toLocaleString("en-IN")}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Duration: {booking.hours_spent}h
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={!booking.actual_checkin || booking.status === "cancelled"}
                  className={`text-white text-[0.8rem] font-semibold px-4 py-2 rounded-md transition-colors
                    ${booking.actual_checkin
                      ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      : "bg-gray-300 cursor-not-allowed"
                    }`}
                >
                  ⏹ Record Check-out
                </button>
              )}
            </div>
          </div>

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
                    ${addonLabel === preset
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
                placeholder="Label (e.g. Airport Transfer)"
                className="flex-[2_1_140px] px-3 py-2 rounded-md border-[1.5px] border-gray-200 text-[0.82rem] focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/10 transition"
              />
              <input
                value={addonAmount}
                onChange={(e) => setAddonAmount(e.target.value)}
                placeholder="Amount ₹"
                type="number"
                className="flex-[1_1_80px] px-3 py-2 rounded-md border-[1.5px] border-gray-200 text-[0.82rem] focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/10 transition"
              />
              <button
                onClick={addAddon}
                disabled={addonLoading}
                className="bg-gold text-white px-4 py-2 rounded-md text-[0.82rem] font-semibold whitespace-nowrap hover:bg-gold/90 transition-colors disabled:opacity-50"
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
                    <span className="text-[0.82rem] text-navy">{addon.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[0.85rem] font-bold text-navy">
                        Rs.{Number(addon.amount).toLocaleString()}
                      </span>
                      <button
                        onClick={() => removeAddon(addon.addon_id)}
                        className="text-red-600 text-[0.72rem] font-bold hover:text-red-700 transition-colors"
                      >
                        ✕
                      </button>
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
                    ${paymentMode === mode
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

            {/* Already paid section */}
            <div className="mb-3">
              <div className="text-[0.6rem] font-bold text-white/30 tracking-[1.5px] uppercase mb-2">
                Booking Payment (Already Paid)
              </div>
              {[
                { label: "Room Charges", val: `Rs.${basePrice.toLocaleString()}` },
                { label: "GST (18%)", val: `Rs.${Math.round(roomGst).toLocaleString()}` },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="flex justify-between text-[0.82rem] py-1 border-b border-white/5"
                >
                  <span className="text-white/45">{label}</span>
                  <span className="text-white/70 font-semibold">{val}</span>
                </div>
              ))}
              <div className="flex justify-between items-center mt-2 bg-emerald-600/15 rounded-md px-2.5 py-1.5 border border-emerald-600/30">
                <span className="text-[0.82rem] text-emerald-500 font-bold">Amount Already Paid</span>
                <span className="text-[0.95rem] text-emerald-500 font-bold">
                  Rs.{Math.round(alreadyPaid).toLocaleString()}
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
                { label: "Add-on Charges", val: `Rs.${addonTotal.toLocaleString()}` },
                { label: "GST on Add-ons (18%)", val: `Rs.${Math.round(addonGst).toLocaleString()}` },
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
                  ${addonPaid
                    ? "bg-emerald-600/15 border-emerald-600/30"
                    : "bg-gold/10 border-gold/25"
                  }`}
              >
                <div>
                  <div className={`text-[0.82rem] font-bold ${addonPaid ? "text-emerald-500" : "text-gold"}`}>
                    {addonPaid ? "Add-ons Paid" : "Remaining Amount to Pay"}
                  </div>
                  <div className="text-[0.68rem] text-white/35 mt-0.5">
                    {addonPaid ? `Received via ${paymentMode}` : `via ${paymentMode}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {addonPaid && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                  <span className={`text-[1.1rem] font-bold font-display ${addonPaid ? "text-emerald-500" : "text-gold"}`}>
                    Rs.{Math.round(remainingAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gold/30 my-3" />

            {/* Grand total */}
            <div className="flex justify-between items-center">
              <span className="font-display font-bold text-gold text-[1rem]">Grand Total</span>
              <span className="font-display font-bold text-white text-[1.4rem]">
                Rs.{Math.round(finalTotal).toLocaleString()}
              </span>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-2.5">
            <button
              onClick={downloadInvoice}
              className="flex-1 flex items-center justify-center gap-1 py-3 bg-navy text-gold text-[0.82rem] font-semibold rounded-lg hover:bg-navy/90 transition-colors"
            >
              <DownloadIcon size={14} color="#C9A84C" />
              Download Invoice
            </button>

            <button
              onClick={() => setAddonPaid(!addonPaid)}
              disabled={addonTotal === 0}
              title={addonTotal === 0 ? "No add-on charges to mark as paid" : ""}
              className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-lg text-[0.88rem] font-bold transition-all
                ${addonPaid
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : addonTotal > 0
                    ? "bg-gold text-navy hover:bg-gold/90"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                }`}
            >
              {addonPaid ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Add-ons Paid
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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

// ═══════════════════════════════════════════════════════════════════
// PATCH FOR AdminDashboard.jsx
// ---------------------------------------------------------------
// STEP 1: Add `useRef` to the React import at the top (line 1):
//   import React, { useState, useEffect, useRef } from "react";
//
// STEP 2: Delete the entire old `EditRoomModal` function
//   (from `/* ── EDIT ROOM MODAL ── */` down to its closing `}`)
//
// STEP 3: Paste EVERYTHING below this comment block in its place.
// ═══════════════════════════════════════════════════════════════════

async function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800;
        let w = img.width,
          h = img.height;
        if (w > MAX) {
          h = (h * MAX) / w;
          w = MAX;
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/* ── single image upload slot ── */
function ImageSlot({ index, value, onChange, isMain }) {
  const [mode, setMode] = useState("idle");
  const [urlInput, setUrlInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = await uploadToCloudinary(file);
    onChange(url);
    setMode("idle");
  }

  function applyUrl() {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput("");
    setMode("idle");
  }

  const slotLabel = isMain ? "Main Photo" : `Photo ${index + 1}`;

  return (
    <div className="flex flex-col gap-1.5">

      {/* Label */}
      <div className="flex items-center gap-1.5">
        {isMain && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#C9A84C">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        )}
        <span
          className={`text-[0.6rem] font-bold uppercase tracking-[0.8px]
            ${isMain ? "text-gold" : "text-gray-400"}`}
        >
          {slotLabel}
        </span>
      </div>

      {/* Box */}
      <div
        className={`relative w-full rounded-[10px] overflow-hidden bg-gray-50 transition-colors duration-200
          ${isMain ? "aspect-video" : "aspect-[4/3]"}
          ${dragging ? "border-2 border-dashed border-gold" : "border-[1.5px] border-gray-200"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragging(false);
          await handleFile(e.dataTransfer.files[0]);
        }}
      >

        {/* PREVIEW */}
        {value && (
          <>
            <img
              src={value}
              alt={slotLabel}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            {isMain && (
              <div className="absolute top-2 left-2 bg-gold/90 text-white text-[0.58rem] font-bold tracking-[0.8px] px-2 py-0.5 rounded uppercase">
                Main
              </div>
            )}
            {/* Hover actions */}
            <div className="absolute bottom-1.5 right-1.5 flex gap-1.5">
              <button
                onClick={() => fileRef.current.click()}
                title="Replace"
                className="w-7 h-7 flex items-center justify-center rounded-md bg-navy/75 text-white border-none cursor-pointer hover:bg-navy transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
              </button>
              <button
                onClick={() => onChange("")}
                title="Remove"
                className="w-7 h-7 flex items-center justify-center rounded-md bg-red-600/80 text-white border-none cursor-pointer hover:bg-red-600 transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* EMPTY STATE */}
        {!value && mode === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#CED4DA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            <div className="text-[0.65rem] text-gray-400 text-center">
              {isMain ? "Main photo" : "Add photo"}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => fileRef.current.click()}
                className="px-2.5 py-1 rounded-full bg-navy text-white text-[0.65rem] font-semibold border-none cursor-pointer hover:bg-navy/90 transition-colors"
              >
                Upload
              </button>
              <button
                onClick={() => setMode("url")}
                className="px-2.5 py-1 rounded-full bg-white text-gray-600 text-[0.65rem] font-semibold border-[1.5px] border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
              >
                URL
              </button>
            </div>
          </div>
        )}

        {/* URL INPUT */}
        {!value && mode === "url" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2.5">
            <div className="text-[0.65rem] text-gray-400 font-semibold">
              Paste image URL
            </div>
            <input
              autoFocus
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyUrl()}
              placeholder="https://..."
              className="w-full px-2 py-1.5 rounded-md border-[1.5px] border-gold text-[0.7rem] outline-none box-border focus:ring-2 focus:ring-gold/20 transition"
            />
            <div className="flex gap-1.5">
              <button
                onClick={applyUrl}
                className="px-3 py-1 rounded-full bg-navy text-gold text-[0.65rem] font-semibold border-none cursor-pointer hover:bg-navy/90 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => setMode("idle")}
                className="px-3 py-1 rounded-full bg-white text-gray-600 text-[0.65rem] font-semibold border-[1.5px] border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => { await handleFile(e.target.files[0]); e.target.value = ""; }}
      />
    </div>
  );
}

/* ── EDIT ROOM MODAL — 5-slot image upload ── */
function EditRoomModal({ room, onClose, showToast, onRefresh }) {
  const [form, setForm] = useState({
    room_number:     room.room_number     || "",
    room_type:       room.room_type       || "",
    price_per_night: room.price_per_night || "",
    capacity:        room.capacity        || 2,
    description:     room.description    || "",
    is_available:    room.is_available,
  });
  const [images, setImages] = useState([
    room.image_url || "",
    room.image2 || "",
    room.image3 || "",
    room.image4 || "",
    room.image5 || "",
  ]);
  const [loading, setLoading] = useState(false);

  function setImage(i, val) {
    setImages((prev) => {
      const n = [...prev];
      n[i] = val;
      return n;
    });
  }

  async function save() {
    setLoading(true);
    const payload = {
      ...form,
      image_url: images[0],
      image2: images[1],
      image3: images[2],
      image4: images[3],
      image5: images[4],
    };
    const res = await apiFetch(`/api/admin/rooms/${room.room_id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return showToast(data.error, "error");
    showToast("Room updated!", "success");
    onRefresh();
    onClose();
  }

  const inputCls = "w-full px-3 py-2 rounded-md border-[1.5px] border-gray-200 text-[0.85rem] text-gray-900 box-border focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/40 transition";
  const labelCls = "block text-[0.62rem] font-bold text-gray-400 mb-1 tracking-[0.8px] uppercase";

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-navy/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-[600px] max-h-[92vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.28)]">

        {/* Header */}
        <div className="bg-navy px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <div className="font-display text-[1rem] font-semibold text-white">
              Edit Room #{room.room_number || room.room_id}
            </div>
            <div className="text-[0.7rem] text-white/40 mt-0.5">
              Upload photos or paste URLs · drag &amp; drop supported
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-full bg-white/10 flex items-center justify-center border-none cursor-pointer hover:bg-white/20 transition-colors"
          >
            <XIcon size={13} color="#fff" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Images */}
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
            <div className="text-[0.65rem] font-bold text-gray-600 tracking-[1px] uppercase mb-3">
              Room Photos — upload file, paste URL, or drag &amp; drop
            </div>

            {/* Main slot */}
            <div className="mb-2.5">
              <ImageSlot index={0} value={images[0]} onChange={(v) => setImage(0, v)} isMain={true} />
            </div>

            {/* 4 thumbnails */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <ImageSlot
                  key={i}
                  index={i}
                  value={images[i]}
                  onChange={(v) => setImage(i, v)}
                  isMain={false}
                />
              ))}
            </div>

            <div className="mt-2 text-[0.62rem] text-gray-400 leading-relaxed">
              JPG, PNG, WebP supported. Files are converted to base64 and stored securely.
            </div>
          </div>

          {/* Room Number + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Room Number</label>
              <input
                className={inputCls}
                value={form.room_number}
                onChange={(e) => setForm({ ...form, room_number: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Room Type</label>
              <select
                className={inputCls}
                value={form.room_type}
                onChange={(e) => setForm({ ...form, room_type: e.target.value })}
              >
                {["Standard", "Deluxe", "Suite", "Luxury", "Presidential"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price + Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price / Night (₹)</label>
              <input
                className={inputCls}
                type="number"
                value={form.price_per_night}
                onChange={(e) => setForm({ ...form, price_per_night: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Capacity</label>
              <input
                className={inputCls}
                type="number"
                min={1}
                max={10}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} resize-y min-h-[64px]`}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Status toggle */}
          <div className="flex items-center gap-2.5">
            <span className={`${labelCls} mb-0`}>Status:</span>
            <button
              onClick={() => setForm({ ...form, is_available: form.is_available ? 0 : 1 })}
              className={`px-3.5 py-1 rounded-md text-[0.78rem] font-bold border-[1.5px] cursor-pointer transition-colors
                ${form.is_available
                  ? "bg-emerald-50 text-emerald-600 border-emerald-600 hover:bg-emerald-100"
                  : "bg-red-50 text-red-600 border-red-600 hover:bg-red-100"
                }`}
            >
              {form.is_available ? "Available" : "Blocked"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-200 flex gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-transparent border-[1.5px] border-gray-200 rounded-lg text-[0.85rem] cursor-pointer hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={loading}
            className={`flex-[2] py-2.5 rounded-lg text-[0.88rem] font-bold border-none transition-colors
              ${loading
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-navy text-gold cursor-pointer hover:bg-navy/90"
              }`}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>

      </div>
    </div>
  );
}

/* ── ADD ROOM MODAL ── */
function AddRoomModal({ onClose, showToast, onRefresh }) {
  const [form, setForm] = useState({
    room_number:     "",
    room_type:       "Standard",
    price_per_night: "",
    capacity:        2,
    description:     "",
    image_url:       "",
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!form.room_number || !form.price_per_night)
      return showToast("Room number and price are required", "error");
    setLoading(true);
    const res = await apiFetch("/api/admin/rooms", {
      method: "POST",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return showToast(data.error || "Failed to add room", "error");
    showToast(`Room #${form.room_number} added successfully!`, "success");
    onRefresh();
    onClose();
  }

  const inputCls = "w-full px-3 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[0.85rem] text-gray-900 box-border outline-none transition-colors duration-200 focus:border-gold focus:ring-2 focus:ring-gold/15";
  const labelCls = "block text-[0.62rem] font-bold text-gray-400 mb-1.5 tracking-[0.8px] uppercase";

  const roomTypes = ["Standard", "Deluxe", "Suite", "Luxury", "Presidential"];
  const typeColors = {
    Standard:     { border: "border-gray-500",   bg: "bg-gray-500",   text: "text-gray-500"   },
    Deluxe:       { border: "border-blue-600",   bg: "bg-blue-600",   text: "text-blue-600"   },
    Suite:        { border: "border-violet-600", bg: "bg-violet-600", text: "text-violet-600" },
    Luxury:       { border: "border-gold",       bg: "bg-gold",       text: "text-gold"       },
    Presidential: { border: "border-red-600",    bg: "bg-red-600",    text: "text-red-600"    },
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-[560px] max-h-[92vh] overflow-hidden flex flex-col shadow-[0_24px_64px_rgba(0,0,0,0.3)]">

        {/* Header */}
        <div className="bg-navy px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <div className="font-display text-[1.1rem] font-semibold text-white">
              Add New Room
            </div>
            <div className="text-[0.72rem] text-white/40 mt-0.5">
              Fill in the room details below
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-[34px] h-[34px] rounded-full bg-white/10 flex items-center justify-center border-none cursor-pointer hover:bg-white/20 transition-colors"
          >
            <XIcon size={14} color="#fff" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Image preview */}
          {form.image_url && (
            <div className="rounded-xl overflow-hidden h-40 relative">
              <img
                src={form.image_url}
                alt="preview"
                onError={(e) => (e.target.style.display = "none")}
                onLoad={(e) => (e.target.style.display = "block")}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
              <div className="absolute bottom-2.5 left-3.5 text-white text-[0.72rem] font-semibold">
                Image Preview
              </div>
            </div>
          )}

          {/* Room Type selector */}
          <div>
            <label className={labelCls}>Room Type</label>
            <div className="flex gap-2 flex-wrap">
              {roomTypes.map((t) => {
                const active = form.room_type === t;
                const c = typeColors[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, room_type: t })}
                    className={`px-3.5 py-1.5 rounded-full text-[0.75rem] font-semibold border-2 transition-all duration-150
                      ${active
                        ? `${c.bg} ${c.border} text-white`
                        : `bg-white border-gray-200 text-gray-600 hover:${c.border} hover:${c.text}`
                      }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Number & Price */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelCls}>Room Number *</label>
              <input
                className={inputCls}
                placeholder="e.g. 102"
                value={form.room_number}
                onChange={(e) => setForm({ ...form, room_number: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Price / Night (₹) *</label>
              <input
                className={inputCls}
                type="number"
                placeholder="e.g. 2500"
                value={form.price_per_night}
                onChange={(e) => setForm({ ...form, price_per_night: e.target.value })}
              />
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label className={labelCls}>Capacity (max guests)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, capacity: n })}
                  className={`w-10 h-10 rounded-lg text-[0.85rem] font-bold border-2 transition-all duration-150
                    ${form.capacity === n
                      ? "bg-navy border-navy text-gold"
                      : "bg-white border-gray-200 text-gray-600 hover:border-navy/40"
                    }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} resize-y min-h-[72px]`}
              placeholder="Describe the room amenities, view, features..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Image URL */}
          <div>
            <label className={labelCls}>Image URL</label>
            <input
              className={inputCls}
              placeholder="https://images.unsplash.com/..."
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
            <div className="text-[0.68rem] text-gray-400 mt-1">
              Paste any image URL — Unsplash works great for hotel photos
            </div>
          </div>

          {/* Pricing preview */}
          {form.price_per_night && (
            <div className="bg-gray-50 rounded-xl px-4 py-3.5 border border-gray-200">
              <div className="text-[0.62rem] font-bold text-gray-400 tracking-[1px] uppercase mb-2">
                Pricing Preview
              </div>
              {[
                {
                  label: "Base price / night",
                  val: `Rs.${Number(form.price_per_night).toLocaleString()}`,
                },
                {
                  label: "GST (18%)",
                  val: `Rs.${Math.round(Number(form.price_per_night) * 0.18).toLocaleString()}`,
                },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between text-[0.82rem] mb-1">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-semibold">{val}</span>
                </div>
              ))}
              <div className="flex justify-between text-[0.9rem] border-t border-gray-200 pt-2 mt-1">
                <span className="font-display font-semibold text-navy">Guest pays / night</span>
                <strong className="font-display text-navy">
                  Rs.{Math.round(Number(form.price_per_night) * 1.18).toLocaleString()}
                </strong>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-transparent border-[1.5px] border-gray-200 rounded-lg text-[0.85rem] font-medium cursor-pointer hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={loading}
            className={`flex-[2] py-2.5 rounded-lg text-[0.88rem] font-bold border-none flex items-center justify-center gap-2 transition-all duration-200
              ${loading
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-navy text-gold cursor-pointer hover:bg-navy/90"
              }`}
          >
            {loading ? "Adding Room..." : "✚ Add Room"}
          </button>
        </div>

      </div>
    </div>
  );
}

/* ── RESET PASSWORD MODAL ── */
function ResetPasswordModal({ user, onClose, showToast }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function handleReset() {
    if (password.length < 6) return showToast("Min 6 characters", "error");
    if (password !== confirm) return showToast("Passwords don't match", "error");
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users/${user.user_id}/reset-password`, {
        method: "PATCH",
        body: JSON.stringify({ new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Password reset for ${user.name}!`, "success");
      onClose();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-md border-[1.5px] border-gray-200 text-[0.875rem] box-border focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/15 transition-colors";
  const labelCls = "block text-[0.62rem] font-bold text-gray-400 mb-1.5 tracking-[0.8px] uppercase";

  const bothFilled = password && confirm;
  const isMatch = password === confirm && password.length >= 6;
  const isMismatch = bothFilled && password !== confirm;

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-[400px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)]">

        {/* Header */}
        <div className="bg-navy px-6 py-5 flex items-center justify-between">
          <div>
            <div className="font-display text-[1rem] font-semibold text-white">
              Reset Password
            </div>
            <div className="text-[0.75rem] text-white/50 mt-0.5">
              {user.name} · {user.email}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-full bg-white/10 flex items-center justify-center border-none cursor-pointer hover:bg-white/20 transition-colors"
          >
            <XIcon size={13} color="#fff" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3.5">

          {/* New Password */}
          <div>
            <label className={labelCls}>New Password</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-base leading-none"
              >
                {show ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className={labelCls}>Confirm Password</label>
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Validation feedback */}
          {isMismatch && (
            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-md text-[0.78rem]">
              ❌ Passwords don't match
            </div>
          )}
          {bothFilled && isMatch && (
            <div className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-md text-[0.78rem]">
              ✅ Passwords match
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-transparent border-[1.5px] border-gray-200 rounded-lg text-[0.85rem] cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={loading}
              className={`flex-[2] py-2.5 bg-navy text-white rounded-lg text-[0.85rem] font-semibold border-none transition-colors
                ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-navy/90"}`}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
/*═════════════════════════════════════════════════════════
   MAIN ADMIN DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard({ adminUser, onClose, showToast, fullPage = false }) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [editRoom, setEditRoom] = useState(null);
  const [cancelBookingData, setCancelBookingData] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);

  const fetchAll = () => {
    Promise.all([
      apiFetch("/api/admin/stats").then((r) => r.json()),
      apiFetch("/api/admin/bookings").then((r) => r.json()),
      apiFetch("/api/admin/rooms").then((r) => r.json()),
      apiFetch("/api/rooms").then((r) => r.json()),
      apiFetch("/api/admin/users").then((r) => r.json()).catch(() => []),
    ]).then(([s, b, allR, r, u]) => {
      setStats(s);
      setBookings(Array.isArray(b) ? b : []);
      setAllRooms(Array.isArray(allR) ? allR : []);
      setRooms(Array.isArray(r) ? r : []);
      setUsers(Array.isArray(u) ? u : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  async function confirmCancelBooking(id) {
    try {
      const res = await apiFetch(`/api/bookings/${id}/cancel`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookings((b) => b.map((x) => x.booking_id === id ? { ...x, status: "cancelled" } : x));
      showToast("Booking cancelled", "success");
      setCancelBookingData(null);
    } catch (err) { showToast(err.message, "error"); }
  }

  async function deleteBooking(id) {
    if (!window.confirm("Permanently delete this cancelled booking record?")) return;
    try {
      const res = await apiFetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookings((b) => b.filter((x) => x.booking_id !== id));
      showToast("Booking deleted", "success");
    } catch (err) { showToast(err.message, "error"); }
  }

  async function deleteRoom(roomId) {
    if (!window.confirm("Permanently delete this room? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/api/admin/rooms/${roomId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAllRooms((r) => r.filter((x) => x.room_id !== roomId));
      showToast("Room deleted successfully", "success");
    } catch (err) { showToast(err.message, "error"); }
  }

  async function toggleRoom(roomId, current) {
    try {
      await apiFetch(`/api/admin/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_available: current ? 0 : 1 }),
      });
      setAllRooms((r) => r.map((x) => x.room_id === roomId ? { ...x, is_available: current ? 0 : 1 } : x));
      showToast(`Room ${current ? "blocked" : "unblocked"}`, "success");
    } catch (err) { showToast(err.message, "error"); }
  }

  const last7 = Array(7).fill(0).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString("en-IN", { weekday: "short" }),
      value: bookings.filter((b) => b.check_in_date?.slice(0, 10) === d.toISOString().slice(0, 10)).length,
    };
  });

  const revenueByRoom = allRooms
    .map((r) => ({
      label: r.room_type,
      value: bookings
        .filter((b) => b.room_type === r.room_type && (b.status === "confirmed" || b.status === "completed"))
        .reduce((sum, b) => sum + Number(b.final_total || b.total_price), 0),
    }))
    .filter((r) => r.value > 0);

  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const completed = bookings.filter((b) => b.status === "completed").length;

  const filteredBookings = bookings.filter(
    (b) => !searchTerm ||
      b.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.room_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const checkedInBookings = bookings.filter(
    (b) => b.actual_checkin && !b.actual_checkout && b.status === "confirmed",
  );

  const tabs = [
    { id: "overview", label: "Overview",       icon: GridIcon     },
    { id: "bookings", label: "Bookings",        icon: BookingIcon  },
    { id: "checkins", label: "Check-in Details",icon: BedIcon      },
    { id: "rooms",    label: "Rooms",           icon: BedIcon      },
    { id: "users",    label: "Users",           icon: UsersIcon    },
    { id: "book",     label: "New Booking",     icon: CalendarIcon },
  ];

  // ── Shared cell classes ──────────────────────────────────────────────────
  const thCls = "px-3.5 py-2.5 text-left text-[0.62rem] font-bold text-gray-400 uppercase tracking-[1px] border-b-[1.5px] border-gray-200 bg-gray-50 whitespace-nowrap";
  const tdCls = "px-3.5 py-[11px]";

  // ── Status badge helper ──────────────────────────────────────────────────
  function StatusBadge({ status }) {
    const map = {
      confirmed: "bg-emerald-50 text-emerald-600",
      cancelled:  "bg-red-50 text-red-600",
      completed:  "bg-blue-50 text-blue-600",
    };
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded text-[0.62rem] font-bold uppercase ${map[status] ?? map.completed}`}>
        {status}
      </span>
    );
  }

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/[0.07] flex items-center gap-2.5">
        <img
          src="/logo.png"
          alt="VV"
          className="h-9 w-9 object-contain mix-blend-screen brightness-125"
        />
        <div className="flex flex-col leading-[1.15]">
          <span className="font-display text-[0.85rem] font-bold text-white tracking-[1.5px]">
            VV GRAND PARK
          </span>
          <span className="font-display text-[0.55rem] text-gold tracking-[2.5px]">
            RESIDENCY
          </span>
        </div>
      </div>

      {/* Nav */}
      <div className="py-4 flex-1">
        <div className="px-5 pb-2.5 text-[0.6rem] tracking-[2px] uppercase text-white/25">
          Management
        </div>
        {tabs.map(({ id, label, icon: TabIcon }) => (
          <div
            key={id}
            onClick={() => { setTab(id); setSidebarOpen(false); }}
            className={`flex items-center gap-2.5 px-5 py-[11px] cursor-pointer text-[0.82rem] transition-all duration-[180ms] border-l-[2.5px]
              ${tab === id
                ? "bg-gold/[0.12] border-gold text-gold font-semibold"
                : "border-transparent text-white/50 font-normal hover:text-white/70 hover:bg-white/[0.04]"
              }`}
          >
            <TabIcon size={15} color={tab === id ? "#C9A84C" : "rgba(255,255,255,0.4)"} />
            {label}
            {id === "checkins" && checkedInBookings.length > 0 && (
              <span className="ml-auto bg-emerald-600 text-white rounded-[10px] px-1.5 text-[0.6rem] font-bold">
                {checkedInBookings.length}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Admin user + back */}
      <div className="px-5 py-4 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
            <UserIcon size={14} color="#C9A84C" />
          </div>
          <div>
            <div className="text-[0.78rem] font-semibold text-white">{adminUser?.name}</div>
            <div className="text-[0.65rem] text-white/35 tracking-[0.5px] uppercase">Administrator</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-white/60 text-[0.78rem] cursor-pointer hover:bg-white/10 transition-colors"
        >
          <ArrowRightIcon size={13} color="rgba(255,255,255,0.5)" /> Back to Site
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Keyframe for pulse-green */}
      <style>{`
        @keyframes pulse-green {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* ── Desktop sidebar ── */}
      <div className="fixed top-0 left-0 bottom-0 w-[220px] bg-navy flex flex-col border-r border-gold/[0.12] z-[100] max-md:hidden">
        <SidebarContent />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[200] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-[220px] bg-navy flex flex-col">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <div className="md:ml-[220px] min-h-screen">

        {/* Topbar */}
        <div className="bg-navy px-5 h-16 flex items-center justify-between border-b border-gold/[0.12] sticky top-0 z-[99]">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden flex flex-col gap-[5px] bg-none border-none cursor-pointer px-2 py-1"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-[22px] h-0.5 bg-gold rounded-sm" />
            ))}
          </button>

          <div>
            <div className="font-display text-[1.05rem] font-semibold text-white">
              {tabs.find((t) => t.id === tab)?.label}
            </div>
            <div className="text-[0.72rem] text-white/35 mt-px">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>

          <div className="text-[0.72rem] text-white/40 bg-gold/[0.12] border border-gold/20 px-3 py-1 rounded-md">
            Admin Portal
          </div>
        </div>

        {/* Content */}
        <div className="p-5">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && stats && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6 max-sm:grid-cols-2 max-[480px]:grid-cols-1">
                <StatCard label="Total Rooms"      value={allRooms.length}                                                    icon={BedIcon}        accent="#0F1923" />
                <StatCard label="Total Bookings"   value={stats.total_bookings}                                               icon={BookingIcon}    accent="#2471A3" chartData={last7}        chartType="bar" />
                <StatCard label="Registered Users" value={stats.total_users}                                                  icon={UsersIcon}      accent="#2D9A6E" />
                <StatCard label="Total Revenue"    value={`Rs.${Number(stats.total_revenue).toLocaleString()}`}               icon={CreditCardIcon} accent="#C9A84C" chartData={revenueByRoom} chartType="bar" />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

                {/* Bookings this week */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[0.65rem] tracking-[1.5px] uppercase text-gray-400 mb-0.5">Bookings This Week</div>
                      <div className="font-display text-[1.4rem] font-semibold text-navy">
                        {last7.reduce((s, d) => s + d.value, 0)}
                      </div>
                    </div>
                    <TrendingUpIcon size={18} color="#C9A84C" />
                  </div>
                  <LineChart data={last7} color="#C9A84C" height={80} />
                  <div className="flex justify-between mt-1.5">
                    {last7.map((d, i) => (
                      <div key={i} className="text-[0.6rem] text-gray-400 text-center">{d.label}</div>
                    ))}
                  </div>
                </div>

                {/* Revenue by room */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[0.65rem] tracking-[1.5px] uppercase text-gray-400 mb-0.5">Revenue by Room</div>
                      <div className="font-display text-[1.4rem] font-semibold text-navy">
                        Rs.{Number(stats.total_revenue).toLocaleString()}
                      </div>
                    </div>
                    <CreditCardIcon size={18} color="#C9A84C" />
                  </div>
                  {revenueByRoom.length > 0 ? (
                    <>
                      <BarChart data={revenueByRoom} color="#0F1923" height={72} />
                      <div className="flex justify-between mt-1.5">
                        {revenueByRoom.map((d, i) => (
                          <div key={i} className="text-[0.58rem] text-gray-400 text-center">{d.label.slice(0, 3)}</div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-[0.82rem]">No revenue data yet</div>
                  )}
                </div>

                {/* Donut */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-[0_1px_4px_rgba(15,25,35,0.05)] flex flex-col items-center justify-center gap-4">
                  <div className="text-[0.65rem] tracking-[1.5px] uppercase text-gray-400">Booking Status</div>
                  <DonutChart confirmed={confirmed} cancelled={cancelled} completed={completed} size={100} />
                  <div className="flex flex-col gap-2 w-full">
                    {[
                      { label: "Confirmed", val: confirmed, color: "#2D9A6E" },
                      { label: "Cancelled", val: cancelled, color: "#C0392B" },
                      { label: "Completed", val: completed, color: "#2471A3" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex items-center justify-between text-[0.78rem]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <span className="text-gray-600">{label}</span>
                        </div>
                        <span className="font-bold text-navy">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent bookings */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-display text-[1rem] font-semibold text-navy">Recent Bookings</div>
                  <button
                    onClick={() => setTab("bookings")}
                    className="flex items-center gap-1 bg-none border-none text-gold text-[0.78rem] font-semibold cursor-pointer"
                  >
                    View all <ArrowRightIcon size={12} color="#C9A84C" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[600px]">
                    <thead>
                      <tr>
                        {["#", "Guest", "Room", "Check-in", "Total", "Status"].map((h) => (
                          <th key={h} className={thCls}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.recent_bookings || []).map((b) => (
                        <tr
                          key={b.booking_id}
                          className="border-t border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setSelectedBookingId(b.booking_id)}
                        >
                          <td className={`${tdCls} text-[0.78rem] text-gray-400`}>#{b.booking_id}</td>
                          <td className={`${tdCls} text-[0.85rem] font-semibold text-navy`}>{b.guest_name}</td>
                          <td className={`${tdCls} text-[0.82rem] text-gray-600`}>{b.room_type}</td>
                          <td className={`${tdCls} text-[0.82rem] text-gray-600 whitespace-nowrap`}>{b.check_in_date?.slice(0, 10)}</td>
                          <td className={`${tdCls} text-[0.85rem] font-semibold text-navy`}>
                            Rs.{Number(b.final_total || b.total_price).toLocaleString()}
                          </td>
                          <td className={tdCls}><StatusBadge status={b.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── BOOKINGS ── */}
          {tab === "bookings" && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div className="font-display text-[1rem] font-semibold text-navy">
                  All Bookings{" "}
                  <span className="text-[0.78rem] font-normal text-gray-400 ml-2">({bookings.length} total)</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 border-[1.5px] border-gray-200 rounded-lg px-3 py-2 min-w-[200px] flex-[0_1_240px]">
                  <SearchIcon size={14} color="#868E96" />
                  <input
                    placeholder="Search guest, room..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-none bg-transparent text-[0.82rem] text-gray-900 outline-none w-full"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[700px]">
                  <thead>
                    <tr>
                      {["#", "Guest", "Room", "Check-in", "Check-out", "Total", "Status", "Actions"].map((h) => (
                        <th key={h} className={thCls}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b.booking_id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className={`${tdCls} text-[0.75rem] text-gray-400`}>#{b.booking_id}</td>
                        <td className={`${tdCls} text-[0.85rem] font-semibold text-navy whitespace-nowrap`}>{b.guest_name}</td>
                        <td className={tdCls}>
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-[0.72rem] font-semibold">{b.room_type}</span>
                        </td>
                        <td className={`${tdCls} text-[0.82rem] text-gray-600 whitespace-nowrap`}>{b.check_in_date?.slice(0, 10)}</td>
                        <td className={`${tdCls} text-[0.82rem] text-gray-600 whitespace-nowrap`}>{b.check_out_date?.slice(0, 10)}</td>
                        <td className={`${tdCls} text-[0.85rem] font-bold text-navy whitespace-nowrap`}>
                          Rs.{Number(b.final_total || b.total_price).toLocaleString()}
                        </td>
                        <td className={tdCls}><StatusBadge status={b.status} /></td>
                        <td className={tdCls}>
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => setSelectedBookingId(b.booking_id)}
                              className="px-2.5 py-1 border-[1.5px] border-navy text-navy bg-none rounded text-[0.72rem] font-semibold cursor-pointer hover:bg-navy hover:text-white transition-colors"
                            >
                              Details
                            </button>
                            {b.status === "confirmed" && (
                              <button
                                onClick={() => setCancelBookingData(b)}
                                className="flex items-center gap-0.5 px-2.5 py-1 border-[1.5px] border-red-600 text-red-600 bg-none rounded text-[0.72rem] font-semibold cursor-pointer hover:bg-red-50 transition-colors"
                              >
                                <XIcon size={11} color="#C0392B" /> Cancel
                              </button>
                            )}
                            {b.status === "cancelled" && (
                              <button
                                onClick={() => deleteBooking(b.booking_id)}
                                className="px-2.5 py-1 border-[1.5px] border-gray-400 text-gray-400 bg-none rounded text-[0.72rem] font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
                              >
                                🗑 Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CHECK-IN DETAILS ── */}
          {tab === "checkins" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-display text-[1.1rem] font-semibold text-navy">Currently Checked-in Guests</div>
                  <div className="text-[0.78rem] text-gray-400 mt-0.5">
                    {checkedInBookings.length > 0 ? (
                      <span>
                        <span className="text-emerald-600 font-semibold">{checkedInBookings.length}</span>
                        {" "}guest{checkedInBookings.length !== 1 ? "s" : ""} currently on premises
                      </span>
                    ) : "No guests currently checked in"}
                  </div>
                </div>
                <button
                  onClick={fetchAll}
                  className="flex items-center gap-1.5 bg-navy text-gold border-none rounded-lg px-4 py-2 text-[0.78rem] font-semibold cursor-pointer hover:bg-navy/90 transition-colors"
                >
                  ↻ Refresh
                </button>
              </div>

              {checkedInBookings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
                  <div className="text-5xl mb-3.5">🏨</div>
                  <div className="font-display text-[1.1rem] text-navy mb-2">No guests currently checked in</div>
                  <div className="text-[0.82rem] text-gray-400">When a booking is checked in, it will appear here with a live timer</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                  {checkedInBookings.map((b) => (
                    <div key={b.booking_id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-[0_2px_12px_rgba(15,25,35,0.08)]">

                      {/* Card header */}
                      <div className="bg-navy px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-[42px] h-[42px] rounded-full bg-gold/20 border-[1.5px] border-gold flex items-center justify-center font-display text-[1.1rem] font-bold text-gold">
                            {b.guest_name?.charAt(0)}
                          </div>
                          <div>
                            <div className="text-[0.9rem] font-semibold text-white">{b.guest_name}</div>
                            <div className="text-[0.68rem] text-white/40 mt-px">Booking #{b.booking_id}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-600/20 border border-emerald-600 rounded-full px-2.5 py-0.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"
                            style={{ animation: "pulse-green 1.5s ease-in-out infinite" }}
                          />
                          <span className="text-[0.62rem] font-bold text-emerald-500 tracking-[1px]">LIVE</span>
                        </div>
                      </div>

                      {/* Live timer */}
                      <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-4 text-center">
                        <div className="text-[0.6rem] font-bold text-gray-400 tracking-[1.5px] uppercase mb-2">
                          Time Spent on Premises
                        </div>
                        <LiveTimer checkinTime={b.actual_checkin} />
                        <div className="text-[0.68rem] text-gray-500 mt-1.5">
                          Checked in: {new Date(b.actual_checkin).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="px-4 pt-3.5 pb-4">
                        {[
                          { label: "Room",               val: `${b.room_type}${b.room_number ? ` · #${b.room_number}` : ""}` },
                          { label: "Scheduled Check-in",  val: b.check_in_date?.slice(0, 10) },
                          { label: "Scheduled Check-out", val: b.check_out_date?.slice(0, 10) },
                          { label: "Guests",             val: `${b.guest_count || 1} person${(b.guest_count || 1) > 1 ? "s" : ""}` },
                          { label: "Room Charges",       val: `Rs.${Number(b.total_price).toLocaleString()}` },
                        ].map(({ label, val }) => (
                          <div key={label} className="flex justify-between items-center text-[0.78rem] py-1.5 border-b border-gray-100">
                            <span className="text-gray-400">{label}</span>
                            <span className="font-semibold text-navy">{val}</span>
                          </div>
                        ))}
                        <button
                          onClick={() => setSelectedBookingId(b.booking_id)}
                          className="w-full mt-3.5 py-2.5 bg-navy text-gold border-none rounded-lg text-[0.8rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-navy/90 transition-colors"
                        >
                          View Details & Checkout →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ROOMS ── */}
          {tab === "rooms" && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div className="font-display text-[1rem] font-semibold text-navy">
                  Room Management{" "}
                  <span className="text-[0.78rem] font-normal text-gray-400 ml-2">
                    ({allRooms.length} total · {allRooms.filter((r) => !r.is_available).length} blocked)
                  </span>
                </div>
                <button
                  onClick={() => setShowAddRoom(true)}
                  className="flex items-center gap-1.5 bg-navy text-gold border-none rounded-lg px-4 py-2 text-[0.82rem] font-bold cursor-pointer hover:bg-navy/90 transition-colors"
                >
                  ✚ Add New Room
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[560px]">
                  <thead>
                    <tr>
                      {["Room", "Type", "Price/Night", "Status", "Actions"].map((h) => (
                        <th key={h} className={thCls}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allRooms.map((r) => (
                      <tr
                        key={r.room_id}
                        className={`border-t border-gray-100 ${!r.is_available ? "bg-red-50/50" : ""}`}
                      >
                        <td className={`${tdCls} text-[0.85rem] font-bold text-navy`}>#{r.room_number || r.room_id}</td>
                        <td className={tdCls}>
                          <span className="bg-navy text-[#E8D5A3] px-2.5 py-0.5 rounded text-[0.65rem] font-bold tracking-[1px] uppercase">
                            {r.room_type}
                          </span>
                        </td>
                        <td className={`${tdCls} text-[0.85rem] font-bold text-navy`}>
                          Rs.{Number(r.price_per_night).toLocaleString()}
                        </td>
                        <td className={tdCls}>
                          <span className={`px-2.5 py-0.5 rounded text-[0.65rem] font-bold uppercase
                            ${r.is_available ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                            {r.is_available ? "Available" : "Blocked"}
                          </span>
                        </td>
                        <td className={tdCls}>
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => setEditRoom(r)}
                              className="px-2.5 py-1 rounded border-[1.5px] border-gold text-[#9A7A2E] bg-none text-[0.72rem] font-semibold cursor-pointer hover:bg-gold/10 transition-colors"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => toggleRoom(r.room_id, r.is_available)}
                              className={`px-2.5 py-1 rounded border-[1.5px] bg-none text-[0.72rem] font-semibold cursor-pointer transition-colors
                                ${r.is_available
                                  ? "border-red-600 text-red-600 hover:bg-red-50"
                                  : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                                }`}
                            >
                              {r.is_available ? "🚫 Block" : "✅ Unblock"}
                            </button>
                            {r.is_available && (
                              <button
                                onClick={() => { setBookingRoom(r); setTab("book"); }}
                                className="px-2.5 py-1 rounded bg-navy text-white border-none text-[0.72rem] font-semibold cursor-pointer hover:bg-navy/90 transition-colors"
                              >
                                Book
                              </button>
                            )}
                            <button
                              onClick={() => deleteRoom(r.room_id)}
                              className="px-2.5 py-1 rounded border-[1.5px] border-gray-400 text-gray-400 bg-none text-[0.72rem] font-semibold cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="font-display text-[1rem] font-semibold text-navy mb-5">
                Registered Users{" "}
                <span className="text-[0.78rem] font-normal text-gray-400 ml-2">({users.length} total)</span>
              </div>
              {users.length === 0 ? (
                <div className="text-center py-10 text-gray-400">No users found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[500px]">
                    <thead>
                      <tr>
                        {["#", "Name", "Email", "Role", "Joined", "Actions"].map((h) => (
                          <th key={h} className={thCls}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.user_id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className={`${tdCls} text-[0.75rem] text-gray-400`}>#{u.user_id}</td>
                          <td className={tdCls}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-[30px] h-[30px] rounded-full bg-navy flex items-center justify-center text-[#E8D5A3] text-[0.72rem] font-bold shrink-0">
                                {u.name?.charAt(0)}
                              </div>
                              <span className="text-[0.85rem] font-semibold text-navy">{u.name}</span>
                            </div>
                          </td>
                          <td className={`${tdCls} text-[0.8rem] text-gray-400`}>{u.email}</td>
                          <td className={tdCls}>
                            <span className={`px-2.5 py-0.5 rounded text-[0.65rem] font-bold uppercase
                              ${u.role === "admin"   ? "bg-navy text-[#E8D5A3]"
                              : u.role === "manager" ? "bg-blue-600 text-white"
                              :                        "bg-gray-100 text-gray-600"}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className={`${tdCls} text-[0.8rem] text-gray-400`}>{u.created_at?.slice(0, 10)}</td>
                          <td className={tdCls}>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setSelectedUserId(u.user_id)}
                                className="px-2.5 py-1 rounded bg-navy text-white border-none text-[0.72rem] font-semibold cursor-pointer hover:bg-navy/90 transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={() => setResetPasswordUser(u)}
                                className="px-2.5 py-1 rounded bg-none border-[1.5px] border-gold text-[#9A7A2E] text-[0.72rem] font-semibold cursor-pointer hover:bg-gold/10 transition-colors"
                              >
                                🔑 Reset
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── NEW BOOKING ── */}
          {tab === "book" && (
            <div>
              <div className="font-display text-[1rem] font-semibold text-navy mb-5">
                New Booking — Select a Room
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
                {rooms.filter((r) => r.is_available).map((r) => (
                  <div key={r.room_id} className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
                    <div className="h-[140px] overflow-hidden">
                      <img
                        src={r.image_url || "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500"}
                        alt={r.room_type}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="px-4 py-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="bg-navy text-[#E8D5A3] px-2 py-0.5 rounded text-[0.62rem] font-bold tracking-[1px] uppercase">
                          {r.room_type}
                        </span>
                        <span className="text-[0.72rem] text-gray-400">👥 {r.capacity || 2}</span>
                      </div>
                      <div className="font-display text-[0.95rem] font-semibold text-navy mb-0.5">
                        Room {r.room_number || r.room_id}
                      </div>
                      <div className="text-[0.78rem] text-gray-400 mb-3">
                        {r.description || "Premium hotel room"}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-display text-[1rem] font-semibold text-navy">
                            Rs.{Number(r.price_per_night).toLocaleString()}{" "}
                            <span className="text-[0.65rem] font-normal text-gray-400">/night</span>
                          </div>
                          <div className="text-[0.62rem] text-gray-400">+18% GST</div>
                        </div>
                        <button
                          onClick={() => setBookingRoom(r)}
                          className="bg-navy text-white border-none rounded-md px-3.5 py-1.5 text-[0.75rem] font-semibold cursor-pointer hover:bg-navy/90 transition-colors"
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

        </div>
      </div>

      {/* ── Modals ── */}
      {selectedUserId    && <UserDetailModal    userId={selectedUserId}        onClose={() => setSelectedUserId(null)}    showToast={showToast} />}
      {selectedBookingId && <BookingDetailModal bookingId={selectedBookingId} onClose={() => setSelectedBookingId(null)} showToast={showToast} onRefresh={fetchAll} />}
      {editRoom          && <EditRoomModal      room={editRoom}               onClose={() => setEditRoom(null)}           showToast={showToast} onRefresh={() => { fetchAll(); setEditRoom(null); }} />}
      {cancelBookingData && <CancelWarningModal booking={cancelBookingData}   onConfirm={() => confirmCancelBooking(cancelBookingData.booking_id)} onClose={() => setCancelBookingData(null)} />}
      {resetPasswordUser && <ResetPasswordModal user={resetPasswordUser}      onClose={() => setResetPasswordUser(null)} showToast={showToast} />}
      {showAddRoom       && <AddRoomModal       onClose={() => setShowAddRoom(false)} showToast={showToast} onRefresh={fetchAll} />}

      {/* Admin Booking Modal */}
      {bookingRoom && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-navy/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-[440px] shadow-[0_16px_48px_rgba(0,0,0,0.2)] overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <div className="font-display text-[1.1rem] font-semibold text-navy">
                Book {bookingRoom.room_type} — Room {bookingRoom.room_number || bookingRoom.room_id}
              </div>
              <button
                onClick={() => setBookingRoom(null)}
                className="w-[30px] h-[30px] rounded-full bg-gray-100 flex items-center justify-center border-none cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <XIcon size={14} color="#495057" />
              </button>
            </div>
            <AdminBookingForm
              room={bookingRoom}
              adminUser={adminUser}
              onClose={() => setBookingRoom(null)}
              showToast={showToast}
              onSuccess={() => { setBookingRoom(null); fetchAll(); }}
            />
          </div>
        </div>
      )}

    </div>
  );
}

function AdminBookingForm({
  room,
  adminUser,
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

  const nights =
    form.check_in_date && form.check_out_date
      ? Math.max(
          0,
          Math.ceil(
            (new Date(form.check_out_date) -
              new Date(form.check_in_date)) /
              86400000
          )
        )
      : 0;

  const basePrice = room.price_per_night * nights;
  const gst = Math.round(basePrice * GST_RATE * 100) / 100;
  const total = basePrice + gst;

  async function submit(e) {
    e.preventDefault();

    if (nights <= 0) {
      showToast("Invalid dates", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          user_id: adminUser.user_id,
          room_id: room.room_id,
          ...form,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      showToast(
        `Booking confirmed! ₹${Number(
          data.total_price
        ).toLocaleString("en-IN")}`,
        "success"
      );

      onSuccess();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="p-6">
      {/* Date Fields */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Check-in
          </label>

          <input
            type="date"
            required
            min={new Date().toISOString().split("T")[0]}
            value={form.check_in_date}
            onChange={(e) =>
              setForm({
                ...form,
                check_in_date: e.target.value,
              })
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Check-out
          </label>

          <input
            type="date"
            required
            min={
              form.check_in_date ||
              new Date().toISOString().split("T")[0]
            }
            value={form.check_out_date}
            onChange={(e) =>
              setForm({
                ...form,
                check_out_date: e.target.value,
              })
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-slate-900"
          />
        </div>
      </div>

      {/* Guest Count */}
      <div className="mb-4">
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Guests
        </label>

        <input
          type="number"
          min={1}
          max={room.capacity || 4}
          value={form.guest_count}
          onChange={(e) =>
            setForm({
              ...form,
              guest_count: +e.target.value,
            })
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-slate-900"
        />
      </div>

      {/* Price Summary */}
      {nights > 0 && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              ₹{Number(room.price_per_night).toLocaleString("en-IN")} ×{" "}
              {nights} night{nights > 1 ? "s" : ""}
            </span>

            <span className="font-semibold text-slate-900">
              ₹{basePrice.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">GST (18%)</span>

            <span className="font-semibold text-slate-900">
              ₹{gst.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="font-serif text-base font-semibold text-slate-900">
              Total
            </span>

            <span className="font-serif text-lg font-bold text-slate-900">
              ₹{Math.round(total).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CheckIcon size={16} />

        {loading ? "Confirming..." : "Confirm Booking"}
      </button>
    </form>
  );
}
