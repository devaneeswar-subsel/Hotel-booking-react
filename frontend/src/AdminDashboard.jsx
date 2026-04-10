import React, { useState, useEffect } from "react";
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
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "20px 22px",
        border: "1px solid #E9ECEF",
        boxShadow: "0 1px 4px rgba(15,25,35,0.05)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "#868E96",
              marginBottom: 6,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.9rem",
              fontWeight: 600,
              color: "#0F1923",
              lineHeight: 1,
            }}
          >
            {value}
          </div>
          {trend && (
            <div
              style={{
                fontSize: "0.72rem",
                color: trend > 0 ? "#2D9A6E" : "#C0392B",
                marginTop: 5,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
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
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: accent || "#F1F3F5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
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

/* ── USER DETAIL MODAL ── */
function UserDetailModal({ userId, onClose, showToast }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading)
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,25,35,0.7)",
          zIndex: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 40,
            color: "#868E96",
          }}
        >
          Loading user details...
        </div>
      </div>
    );

  if (!user) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,25,35,0.7)",
        zIndex: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#0F1923",
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(201,168,76,0.2)",
                border: "2px solid #C9A84C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "#C9A84C",
                }}
              >
                {user.name?.charAt(0)}
              </span>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: "#fff",
                }}
              >
                {user.name}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "rgba(255,255,255,0.5)",
                  marginTop: 2,
                }}
              >
                {user.email}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <XIcon size={14} color="#fff" />
          </button>
        </div>

        {/* Info cards */}
        <div
          style={{
            padding: "20px 28px",
            borderBottom: "1px solid #E9ECEF",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {[
            { label: "Phone", val: user.phone || "—" },
            { label: "Role", val: user.role?.toUpperCase() },
            { label: "Joined", val: user.created_at?.slice(0, 10) },
            {
              label: "Total Spent",
              val: `Rs.${Number(user.total_spent || 0).toLocaleString()}`,
            },
          ].map(({ label, val }) => (
            <div
              key={label}
              style={{
                background: "#F8F9FA",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: "0.6rem",
                  color: "#868E96",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#0F1923",
                }}
              >
                {val}
              </div>
            </div>
          ))}
        </div>

        {/* Bookings */}
        <div style={{ padding: "20px 28px", overflowY: "auto", flex: 1 }}>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#0F1923",
              marginBottom: 14,
            }}
          >
            Booking History ({user.bookings?.length || 0})
          </div>
          {!user.bookings || user.bookings.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "30px",
                color: "#868E96",
                fontSize: "0.85rem",
              }}
            >
              No bookings yet
            </div>
          ) : (
            user.bookings.map((b) => (
              <div
                key={b.booking_id}
                style={{
                  background: "#F8F9FA",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 10,
                  border: "1px solid #E9ECEF",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <span
                      style={{
                        background: "#0F1923",
                        color: "#E8D5A3",
                        padding: "2px 8px",
                        borderRadius: 3,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        letterSpacing: "1px",
                      }}
                    >
                      {b.room_type}
                    </span>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "#868E96",
                        marginLeft: 8,
                      }}
                    >
                      #{b.booking_id}
                    </span>
                  </div>
                  <span
                    style={{
                      background:
                        b.status === "confirmed"
                          ? "#E8F8F0"
                          : b.status === "cancelled"
                            ? "#FDECEA"
                            : "#EAF2FB",
                      color:
                        b.status === "confirmed"
                          ? "#2D9A6E"
                          : b.status === "cancelled"
                            ? "#C0392B"
                            : "#2471A3",
                      padding: "2px 8px",
                      borderRadius: 3,
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {b.status}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                    fontSize: "0.78rem",
                  }}
                >
                  <div>
                    <span style={{ color: "#868E96" }}>Check-in: </span>
                    {b.check_in_date?.slice(0, 10)}
                  </div>
                  <div>
                    <span style={{ color: "#868E96" }}>Check-out: </span>
                    {b.check_out_date?.slice(0, 10)}
                  </div>
                  <div>
                    <span style={{ color: "#868E96" }}>Total: </span>
                    <strong>
                      Rs.
                      {Number(b.final_total || b.total_price).toLocaleString()}
                    </strong>
                  </div>
                </div>
                {b.actual_checkin && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: "0.72rem",
                      color: "#2D9A6E",
                    }}
                  >
                    ✅ Checked in:{" "}
                    {new Date(b.actual_checkin).toLocaleString("en-IN")}
                    {b.actual_checkout &&
                      ` → Checked out: ${new Date(b.actual_checkout).toLocaleString("en-IN")} (${b.hours_spent}h)`}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── BOOKING DETAIL MODAL (check-in/out + addons) ── */
function BookingDetailModal({ bookingId, onClose, showToast, onRefresh }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addonLabel, setAddonLabel] = useState("");
  const [addonAmount, setAddonAmount] = useState("");
  const [addonLoading, setAddonLoading] = useState(false);

  const PRESET_ADDONS = [
    "Food & Beverages",
    "Laundry",
    "Spa/Massage",
    "Extra Bed",
    "Room Service",
  ];

  const fetchBooking = () => {
    setLoading(true);
    fetch(`${API}/api/admin/bookings/${bookingId}`)
      .then((r) => r.json())
      .then(setBooking)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  async function handleCheckin() {
    const res = await fetch(`${API}/api/bookings/${bookingId}/checkin`, {
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
    const res = await fetch(`${API}/api/bookings/${bookingId}/checkout`, {
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
    const res = await fetch(`${API}/api/bookings/${bookingId}/addons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    await fetch(`${API}/api/bookings/${bookingId}/addons/${addonId}`, {
      method: "DELETE",
    });
    showToast("Addon removed", "success");
    fetchBooking();
    onRefresh();
  }

  async function downloadInvoice() {
    if (!booking) return;
    const b = booking;
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
    const basePrice = Number(b.total_price);
    const addonTotal = Number(b.addon_charges || 0);
    const subtotal = basePrice + addonTotal;
    const gst = Number(b.gst_amount || subtotal * GST_RATE);
    const finalTotal = Number(b.final_total || subtotal + gst);
    const invNo = `INV-${String(b.booking_id).padStart(5, "0")}`;
    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;

    // Header
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

    // Bill to
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(134, 142, 150);
    doc.text("BILL TO", 18, 58);
    doc.text("FROM", W / 2 + 10, 58);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 25, 35);
    doc.text(b.guest_name || "Guest", 18, 66);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(73, 80, 87);
    doc.text(b.email || "", 18, 72);
    if (b.phone) doc.text(b.phone, 18, 78);
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

    // Stay details
    const tableTop = 98;
    doc.setFillColor(15, 25, 35);
    doc.rect(18, tableTop, W - 36, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(201, 168, 76);
    doc.text("DESCRIPTION", 24, tableTop + 7);
    doc.text("DETAILS", 110, tableTop + 7);
    doc.text("AMOUNT", W - 18, tableTop + 7, { align: "right" });

    const pricePerNight = Math.round(basePrice / nights);
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
              desc: "Total Hours Stayed",
              detail: `${b.hours_spent} hours`,
              amount: "—",
            },
          ]
        : []),
      { desc: "Guests", detail: `${b.guest_count || 1}`, amount: "—" },
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
      doc.text(String(row.detail), 110, y);
      doc.text(row.amount, W - 18, y, { align: "right" });
      y += 12;
    });

    // Add-ons section
    if (b.addons && b.addons.length > 0) {
      y += 4;
      doc.setFillColor(240, 240, 240);
      doc.rect(18, y - 6, W - 36, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 25, 35);
      doc.text("ADD-ON CHARGES", 24, y);
      y += 12;
      b.addons.forEach((addon, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(18, y - 6, W - 36, 10, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(15, 25, 35);
        doc.text(addon.label, 24, y);
        doc.setTextColor(73, 80, 87);
        doc.text(
          new Date(addon.created_at).toLocaleDateString("en-IN"),
          110,
          y,
        );
        doc.text(`Rs.${Number(addon.amount).toLocaleString()}`, W - 18, y, {
          align: "right",
        });
        y += 12;
      });
    }

    // Totals
    y += 4;
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.3);
    doc.line(18, y, W - 18, y);
    y += 8;

    const totalsData = [
      { label: "Room Charges", val: `Rs.${basePrice.toLocaleString()}` },
      { label: "Add-on Charges", val: `Rs.${addonTotal.toLocaleString()}` },
      { label: "Subtotal", val: `Rs.${subtotal.toLocaleString()}` },
      { label: "GST (18%)", val: `Rs.${Math.round(gst).toLocaleString()}` },
    ];
    totalsData.forEach(({ label, val }) => {
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
    doc.roundedRect(W - 90, y - 6, 72, 18, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(201, 168, 76);
    doc.text("GRAND TOTAL", W - 54, y + 1, { align: "center" });
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(`Rs.${Math.round(finalTotal).toLocaleString()}`, W - 54, y + 9, {
      align: "center",
    });

    // Status + footer
    y += 28;
    const sc =
      b.status === "confirmed"
        ? [45, 154, 110]
        : b.status === "cancelled"
          ? [192, 57, 43]
          : [36, 113, 163];
    doc.setFillColor(...sc);
    doc.roundedRect(18, y - 5, 36, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(b.status?.toUpperCase(), 36, y + 2, { align: "center" });

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

    doc.save(`${invNo}-${(b.guest_name || "guest").replace(/\s+/g, "_")}.pdf`);
  }

  if (loading)
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,25,35,0.7)",
          zIndex: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 40,
            color: "#868E96",
          }}
        >
          Loading booking details...
        </div>
      </div>
    );
  if (!booking) return null;

  const basePrice = Number(booking.total_price);
  const addonTotal = Number(booking.addon_charges || 0);
  const subtotal = basePrice + addonTotal;
  const gst = Math.round(subtotal * GST_RATE * 100) / 100;
  const finalTotal = Number(booking.final_total || subtotal + gst);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,25,35,0.7)",
        zIndex: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#0F1923",
            padding: "20px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.05rem",
                fontWeight: 600,
                color: "#fff",
              }}
            >
              Booking #{booking.booking_id} — {booking.guest_name}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.45)",
                marginTop: 2,
              }}
            >
              {booking.room_type} · {booking.check_in_date?.slice(0, 10)} →{" "}
              {booking.check_out_date?.slice(0, 10)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <XIcon size={14} color="#fff" />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "22px 28px" }}>
          {/* Check-in / Check-out actions */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: "#F8F9FA",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: "#868E96",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Check-in
              </div>
              {booking.actual_checkin ? (
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "#2D9A6E",
                    fontWeight: 600,
                  }}
                >
                  ✅ {new Date(booking.actual_checkin).toLocaleString("en-IN")}
                </div>
              ) : (
                <button
                  onClick={handleCheckin}
                  disabled={booking.status === "cancelled"}
                  style={{
                    background: "#2D9A6E",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 18px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  ▶ Record Check-in
                </button>
              )}
            </div>
            <div
              style={{
                background: "#F8F9FA",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: "#868E96",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Check-out
              </div>
              {booking.actual_checkout ? (
                <div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "#2471A3",
                      fontWeight: 600,
                    }}
                  >
                    ✅{" "}
                    {new Date(booking.actual_checkout).toLocaleString("en-IN")}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#868E96",
                      marginTop: 4,
                    }}
                  >
                    Duration: {booking.hours_spent}h
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={
                    !booking.actual_checkin || booking.status === "cancelled"
                  }
                  style={{
                    background: booking.actual_checkin ? "#2471A3" : "#CCC",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 18px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: booking.actual_checkin ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                  }}
                >
                  ⏹ Record Check-out
                </button>
              )}
            </div>
          </div>

          {/* Add-ons */}
          <div
            style={{
              background: "#F8F9FA",
              borderRadius: 12,
              padding: "18px 20px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#0F1923",
                marginBottom: 14,
              }}
            >
              Add-on Charges
            </div>

            {/* Preset buttons */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 12,
              }}
            >
              {PRESET_ADDONS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAddonLabel(preset)}
                  style={{
                    background: addonLabel === preset ? "#0F1923" : "#fff",
                    color: addonLabel === preset ? "#E8D5A3" : "#495057",
                    border: "1.5px solid #E9ECEF",
                    borderRadius: 20,
                    padding: "4px 12px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={addonLabel}
                onChange={(e) => setAddonLabel(e.target.value)}
                placeholder="Label (e.g. Airport Transfer)"
                style={{
                  flex: 2,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1.5px solid #E9ECEF",
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                }}
              />
              <input
                value={addonAmount}
                onChange={(e) => setAddonAmount(e.target.value)}
                placeholder="Amount ₹"
                type="number"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1.5px solid #E9ECEF",
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={addAddon}
                disabled={addonLoading}
                style={{
                  background: "#C9A84C",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                + Add
              </button>
            </div>

            {/* Existing addons */}
            {booking.addons && booking.addons.length > 0 ? (
              booking.addons.map((addon) => (
                <div
                  key={addon.addon_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#fff",
                    borderRadius: 6,
                    padding: "8px 12px",
                    marginBottom: 6,
                    border: "1px solid #E9ECEF",
                  }}
                >
                  <span style={{ fontSize: "0.82rem", color: "#0F1923" }}>
                    {addon.label}
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#0F1923",
                      }}
                    >
                      Rs.{Number(addon.amount).toLocaleString()}
                    </span>
                    <button
                      onClick={() => removeAddon(addon.addon_id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#C0392B",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#868E96",
                  textAlign: "center",
                  padding: "10px 0",
                }}
              >
                No add-ons yet
              </div>
            )}
          </div>

          {/* Bill summary */}
          <div
            style={{
              background: "#0F1923",
              borderRadius: 12,
              padding: "18px 20px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#C9A84C",
                marginBottom: 14,
              }}
            >
              Bill Summary
            </div>
            {[
              {
                label: "Room Charges",
                val: `Rs.${basePrice.toLocaleString()}`,
              },
              {
                label: "Add-on Charges",
                val: `Rs.${addonTotal.toLocaleString()}`,
              },
              { label: "Subtotal", val: `Rs.${subtotal.toLocaleString()}` },
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
                  padding: "5px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.55)" }}>{label}</span>
                <span style={{ color: "#fff", fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1rem",
                padding: "12px 0 0",
                marginTop: 4,
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  color: "#C9A84C",
                }}
              >
                Grand Total
              </span>
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  color: "#fff",
                  fontSize: "1.1rem",
                }}
              >
                Rs.{Math.round(finalTotal).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Download invoice */}
          <button
            onClick={downloadInvoice}
            style={{
              width: "100%",
              padding: 12,
              background: "#C9A84C",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <DownloadIcon size={15} color="#fff" /> Download Invoice (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── EDIT ROOM MODAL ── */
function EditRoomModal({ room, onClose, showToast, onRefresh }) {
  const [form, setForm] = useState({
    room_number: room.room_number || "",
    room_type: room.room_type || "",
    price_per_night: room.price_per_night || "",
    capacity: room.capacity || 2,
    description: room.description || "",
    image_url: room.image_url || "",
    is_available: room.is_available,
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await fetch(`${API}/api/admin/rooms/${room.room_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return showToast(data.error, "error");
    showToast("Room updated!", "success");
    onRefresh();
    onClose();
  }

  const iStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    border: "1.5px solid #E9ECEF",
    fontSize: "0.85rem",
    fontFamily: "inherit",
    color: "#212529",
    boxSizing: "border-box",
  };
  const lStyle = {
    display: "block",
    fontSize: "0.62rem",
    fontWeight: 700,
    color: "#868E96",
    marginBottom: 5,
    letterSpacing: "0.8px",
    textTransform: "uppercase",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,25,35,0.7)",
        zIndex: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#0F1923",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1rem",
              fontWeight: 600,
              color: "#fff",
            }}
          >
            Edit Room #{room.room_number || room.room_id}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <XIcon size={13} color="#fff" />
          </button>
        </div>
        <div style={{ padding: "22px 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={lStyle}>Room Number</label>
              <input
                style={iStyle}
                value={form.room_number}
                onChange={(e) =>
                  setForm({ ...form, room_number: e.target.value })
                }
              />
            </div>
            <div>
              <label style={lStyle}>Room Type</label>
              <select
                style={iStyle}
                value={form.room_type}
                onChange={(e) =>
                  setForm({ ...form, room_type: e.target.value })
                }
              >
                {["Standard", "Deluxe", "Suite", "Luxury", "Presidential"].map(
                  (t) => (
                    <option key={t}>{t}</option>
                  ),
                )}
              </select>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={lStyle}>Price / Night (₹)</label>
              <input
                style={iStyle}
                type="number"
                value={form.price_per_night}
                onChange={(e) =>
                  setForm({ ...form, price_per_night: e.target.value })
                }
              />
            </div>
            <div>
              <label style={lStyle}>Capacity</label>
              <input
                style={iStyle}
                type="number"
                min={1}
                max={10}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lStyle}>Description</label>
            <textarea
              style={{ ...iStyle, resize: "vertical", minHeight: 60 }}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={lStyle}>Image URL</label>
            <input
              style={iStyle}
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <label style={{ ...lStyle, margin: 0 }}>Status:</label>
            <button
              onClick={() =>
                setForm({ ...form, is_available: form.is_available ? 0 : 1 })
              }
              style={{
                background: form.is_available ? "#E8F8F0" : "#FDECEA",
                color: form.is_available ? "#2D9A6E" : "#C0392B",
                border: `1.5px solid ${form.is_available ? "#2D9A6E" : "#C0392B"}`,
                borderRadius: 6,
                padding: "5px 14px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {form.is_available ? "✅ Available" : "🚫 Blocked"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: 10,
                background: "transparent",
                border: "1.5px solid #E9ECEF",
                borderRadius: 6,
                fontSize: "0.85rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={loading}
              style={{
                flex: 2,
                padding: 10,
                background: "#0F1923",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN ADMIN DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard({
  adminUser,
  onClose,
  showToast,
  fullPage = false,
}) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [editRoom, setEditRoom] = useState(null);

  const fetchAll = () => {
    Promise.all([
      fetch(`${API}/api/admin/stats`).then((r) => r.json()),
      fetch(`${API}/api/admin/bookings`).then((r) => r.json()),
      fetch(`${API}/api/rooms`).then((r) => r.json()),
      fetch(`${API}/api/admin/users`)
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([s, b, r, u]) => {
        setStats(s);
        setBookings(Array.isArray(b) ? b : []);
        setRooms(Array.isArray(r) ? r : []);
        setUsers(Array.isArray(u) ? u : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

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

  async function toggleRoom(roomId, current) {
    try {
      await fetch(`${API}/api/admin/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: current ? 0 : 1 }),
      });
      setRooms((r) =>
        r.map((x) =>
          x.room_id === roomId ? { ...x, is_available: current ? 0 : 1 } : x,
        ),
      );
      showToast(`Room ${current ? "blocked" : "available"}`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // Chart data
  const last7 = Array(7)
    .fill(0)
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
        value: bookings.filter(
          (b) => b.check_in_date?.slice(0, 10) === d.toISOString().slice(0, 10),
        ).length,
      };
    });
  const revenueByRoom = rooms
    .map((r) => ({
      label: r.room_type,
      value: bookings
        .filter(
          (b) =>
            b.room_type === r.room_type &&
            (b.status === "confirmed" || b.status === "completed"),
        )
        .reduce((sum, b) => sum + Number(b.final_total || b.total_price), 0),
    }))
    .filter((r) => r.value > 0);
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const filteredBookings = bookings.filter(
    (b) =>
      !searchTerm ||
      b.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.room_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: GridIcon },
    { id: "bookings", label: "Bookings", icon: BookingIcon },
    { id: "rooms", label: "Rooms", icon: BedIcon },
    { id: "users", label: "Users", icon: UsersIcon },
    { id: "book", label: "New Booking", icon: CalendarIcon },
  ];

  const s = {
    wrap: {
      minHeight: "100vh",
      background: "#F8F9FA",
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    },
    sidebar: {
      position: "fixed",
      top: 0,
      left: 0,
      bottom: 0,
      width: 220,
      background: "#0F1923",
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid rgba(201,168,76,0.12)",
      zIndex: 100,
    },
    navItem: (active) => ({
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "11px 20px",
      cursor: "pointer",
      background: active ? "rgba(201,168,76,0.12)" : "transparent",
      borderLeft: active ? "2.5px solid #C9A84C" : "2.5px solid transparent",
      color: active ? "#C9A84C" : "rgba(255,255,255,0.5)",
      fontSize: "0.82rem",
      fontWeight: active ? 600 : 400,
      transition: "all 0.18s",
    }),
    main: { marginLeft: 220, minHeight: "100vh" },
    topbar: {
      background: "#0F1923",
      padding: "0 28px",
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid rgba(201,168,76,0.12)",
      position: "sticky",
      top: 0,
      zIndex: 99,
    },
    content: { padding: "28px 28px" },
    card: {
      background: "#fff",
      borderRadius: 14,
      padding: "20px 22px",
      border: "1px solid #E9ECEF",
      boxShadow: "0 1px 4px rgba(15,25,35,0.05)",
    },
  };

  if (loading)
    return (
      <div
        style={{
          ...s.wrap,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#868E96" }}>Loading dashboard...</div>
      </div>
    );

  return (
    <div style={s.wrap}>
      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <div
          style={{
            padding: "24px 20px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <img
            src="/logo.png"
            alt="VV"
            style={{
              height: 36,
              width: 36,
              objectFit: "contain",
              mixBlendMode: "screen",
              filter: "brightness(1.2)",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1.15,
            }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "1.5px",
              }}
            >
              VV GRAND PARK
            </span>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "0.55rem",
                color: "#C9A84C",
                letterSpacing: "2.5px",
              }}
            >
              RESIDENCY
            </span>
          </div>
        </div>
        <div style={{ padding: "16px 0", flex: 1 }}>
          <div
            style={{
              padding: "6px 20px 10px",
              fontSize: "0.6rem",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            Management
          </div>
          {tabs.map(({ id, label, icon: TabIcon }) => (
            <div
              key={id}
              style={s.navItem(tab === id)}
              onClick={() => setTab(id)}
            >
              <TabIcon
                size={15}
                color={tab === id ? "#C9A84C" : "rgba(255,255,255,0.4)"}
              />
              {label}
            </div>
          ))}
        </div>
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(201,168,76,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserIcon size={14} color="#C9A84C" />
            </div>
            <div>
              <div
                style={{ fontSize: "0.78rem", fontWeight: 600, color: "#fff" }}
              >
                {adminUser?.name}
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Administrator
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 12px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.78rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <ArrowRightIcon size={13} color="rgba(255,255,255,0.5)" /> Back to
            Site
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={s.main}>
        <div style={s.topbar}>
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.05rem",
                fontWeight: 600,
                color: "#fff",
              }}
            >
              {tabs.find((t) => t.id === tab)?.label}
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.35)",
                marginTop: 1,
              }}
            >
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "rgba(255,255,255,0.4)",
              background: "rgba(201,168,76,0.12)",
              border: "1px solid rgba(201,168,76,0.2)",
              padding: "5px 12px",
              borderRadius: 6,
            }}
          >
            Admin Portal
          </div>
        </div>

        <div style={s.content}>
          {/* ── OVERVIEW ── */}
          {tab === "overview" && stats && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <StatCard
                  label="Total Rooms"
                  value={stats.total_rooms}
                  icon={BedIcon}
                  accent="#0F1923"
                />
                <StatCard
                  label="Total Bookings"
                  value={stats.total_bookings}
                  icon={BookingIcon}
                  accent="#2471A3"
                  chartData={last7}
                  chartType="bar"
                />
                <StatCard
                  label="Registered Users"
                  value={stats.total_users}
                  icon={UsersIcon}
                  accent="#2D9A6E"
                />
                <StatCard
                  label="Total Revenue"
                  value={`Rs.${Number(stats.total_revenue).toLocaleString()}`}
                  icon={CreditCardIcon}
                  accent="#C9A84C"
                  chartData={revenueByRoom}
                  chartType="bar"
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 280px",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <div style={s.card}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          letterSpacing: "1.5px",
                          textTransform: "uppercase",
                          color: "#868E96",
                          marginBottom: 3,
                        }}
                      >
                        Bookings This Week
                      </div>
                      <div
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "1.4rem",
                          fontWeight: 600,
                          color: "#0F1923",
                        }}
                      >
                        {last7.reduce((s, d) => s + d.value, 0)}
                      </div>
                    </div>
                    <TrendingUpIcon size={18} color="#C9A84C" />
                  </div>
                  <LineChart data={last7} color="#C9A84C" height={80} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    {last7.map((d, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: "0.6rem",
                          color: "#868E96",
                          textAlign: "center",
                        }}
                      >
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={s.card}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          letterSpacing: "1.5px",
                          textTransform: "uppercase",
                          color: "#868E96",
                          marginBottom: 3,
                        }}
                      >
                        Revenue by Room
                      </div>
                      <div
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "1.4rem",
                          fontWeight: 600,
                          color: "#0F1923",
                        }}
                      >
                        Rs.{Number(stats.total_revenue).toLocaleString()}
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
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: 6,
                        }}
                      >
                        {revenueByRoom.map((d, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: "0.58rem",
                              color: "#868E96",
                              textAlign: "center",
                            }}
                          >
                            {d.label.slice(0, 3)}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "24px 0",
                        color: "#868E96",
                        fontSize: "0.82rem",
                      }}
                    >
                      No revenue data yet
                    </div>
                  )}
                </div>
                <div
                  style={{
                    ...s.card,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "#868E96",
                    }}
                  >
                    Booking Status
                  </div>
                  <DonutChart
                    confirmed={confirmed}
                    cancelled={cancelled}
                    completed={completed}
                    size={100}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      width: "100%",
                    }}
                  >
                    {[
                      { label: "Confirmed", val: confirmed, color: "#2D9A6E" },
                      { label: "Cancelled", val: cancelled, color: "#C0392B" },
                      { label: "Completed", val: completed, color: "#2471A3" },
                    ].map(({ label, val, color }) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "0.78rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: color,
                            }}
                          />
                          <span style={{ color: "#495057" }}>{label}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: "#0F1923" }}>
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Recent bookings */}
              <div style={s.card}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#0F1923",
                    }}
                  >
                    Recent Bookings
                  </div>
                  <button
                    onClick={() => setTab("bookings")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      background: "none",
                      border: "none",
                      color: "#C9A84C",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    View all <ArrowRightIcon size={12} color="#C9A84C" />
                  </button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 14px",
                              textAlign: "left",
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              color: "#868E96",
                              textTransform: "uppercase",
                              letterSpacing: "1px",
                              borderBottom: "1px solid #E9ECEF",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.recent_bookings || []).map((b) => (
                        <tr
                          key={b.booking_id}
                          style={{
                            borderTop: "1px solid #F1F3F5",
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedBookingId(b.booking_id)}
                        >
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: "0.78rem",
                              color: "#868E96",
                            }}
                          >
                            #{b.booking_id}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: "#0F1923",
                            }}
                          >
                            {b.guest_name}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: "0.82rem",
                              color: "#495057",
                            }}
                          >
                            {b.room_type}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: "0.82rem",
                              color: "#495057",
                            }}
                          >
                            {b.check_in_date?.slice(0, 10)}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: "0.82rem",
                              color: "#495057",
                            }}
                          >
                            {b.check_out_date?.slice(0, 10)}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: "#0F1923",
                            }}
                          >
                            Rs.
                            {Number(
                              b.final_total || b.total_price,
                            ).toLocaleString()}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: 4,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                background:
                                  b.status === "confirmed"
                                    ? "#E8F8F0"
                                    : b.status === "cancelled"
                                      ? "#FDECEA"
                                      : "#EAF2FB",
                                color:
                                  b.status === "confirmed"
                                    ? "#2D9A6E"
                                    : b.status === "cancelled"
                                      ? "#C0392B"
                                      : "#2471A3",
                              }}
                            >
                              {b.status}
                            </span>
                          </td>
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
            <div style={s.card}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#0F1923",
                  }}
                >
                  All Bookings{" "}
                  <span
                    style={{
                      fontFamily: "inherit",
                      fontSize: "0.78rem",
                      fontWeight: 400,
                      color: "#868E96",
                      marginLeft: 8,
                    }}
                  >
                    ({bookings.length} total)
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#F8F9FA",
                    border: "1.5px solid #E9ECEF",
                    borderRadius: 8,
                    padding: "8px 12px",
                    width: 240,
                  }}
                >
                  <SearchIcon size={14} color="#868E96" />
                  <input
                    placeholder="Search guest, room..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      border: "none",
                      background: "none",
                      fontSize: "0.82rem",
                      color: "#212529",
                      fontFamily: "inherit",
                      outline: "none",
                      width: "100%",
                    }}
                  />
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 14px",
                            textAlign: "left",
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            color: "#868E96",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            borderBottom: "1.5px solid #E9ECEF",
                            whiteSpace: "nowrap",
                            background: "#F8F9FA",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr
                        key={b.booking_id}
                        style={{ borderTop: "1px solid #F1F3F5" }}
                      >
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.75rem",
                            color: "#868E96",
                          }}
                        >
                          #{b.booking_id}
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "#0F1923",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.guest_name}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <span
                            style={{
                              background: "#F1F3F5",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: "0.72rem",
                              fontWeight: 600,
                            }}
                          >
                            {b.room_type}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.82rem",
                            color: "#495057",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.check_in_date?.slice(0, 10)}
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.82rem",
                            color: "#495057",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.check_out_date?.slice(0, 10)}
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.82rem",
                            color: "#495057",
                          }}
                        >
                          Rs.{Number(b.total_price).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.82rem",
                            color: "#C9A84C",
                            fontWeight: 600,
                          }}
                        >
                          Rs.{Number(b.addon_charges || 0).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.82rem",
                            color: "#868E96",
                          }}
                        >
                          Rs.{Number(b.gst_amount || 0).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "#0F1923",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Rs.
                          {Number(
                            b.final_total || b.total_price,
                          ).toLocaleString()}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 9px",
                              borderRadius: 3,
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background:
                                b.status === "confirmed"
                                  ? "#E8F8F0"
                                  : b.status === "cancelled"
                                    ? "#FDECEA"
                                    : "#EAF2FB",
                              color:
                                b.status === "confirmed"
                                  ? "#2D9A6E"
                                  : b.status === "cancelled"
                                    ? "#C0392B"
                                    : "#2471A3",
                            }}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => setSelectedBookingId(b.booking_id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                                padding: "4px 10px",
                                border: "1.5px solid #0F1923",
                                color: "#0F1923",
                                background: "none",
                                borderRadius: 4,
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Details
                            </button>
                            {b.status === "confirmed" && (
                              <button
                                onClick={() => cancelBooking(b.booking_id)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                  padding: "4px 10px",
                                  border: "1.5px solid #C0392B",
                                  color: "#C0392B",
                                  background: "none",
                                  borderRadius: 4,
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                <XIcon size={11} color="#C0392B" /> Cancel
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

          {/* ── ROOMS ── */}
          {tab === "rooms" && (
            <div style={s.card}>
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#0F1923",
                  marginBottom: 20,
                }}
              >
                Room Management{" "}
                <span
                  style={{
                    fontFamily: "inherit",
                    fontSize: "0.78rem",
                    fontWeight: 400,
                    color: "#868E96",
                    marginLeft: 8,
                  }}
                >
                  ({rooms.length} total)
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[
                        "Room",
                        "Type",
                        "Price / Night",
                        "Capacity",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 14px",
                            textAlign: "left",
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            color: "#868E96",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            borderBottom: "1.5px solid #E9ECEF",
                            background: "#F8F9FA",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r) => (
                      <tr
                        key={r.room_id}
                        style={{ borderTop: "1px solid #F1F3F5" }}
                      >
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "#0F1923",
                          }}
                        >
                          #{r.room_number || r.room_id}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <span
                            style={{
                              background: "#0F1923",
                              color: "#E8D5A3",
                              padding: "3px 10px",
                              borderRadius: 3,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              letterSpacing: "1px",
                              textTransform: "uppercase",
                            }}
                          >
                            {r.room_type}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "#0F1923",
                          }}
                        >
                          Rs.{Number(r.price_per_night).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.82rem",
                            color: "#495057",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <UserIcon size={13} color="#868E96" />{" "}
                          {r.capacity || 2}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <span
                            style={{
                              background: r.is_available
                                ? "#E8F8F0"
                                : "#FDECEA",
                              color: r.is_available ? "#2D9A6E" : "#C0392B",
                              padding: "3px 10px",
                              borderRadius: 3,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}
                          >
                            {r.is_available ? "Available" : "Blocked"}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => setEditRoom(r)}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 4,
                                border: "1.5px solid #C9A84C",
                                color: "#9A7A2E",
                                background: "none",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() =>
                                toggleRoom(r.room_id, r.is_available)
                              }
                              style={{
                                padding: "5px 12px",
                                borderRadius: 4,
                                border: `1.5px solid ${r.is_available ? "#C0392B" : "#2D9A6E"}`,
                                color: r.is_available ? "#C0392B" : "#2D9A6E",
                                background: "none",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              {r.is_available ? "🚫 Block" : "✅ Unblock"}
                            </button>
                            <button
                              onClick={() => {
                                setBookingRoom(r);
                                setTab("book");
                              }}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 4,
                                background: "#0F1923",
                                color: "#fff",
                                border: "none",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <CalendarIcon size={12} color="#fff" /> Book
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
            <div style={s.card}>
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#0F1923",
                  marginBottom: 20,
                }}
              >
                Registered Users{" "}
                <span
                  style={{
                    fontFamily: "inherit",
                    fontSize: "0.78rem",
                    fontWeight: 400,
                    color: "#868E96",
                    marginLeft: 8,
                  }}
                >
                  ({users.length} total)
                </span>
              </div>
              {users.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#868E96",
                    fontSize: "0.9rem",
                  }}
                >
                  No users found
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {[
                          "#",
                          "Name",
                          "Email",
                          "Phone",
                          "Role",
                          "Joined",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 14px",
                              textAlign: "left",
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              color: "#868E96",
                              textTransform: "uppercase",
                              letterSpacing: "1px",
                              borderBottom: "1.5px solid #E9ECEF",
                              background: "#F8F9FA",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.user_id}
                          style={{ borderTop: "1px solid #F1F3F5" }}
                        >
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: "0.75rem",
                              color: "#868E96",
                            }}
                          >
                            #{u.user_id}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: "50%",
                                  background: "#0F1923",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#E8D5A3",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {u.name?.charAt(0)}
                              </div>
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                  color: "#0F1923",
                                }}
                              >
                                {u.name}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: "0.8rem",
                              color: "#868E96",
                            }}
                          >
                            {u.email}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: "0.82rem",
                              color: "#495057",
                            }}
                          >
                            {u.phone || "—"}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <span
                              style={{
                                background:
                                  u.role === "admin" ? "#0F1923" : "#F1F3F5",
                                color:
                                  u.role === "admin" ? "#E8D5A3" : "#495057",
                                padding: "3px 10px",
                                borderRadius: 3,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: "0.8rem",
                              color: "#868E96",
                            }}
                          >
                            {u.created_at?.slice(0, 10)}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <button
                              onClick={() => setSelectedUserId(u.user_id)}
                              style={{
                                padding: "5px 14px",
                                borderRadius: 4,
                                background: "#0F1923",
                                color: "#fff",
                                border: "none",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              View Details
                            </button>
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
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#0F1923",
                  marginBottom: 20,
                }}
              >
                New Booking — Select a Room
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 20,
                }}
              >
                {rooms
                  .filter((r) => r.is_available)
                  .map((r) => (
                    <div
                      key={r.room_id}
                      style={{
                        background: "#fff",
                        borderRadius: 14,
                        overflow: "hidden",
                        border: "1px solid #E9ECEF",
                        boxShadow: "0 1px 4px rgba(15,25,35,0.05)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 24px rgba(15,25,35,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow =
                          "0 1px 4px rgba(15,25,35,0.05)";
                      }}
                    >
                      <div style={{ height: 160, overflow: "hidden" }}>
                        <img
                          src={
                            r.image_url ||
                            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500"
                          }
                          alt={r.room_type}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                      <div style={{ padding: "16px 18px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              background: "#0F1923",
                              color: "#E8D5A3",
                              padding: "3px 10px",
                              borderRadius: 3,
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              letterSpacing: "1px",
                              textTransform: "uppercase",
                            }}
                          >
                            {r.room_type}
                          </span>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#868E96",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <UserIcon size={12} color="#868E96" />
                            {r.capacity || 2}
                          </span>
                        </div>
                        <div
                          style={{
                            fontFamily: "'Playfair Display', serif",
                            fontSize: "1rem",
                            fontWeight: 600,
                            color: "#0F1923",
                            marginBottom: 4,
                          }}
                        >
                          Room {r.room_number || r.room_id}
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#868E96",
                            marginBottom: 14,
                          }}
                        >
                          {r.description || "Premium hotel room"}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: "1.05rem",
                                fontWeight: 600,
                                color: "#0F1923",
                              }}
                            >
                              Rs.{Number(r.price_per_night).toLocaleString()}{" "}
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 400,
                                  color: "#868E96",
                                }}
                              >
                                /night
                              </span>
                            </div>
                            <div
                              style={{ fontSize: "0.65rem", color: "#868E96" }}
                            >
                              +18% GST applicable
                            </div>
                          </div>
                          <button
                            onClick={() => setBookingRoom(r)}
                            style={{
                              background: "#0F1923",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "8px 16px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            Book <ArrowRightIcon size={13} color="#fff" />
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

      {/* ── MODALS ── */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          showToast={showToast}
        />
      )}
      {selectedBookingId && (
        <BookingDetailModal
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

      {/* Admin Booking Modal */}
      {bookingRoom && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,25,35,0.7)",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 26px",
                borderBottom: "1px solid #E9ECEF",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: "#0F1923",
                }}
              >
                Book {bookingRoom.room_type} — Room{" "}
                {bookingRoom.room_number || bookingRoom.room_id}
              </div>
              <button
                onClick={() => setBookingRoom(null)}
                style={{
                  background: "#F1F3F5",
                  border: "none",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
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

  async function submit(e) {
    e.preventDefault();
    if (nights <= 0) {
      showToast("Invalid dates", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: adminUser.user_id,
          room_id: room.room_id,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(
        `Booking confirmed! Rs.${Number(data.total_price).toLocaleString()}`,
        "success",
      );
      onSuccess();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const iStyle = {
    width: "100%",
    padding: "10px 13px",
    borderRadius: 6,
    border: "1.5px solid #E9ECEF",
    fontSize: "0.875rem",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: "#212529",
    boxSizing: "border-box",
  };
  const lStyle = {
    display: "block",
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "#868E96",
    marginBottom: 6,
    letterSpacing: "0.8px",
    textTransform: "uppercase",
  };

  return (
    <form onSubmit={submit} style={{ padding: "22px 26px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div>
          <label style={lStyle}>Check-in</label>
          <input
            type="date"
            required
            style={iStyle}
            min={new Date().toISOString().split("T")[0]}
            value={form.check_in_date}
            onChange={(e) =>
              setForm({ ...form, check_in_date: e.target.value })
            }
          />
        </div>
        <div>
          <label style={lStyle}>Check-out</label>
          <input
            type="date"
            required
            style={iStyle}
            min={form.check_in_date || new Date().toISOString().split("T")[0]}
            value={form.check_out_date}
            onChange={(e) =>
              setForm({ ...form, check_out_date: e.target.value })
            }
          />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lStyle}>Guests</label>
        <input
          type="number"
          min={1}
          max={room.capacity || 4}
          style={iStyle}
          value={form.guest_count}
          onChange={(e) => setForm({ ...form, guest_count: +e.target.value })}
        />
      </div>
      {nights > 0 && (
        <div
          style={{
            background: "#F8F9FA",
            border: "1px solid #E9ECEF",
            borderRadius: 6,
            padding: "12px 14px",
            marginBottom: 14,
          }}
        >
          {[
            {
              label: `Rs.${Number(room.price_per_night).toLocaleString()} × ${nights} night${nights > 1 ? "s" : ""}`,
              val: `Rs.${basePrice.toLocaleString()}`,
            },
            { label: "GST (18%)", val: `Rs.${gst.toLocaleString()}` },
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
              <span style={{ color: "#868E96" }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{val}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.9rem",
              borderTop: "1px solid #E9ECEF",
              paddingTop: 8,
              marginTop: 4,
            }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 600,
                color: "#0F1923",
              }}
            >
              Total
            </span>
            <strong
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "#0F1923",
              }}
            >
              Rs.{Math.round(total).toLocaleString()}
            </strong>
          </div>
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: 12,
          background: "#0F1923",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 600,
          fontSize: "0.9rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <CheckIcon size={15} color="#fff" />
        {loading ? "Confirming..." : "Confirm Booking"}
      </button>
    </form>
  );
}
