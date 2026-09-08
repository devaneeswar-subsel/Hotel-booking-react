import React, { useState, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  TrendingUpIcon,
  BedIcon,
  UsersIcon,
  BookingIcon,
  CreditCardIcon,
  CalendarIcon,
  CheckIcon,
  XIcon,
  UserIcon,
  SearchIcon,
  ArrowRightIcon,
  GridIcon,
  VehicleIcon,
  DownloadIcon,
} from "./Icons";
import VehicleCustomers from "./Components/VehicleCustomers";
import AdminBookingForUsers from "./AdminBookingForUsers";
import { getPaginationItems } from "./pagination";
import GuestCheckIn from "./GuestCheckIn";
import BookingCalendar from "./BookingCalendar";
import { printInvoicePdf } from "./invoicePdf";
import { createPortal } from "react-dom";
import ReportsTab from "./Components/ReportsTab";

const API = process.env.REACT_APP_API_URL;
const GST_RATE = 0.12;
function formatBookingId(booking) {
  const year = new Date(booking.created_at || Date.now()).getFullYear();
  return `${year}-${String(booking.booking_id).padStart(4, "0")}`;
}
function getBookingCreatedTime(booking) {
  const timestamp = new Date(booking.created_at || booking.createdAt || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
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
    "0",
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
function RowActionsMenu({ booking, onDetails, onCancel, onDelete }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const canCancel = booking.status === "confirmed" && !booking.actual_checkin;
  const canDelete = !(booking.actual_checkin && !booking.actual_checkout);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.right - 176, // 176px = menu width (w-44), right-aligned to button
      });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickAway(e) {
      const clickedButton = btnRef.current && btnRef.current.contains(e.target);
     const clickedMenu = menuRef.current && menuRef.current.contains(e.target);
     if (!clickedButton && !clickedMenu) setOpen(false);
    }
    // close on scroll too, since the menu position would go stale
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickAway);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex h-7 w-7 items-center justify-center rounded border-[1.5px] border-gray-200 text-gray-500 hover:bg-gray-50"
      >
        ⋯
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              zIndex: 9999,
            }}
            className="w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <button
              onClick={() => {
                setOpen(false);
                onDetails();
              }}
              className="block w-full px-3 py-2 text-left text-[0.78rem] hover:bg-gray-50"
            >
              Details
            </button>
            {canCancel && (
              <button
                onClick={() => {
                  setOpen(false);
                  onCancel();
                }}
                className="block w-full px-3 py-2 text-left text-[0.78rem] text-red-600 hover:bg-red-50"
              >
                Cancel booking
              </button>
            )}
            <button
              onClick={() => {
                if (canDelete) {
                  setOpen(false);
                  onDelete();
                }
              }}
              disabled={!canDelete}
              title={!canDelete ? "Record check-out before deleting" : ""}
              className="block w-full px-3 py-2 text-left text-[0.78rem] text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300"
            >
              Delete permanently
            </button>
          </div>,
          document.body,
        )}
    </>
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
          <linearGradient id="adminLineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={filled} fill="url(#adminLineGradient)" />
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

function DonutChart({ confirmed, cancelled, completed, size = 80 }) {
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

          <div className="font-body text-[1.5rem] font-semibold text-[#0F1923] leading-none">
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
          <Icon size={18} color={accent ? "#fff" : "#0F1923"} />
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

/* ── CANCEL WARNING MODAL ── */
function CancelWarningModal({ booking, onConfirm, onClose }) {
  const checkedIn = Boolean(booking.actual_checkin);

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
              #{formatBookingId(booking)} — {booking.guest_name}
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
                  booking.final_total || booking.total_price,
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
            {checkedIn
              ? "This guest has already checked in, so this booking cannot be cancelled."
              : "Are you sure you want to cancel this booking? The guest will need to be notified separately."}
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
              disabled={checkedIn}
              title={checkedIn ? "Checked-in bookings cannot be cancelled" : ""}
              className="flex-1 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
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
              val: `₹${Number(user.total_spent || 0).toLocaleString("en-IN")}`,
            },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl bg-gray-50 p-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {label}
              </div>

              <div className="text-sm font-semibold text-slate-900">{val}</div>
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
                        b.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : b.actual_checkout
                            ? "bg-blue-100 text-blue-700"
                            : b.actual_checkin
                              ? "bg-amber-100 text-amber-700"
                              : b.status === "confirmed"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {b.status === "cancelled"
                        ? b.status
                        : b.actual_checkout
                          ? "checked out"
                          : b.actual_checkin
                            ? "checked in"
                            : b.status}
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
                        {Number(b.final_total || b.total_price).toLocaleString(
                          "en-IN",
                        )}
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

/**
 * Uploads an image file to Cloudinary via the backend `/api/upload` endpoint
 * and returns the short secure_url.
 *
 * NOTE: the base64 string here is ONLY used as the transport format to send
 * the file to the backend. It is never stored in the database — the DB only
 * ever receives the short https://res.cloudinary.com/... URL. Storing base64
 * directly is what caused the MySQL "Data too long for column 'image_url'"
 * error (VARCHAR column vs ~100,000 character data URL).
 */
async function uploadToCloudinary(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Could not read the selected file"));
    reader.readAsDataURL(file);
  });

  const res = await apiFetch("/api/upload", {
    method: "POST",
    body: JSON.stringify({ image: base64 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Upload failed. Please try again.");
  }

  const data = await res.json();
  if (!data.url) throw new Error("Upload succeeded but no URL was returned");
  return data.url;
}

/* ── single image upload slot ── */
function ImageSlot({ index, value, onChange, isMain }) {
  const [mode, setMode] = useState("idle");
  const [urlInput, setUrlInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setUploadError("");
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
      setMode("idle");
    } catch (err) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
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
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragging(false);
          await handleFile(e.dataTransfer.files[0]);
        }}
      >
        {/* UPLOADING OVERLAY */}
        {uploading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/85">
            <svg
              className="animate-spin"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C9A84C"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <div className="text-[0.65rem] font-semibold text-gray-500">
              Uploading…
            </div>
          </div>
        )}

        {/* PREVIEW */}
        {value && (
          <>
            <img
              src={value}
              alt={slotLabel}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = "none";
              }}
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
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
              </button>
              <button
                onClick={() => onChange("")}
                title="Remove"
                className="w-7 h-7 flex items-center justify-center rounded-md bg-red-600/80 text-white border-none cursor-pointer hover:bg-red-600 transition-colors"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* EMPTY STATE */}
        {!value && mode === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2.5">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#CED4DA"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
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

      {/* Upload error */}
      {uploadError && (
        <div className="text-[0.6rem] font-semibold text-red-600 leading-tight">
          {uploadError}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          await handleFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ── EDIT ROOM MODAL — 5-slot image upload ── */
function EditRoomModal({ room, onClose, showToast, onRefresh }) {
  const [form, setForm] = useState({
    room_number: room.room_number || "",
    room_type: room.room_type || "",
    price_per_night: room.price_per_night || "",
    price_double: room.price_double ?? "",
    capacity: room.capacity || 2,
    description: room.description || "",
    is_available: room.is_available,
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
    // Safety net: never send a raw base64 data URL to the database. The
    // image_url column is a VARCHAR, so a data URL would trigger the MySQL
    // "Data too long for column 'image_url'" error.
    const badSlot = images.findIndex((img) => img && img.startsWith("data:"));
    if (badSlot !== -1) {
      return showToast(
        `Photo ${badSlot + 1} was not uploaded properly. Please remove it and upload again.`,
        "error",
      );
    }

    setLoading(true);
    const payload = {
      ...form,
      image_url: images[0],
      image2: images[1],
      image3: images[2],
      image4: images[3],
      image5: images[4],
    };
    try {
      const res = await apiFetch(`/api/admin/rooms/${room.room_id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(data.error || "Update failed", "error");
      showToast("Room updated!", "success");
      onRefresh();
      onClose();
    } catch (err) {
      showToast(err.message || "Network error", "error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 rounded-md border-[1.5px] border-gray-200 text-[0.85rem] text-gray-900 box-border focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/40 transition";
  const labelCls =
    "block text-[0.62rem] font-bold text-gray-400 mb-1 tracking-[0.8px] uppercase";

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
              <ImageSlot
                index={0}
                value={images[0]}
                onChange={(v) => setImage(0, v)}
                isMain={true}
              />
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
              JPG, PNG, WebP supported. Files are uploaded to secure cloud
              storage and only the image link is saved.
            </div>
          </div>

          {/* Room Number + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Room Number</label>
              <input
                className={inputCls}
                value={form.room_number}
                onChange={(e) =>
                  setForm({ ...form, room_number: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Room Type</label>
              <select
                className={inputCls}
                value={form.room_type}
                onChange={(e) =>
                  setForm({ ...form, room_type: e.target.value })
                }
              >
                {["Deluxe Room", "Suite Room", "Suite with Balcony"].map(
                  (t) => (
                    <option key={t}>{t}</option>
                  ),
                )}
              </select>
            </div>
          </div>

          {/* Price + Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price / Night — 1 Guest (₹)</label>
              <input
                className={inputCls}
                type="number"
                value={form.price_per_night}
                onChange={(e) =>
                  setForm({ ...form, price_per_night: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Price / Night — 2+ Guests (₹)</label>
              <input
                className={inputCls}
                type="number"
                placeholder="Leave blank for same rate"
                value={form.price_double}
                onChange={(e) =>
                  setForm({ ...form, price_double: e.target.value })
                }
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
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          {/* Status toggle */}
          <div className="flex items-center gap-2.5">
            <span className={`${labelCls} mb-0`}>Status:</span>
            <button
              onClick={() =>
                setForm({ ...form, is_available: form.is_available ? 0 : 1 })
              }
              className={`px-3.5 py-1 rounded-md text-[0.78rem] font-bold border-[1.5px] cursor-pointer transition-colors
                ${
                  form.is_available
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
              ${
                loading
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
    room_number: "",
    room_type: "Deluxe Room",
    price_per_night: "",
    price_double: "",
    capacity: 2,
    description: "",
    image_url: "",
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

  const inputCls =
    "w-full px-3 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[0.85rem] text-gray-900 box-border outline-none transition-colors duration-200 focus:border-gold focus:ring-2 focus:ring-gold/15";
  const labelCls =
    "block text-[0.62rem] font-bold text-gray-400 mb-1.5 tracking-[0.8px] uppercase";

  const roomTypes = ["Deluxe Room", "Suite Room", "Suite with Balcony"];
  const typeColors = {
    "Deluxe Room": {
      border: "border-gold",
      bg: "bg-gold",
      text: "text-gold",
    },
    "Suite Room": { border: "border-gold", bg: "bg-gold", text: "text-gold" },
    "Suite with Balcony": {
      border: "border-gold",
      bg: "bg-gold",
      text: "text-gold",
    },
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
                      ${
                        active
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
                onChange={(e) =>
                  setForm({ ...form, room_number: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelCls}>Price / Night — 1 Guest (₹) *</label>
              <input
                className={inputCls}
                type="number"
                placeholder="e.g. 2000"
                value={form.price_per_night}
                onChange={(e) =>
                  setForm({ ...form, price_per_night: e.target.value })
                }
              />
            </div>
          </div>

          {/* Double occupancy rate */}
          <div>
            <label className={labelCls}>Price / Night — 2+ Guests (₹)</label>
            <input
              className={inputCls}
              type="number"
              placeholder="e.g. 2300 — leave blank to charge the same rate"
              value={form.price_double}
              onChange={(e) =>
                setForm({ ...form, price_double: e.target.value })
              }
            />
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
                    ${
                      form.capacity === n
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
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
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
              {/* Show BOTH occupancy rates. Previewing only price_per_night
                  hid what a 2-guest stay would actually cost. */}
              {[
                {
                  label: "1 guest / night",
                  val: `Rs.${Number(form.price_per_night || 0).toLocaleString()}`,
                },
                {
                  label: "GST (12%)",
                  val: `Rs.${Math.round(Number(form.price_per_night || 0) * GST_RATE).toLocaleString()}`,
                },
                {
                  label: "Guest pays — 1 guest",
                  val: `Rs.${Math.round(Number(form.price_per_night || 0) * (1 + GST_RATE)).toLocaleString()}`,
                  strong: true,
                },
                ...(Number(form.price_double) > 0
                  ? [
                      {
                        label: "2+ guests / night",
                        val: `Rs.${Number(form.price_double).toLocaleString()}`,
                      },
                      {
                        label: "GST (12%)",
                        val: `Rs.${Math.round(Number(form.price_double) * GST_RATE).toLocaleString()}`,
                      },
                      {
                        label: "Guest pays — 2+ guests",
                        val: `Rs.${Math.round(Number(form.price_double) * (1 + GST_RATE)).toLocaleString()}`,
                        strong: true,
                      },
                    ]
                  : []),
              ].map(({ label, val, strong }) => (
                <div
                  key={label + val}
                  className={`flex justify-between text-[0.82rem] mb-1 ${
                    strong ? "border-t border-gray-200 pt-1.5 mt-1" : ""
                  }`}
                >
                  <span className={strong ? "font-semibold text-navy" : "text-gray-400"}>
                    {label}
                  </span>
                  <span className={strong ? "font-bold text-navy" : "font-semibold"}>
                    {val}
                  </span>
                </div>
              ))}
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
              ${
                loading
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
    if (password !== confirm)
      return showToast("Passwords don't match", "error");
    setLoading(true);
    try {
      const res = await apiFetch(
        `/api/admin/users/${user.user_id}/reset-password`,
        {
          method: "PATCH",
          body: JSON.stringify({ new_password: password }),
        },
      );
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

  const inputCls =
    "w-full px-3 py-2.5 rounded-md border-[1.5px] border-gray-200 text-[0.875rem] box-border focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/15 transition-colors";
  const labelCls =
    "block text-[0.62rem] font-bold text-gray-400 mb-1.5 tracking-[0.8px] uppercase";

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
function RoomBlockedDatesModal({ room, onClose, showToast, onRefresh }) {
  const [blockedDates, setBlockedDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // why the room is being held
  const [reason, setReason] = useState("maintenance");
  const [note, setNote] = useState("");
  const [bulk, setBulk] = useState({
    guest_name: "",
    phone: "",
    email: "",
    guest_count: 1,
    total_amount: "",
  });

  useEffect(() => {
    let active = true;
    apiFetch(`/api/rooms/${room.room_id}/blocked-dates`)
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok) throw new Error(data.error || "Unable to load blocked dates");
        if (active) setBlockedDates(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) showToast(err.message, "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [room.room_id, showToast]);

  // the API returns { blocked_date, block_reason, block_note, booking_id }
  const blockedDateSet = new Set(
    blockedDates.map((b) => (typeof b === "string" ? b : b.blocked_date)),
  );
  const reasonByDate = new Map(
    blockedDates
      .filter((b) => typeof b !== "string")
      .map((b) => [b.blocked_date, b]),
  );
  const selectedDateKeys = selectedDates.map((date) => formatLocalDate(date));

  function toggleDate(date) {
    const dateKey = formatLocalDate(date);
    setSelectedDates((current) =>
      current.some((selectedDate) => formatLocalDate(selectedDate) === dateKey)
        ? current.filter((selectedDate) => formatLocalDate(selectedDate) !== dateKey)
        : [...current, date],
    );
  }

  async function saveDates(action) {
    if (!selectedDateKeys.length) return;
    setSaving(true);
    try {
      const payload =
        action === "block"
          ? {
              dates: selectedDateKeys,
              reason,
              note: note.trim() || null,
              ...(reason === "bulk"
                ? {
                    guest_name: bulk.guest_name.trim(),
                    phone: bulk.phone.trim() || null,
                    email: bulk.email.trim() || null,
                    guest_count: Number(bulk.guest_count) || 1,
                    total_amount: bulk.total_amount,
                  }
                : {}),
            }
          : { dates: selectedDateKeys };

      const res = await apiFetch(`/api/admin/rooms/${room.room_id}/blocked-dates`, {
        method: action === "block" ? "POST" : "DELETE",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update blocked dates");
      showToast(data.message || "Dates updated", "success");
      if (action === "block") {
        setNote("");
        setBulk({
          guest_name: "",
          phone: "",
          email: "",
          guest_count: 1,
          total_amount: "",
        });
      }
      setSelectedDates([]);
      const refreshed = await apiFetch(`/api/rooms/${room.room_id}/blocked-dates`);
      const refreshedData = await refreshed.json();
      if (refreshed.ok) setBlockedDates(Array.isArray(refreshedData) ? refreshedData : []);
      onRefresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-[900px] overflow-y-auto rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between bg-navy px-6 py-5">
          <div>
            <div className="font-display text-[1rem] font-semibold text-white">
              Room {room.room_number || room.room_id} — Manage Room Availability
            </div>
            <div className="mt-0.5 text-[0.72rem] text-white/50">{room.room_type}</div>
          </div>
          <button
            onClick={onClose}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <XIcon size={13} color="#fff" />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading blocked dates...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
              {/* ── left: pick the dates ── */}
              <div>
              <div className="flex justify-center">
                <DatePicker
                  inline
                  selected={selectedDates[selectedDates.length - 1] || null}
                  onChange={toggleDate}
                  dayClassName={(date) => {
                    const dateKey = formatLocalDate(date);
                    const classes = [];
                    if (blockedDateSet.has(dateKey)) classes.push("vv-room-date-blocked");
                    if (selectedDateKeys.includes(dateKey)) classes.push("vv-room-date-selected");
                    return classes.join(" ") || undefined;
                  }}
                  calendarClassName="vv-calendar"
                />
              </div>
              <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-[0.72rem] text-gray-500">
                <span className="font-semibold text-gray-600">Selected:</span>{" "}
                {selectedDateKeys.length
                  ? `${selectedDateKeys.length} night${
                      selectedDateKeys.length === 1 ? "" : "s"
                    } — ${selectedDateKeys.join(", ")}`
                  : "None"}
              </div>
              </div>

              {/* ── right: why, and who for ── */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[0.68rem] font-semibold text-gray-500">
                    Reason for blocking
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[0.82rem] text-navy outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="cleaning">Room Cleaning</option>
                    <option value="service">Service</option>
                    <option value="bulk">Bulk Booking</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {reason === "bulk" ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <div className="mb-3 flex items-start gap-2">
                      <span className="mt-[2px] text-amber-500">●</span>
                      <p className="m-0 text-[0.74rem] leading-relaxed text-amber-800">
                        A confirmed booking will be created for these nights and
                        listed in the Bookings tab, marked{" "}
                        <strong>Bulk Booking</strong>.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[0.68rem] font-semibold text-gray-500">
                          Guest or company name{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={bulk.guest_name}
                          onChange={(e) =>
                            setBulk({ ...bulk, guest_name: e.target.value })
                          }
                          placeholder="e.g. Aathi / Sunrise Textiles"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[0.82rem] text-navy outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[0.68rem] font-semibold text-gray-500">Phone number</label>
                          <input
                            value={bulk.phone}
                            onChange={(e) =>
                              setBulk({ ...bulk, phone: e.target.value })
                            }
                            placeholder="10-digit mobile"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[0.82rem] text-navy outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[0.68rem] font-semibold text-gray-500">Number of guests</label>
                          <input
                            type="number"
                            min={1}
                            value={bulk.guest_count}
                            onChange={(e) =>
                              setBulk({ ...bulk, guest_count: e.target.value })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[0.82rem] text-navy outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[0.68rem] font-semibold text-gray-500">Email address</label>
                        <input
                          type="email"
                          value={bulk.email}
                          onChange={(e) =>
                            setBulk({ ...bulk, email: e.target.value })
                          }
                          placeholder="Optional — used to send the invoice"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[0.82rem] text-navy outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[0.68rem] font-semibold text-gray-500">
                          Agreed room amount (before GST)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={bulk.total_amount}
                          onChange={(e) =>
                            setBulk({ ...bulk, total_amount: e.target.value })
                          }
                          placeholder="Leave blank to use the room tariff"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[0.82rem] text-navy outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10"
                        />
                        <p className="mt-1 text-[0.68rem] text-amber-700">
                          12% GST is added on top. Leave blank to charge the
                          normal tariff for the selected nights.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-[0.68rem] font-semibold text-gray-500">Note (optional)</label>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. AC repair, deep cleaning"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[0.82rem] text-navy outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/10"
                    />
                  </div>
                )}

                {/* what will actually be created */}
                {reason === "bulk" && selectedDateKeys.length > 0 && (
                  <div className="rounded-xl border border-navy/15 bg-navy/[0.03] p-3">
                    <div className="mb-2 text-[0.65rem] font-bold uppercase tracking-[1px] text-gray-400">
                      Booking summary
                    </div>
                    {[
                      ["Guest", bulk.guest_name.trim() || "—"],
                      ["Room", `${room.room_type} · ${room.room_number || room.room_id}`],
                      ["Nights", selectedDateKeys.length],
                      ["Check-in", selectedDateKeys.slice().sort()[0]],
                      [
                        "Check-out",
                        (() => {
                          const last = new Date(
                            selectedDateKeys.slice().sort().pop(),
                          );
                          last.setDate(last.getDate() + 1);
                          return formatLocalDate(last);
                        })(),
                      ],
                      ["Guests", bulk.guest_count || 1],
                      [
                        "Room amount",
                        bulk.total_amount
                          ? `Rs.${Number(bulk.total_amount).toLocaleString("en-IN")}`
                          : "Room tariff",
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between border-t border-gray-100 py-1 text-[0.76rem] first:border-t-0"
                      >
                        <span className="text-gray-400">{label}</span>
                        <span className="font-semibold text-navy">{value}</span>
                      </div>
                    ))}
                    <p className="mt-2 text-[0.68rem] text-gray-500">
                      12% GST is added. Payment stays pending until collected
                      at check-in.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 p-3">
                  <div className="text-[0.65rem] font-bold uppercase tracking-[1px] text-gray-400">
                    Currently blocked dates
                  </div>
                  {blockedDates.length ? (
                    <ul className="mt-2 max-h-[150px] list-none space-y-1 overflow-y-auto p-0">
                      {blockedDates.map((b) => {
                        const date =
                          typeof b === "string" ? b : b.blocked_date;
                        const info = reasonByDate.get(date);
                        return (
                          <li
                            key={date}
                            className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1 text-[0.76rem]"
                          >
                            <span className="font-semibold text-gray-700">
                              {date}
                            </span>
                            <span className="text-[0.7rem] text-gray-500">
                              {info?.block_reason || "Blocked"}
                              {info?.block_note ? ` · ${info.block_note}` : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mt-1 text-[0.8rem] text-gray-500">
                      No dates blocked
                    </div>
                  )}
                </div>
              </div>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-gray-200 px-6 py-4">
          <button
            onClick={() => saveDates("unblock")}
            disabled={saving || loading || !selectedDates.length}
            className="flex-1 rounded-lg border-[1.5px] border-emerald-600 px-3 py-2.5 text-[0.78rem] font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Unblock Selected Dates
          </button>
          <button
            onClick={() => {
              if (reason === "bulk") {
                const nights = selectedDateKeys.length;
                const ok = window.confirm(
                  `Create a bulk booking for ${bulk.guest_name.trim()}?\n\n` +
                    `Room ${room.room_number || room.room_id} · ${nights} night${
                      nights === 1 ? "" : "s"
                    }\n\n` +
                    `This will appear in the Bookings tab marked as Bulk Booking, ` +
                    `and the room will be unavailable on those dates.`,
                );
                if (!ok) return;
              }
              saveDates("block");
            }}
            disabled={
              saving ||
              loading ||
              !selectedDates.length ||
              (reason === "bulk" && !bulk.guest_name.trim())
            }
            className="flex-1 rounded-lg bg-navy px-3 py-2.5 text-[0.78rem] font-semibold text-gold transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving
              ? "Saving..."
              : reason === "bulk"
                ? "Confirm Bulk Booking"
                : "Block Selected Dates"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-full rounded-lg border-[1.5px] border-gray-200 px-3 py-2.5 text-[0.78rem] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/*═════════════════════════════════════════════════════════
   MAIN ADMIN DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard({
  adminUser,
  onClose,
  onLogout,
  showToast,
  fullPage = false,
}) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [roomAvailabilityRoom, setRoomAvailabilityRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [editRoom, setEditRoom] = useState(null);
  const [cancelBookingData, setCancelBookingData] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [bookingPage, setBookingPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 10;
  const [bookingFilter, setBookingFilter] = useState("recent"); // recent | week | month | custom | checkedin
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // Overview panel: "recent" table or "calendar" view
  const [overviewView, setOverviewView] = useState("recent");

  async function handleAdminLogout() {
    if (!window.confirm("Log out of the admin portal?")) return;

    if (onLogout) {
      // parent (App.js) owns the session — let it clear state and show login
      onLogout();
      return;
    }

    // no parent handler wired up: clear the cookie ourselves and hard reload,
    // which drops all client state and sends us back to the logged-out site
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      /* cookie may already be gone — reload regardless */
    }
    window.location.href = "/";
  }

  const fetchAll = () => {
    setRefreshing(true);
    Promise.all([
      apiFetch("/api/admin/stats").then((r) => r.json()),
      apiFetch("/api/admin/bookings").then((r) => r.json()),
      apiFetch("/api/admin/rooms").then((r) => r.json()),
      apiFetch("/api/rooms").then((r) => r.json()),
      apiFetch("/api/admin/users")
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([s, b, allR, r, u]) => {
        setStats(s);
        setBookings(Array.isArray(b) ? b : []);
        setAllRooms(Array.isArray(allR) ? allR : []);
        setRooms(Array.isArray(r) ? r : []);
        setUsers(Array.isArray(u) ? u : []);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const getPaginatedData = (data, page) =>
    data.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const userTotalPages = Math.ceil(users.length / itemsPerPage);

  const paginatedUsers = getPaginatedData(users, userPage);
  async function confirmCancelBooking(id) {
    const bookingToCancel =
      cancelBookingData ||
      bookings.find((booking) => booking.booking_id === id);
    if (bookingToCancel?.actual_checkin) {
      showToast("Checked-in bookings cannot be cancelled", "error");
      setCancelBookingData(null);
      return;
    }

    try {
      const res = await apiFetch(`/api/bookings/${id}/cancel`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookings((b) =>
        b.map((x) => (x.booking_id === id ? { ...x, status: "cancelled" } : x)),
      );
      showToast("Booking cancelled", "success");
      setCancelBookingData(null);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function deleteBooking(id, booking) {
    const isCancelled = booking?.status === "cancelled";
    const amount = Number(booking?.final_total || booking?.total_price || 0);
    const warning = isCancelled
      ? "Permanently delete this cancelled booking record?"
      : `Permanently delete this booking?\n\nRs.${Math.round(
          amount,
        ).toLocaleString(
          "en-IN",
        )} will be removed from total revenue. This cannot be undone.`;

    if (!window.confirm(warning)) return;
    try {
      const res = await apiFetch(`/api/admin/bookings/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookings((b) => b.filter((x) => x.booking_id !== id));
      // reload so the revenue and booking counts reflect the deletion
      fetchAll();
      showToast(
        data.removedRevenue > 0
          ? `Booking deleted — Rs.${Math.round(
              data.removedRevenue,
            ).toLocaleString("en-IN")} removed from revenue`
          : "Booking deleted",
        "success",
      );
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function deleteRoom(roomId) {
    if (!window.confirm("Permanently delete this room? This cannot be undone."))
      return;
    try {
      const res = await apiFetch(`/api/admin/rooms/${roomId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAllRooms((r) => r.filter((x) => x.room_id !== roomId));
      showToast("Room deleted successfully", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function toggleRoom(roomId, current) {
    try {
      await apiFetch(`/api/admin/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_available: current ? 0 : 1 }),
      });
      setAllRooms((r) =>
        r.map((x) =>
          x.room_id === roomId ? { ...x, is_available: current ? 0 : 1 } : x,
        ),
      );
      showToast(`Room ${current ? "blocked" : "unblocked"}`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  }
  function getFilterRange(filter) {
    const now = new Date();
    if (filter === "week") {
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMon);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { start: monday, end: sunday };
    }
    if (filter === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return { start, end };
    }
    if (filter === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    return null;
  }
  const dateKey = (value = new Date()) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const paidBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed",
  );
  const derivedRevenue = paidBookings.reduce(
    (sum, b) => sum + Number(b.final_total || b.total_price || 0),
    0,
  );
  const derivedStats = {
    total_bookings: bookings.length || Number(stats?.total_bookings || 0),
    total_users: users.length || Number(stats?.total_users || 0),
    total_revenue: derivedRevenue || Number(stats?.total_revenue || 0),
  };
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
  const usersLast7 = Array(7)
    .fill(0)
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = dateKey(d);
      return {
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
        value: users.filter((u) => dateKey(u.created_at) === key).length,
      };
    });

  const revenueByRoom = Object.entries(
    paidBookings.reduce((acc, booking) => {
      const key = booking.room_type || "Room";
      acc[key] =
        (acc[key] || 0) +
        Number(booking.final_total || booking.total_price || 0);
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const roomAvailabilityData = [
    {
      label: "Open",
      value: allRooms.filter((r) => Number(r.is_available) !== 0).length,
    },
    {
      label: "Blocked",
      value: allRooms.filter((r) => Number(r.is_available) === 0).length,
    },
  ];
  const adminRecentBookings = [...bookings]
    .sort(
      (a, b) =>
        new Date(b.created_at || b.check_in_date || 0) -
        new Date(a.created_at || a.check_in_date || 0),
    )
    .slice(0, 5);

  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const recentCutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const recentBookings = bookings
    .filter((booking) => getBookingCreatedTime(booking) >= recentCutoff)
    .sort(
      (a, b) =>
        getBookingCreatedTime(b) - getBookingCreatedTime(a) ||
        Number(b.booking_id || 0) - Number(a.booking_id || 0),
    );
  const filterRange = getFilterRange(bookingFilter);
  const dateAndStatusFiltered =
    bookingFilter === "recent"
      ? recentBookings
      : bookings.filter((b) => {
          if (bookingFilter === "checkedin") {
            return Boolean(b.actual_checkin) && !b.actual_checkout;
          }
          if (!filterRange) return true;
          const checkIn = new Date(b.check_in_date);
          return checkIn >= filterRange.start && checkIn <= filterRange.end;
        });
  const filteredBookings = dateAndStatusFiltered.filter(
    (b) =>
      !searchTerm ||
      b.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.room_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  const paginatedBookings = getPaginatedData(filteredBookings, bookingPage);
  const checkedInBookings = bookings.filter(
    (b) => b.actual_checkin && !b.actual_checkout && b.status === "confirmed",
  );
  const [showMoreNav, setShowMoreNav] = useState(false);
  const primaryTabs = [
    { id: "overview", label: "Overview", icon: GridIcon },
    { id: "book", label: "New Booking", icon: CalendarIcon },
    { id: "bookings", label: "Bookings", icon: BookingIcon },
    { id: "rooms", label: "Rooms", icon: BedIcon },
    { id: "users", label: "Users", icon: UsersIcon },
    { id: "reports", label: "Reports", icon: DownloadIcon },
  ];

  const secondaryTabs = [
    { id: "vehicles", label: "Vehicle Customers", icon: BookingIcon },
    { id: "checkins", label: "Check-in Details", icon: BedIcon },
  ];

  const tabs = [...primaryTabs, ...secondaryTabs]; // keep this — Topbar label lookup still needs every id
  useEffect(() => {
    setBookingPage(1);
  }, [bookingFilter, customStart, customEnd]);

  useEffect(() => {
    setBookingPage((page) =>
      Math.min(Math.max(page, 1), Math.max(totalPages, 1)),
    );
  }, [totalPages]);

  useEffect(() => {
    setUserPage((page) =>
      Math.min(Math.max(page, 1), Math.max(userTotalPages, 1)),
    );
  }, [userTotalPages]);
  // ── Shared cell classes ──────────────────────────────────────────────────
  const thCls =
    "px-3.5 py-2.5 text-left text-[0.62rem] font-bold text-gray-400 uppercase tracking-[1px] border-b-[1.5px] border-gray-200 bg-gray-50 whitespace-nowrap";
  const tdCls = "px-3.5 py-[11px]";

  // ── Status badge helper ──────────────────────────────────────────────────
  function StatusBadge({ status, booking }) {
    // rooms held for a group show as a bulk booking, not a normal stay
    if (booking?.booking_source === "BULK_BOOKING" && status !== "cancelled") {
      return (
        <span className="inline-block rounded bg-amber-50 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase text-amber-700">
          bulk booking
        </span>
      );
    }

    // "confirmed" becomes "checked in" / "checked out" once the stay starts
    let label = status;
    if (booking && booking.status !== "cancelled") {
      if (booking.actual_checkout) label = "checked out";
      else if (booking.actual_checkin) label = "checked in";
    }

    const map = {
      confirmed: "bg-emerald-50 text-emerald-600",
      "checked in": "bg-amber-50 text-amber-700",
      "checked out": "bg-blue-50 text-blue-600",
      cancelled: "bg-red-50 text-red-600",
      completed: "bg-blue-50 text-blue-600",
    };
    return (
      <span
        className={`inline-block whitespace-nowrap px-2.5 py-0.5 rounded text-[0.62rem] font-bold uppercase ${map[label] ?? map.completed}`}
      >
        {label}
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
        {primaryTabs.map(({ id, label, icon: TabIcon }) => (
          <div
            key={id}
            onClick={() => {
              setBookingRoom(null);
              setSelectedBookingId(null);
              setTab(id);
              setSidebarOpen(false);
            }}
            className={`flex items-center gap-2.5 px-5 py-[11px] cursor-pointer text-[0.82rem] transition-all duration-[180ms] border-l-[2.5px]
      ${
        tab === id
          ? "bg-gold/[0.12] border-gold text-gold font-semibold"
          : "border-transparent text-white/50 font-normal hover:text-white/70 hover:bg-white/[0.04]"
      }`}
          >
            <TabIcon
              size={15}
              color={tab === id ? "#C9A84C" : "rgba(255,255,255,0.4)"}
            />
            {label}
          </div>
        ))}

        {/* More — collapsed by default */}
        <div
          onClick={() => setShowMoreNav((v) => !v)}
          className="flex items-center gap-2.5 px-5 py-[11px] cursor-pointer text-[0.72rem] font-semibold uppercase tracking-wide text-white/30 hover:text-white/50 transition-colors"
        >
          <span
            className={`inline-block transition-transform duration-150 ${showMoreNav ? "rotate-90" : ""}`}
          >
            ▸
          </span>
          {showMoreNav ? "Less" : "More"}
        </div>

        {showMoreNav &&
          secondaryTabs.map(({ id, label, icon: TabIcon }) => (
            <div
              key={id}
              onClick={() => {
                setBookingRoom(null);
                setSelectedBookingId(null);
                setTab(id);
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-2.5 px-5 py-[11px] cursor-pointer text-[0.82rem] transition-all duration-[180ms] border-l-[2.5px]
        ${
          tab === id
            ? "bg-gold/[0.12] border-gold text-gold font-semibold"
            : "border-transparent text-white/50 font-normal hover:text-white/70 hover:bg-white/[0.04]"
        }`}
            >
              <TabIcon
                size={15}
                color={tab === id ? "#C9A84C" : "rgba(255,255,255,0.4)"}
              />
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
            <div className="text-[0.78rem] font-semibold text-white">
              {adminUser?.name}
            </div>
            <div className="text-[0.65rem] text-white/35 tracking-[0.5px] uppercase">
              Administrator
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-white/60 text-[0.78rem] cursor-pointer hover:bg-white/10 transition-colors"
        >
          <ArrowRightIcon size={13} color="rgba(255,255,255,0.5)" /> Back to
          Site
        </button>
        <button
          onClick={handleAdminLogout}
          className="mt-2 w-full flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-red-300 text-[0.78rem] font-semibold cursor-pointer hover:bg-red-500/20 transition-colors"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <path d="M21 12H9" />
          </svg>
          Logout
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
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
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
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
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
                <StatCard
                  label="Total Rooms"
                  value={allRooms.length}
                  icon={BedIcon}
                  accent="#0F1923"
                  chartData={roomAvailabilityData}
                  chartType="bar"
                />
                <StatCard
                  label="Total Bookings"
                  value={derivedStats.total_bookings}
                  icon={BookingIcon}
                  accent="#2471A3"
                  chartData={last7}
                  chartType="bar"
                />
                <StatCard
                  label="Registered Users"
                  value={derivedStats.total_users}
                  icon={UsersIcon}
                  accent="#2D9A6E"
                  chartData={usersLast7}
                  chartType="line"
                />
                <StatCard
                  label="Total Revenue"
                  value={`Rs.${Number(derivedStats.total_revenue).toLocaleString()}`}
                  icon={CreditCardIcon}
                  accent="#C9A84C"
                  chartData={revenueByRoom}
                  chartType="bar"
                />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Bookings this week */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[0.65rem] tracking-[1.5px] uppercase text-gray-400 mb-0.5">
                        Bookings This Week
                      </div>
                      <div className="font-body text-[1.4rem] font-semibold text-navy">
                        {last7.reduce((s, d) => s + d.value, 0)}
                      </div>
                    </div>
                    <TrendingUpIcon size={18} color="#C9A84C" />
                  </div>
                  <LineChart data={last7} color="#C9A84C" height={80} />
                  <div className="flex justify-between mt-1.5">
                    {last7.map((d, i) => (
                      <div
                        key={i}
                        className="text-[0.6rem] text-gray-400 text-center"
                      >
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue by room */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[0.65rem] tracking-[1.5px] uppercase text-gray-400 mb-0.5">
                        Revenue by Room
                      </div>
                      <div className="font-body text-[1.4rem] font-semibold text-navy">
                        Rs.{Number(derivedStats.total_revenue).toLocaleString()}
                      </div>
                    </div>
                    <CreditCardIcon size={18} color="#C9A84C" />
                  </div>
                  {revenueByRoom.length > 0 ? (
                    <>
                      <BarChart
                        data={revenueByRoom}
                        color="#0F1923"
                        height={72}
                      />
                      <div className="flex justify-between mt-1.5">
                        {revenueByRoom.map((d, i) => (
                          <div
                            key={i}
                            className="text-[0.58rem] text-gray-400 text-center"
                          >
                            {d.label.slice(0, 3)}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-[0.82rem]">
                      No revenue data yet
                    </div>
                  )}
                </div>

                {/* Donut */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-[0_1px_4px_rgba(15,25,35,0.05)] flex flex-col items-center justify-center gap-4">
                  <div className="text-[0.65rem] tracking-[1.5px] uppercase text-gray-400">
                    Booking Status
                  </div>
                  <DonutChart
                    confirmed={confirmed}
                    cancelled={cancelled}
                    completed={completed}
                    size={100}
                  />
                  <div className="flex flex-col gap-2 w-full">
                    {[
                      { label: "Confirmed", val: confirmed, color: "#2D9A6E" },
                      { label: "Cancelled", val: cancelled, color: "#C0392B" },
                      { label: "Completed", val: completed, color: "#2471A3" },
                    ].map(({ label, val, color }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between text-[0.78rem]"
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: color }}
                          />
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
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="font-display text-[1rem] font-semibold text-navy">
                    {overviewView === "recent"
                      ? "Recent Bookings"
                      : "Booking Calendar"}
                  </div>

                  <div className="flex items-center gap-3">
                    {overviewView === "recent" && (
                      <button
                        onClick={() => setTab("bookings")}
                        className="flex items-center gap-1 bg-none border-none text-gold text-[0.78rem] font-semibold cursor-pointer"
                      >
                        View all <ArrowRightIcon size={12} color="#C9A84C" />
                      </button>
                    )}

                    <div className="relative">
                      <select
                        value={overviewView}
                        onChange={(e) => setOverviewView(e.target.value)}
                        className="cursor-pointer appearance-none rounded-lg border-[1.5px] border-gold bg-white py-2 pl-9 pr-8 text-[0.82rem] font-semibold text-navy outline-none"
                      >
                        <option value="recent">Recent Bookings</option>
                        <option value="calendar">Booking Calendar</option>
                      </select>
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                        <CalendarIcon size={14} color="#C9A84C" />
                      </span>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.7rem] text-navy">
                        ▾
                      </span>
                    </div>
                  </div>
                </div>

                {overviewView === "calendar" && (
                  <BookingCalendar
                    bookings={bookings}
                    onSelectBooking={(id) => setSelectedBookingId(id)}
                  />
                )}
                {overviewView === "recent" && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[600px]">
                      <thead>
                        <tr>
                          {[
                            "#",
                            "Guest",
                            "Room",
                            "Check-in",
                            "Check-out",
                            "Actual Time",
                            "Total",
                            "Status",
                            "Actions",
                          ].map((h) => (
                            <th key={h} className={thCls}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBookings.map((b) => (
                          <tr
                            key={b.booking_id}
                            className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td
                              className={`${tdCls} text-[0.75rem] text-gray-400`}
                            >
                              {formatBookingId(b)}
                            </td>

                            <td
                              className={`${tdCls} text-[0.85rem] font-semibold text-navy`}
                            >
                              <div
                                className="flex max-w-[170px] items-center gap-1.5"
                                title={b.guest_name}
                              >
                                <span className="truncate">{b.guest_name}</span>
                                {b.vehicle_type &&
                                  b.vehicle_type !== "none" && (
                                    <span
                                      title={`Vehicle booked · ${b.vehicle_type}`}
                                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C9A84C]/15 ${
                                        b.status === "cancelled"
                                          ? "opacity-40"
                                          : ""
                                      }`}
                                    >
                                      <VehicleIcon size={12} color="#9A7A2E" />
                                    </span>
                                  )}
                              </div>
                            </td>

                            <td className={tdCls}>
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-[0.72rem] font-semibold">
                                {b.room_type}
                              </span>
                            </td>

                            <td
                              className={`${tdCls} text-[0.82rem] text-gray-600 whitespace-nowrap`}
                            >
                              {b.check_in_date?.slice(0, 10)}
                            </td>

                            <td
                              className={`${tdCls} text-[0.82rem] text-gray-600 whitespace-nowrap`}
                            >
                              {b.check_out_date?.slice(0, 10)}
                            </td>

                            <td className={`${tdCls} align-middle`}>
                              {b.actual_checkin ? (
                                <div
                                  className="flex items-center gap-1 whitespace-nowrap text-[0.72rem] font-semibold text-navy"
                                  title={
                                    b.actual_checkout
                                      ? `Checked in ${new Date(b.actual_checkin).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · Checked out ${new Date(b.actual_checkout).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                                      : `Checked in ${new Date(b.actual_checkin).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                                  }
                                >
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                  {new Date(
                                    b.actual_checkin,
                                  ).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                  {b.actual_checkout && (
                                    <>
                                      <span className="text-gray-300">→</span>
                                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                                      {new Date(
                                        b.actual_checkout,
                                      ).toLocaleTimeString("en-IN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[0.75rem] text-gray-300">
                                  —
                                </span>
                              )}
                            </td>

                            <td
                              className={`${tdCls} text-[0.85rem] font-bold text-navy whitespace-nowrap`}
                            >
                              Rs.
                              {Number(
                                b.final_total || b.total_price,
                              ).toLocaleString()}
                            </td>

                            <td className={tdCls}>
                              <StatusBadge status={b.status} booking={b} />
                            </td>

                            <td className={tdCls}>
                              <RowActionsMenu
                                booking={b}
                                onDetails={() =>
                                  setSelectedBookingId(b.booking_id)
                                }
                                onCancel={() => setCancelBookingData(b)}
                                onDelete={() => deleteBooking(b.booking_id, b)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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

          {/* ── BOOKINGS ── */}
          {tab === "bookings" && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="font-display text-[1rem] font-semibold text-navy">
                  All Bookings{" "}
                  <span className="text-[0.78rem] font-body font-normal text-gray-400 ml-2">
                    ({filteredBookings.length} shown · {bookings.length} total)
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-[0_1_320px] min-w-[200px]">
                  <div className="flex items-center gap-2 bg-gray-50 border-[1.5px] border-gray-200 rounded-lg px-3 py-2 flex-1">
                    <SearchIcon size={14} color="#868E96" />
                    <input
                      placeholder="Search guest, room..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setBookingPage(1);
                      }}
                      className="border-none bg-transparent text-[0.82rem] text-gray-900 outline-none w-full"
                    />
                  </div>
                  <button
                    onClick={fetchAll}
                    disabled={refreshing}
                    title="Refresh bookings"
                    className="flex items-center gap-1.5 rounded-lg border-[1.5px] border-gray-200 bg-white px-3 py-2 text-[0.78rem] font-semibold text-navy transition hover:border-navy/40 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={refreshing ? "animate-spin" : ""}
                    >
                      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                      <polyline points="21 3 21 9 15 9" />
                    </svg>
                    {refreshing ? "Refreshing" : "Refresh"}
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {[
                  { id: "recent", label: "Recent" },
                  { id: "week", label: "This Week" },
                  { id: "month", label: "This Month" },
                  { id: "custom", label: "Custom Date" },
                  { id: "checkedin", label: "Checked-in Users" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setBookingFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-full text-[0.78rem] font-semibold border-2 transition-colors
                      ${
                        bookingFilter === f.id
                          ? "bg-navy text-gold border-navy"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    {f.label}
                  </button>
                ))}

                {bookingFilter === "custom" && (
                  <div className="flex items-center gap-2 ml-1">
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="rounded-lg border-[1.5px] border-gray-200 px-2.5 py-1.5 text-[0.78rem] text-gray-700 outline-none focus:border-navy/40"
                    />
                    <span className="text-gray-400 text-[0.78rem]">to</span>
                    <input
                      type="date"
                      value={customEnd}
                      min={customStart || undefined}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="rounded-lg border-[1.5px] border-gray-200 px-2.5 py-1.5 text-[0.78rem] text-gray-700 outline-none focus:border-navy/40"
                    />
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[700px]">
                  <thead>
                    <tr>
                      {[
                        "#",
                        "Guest",
                        "Room",
                        "Check-in",
                        "Check-out",
                        "Actual Time",
                        "Total",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th key={h} className={thCls}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBookings.map((b) => (
                      <tr
                        key={b.booking_id}
                        className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className={`${tdCls} text-[0.75rem] text-gray-400`}>
                          {formatBookingId(b)}
                        </td>

                        {/* Guest — name + vehicle icon if a vehicle was booked */}
                        <td
                          className={`${tdCls} text-[0.85rem] font-semibold text-navy`}
                        >
                          <div
                            className="flex max-w-[160px] items-center gap-1.5"
                            title={b.guest_name}
                          >
                            <span className="truncate">{b.guest_name}</span>
                            {b.vehicle_type && b.vehicle_type !== "none" && (
                              <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-[#C9A84C]/15 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-[#9A7A2E] ${
                                  b.status === "cancelled" ? "opacity-40" : ""
                                }`}
                              >
                                <VehicleIcon size={10} color="#9A7A2E" />
                                {b.vehicle_type}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className={tdCls}>
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-[0.72rem] font-semibold">
                            {b.room_type}
                          </span>
                        </td>

                        <td
                          className={`${tdCls} text-[0.82rem] text-gray-600 whitespace-nowrap`}
                        >
                          {b.check_in_date?.slice(0, 10)}
                        </td>

                        <td
                          className={`${tdCls} text-[0.82rem] text-gray-600 whitespace-nowrap`}
                        >
                          {b.check_out_date?.slice(0, 10)}
                        </td>

                        {/* Actual Time — one compact line, tooltip has the full detail */}
                        <td className={`${tdCls} align-middle`}>
                          {b.actual_checkin ? (
                            <div
                              className="flex items-center gap-1 whitespace-nowrap text-[0.72rem] font-semibold text-navy"
                              title={
                                b.actual_checkout
                                  ? `Checked in ${new Date(b.actual_checkin).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · Checked out ${new Date(b.actual_checkout).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                                  : `Checked in ${new Date(b.actual_checkin).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                              }
                            >
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                              {new Date(b.actual_checkin).toLocaleTimeString(
                                "en-IN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                              {b.actual_checkout && (
                                <>
                                  <span className="text-gray-300">→</span>
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                                  {new Date(
                                    b.actual_checkout,
                                  ).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-[0.75rem] text-gray-300">
                              —
                            </span>
                          )}
                        </td>

                        <td
                          className={`${tdCls} text-[0.85rem] font-bold text-navy whitespace-nowrap`}
                        >
                          Rs.
                          {Number(
                            b.final_total || b.total_price,
                          ).toLocaleString()}
                        </td>

                        <td className={tdCls}>
                          <StatusBadge status={b.status} booking={b} />
                        </td>

                        <td className={tdCls}>
                          <RowActionsMenu
                            booking={b}
                            onDetails={() => setSelectedBookingId(b.booking_id)}
                            onCancel={() => setCancelBookingData(b)}
                            onDelete={() => deleteBooking(b.booking_id, b)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Showing Count */}
                    <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                      Showing {(bookingPage - 1) * itemsPerPage + 1} -
                      {Math.min(
                        bookingPage * itemsPerPage,
                        filteredBookings.length,
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
                        className="px-3 py-2 border rounded-lg text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>

                      {getPaginationItems(bookingPage, totalPages).map(
                        (item) =>
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
                                  ? "bg-navy text-white"
                                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {item}
                            </button>
                          ),
                      )}

                      <button
                        onClick={() =>
                          setBookingPage((p) => Math.min(p + 1, totalPages))
                        }
                        disabled={bookingPage === totalPages}
                        className="px-3 py-2 border rounded-lg text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CHECK-IN DETAILS ── */}
          {tab === "checkins" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-display text-[1.1rem] font-semibold text-navy">
                    Currently Checked-in Guests
                  </div>
                  <div className="text-[0.78rem] text-gray-400 mt-0.5">
                    {checkedInBookings.length > 0 ? (
                      <span>
                        <span className="text-emerald-600 font-semibold">
                          {checkedInBookings.length}
                        </span>{" "}
                        guest{checkedInBookings.length !== 1 ? "s" : ""}{" "}
                        currently on premises
                      </span>
                    ) : (
                      "No guests currently checked in"
                    )}
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
                  <div className="font-display text-[1.1rem] text-navy mb-2">
                    No guests currently checked in
                  </div>
                  <div className="text-[0.82rem] text-gray-400">
                    When a booking is checked in, it will appear here with a
                    live timer
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                  {checkedInBookings.map((b) => (
                    <div
                      key={b.booking_id}
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-[0_2px_12px_rgba(15,25,35,0.08)]"
                    >
                      {/* Card header */}
                      <div className="bg-navy px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-[42px] h-[42px] rounded-full bg-gold/20 border-[1.5px] border-gold flex items-center justify-center font-display text-[1.1rem] font-bold text-gold">
                            {b.guest_name?.charAt(0)}
                          </div>
                          <div>
                            <div className="text-[0.9rem] font-semibold text-white">
                              {b.guest_name}
                            </div>
                            <div className="text-[0.68rem] text-white/40 mt-px">
                              Booking #{b.booking_id}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-600/20 border border-emerald-600 rounded-full px-2.5 py-0.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"
                            style={{
                              animation:
                                "pulse-green 1.5s ease-in-out infinite",
                            }}
                          />
                          <span className="text-[0.62rem] font-bold text-emerald-500 tracking-[1px]">
                            LIVE
                          </span>
                        </div>
                      </div>

                      {/* Live timer */}
                      <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-4 text-center">
                        <div className="text-[0.6rem] font-bold text-gray-400 tracking-[1.5px] uppercase mb-2">
                          Time Spent on Premises
                        </div>
                        <LiveTimer checkinTime={b.actual_checkin} />
                        <div className="text-[0.68rem] text-gray-500 mt-1.5">
                          Checked in:{" "}
                          {new Date(b.actual_checkin).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="px-4 pt-3.5 pb-4">
                        {[
                          {
                            label: "Room",
                            val: `${b.room_type}${b.room_number ? ` · #${b.room_number}` : ""}`,
                          },
                          {
                            label: "Scheduled Check-in",
                            val: b.check_in_date?.slice(0, 10),
                          },
                          {
                            label: "Scheduled Check-out",
                            val: b.check_out_date?.slice(0, 10),
                          },
                          {
                            label: "Guests",
                            val: `${b.guest_count || 1} person${(b.guest_count || 1) > 1 ? "s" : ""}`,
                          },
                          {
                            label: "Room Charges",
                            val: `Rs.${Number(b.total_price).toLocaleString()}`,
                          },
                        ].map(({ label, val }) => (
                          <div
                            key={label}
                            className="flex justify-between items-center text-[0.78rem] py-1.5 border-b border-gray-100"
                          >
                            <span className="text-gray-400">{label}</span>
                            <span className="font-semibold text-navy">
                              {val}
                            </span>
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
                    ({allRooms.length} total ·{" "}
                    {allRooms.filter((r) => !r.is_available).length} blocked)
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
                      {["Room", "Type", "Price/Night", "Status", "Actions"].map(
                        (h) => (
                          <th key={h} className={thCls}>
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {allRooms.map((r) => (
                      <tr
                        key={r.room_id}
                        className={`border-t border-gray-100 ${!r.is_available ? "bg-red-50/50" : ""}`}
                      >
                        <td
                          className={`${tdCls} text-[0.85rem] font-bold text-navy`}
                        >
                          #{r.room_number || r.room_id}
                        </td>
                        <td className={tdCls}>
                          <span className="bg-navy text-[#E8D5A3] px-2.5 py-0.5 rounded text-[0.65rem] font-bold tracking-[1px] uppercase">
                            {r.room_type}
                          </span>
                        </td>
                        <td
                          className={`${tdCls} text-[0.85rem] font-bold text-navy`}
                        >
                          Rs.{Number(r.price_per_night).toLocaleString()}
                        </td>
                        <td className={tdCls}>
                          <span
                            className={`px-2.5 py-0.5 rounded text-[0.65rem] font-bold uppercase
                            ${r.is_available ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
                          >
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
                              onClick={() =>
                                r.is_available
                                  ? setRoomAvailabilityRoom(r)
                                  : toggleRoom(r.room_id, r.is_available)
                              }
                              className={`px-2.5 py-1 rounded border-[1.5px] bg-none text-[0.72rem] font-semibold cursor-pointer transition-colors
                                ${
                                  r.is_available
                                    ? "border-red-600 text-red-600 hover:bg-red-50"
                                    : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                                }`}
                            >
                              {r.is_available ? "🚫 Block" : "✅ Unblock"}
                            </button>
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
                <span className="text-[0.78rem] font-body text-gray-400 ml-2">
                  ({users.length} total)
                </span>
              </div>
              {users.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  No users found
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[500px]">
                      <thead>
                        <tr>
                          {[
                            "#",
                            "Name",
                            "Email",
                            "Role",
                            "Joined",
                            "Actions",
                          ].map((h) => (
                            <th key={h} className={thCls}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUsers.map((u) => (
                          <tr
                            key={u.user_id}
                            className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td
                              className={`${tdCls} text-[0.75rem] text-gray-400`}
                            >
                              #{u.user_id}
                            </td>
                            <td className={tdCls}>
                              <div className="flex items-center gap-2.5">
                                <div className="w-[30px] h-[30px] rounded-full bg-navy flex items-center justify-center text-[#E8D5A3] text-[0.72rem] font-bold shrink-0">
                                  {u.name?.charAt(0)}
                                </div>
                                <span className="text-[0.85rem] font-semibold text-navy">
                                  {u.name}
                                </span>
                              </div>
                            </td>
                            <td
                              className={`${tdCls} text-[0.8rem] text-gray-400`}
                            >
                              {u.email}
                            </td>
                            <td className={tdCls}>
                              <span
                                className={`px-2.5 py-0.5 rounded text-[0.65rem] font-bold uppercase
                              ${
                                u.role === "admin"
                                  ? "bg-navy text-[#E8D5A3]"
                                  : u.role === "manager"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td
                              className={`${tdCls} text-[0.8rem] text-gray-400`}
                            >
                              {u.created_at?.slice(0, 10)}
                            </td>
                            <td className={tdCls}>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setSelectedUserId(u.user_id)}
                                  className="px-2.5 py-1 rounded bg-[#0F1923] text-white border-none text-[0.72rem] font-semibold cursor-pointer transition-all duration-300 hover:bg-[#C9A84C] hover:text-black hover:-translate-y-[1px]"
                                >
                                  View
                                </button>
                                {(u.role === "admin" ||
                                  u.role === "manager") && (
                                  <button
                                    onClick={() => setResetPasswordUser(u)}
                                    className="px-2.5 py-1 rounded bg-none border-[1.5px] border-gold text-[#9A7A2E] text-[0.72rem] font-semibold cursor-pointer hover:bg-gold/10 transition-colors"
                                  >
                                    🔑 Reset
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {userTotalPages > 1 && (
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Showing Count */}
                        <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                          Showing {(userPage - 1) * itemsPerPage + 1} -
                          {Math.min(userPage * itemsPerPage, users.length)} of{" "}
                          {users.length}
                        </p>

                        {/* Pagination */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                          <button
                            onClick={() =>
                              setUserPage((p) => Math.max(p - 1, 1))
                            }
                            disabled={userPage === 1}
                            className="px-3 py-2 border rounded-lg text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Previous
                          </button>

                          {getPaginationItems(userPage, userTotalPages).map(
                            (item) =>
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
                                  onClick={() => setUserPage(item)}
                                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm flex items-center justify-center ${
                                    userPage === item
                                      ? "bg-navy text-white"
                                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                  }`}
                                >
                                  {item}
                                </button>
                              ),
                          )}

                          <button
                            onClick={() =>
                              setUserPage((p) =>
                                Math.min(p + 1, userTotalPages),
                              )
                            }
                            disabled={userPage === userTotalPages}
                            className="px-3 py-2 border rounded-lg text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── NEW BOOKING ── */}
          {tab === "admin_booking_for_users" && bookingRoom && (
            <AdminBookingForUsers
              room={bookingRoom}
              apiFetch={apiFetch}
              showToast={showToast}
              onBack={() => {
                setBookingRoom(null);
                setTab("book");
              }}
              onSuccess={() => {
                setBookingRoom(null);
                fetchAll();
                setTab("bookings");
              }}
            />
          )}
          {tab === "reports" && (
            <ReportsTab apiFetch={apiFetch} showToast={showToast} />
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
        </div>
      </div>

      {/* ── Modals ── */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          showToast={showToast}
        />
      )}
      {selectedBookingId && (
        <GuestCheckIn
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          showToast={showToast}
          onRefresh={fetchAll}
        />
      )}
      {editRoom && (
        <EditRoomModal
          room={editRoom}
          onClose={() => setEditRoom(null)}
          showToast={showToast}
          onRefresh={() => {
            fetchAll();
            setEditRoom(null);
          }}
        />
      )}
      {cancelBookingData && (
        <CancelWarningModal
          booking={cancelBookingData}
          onConfirm={() => confirmCancelBooking(cancelBookingData.booking_id)}
          onClose={() => setCancelBookingData(null)}
        />
      )}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          showToast={showToast}
        />
      )}
      {showAddRoom && (
        <AddRoomModal
          onClose={() => setShowAddRoom(false)}
          showToast={showToast}
          onRefresh={fetchAll}
        />
      )}
      {roomAvailabilityRoom && (
        <RoomBlockedDatesModal
          room={roomAvailabilityRoom}
          onClose={() => setRoomAvailabilityRoom(null)}
          showToast={showToast}
          onRefresh={fetchAll}
        />
      )}

      {/* Admin Booking Modal */}
      {bookingRoom && tab === "legacy_booking_modal" && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-navy/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-[440px] shadow-[0_16px_48px_rgba(0,0,0,0.2)] overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <div className="font-display text-[1.1rem] font-semibold text-navy">
                Book {bookingRoom.room_type} — Room{" "}
                {bookingRoom.room_number || bookingRoom.room_id}
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
              onSuccess={() => {
                setBookingRoom(null);
                fetchAll();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AdminBookingForm({ room, adminUser, onClose, showToast, onSuccess }) {
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
          Math.ceil((checkOutDate - checkInDate) / 86400000),
        )
      : 0;

  // Must use the double-occupancy rate when it applies, otherwise this preview
  // quotes the single rate while the backend charges the double rate.
  const nightly =
    Number(form.guest_count) >= 2 && Number(room.price_double || 0) > 0
      ? Number(room.price_double)
      : Number(room.price_per_night || 0);
  const basePrice = nightly * nights;
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
          user_id: adminUser.user_id,
          room_id: room.room_id,
          ...form,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      showToast(
        `Booking confirmed! ₹${Number(data.total_price).toLocaleString(
          "en-IN",
        )}`,
        "success",
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

  return (
    <form onSubmit={submit} className="p-6">
      {/* Date Fields */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Check-in
          </label>

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
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Check-out
          </label>

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
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-slate-900"
          />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 text-gray-600">
          <span className="font-semibold text-navy">Check-in</span>
          <span className="text-gray-500">24 hours</span>
        </div>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-1.5 text-gray-600">
          <span className="font-semibold text-navy">Check-out</span>
          <span className="text-gray-500">24 hours</span>
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
              ₹{Number(room.price_per_night).toLocaleString("en-IN")} × {nights}{" "}
              night{nights > 1 ? "s" : ""}
            </span>

            <span className="font-semibold text-slate-900">
              ₹{basePrice.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">GST (12%)</span>

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
        disabled={loading || calendarLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CheckIcon size={16} />

        {calendarLoading
          ? "Loading calendar..."
          : loading
            ? "Confirming..."
            : "Confirm Booking"}
      </button>
    </form>
  );
}