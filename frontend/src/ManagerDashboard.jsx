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
} from "./Icons";

const API = process.env.REACT_APP_API_URL;
const GST_RATE = 0.18;

const apiFetch = (url, options = {}) =>
  fetch(`${API}${url}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

/* ── BOOKING DETAIL MODAL ── */
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
    y += 4;
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.3);
    doc.line(18, y, W - 18, y);
    y += 8;
    [
      { label: "Room Charges", val: `Rs.${basePrice.toLocaleString()}` },
      { label: "Add-on Charges", val: `Rs.${addonTotal.toLocaleString()}` },
      { label: "Subtotal", val: `Rs.${subtotal.toLocaleString()}` },
      { label: "GST (18%)", val: `Rs.${Math.round(gst).toLocaleString()}` },
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
      if (reportType === "custom" && customStart && customEnd) {
        url = `/api/manager/reports?start_date=${customStart}&end_date=${customEnd}`;
      }
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

    // Header
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

    // Summary boxes
    const s = reportData.summary;
    const summaryY = 58;
    const boxes = [
      { label: "Total Bookings", val: String(s.total_bookings || 0) },
      { label: "Confirmed", val: String(s.confirmed || 0) },
      { label: "Completed", val: String(s.completed || 0) },
      {
        label: "Total Revenue",
        val: `Rs.${Number(s.total_revenue || 0).toLocaleString()}`,
      },
    ];
    boxes.forEach((box, i) => {
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

    // GST & Addon summary
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

    // Table header
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
        // New page
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
      const statusColors = {
        confirmed: [45, 154, 110],
        completed: [36, 113, 163],
        cancelled: [192, 57, 43],
      };
      const sc = statusColors[b.status] || [134, 142, 150];
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

    // Total line
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

    // Footer
    const lastPage = doc.internal.getNumberOfPages();
    doc.setPage(lastPage);
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

    const filename = `VVGrandPark_${reportTitle.replace(" ", "_")}_${reportData.startDate}_to_${reportData.endDate}.pdf`;
    doc.save(filename);
  }

  return (
    <div>
      {/* Report Controls */}
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
            fontFamily: "'Playfair Display', serif",
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

      {/* Summary Cards */}
      {reportData && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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
                    fontFamily: "'Playfair Display', serif",
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

          {/* Download Button */}
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

          {/* Booking Table */}
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
                fontFamily: "'Playfair Display', serif",
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
                          fontFamily: "'Playfair Display', serif",
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
                          fontFamily: "'Playfair Display', serif",
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBookings = () => {
    setLoading(true);
    apiFetch("/api/manager/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
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

  const tabs = [
    { id: "bookings", label: "Bookings", icon: BookingIcon },
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F9FA",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
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
      `}</style>

      {/* Main */}
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
            <div
              style={{
                width: 22,
                height: 2,
                background: "#C9A84C",
                borderRadius: 2,
              }}
            />
            <div
              style={{
                width: 22,
                height: 2,
                background: "#C9A84C",
                borderRadius: 2,
              }}
            />
            <div
              style={{
                width: 22,
                height: 2,
                background: "#C9A84C",
                borderRadius: 2,
              }}
            />
          </button>
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.05rem",
                fontWeight: 600,
                color: "#fff",
              }}
            >
              {tab === "bookings" ? "Bookings" : "Reports"}
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
          {/* BOOKINGS TAB */}
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
                    fontFamily: "'Playfair Display', serif",
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

          {/* REPORTS TAB */}
          {tab === "reports" && <ReportsTab showToast={showToast} />}
        </div>
      </div>

      {/* Modals */}
      {selectedBookingId && (
        <BookingDetailModal
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          showToast={showToast}
          onRefresh={fetchBookings}
        />
      )}

      {/* Toast */}
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
