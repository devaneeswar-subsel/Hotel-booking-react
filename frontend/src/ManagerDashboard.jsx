import React, { useState, useEffect } from "react";
import {
  XIcon,
  DownloadIcon,
  BookingIcon,
  BedIcon,
  CalendarIcon,
  ArrowRightIcon,
  UserIcon,
  SearchIcon,
  CheckIcon,
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
      const diff = Math.floor((new Date() - new Date(checkinTime)) / 1000);
      if (diff < 0) {
        setElapsed("00:00:00");
        return;
      }
      const h = Math.floor(diff / 3600),
        m = Math.floor((diff % 3600) / 60),
        s = diff % 60;
      setElapsed(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [checkinTime]);
  return (
    <span
      style={{
        fontFamily: "monospace",
        fontSize: "1.6rem",
        fontWeight: 700,
        color: "#2D9A6E",
        letterSpacing: "3px",
      }}
    >
      {elapsed}
    </span>
  );
}

/* ── BOOKING DETAIL MODAL ── */
function BookingDetailModal({ bookingId, onClose, showToast, onRefresh }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addonLabel, setAddonLabel] = useState("");
  const [addonAmount, setAddonAmount] = useState("");
  const [addonLoading, setAddonLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [addonPaid, setAddonPaid] = useState(false);
  const PAYMENT_MODES = ["Cash", "UPI", "Card", "Online", "Bank Transfer"];
  const PRESET_ADDONS = [
    "Food & Beverages",
    "Laundry",
    "Spa/Massage",
    "Extra Bed",
    "Room Service",
  ];

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

  async function removeAddon(addonId) {
    await apiFetch(`/api/manager/bookings/${bookingId}/addons/${addonId}`, {
      method: "DELETE",
    });
    showToast("Addon removed", "success");
    fetchBooking();
    onRefresh();
  }

  async function downloadInvoice() {
    if (!booking) return;
    const b = booking;
    const selectedPaymentMode = paymentMode;
    const isAddonPaid = addonPaid;
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
    const roomGst = Math.round(basePrice * GST_RATE * 100) / 100;
    const alreadyPaid = Math.round((basePrice + roomGst) * 100) / 100;
    const addonTotal = Number(b.addon_charges || 0);
    const addonGst = Math.round(addonTotal * GST_RATE * 100) / 100;
    const remaining = Math.round((addonTotal + addonGst) * 100) / 100;
    const grandTotal = Math.round((alreadyPaid + remaining) * 100) / 100;
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
    doc.text("123 Palace Road, Chennai", W / 2 + 8, 57);
    doc.text("hello@vvgrandpark.com | +91 12345 67890", W / 2 + 8, 63);
    doc.text("GSTIN: 33AAAAA0000A1Z5", W / 2 + 8, 69);
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
      { label: "GST (18%)", val: `Rs.${Math.round(roomGst).toLocaleString()}` },
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
    doc.setFillColor(232, 248, 240);
    doc.rect(SX - 1, y - 4, R - SX + 3, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(45, 154, 110);
    doc.text("Amount Already Paid", SX, y + 1);
    doc.text(`Rs.${Math.round(alreadyPaid).toLocaleString()}`, R, y + 1, {
      align: "right",
    });
    y += 9;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.text("ADD-ON CHARGES", L, y + 1);
    y += 6;
    [
      { label: "Add-on Charges", val: `Rs.${addonTotal.toLocaleString()}` },
      {
        label: "GST on Add-ons (18%)",
        val: `Rs.${Math.round(addonGst).toLocaleString()}`,
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
    doc.text(`Rs.${Math.round(remaining).toLocaleString()}`, R, y + 1, {
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
      `Rs.${Math.round(grandTotal).toLocaleString()}`,
      (SX - 1 + R) / 2,
      y + 13,
      { align: "center" },
    );
    const footerY = 282;
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
      "www.vvgrandpark.com  |  hello@vvgrandpark.com  |  +91 12345 67890",
      W / 2,
      footerY + 11,
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
  const roomGst = Math.round(basePrice * GST_RATE * 100) / 100;
  const alreadyPaid = Math.round((basePrice + roomGst) * 100) / 100;
  const addonTotal = Number(booking.addon_charges || 0);
  const addonGst = Math.round(addonTotal * GST_RATE * 100) / 100;
  const remainingAmount = Math.round((addonTotal + addonGst) * 100) / 100;
  const finalTotal = Math.round((alreadyPaid + remainingAmount) * 100) / 100;

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
                fontFamily: "'Playfair Display',serif",
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
                fontFamily: "'Playfair Display',serif",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#0F1923",
                marginBottom: 14,
              }}
            >
              Add-on Charges
            </div>
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
                }}
              >
                + Add
              </button>
            </div>
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
          {/* Payment Mode */}
          <div
            style={{
              background: "#F8F9FA",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#868E96",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Payment Mode
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PAYMENT_MODES.map((mode) => {
                const icons = {
                  Cash: (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                    </svg>
                  ),
                  UPI: (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
                    </svg>
                  ),
                  Card: (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                    </svg>
                  ),
                  Online: (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" />
                    </svg>
                  ),
                  "Bank Transfer": (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11.5 2L2 7v2h19V7L11.5 2zM4 10v7H2v2h20v-2h-2v-7h-2v7h-4v-7h-2v7H8v-7H4z" />
                    </svg>
                  ),
                };
                return (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 16px",
                      borderRadius: 20,
                      border: `2px solid ${paymentMode === mode ? "#0F1923" : "#E9ECEF"}`,
                      background: paymentMode === mode ? "#0F1923" : "#fff",
                      color: paymentMode === mode ? "#C9A84C" : "#495057",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {icons[mode]}
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Bill Summary */}
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
                fontFamily: "'Playfair Display',serif",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#C9A84C",
                marginBottom: 14,
              }}
            >
              Bill Summary
            </div>
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Booking Payment (Already Paid)
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
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.82rem",
                    padding: "4px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>
                    {label}
                  </span>
                  <span
                    style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}
                  >
                    {val}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                  background: "rgba(45,154,110,0.15)",
                  borderRadius: 6,
                  padding: "7px 10px",
                  border: "1px solid rgba(45,154,110,0.3)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "#2D9A6E",
                    fontWeight: 700,
                  }}
                >
                  Amount Already Paid
                </span>
                <span
                  style={{
                    fontSize: "0.95rem",
                    color: "#2D9A6E",
                    fontWeight: 700,
                  }}
                >
                  Rs.{Math.round(alreadyPaid).toLocaleString()}
                </span>
              </div>
            </div>
            <div
              style={{
                borderTop: "1px dashed rgba(255,255,255,0.1)",
                margin: "12px 0",
              }}
            />
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
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
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.82rem",
                    padding: "4px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>
                    {label}
                  </span>
                  <span
                    style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}
                  >
                    {val}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                  background: addonPaid
                    ? "rgba(45,154,110,0.15)"
                    : "rgba(201,168,76,0.12)",
                  borderRadius: 6,
                  padding: "7px 10px",
                  border: `1px solid ${addonPaid ? "rgba(45,154,110,0.3)" : "rgba(201,168,76,0.25)"}`,
                  transition: "all 0.3s",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: addonPaid ? "#2D9A6E" : "#C9A84C",
                      fontWeight: 700,
                    }}
                  >
                    {addonPaid ? "Add-ons Paid" : "Remaining Amount to Pay"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "rgba(255,255,255,0.35)",
                      marginTop: 2,
                    }}
                  >
                    {addonPaid
                      ? `Received via ${paymentMode}`
                      : `via ${paymentMode}`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {addonPaid && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="#2D9A6E"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                  <span
                    style={{
                      fontSize: "1.1rem",
                      color: addonPaid ? "#2D9A6E" : "#C9A84C",
                      fontWeight: 700,
                      fontFamily: "'Playfair Display',serif",
                    }}
                  >
                    Rs.{Math.round(remainingAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                borderTop: "1px solid rgba(201,168,76,0.3)",
                margin: "12px 0",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontWeight: 700,
                  color: "#C9A84C",
                  fontSize: "1rem",
                }}
              >
                Grand Total
              </span>
              <span
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontWeight: 700,
                  color: "#fff",
                  fontSize: "1.4rem",
                }}
              >
                Rs.{Math.round(finalTotal).toLocaleString()}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={downloadInvoice}
              style={{
                flex: 1,
                padding: 12,
                background: "#0F1923",
                color: "#C9A84C",
                border: "none",
                borderRadius: 8,
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <DownloadIcon size={14} color="#C9A84C" /> Download Invoice
            </button>
            <button
              onClick={() => setAddonPaid(!addonPaid)}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: addonTotal > 0 ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                border: "none",
                transition: "all 0.2s",
                background: addonPaid
                  ? "#2D9A6E"
                  : addonTotal > 0
                    ? "#C9A84C"
                    : "#E9ECEF",
                color: addonPaid
                  ? "#fff"
                  : addonTotal > 0
                    ? "#0F1923"
                    : "#868E96",
                opacity: addonTotal > 0 ? 1 : 0.6,
              }}
              disabled={addonTotal === 0}
            >
              {addonPaid ? (
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
    fontFamily: "inherit",
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
                fontFamily: "'Playfair Display',serif",
                fontWeight: 600,
                color: "#0F1923",
              }}
            >
              Total
            </span>
            <strong
              style={{
                fontFamily: "'Playfair Display',serif",
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
          fontFamily: "inherit",
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

/* ── REPORTS TAB ── */
function ReportsTab({ showToast }) {
  const [reportType, setReportType] = useState("weekly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchReport() {
    setLoading(true);
    try {
      let url = `/api/manager/reports?type=${reportType}`;
      if (reportType === "custom" && customStart && customEnd)
        url = `/api/manager/reports?start_date=${customStart}&end_date=${customEnd}`;
      const res = await apiFetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReportData(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchReport();
  }, []); // eslint-disable-line

  async function downloadReport() {
    if (!reportData) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    doc.setFillColor(15, 25, 35);
    doc.rect(0, 0, W, 45, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(201, 168, 76);
    doc.text("VV GRAND PARK", 18, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(180, 160, 100);
    doc.text("RESIDENCY", 18, 25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const reportTitle =
      reportType === "weekly"
        ? "WEEKLY REPORT"
        : reportType === "monthly"
          ? "MONTHLY REPORT"
          : "CUSTOM REPORT";
    doc.text(reportTitle, W - 18, 18, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 140, 120);
    doc.text(
      `Period: ${reportData.startDate} to ${reportData.endDate}`,
      W - 18,
      26,
      { align: "right" },
    );
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
      W - 18,
      33,
      { align: "right" },
    );
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.5);
    doc.line(18, 52, W - 18, 52);
    const s = reportData.summary;
    const summaryY = 58;
    [
      { label: "Total Bookings", val: String(s.total_bookings || 0) },
      { label: "Confirmed", val: String(s.confirmed || 0) },
      { label: "Completed", val: String(s.completed || 0) },
      {
        label: "Total Revenue",
        val: `Rs.${Number(s.total_revenue || 0).toLocaleString()}`,
      },
    ].forEach((box, i) => {
      const x = 18 + i * 46;
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(x, summaryY, 42, 22, 3, 3, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(134, 142, 150);
      doc.text(box.label, x + 21, summaryY + 8, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 25, 35);
      doc.text(box.val, x + 21, summaryY + 17, { align: "center" });
    });
    let infoY = summaryY + 30;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(73, 80, 87);
    doc.text(
      `Total GST Collected: Rs.${Number(s.total_gst || 0).toLocaleString()}`,
      18,
      infoY,
    );
    doc.text(
      `Total Add-on Revenue: Rs.${Number(s.total_addons || 0).toLocaleString()}`,
      18,
      infoY + 7,
    );
    let tableY = infoY + 18;
    doc.setFillColor(15, 25, 35);
    doc.rect(18, tableY, W - 36, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(201, 168, 76);
    doc.text("#", 22, tableY + 7);
    doc.text("Guest", 30, tableY + 7);
    doc.text("Room", 70, tableY + 7);
    doc.text("Check-in", 95, tableY + 7);
    doc.text("Check-out", 120, tableY + 7);
    doc.text("Status", 148, tableY + 7);
    doc.text("Total", W - 18, tableY + 7, { align: "right" });
    tableY += 13;
    reportData.bookings.forEach((b, i) => {
      if (tableY > 265) {
        doc.addPage();
        tableY = 20;
      }
      if (i % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(18, tableY - 6, W - 36, 10, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 25, 35);
      doc.text(String(b.booking_id), 22, tableY);
      doc.text((b.guest_name || "—").substring(0, 16), 30, tableY);
      doc.text((b.room_type || "—").substring(0, 12), 70, tableY);
      doc.text(b.check_in_date?.slice(0, 10) || "—", 95, tableY);
      doc.text(b.check_out_date?.slice(0, 10) || "—", 120, tableY);
      const sc = {
        confirmed: [45, 154, 110],
        completed: [36, 113, 163],
        cancelled: [192, 57, 43],
      }[b.status] || [134, 142, 150];
      doc.setTextColor(...sc);
      doc.text((b.status || "—").toUpperCase(), 148, tableY);
      doc.setTextColor(15, 25, 35);
      doc.text(
        `Rs.${Number(b.final_total || b.total_price || 0).toLocaleString()}`,
        W - 18,
        tableY,
        { align: "right" },
      );
      tableY += 10;
    });
    tableY += 4;
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.4);
    doc.line(18, tableY, W - 18, tableY);
    tableY += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 25, 35);
    doc.text("GRAND TOTAL REVENUE", 18, tableY);
    doc.setTextColor(201, 168, 76);
    doc.text(
      `Rs.${Number(s.total_revenue || 0).toLocaleString()}`,
      W - 18,
      tableY,
      { align: "right" },
    );
    doc.setPage(doc.internal.getNumberOfPages());
    const footerY = 282;
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.3);
    doc.line(18, footerY - 8, W - 18, footerY - 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(134, 142, 150);
    doc.text("VV Grand Park Residency — Confidential Report", W / 2, footerY, {
      align: "center",
    });
    doc.save(
      `VVGrandPark_${reportTitle.replace(" ", "_")}_${reportData.startDate}_to_${reportData.endDate}.pdf`,
    );
  }

  return (
    <div>
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "20px 22px",
          border: "1px solid #E9ECEF",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#0F1923",
            marginBottom: 16,
          }}
        >
          Generate Report
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          {["weekly", "monthly", "custom"].map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              style={{
                padding: "8px 20px",
                borderRadius: 6,
                border: `1.5px solid ${reportType === type ? "#0F1923" : "#E9ECEF"}`,
                background: reportType === type ? "#0F1923" : "#fff",
                color: reportType === type ? "#fff" : "#495057",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                textTransform: "capitalize",
              }}
            >
              {type}
            </button>
          ))}
          {reportType === "custom" && (
            <>
              <div>
                <div
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    color: "#868E96",
                    marginBottom: 4,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                  }}
                >
                  Start Date
                </div>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1.5px solid #E9ECEF",
                    fontSize: "0.82rem",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    color: "#868E96",
                    marginBottom: 4,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                  }}
                >
                  End Date
                </div>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1.5px solid #E9ECEF",
                    fontSize: "0.82rem",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </>
          )}
          <button
            onClick={fetchReport}
            disabled={loading}
            style={{
              padding: "9px 20px",
              borderRadius: 6,
              background: "#C9A84C",
              color: "#fff",
              border: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {loading ? "Loading..." : "Generate"}
          </button>
        </div>
      </div>
      {reportData && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Total Bookings",
                val: reportData.summary.total_bookings || 0,
                color: "#2471A3",
              },
              {
                label: "Total Revenue",
                val: `Rs.${Number(reportData.summary.total_revenue || 0).toLocaleString()}`,
                color: "#C9A84C",
              },
              {
                label: "GST Collected",
                val: `Rs.${Number(reportData.summary.total_gst || 0).toLocaleString()}`,
                color: "#2D9A6E",
              },
              {
                label: "Add-on Revenue",
                val: `Rs.${Number(reportData.summary.total_addons || 0).toLocaleString()}`,
                color: "#9B59B6",
              },
              {
                label: "Confirmed",
                val: reportData.summary.confirmed || 0,
                color: "#2D9A6E",
              },
              {
                label: "Completed",
                val: reportData.summary.completed || 0,
                color: "#2471A3",
              },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "16px 18px",
                  border: "1px solid #E9ECEF",
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <div
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    color: "#868E96",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: "'Playfair Display',serif",
                    fontSize: "1.4rem",
                    fontWeight: 600,
                    color: "#0F1923",
                  }}
                >
                  {val}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={downloadReport}
              style={{
                padding: "12px 28px",
                background: "#0F1923",
                color: "#C9A84C",
                border: "none",
                borderRadius: 8,
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <DownloadIcon size={16} color="#C9A84C" />
              Download{" "}
              {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
              PDF
            </button>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "20px 22px",
              border: "1px solid #E9ECEF",
            }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: "1rem",
                fontWeight: 600,
                color: "#0F1923",
                marginBottom: 16,
              }}
            >
              Bookings ({reportData.startDate} → {reportData.endDate})
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 400,
                  color: "#868E96",
                  marginLeft: 8,
                }}
              >
                ({reportData.bookings.length} records)
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 600,
                }}
              >
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
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontSize: "0.6rem",
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
                  {reportData.bookings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        style={{
                          padding: "30px",
                          textAlign: "center",
                          color: "#868E96",
                          fontSize: "0.85rem",
                        }}
                      >
                        No bookings in this period
                      </td>
                    </tr>
                  ) : (
                    reportData.bookings.map((b) => (
                      <tr
                        key={b.booking_id}
                        style={{ borderTop: "1px solid #F1F3F5" }}
                      >
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: "0.75rem",
                            color: "#868E96",
                          }}
                        >
                          #{b.booking_id}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: "#0F1923",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.guest_name}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: "0.78rem",
                            color: "#495057",
                          }}
                        >
                          {b.room_type}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: "0.78rem",
                            color: "#495057",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.check_in_date?.slice(0, 10)}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: "0.78rem",
                            color: "#495057",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.check_out_date?.slice(0, 10)}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: "0.78rem",
                            color: "#495057",
                          }}
                        >
                          Rs.{Number(b.total_price || 0).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: "0.78rem",
                            color: "#C9A84C",
                            fontWeight: 600,
                          }}
                        >
                          Rs.{Number(b.addon_charges || 0).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: "0.78rem",
                            color: "#868E96",
                          }}
                        >
                          Rs.{Number(b.gst_amount || 0).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "#0F1923",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Rs.
                          {Number(
                            b.final_total || b.total_price || 0,
                          ).toLocaleString()}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 3,
                              fontSize: "0.6rem",
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
                    ))
                  )}
                </tbody>
                {reportData.bookings.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #0F1923" }}>
                      <td
                        colSpan={8}
                        style={{
                          padding: "10px 12px",
                          fontFamily: "'Playfair Display',serif",
                          fontWeight: 700,
                          color: "#0F1923",
                          fontSize: "0.85rem",
                        }}
                      >
                        TOTAL REVENUE
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          padding: "10px 12px",
                          fontFamily: "'Playfair Display',serif",
                          fontWeight: 700,
                          color: "#C9A84C",
                          fontSize: "1rem",
                        }}
                      >
                        Rs.
                        {Number(
                          reportData.summary.total_revenue || 0,
                        ).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
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
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  }, []);

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  const filteredBookings = bookings.filter(
    (b) =>
      !searchTerm ||
      b.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.room_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const checkedInBookings = bookings.filter(
    (b) => b.actual_checkin && !b.actual_checkout && b.status === "confirmed",
  );

  const tabs = [
    { id: "bookings", label: "Bookings", icon: BookingIcon },
    { id: "checkins", label: "Check-in Details", icon: BedIcon },
    { id: "book", label: "New Booking", icon: CalendarIcon },
    { id: "reports", label: "Reports", icon: DownloadIcon },
  ];

  const SIDEBAR_W = 210;

  const SidebarContent = () => (
    <>
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
          style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display',serif",
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
              fontFamily: "'Playfair Display',serif",
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
          Manager
        </div>
        {tabs.map(({ id, label, icon: TabIcon }) => (
          <div
            key={id}
            onClick={() => {
              setTab(id);
              setSidebarOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 20px",
              cursor: "pointer",
              background: tab === id ? "rgba(201,168,76,0.12)" : "transparent",
              borderLeft:
                tab === id ? "2.5px solid #C9A84C" : "2.5px solid transparent",
              color: tab === id ? "#C9A84C" : "rgba(255,255,255,0.5)",
              fontSize: "0.82rem",
              fontWeight: tab === id ? 600 : 400,
              transition: "all 0.18s",
            }}
          >
            <TabIcon
              size={15}
              color={tab === id ? "#C9A84C" : "rgba(255,255,255,0.4)"}
            />
            {label}
            {id === "checkins" && checkedInBookings.length > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  background: "#2D9A6E",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "1px 7px",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                }}
              >
                {checkedInBookings.length}
              </span>
            )}
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
              {managerUser?.name}
            </div>
            <div
              style={{
                fontSize: "0.65rem",
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Manager
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
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
          <ArrowRightIcon size={13} color="rgba(255,255,255,0.5)" /> Sign Out
        </button>
      </div>
    </>
  );

  const tabLabels = {
    bookings: "Bookings",
    checkins: "Check-in Details",
    book: "New Booking",
    reports: "Reports",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F9FA",
        fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
      }}
    >
      {/* Desktop Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: SIDEBAR_W,
          background: "#0F1923",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid rgba(201,168,76,0.12)",
          zIndex: 100,
        }}
        className="admin-sidebar-desktop"
      >
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: SIDEBAR_W,
              background: "#0F1923",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar-desktop { display: none !important; }
          .manager-main { margin-left: 0 !important; }
          .admin-hamburger { display: flex !important; }
        }
        @keyframes pulse-green { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <div
        className="manager-main"
        style={{ marginLeft: SIDEBAR_W, minHeight: "100vh" }}
      >
        {/* Topbar */}
        <div
          style={{
            background: "#0F1923",
            padding: "0 20px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(201,168,76,0.12)",
            position: "sticky",
            top: 0,
            zIndex: 99,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="admin-hamburger"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              display: "none",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 22,
                  height: 2,
                  background: "#C9A84C",
                  borderRadius: 2,
                }}
              />
            ))}
          </button>
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: "1.05rem",
                fontWeight: 600,
                color: "#fff",
              }}
            >
              {tabLabels[tab]}
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
            Manager Portal
          </div>
        </div>

        <div style={{ padding: "20px" }}>
          {/* ── BOOKINGS TAB ── */}
          {tab === "bookings" && (
            <div
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "20px 22px",
                border: "1px solid #E9ECEF",
              }}
            >
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
                    fontFamily: "'Playfair Display',serif",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "#0F1923",
                  }}
                >
                  All Bookings
                  <span
                    style={{
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
                    minWidth: 200,
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
              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#868E96",
                  }}
                >
                  Loading bookings...
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 650,
                    }}
                  >
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
                              fontSize: "0.85rem",
                              fontWeight: 700,
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
                            <button
                              onClick={() => setSelectedBookingId(b.booking_id)}
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
                              Details
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

          {/* ── CHECK-IN DETAILS TAB ── */}
          {tab === "checkins" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display',serif",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: "#0F1923",
                    }}
                  >
                    Currently Checked-in Guests
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "#868E96",
                      marginTop: 3,
                    }}
                  >
                    {checkedInBookings.length > 0 ? (
                      <span>
                        <span style={{ color: "#2D9A6E", fontWeight: 600 }}>
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
                  style={{
                    background: "#0F1923",
                    color: "#C9A84C",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  ↻ Refresh
                </button>
              </div>
              {checkedInBookings.length === 0 ? (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #E9ECEF",
                    padding: "60px 20px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "3rem", marginBottom: 14 }}>🏨</div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display',serif",
                      fontSize: "1.1rem",
                      color: "#0F1923",
                      marginBottom: 8,
                    }}
                  >
                    No guests currently checked in
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#868E96" }}>
                    When a booking is checked in, it will appear here with a
                    live timer
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
                    gap: 16,
                  }}
                >
                  {checkedInBookings.map((b) => (
                    <div
                      key={b.booking_id}
                      style={{
                        background: "#fff",
                        borderRadius: 16,
                        border: "1px solid #E9ECEF",
                        overflow: "hidden",
                        boxShadow: "0 2px 12px rgba(15,25,35,0.08)",
                      }}
                    >
                      <div
                        style={{
                          background: "#0F1923",
                          padding: "16px 20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: "50%",
                              background: "rgba(201,168,76,0.2)",
                              border: "1.5px solid #C9A84C",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.1rem",
                              fontWeight: 700,
                              color: "#C9A84C",
                              fontFamily: "'Playfair Display',serif",
                            }}
                          >
                            {b.guest_name?.charAt(0)}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                color: "#fff",
                              }}
                            >
                              {b.guest_name}
                            </div>
                            <div
                              style={{
                                fontSize: "0.68rem",
                                color: "rgba(255,255,255,0.4)",
                                marginTop: 1,
                              }}
                            >
                              Booking #{b.booking_id}
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            background: "rgba(45,154,110,0.2)",
                            border: "1px solid #2D9A6E",
                            borderRadius: 20,
                            padding: "3px 10px",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#2D9A6E",
                              display: "inline-block",
                              animation:
                                "pulse-green 1.5s ease-in-out infinite",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              color: "#2D9A6E",
                              letterSpacing: "1px",
                            }}
                          >
                            LIVE
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          background: "#F0FDF6",
                          borderBottom: "1px solid #BBF0D6",
                          padding: "16px 20px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            color: "#868E96",
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                            marginBottom: 8,
                          }}
                        >
                          Time Spent on Premises
                        </div>
                        <LiveTimer checkinTime={b.actual_checkin} />
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "#6B7280",
                            marginTop: 6,
                          }}
                        >
                          Checked in:{" "}
                          {new Date(b.actual_checkin).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div style={{ padding: "14px 18px 18px" }}>
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
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "0.78rem",
                              padding: "6px 0",
                              borderBottom: "1px solid #F3F4F6",
                            }}
                          >
                            <span style={{ color: "#9CA3AF" }}>{label}</span>
                            <span style={{ fontWeight: 600, color: "#0F1923" }}>
                              {val}
                            </span>
                          </div>
                        ))}
                        <button
                          onClick={() => setSelectedBookingId(b.booking_id)}
                          style={{
                            width: "100%",
                            marginTop: 14,
                            padding: "10px",
                            background: "#0F1923",
                            color: "#C9A84C",
                            border: "none",
                            borderRadius: 8,
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
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

          {/* ── NEW BOOKING TAB ── */}
          {tab === "book" && (
            <div>
              <div
                style={{
                  fontFamily: "'Playfair Display',serif",
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
                  gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
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
                      }}
                    >
                      <div style={{ height: 140, overflow: "hidden" }}>
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
                      <div style={{ padding: "14px 16px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              background: "#0F1923",
                              color: "#E8D5A3",
                              padding: "2px 8px",
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
                            style={{ fontSize: "0.72rem", color: "#868E96" }}
                          >
                            👥 {r.capacity || 2}
                          </span>
                        </div>
                        <div
                          style={{
                            fontFamily: "'Playfair Display',serif",
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            color: "#0F1923",
                            marginBottom: 2,
                          }}
                        >
                          Room {r.room_number || r.room_id}
                        </div>
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "#868E96",
                            marginBottom: 12,
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
                                fontFamily: "'Playfair Display',serif",
                                fontSize: "1rem",
                                fontWeight: 600,
                                color: "#0F1923",
                              }}
                            >
                              Rs.{Number(r.price_per_night).toLocaleString()}{" "}
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 400,
                                  color: "#868E96",
                                }}
                              >
                                /night
                              </span>
                            </div>
                            <div
                              style={{ fontSize: "0.62rem", color: "#868E96" }}
                            >
                              +18% GST
                            </div>
                          </div>
                          <button
                            onClick={() => setBookingRoom(r)}
                            style={{
                              background: "#0F1923",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "7px 14px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
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

          {/* ── REPORTS TAB ── */}
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
                  fontFamily: "'Playfair Display',serif",
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
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: toast.type === "error" ? "#C0392B" : "#2D9A6E",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 10,
            fontSize: "0.85rem",
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            fontFamily: "inherit",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
