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

const API = "http://localhost:5000";

/* ── MINI SVG CHART COMPONENTS ───────────────────────────────────── */

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
        const x = i * 28 + 4;
        const y = height - barH - 4;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
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
  const circumference = 2 * Math.PI * r;
  const segments = [
    { val: confirmed, color: "#2D9A6E", label: "Confirmed" },
    { val: cancelled, color: "#C0392B", label: "Cancelled" },
    { val: completed, color: "#2471A3", label: "Completed" },
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
        const dash = (val / total) * circumference;
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${circumference - dash}`}
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
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {total}
      </text>
    </svg>
  );
}

/* ── STAT CARD ───────────────────────────────────────────────────── */
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
        gap: 0,
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

/* ── MAIN ADMIN DASHBOARD ────────────────────────────────────────── */
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

  useEffect(() => {
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
      showToast(`Room ${current ? "disabled" : "enabled"}`, "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function downloadInvoice(b) {
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
    const pricePerNight = Math.round(Number(b.total_price) / nights);

    // Dynamically import jsPDF
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210; // A4 width mm

    // ── HEADER BAND ──────────────────────────────
    doc.setFillColor(15, 25, 35); // navy
    doc.rect(0, 0, W, 42, "F");

    // Hotel name
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(201, 168, 76); // gold
    doc.text("VV GRAND PARK", 18, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(180, 160, 100);
    doc.text("RESIDENCY", 18, 25);

    // Invoice label on right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("INVOICE", W - 18, 20, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 140, 120);
    doc.text(invNo, W - 18, 27, { align: "right" });
    doc.text(`Date: ${today}`, W - 18, 33, { align: "right" });

    // ── GOLD DIVIDER ─────────────────────────────
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.5);
    doc.line(18, 48, W - 18, 48);

    // ── BILL TO / HOTEL INFO ──────────────────────
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
    doc.text("+91 12345 67890", W / 2 + 10, 84);

    // ── BOOKING DETAILS TABLE ──────────────────────
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
        desc: `${b.room_type} — Room ${b.room_id}`,
        detail: `${ci} → ${co}`,
        amount: `Rs.${pricePerNight.toLocaleString()} × ${nights} night${nights > 1 ? "s" : ""}`,
      },
      {
        desc: "Guest Count",
        detail: `${b.guest_count || 1} guest${(b.guest_count || 1) > 1 ? "s" : ""}`,
        amount: "—",
      },
      { desc: "Booking Status", detail: b.status?.toUpperCase(), amount: "—" },
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

    // ── TOTAL BOX ─────────────────────────────────
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
    doc.text("TOTAL AMOUNT", W - 49, y + 1, { align: "center" });
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(`Rs.${Number(b.total_price).toLocaleString()}`, W - 49, y + 9, {
      align: "center",
    });

    // ── PAYMENT STATUS BADGE ───────────────────────
    y += 28;
    const statusColor =
      b.status === "confirmed"
        ? [45, 154, 110]
        : b.status === "cancelled"
          ? [192, 57, 43]
          : [36, 113, 163];
    doc.setFillColor(...statusColor);
    doc.roundedRect(18, y - 5, 36, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(b.status?.toUpperCase(), 36, y + 2, { align: "center" });

    // ── FOOTER ────────────────────────────────────
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

    // ── SAVE ──────────────────────────────────────
    doc.save(`${invNo}-${(b.guest_name || "guest").replace(/\s+/g, "_")}.pdf`);
  }

  // Chart data derived from bookings
  const last7 = Array(7)
    .fill(0)
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      const value = bookings.filter(
        (b) => b.check_in_date?.slice(0, 10) === d.toISOString().slice(0, 10),
      ).length;
      return { label, value };
    });

  const revenueByRoom = rooms
    .map((r) => ({
      label: r.room_type,
      value: bookings
        .filter((b) => b.room_type === r.room_type && b.status === "confirmed")
        .reduce((sum, b) => sum + Number(b.total_price), 0),
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

  /* ── TABS ── */
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
    sidebarLogo: {
      padding: "24px 20px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      fontFamily: "'Playfair Display', serif",
      fontSize: "1.1rem",
      fontWeight: 700,
      color: "#fff",
      letterSpacing: "2px",
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    logoDot: { width: 6, height: 6, background: "#C9A84C", borderRadius: "50" },
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
      letterSpacing: "0.2px",
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
        <div style={{ color: "#868E96", fontSize: "0.9rem" }}>
          Loading dashboard...
        </div>
      </div>
    );

  return (
    <div style={s.wrap}>
      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <div style={s.sidebarLogo}>
          <img
            src="/logo.png"
            alt="VV Grand Park"
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

        {/* User info at bottom */}
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
            <ArrowRightIcon
              size={13}
              color="rgba(255,255,255,0.5)"
              style={{ transform: "rotate(180deg)" }}
            />
            Back to Site
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={s.main}>
        {/* TOPBAR */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        </div>

        <div style={s.content}>
          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && stats && (
            <>
              {/* STAT CARDS */}
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

              {/* CHARTS ROW */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 280px",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {/* Bookings trend */}
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
                  <div style={{ marginBottom: 8 }}>
                    <LineChart data={last7} color="#C9A84C" height={80} />
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
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

                {/* Revenue by room */}
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
                        Revenue by Room Type
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

                {/* Booking status donut */}
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

              {/* RECENT BOOKINGS */}
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
                          "Amount",
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
                          style={{ borderTop: "1px solid #F1F3F5" }}
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
                            Rs.{Number(b.total_price).toLocaleString()}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: 4,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                letterSpacing: "0.5px",
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

          {/* ── BOOKINGS TAB ── */}
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
                  All Bookings
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
                        "Email",
                        "Room",
                        "Check-in",
                        "Check-out",
                        "Guests",
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
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.78rem",
                            color: "#868E96",
                          }}
                        >
                          {b.email}
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            fontSize: "0.82rem",
                            color: "#495057",
                          }}
                        >
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
                            textAlign: "center",
                          }}
                        >
                          {b.guest_count}
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
                          Rs.{Number(b.total_price).toLocaleString()}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 9px",
                              borderRadius: 3,
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              letterSpacing: "0.5px",
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
                            {b.status === "confirmed" && (
                              <button
                                onClick={() => cancelBooking(b.booking_id)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
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
                            <button
                              onClick={() => downloadInvoice(b)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 10px",
                                border: "1.5px solid #C9A84C",
                                color: "#9A7A2E",
                                background: "none",
                                borderRadius: 4,
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              <DownloadIcon size={11} color="#9A7A2E" /> Invoice
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

          {/* ── ROOMS TAB ── */}
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
                Room Management
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
                              letterSpacing: "0.5px",
                            }}
                          >
                            {r.is_available ? "Available" : "Disabled"}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() =>
                                toggleRoom(r.room_id, r.is_available)
                              }
                              style={{
                                padding: "5px 14px",
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
                              {r.is_available ? "Disable" : "Enable"}
                            </button>
                            <button
                              onClick={() => {
                                setBookingRoom(r);
                                setTab("book");
                              }}
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

          {/* ── USERS TAB ── */}
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
                Registered Users
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
                        {["#", "Name", "Email", "Phone", "Role", "Joined"].map(
                          (h) => (
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
                          ),
                        )}
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
                                  fontFamily: "'Playfair Display', serif",
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
                                letterSpacing: "0.5px",
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── NEW BOOKING TAB ── */}
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
                          <div
                            style={{
                              fontFamily: "'Playfair Display', serif",
                              fontSize: "1.15rem",
                              fontWeight: 600,
                              color: "#0F1923",
                            }}
                          >
                            Rs.{Number(r.price_per_night).toLocaleString()}{" "}
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 400,
                                color: "#868E96",
                              }}
                            >
                              /night
                            </span>
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

      {/* Booking modal */}
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
                fetch(`${API}/api/admin/bookings`)
                  .then((r) => r.json())
                  .then(setBookings);
                fetch(`${API}/api/admin/stats`)
                  .then((r) => r.json())
                  .then(setStats);
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
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 14,
            fontSize: "0.85rem",
          }}
        >
          <span style={{ color: "#868E96" }}>
            Rs.{Number(room.price_per_night).toLocaleString()} × {nights} night
            {nights > 1 ? "s" : ""}
          </span>
          <strong
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#0F1923",
            }}
          >
            Rs.{(room.price_per_night * nights).toLocaleString()}
          </strong>
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
