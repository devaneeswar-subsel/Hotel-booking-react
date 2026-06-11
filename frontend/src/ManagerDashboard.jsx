import React, { useState, useEffect, useCallback } from "react";
import {
  XIcon,
  DownloadIcon,
  BookingIcon,
  BedIcon,
  CalendarIcon,
  ArrowRightIcon,
  UserIcon,
  CheckIcon,
} from "./Icons";

const API = process.env.REACT_APP_API_URL || "";
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

  const fetchBooking = useCallback(() => {
    setLoading(true);
    apiFetch(`/api/manager/bookings/${bookingId}`)
      .then((r) => r.json())
      .then(setBooking)
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

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
      "success"
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
            (new Date(b.check_out_date) - new Date(b.check_in_date)) / 86400000
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
          y
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
      y
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
      { align: "center" }
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
      { align: "center" }
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      "www.vvgrandpark.com  |  hello@vvgrandpark.com  |  +91 12345 67890",
      W / 2,
      footerY + 11,
      { align: "center" }
    );
    doc.save(`${invNo}-${(b.guest_name || "guest").replace(/\s+/g, "_")}.pdf`);
  }

  if (loading)
    return (
      <div className="fixed inset-0 bg-[#0F1923]/70 z-[600] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-[#868E96]">
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
    <div className="fixed inset-0 z-[600] flex justify-center p-4 bg-[#0F1923]/70 backdrop-blur-[6px] overflow-y-auto items-start sm:items-center">
      <div className="bg-white rounded-[20px] w-full max-w-[720px] md:max-w-[900px] lg:max-w-[1100px] mx-auto my-auto max-h-[90vh] overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.25)]">

        {/* Modal Header */}
        <div className="bg-[#0F1923] px-7 py-5 flex items-center justify-between shrink-0">
          <div>
            <div className="font-['Playfair_Display',serif] text-[1.05rem] font-semibold text-white">
              Booking #{booking.booking_id} — {booking.guest_name}
            </div>
            <div className="text-[0.75rem] text-white/45 mt-[2px]">
              {booking.room_type} · {booking.check_in_date?.slice(0, 10)} → {booking.check_out_date?.slice(0, 10)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition hover:bg-white/20"
          >
            <XIcon size={14} color="#fff" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto flex-1 px-7 py-[22px]">

          {/* Check-In / Check-Out Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="bg-[#F8F9FA] rounded-xl px-[18px] py-4">
              <div className="text-[0.62rem] font-bold text-[#868E96] tracking-[1px] uppercase mb-2">
                Check-in
              </div>
              {booking.actual_checkin ? (
                <div className="text-[0.82rem] font-semibold text-[#2D9A6E]">
                  ✅ {new Date(booking.actual_checkin).toLocaleString("en-IN")}
                </div>
              ) : (
                <button
                  onClick={handleCheckin}
                  disabled={booking.status === "cancelled"}
                  className="bg-[#2D9A6E] text-white rounded-md px-[18px] py-2 text-[0.8rem] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ▶ Record Check-in
                </button>
              )}
            </div>

            <div className="bg-[#F8F9FA] rounded-xl px-[18px] py-4">
              <div className="text-[0.62rem] font-bold text-[#868E96] tracking-[1px] uppercase mb-2">
                Check-out
              </div>
              {booking.actual_checkout ? (
                <div>
                  <div className="text-[0.82rem] text-[#2471A3] font-semibold">
                    ✅ {new Date(booking.actual_checkout).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[0.75rem] text-[#868E96] mt-1">
                    Duration: {booking.hours_spent}h
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={!booking.actual_checkin || booking.status === "cancelled"}
                  className={`text-white rounded-md px-[18px] py-2 text-[0.8rem] font-semibold transition-colors ${
                    booking.actual_checkin ? "bg-[#2471A3] cursor-pointer" : "bg-[#CCC] cursor-not-allowed"
                  }`}
                >
                  ⏹ Record Check-out
                </button>
              )}
            </div>
          </div>

          {/* Add-ons Section */}
          <div className="bg-[#F8F9FA] rounded-xl px-5 py-4 mb-5">
            <div className="font-['Playfair_Display',serif] text-[0.9rem] font-semibold text-[#0F1923] mb-3.5">
              Add-on Charges
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESET_ADDONS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAddonLabel(preset)}
                  className={`border-[1.5px] rounded-[20px] px-3 py-1 text-[0.72rem] font-semibold cursor-pointer transition ${
                    addonLabel === preset ? "bg-[#0F1923] border-[#0F1923] text-[#E8D5A3]" : "bg-white border-[#E9ECEF] text-[#495057]"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Inputs Form */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                value={addonLabel}
                onChange={(e) => setAddonLabel(e.target.value)}
                placeholder="Label (e.g. Airport Transfer)"
                className="flex-1 sm:flex-[2] px-3 py-2 rounded-md border-[1.5px] border-[#E9ECEF] text-[0.82rem] focus:outline-none focus:border-[#C9A84C]"
              />
              <input
                value={addonAmount}
                onChange={(e) => setAddonAmount(e.target.value)}
                placeholder="Amount ₹"
                type="number"
                className="flex-1 px-3 py-2 rounded-md border-[1.5px] border-[#E9ECEF] text-[0.82rem] focus:outline-none focus:border-[#C9A84C]"
              />
              <button
                onClick={addAddon}
                disabled={addonLoading}
                className="bg-[#C9A84C] text-white rounded-md px-4 py-2 text-[0.82rem] font-semibold cursor-pointer transition hover:bg-[#b5943b] disabled:opacity-50"
              >
                + Add
              </button>
            </div>

            {/* Existing Addons List */}
            {booking.addons && booking.addons.length > 0 ? (
              booking.addons.map((addon) => (
                <div
                  key={addon.addon_id}
                  className="flex items-center justify-between bg-white rounded-md px-3 py-2 mb-1.5 border border-[#E9ECEF]"
                >
                  <span className="text-[0.82rem] text-[#0F1923]">
                    {addon.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[0.85rem] font-bold text-[#0F1923]">
                      Rs.{Number(addon.amount).toLocaleString()}
                    </span>
                    <button
                      onClick={() => removeAddon(addon.addon_id)}
                      className="bg-transparent border-none cursor-pointer text-[#C0392B] text-[0.72rem] font-semibold transition hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[0.78rem] text-[#868E96] text-center py-2.5">
                No add-ons yet
              </div>
            )}
          </div>

          {/* Payment Mode */}
          <div className="bg-[#F8F9FA] rounded-xl px-5 py-4 mb-4">
            <div className="text-[0.72rem] font-bold text-[#868E96] tracking-[1px] uppercase mb-3">
              Payment Mode
            </div>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_MODES.map((mode) => {
                const icons = {
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
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[20px] font-semibold text-[0.78rem] cursor-pointer transition-all duration-150 border-2 ${
                      paymentMode === mode
                        ? "border-[#0F1923] bg-[#0F1923] text-[#C9A84C]"
                        : "border-[#E9ECEF] bg-white text-[#495057]"
                    }`}
                  >
                    {icons[mode]}
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bill Summary */}
          <div className="bg-[#0F1923] rounded-xl px-5 py-[18px] mb-4">
            <div className="font-['Playfair_Display',serif] text-[0.9rem] font-semibold text-[#C9A84C] mb-3.5">
              Bill Summary
            </div>

            {/* Room Payments Block */}
            <div className="mb-2.5">
              <div className="text-[0.6rem] font-bold text-white/30 tracking-[1.5px] uppercase mb-1.5">
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
              <div className="flex justify-between items-center mt-2 bg-[#2D9A6E]/15 rounded-md px-2.5 py-[7px] border border-[#2D9A6E]/30">
                <span className="text-[0.82rem] text-[#2D9A6E] font-bold">
                  Amount Already Paid
                </span>
                <span className="text-[0.95rem] text-[#2D9A6E] font-bold">
                  Rs.{Math.round(alreadyPaid).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-white/10 my-3" />

            {/* Addons Payments Block */}
            <div className="mb-2.5">
              <div className="text-[0.6rem] font-bold text-white/30 tracking-[1.5px] uppercase mb-1.5">
                Add-on Charges Summary
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

              {/* Remaining / Extra Due Row */}
              <div className={`flex justify-between items-center mt-2 rounded-md px-2.5 py-[7px] border ${
                addonPaid
                  ? "bg-[#2D9A6E]/15 border-[#2D9A6E]/30 text-[#2D9A6E]"
                  : "bg-[#FFf8dc]/15 border-[#FFf8dc]/30 text-[#b47814]"
              }`}>
                <span className="text-[0.82rem] font-bold">
                  {addonPaid ? "Add-ons Paid" : "Remaining to Pay"}
                </span>
                <span className="text-[0.95rem] font-bold">
                  Rs.{Math.round(remainingAmount).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-white/10 my-3" />

            {/* Total Grand Row inside container */}
            <div className="flex justify-between items-center mt-2 bg-white/5 rounded-md px-2.5 py-[7px]">
              <span className="text-[0.85rem] text-[#C9A84C] font-bold">
                Grand Total (Calculated)
              </span>
              <span className="text-[1.05rem] text-white font-bold">
                Rs.{Math.round(finalTotal).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action Footer Toggles & Invoice Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-5 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-[0.85rem] text-[#495057] font-semibold select-none">
              <input
                type="checkbox"
                checked={addonPaid}
                onChange={(e) => setAddonPaid(e.target.checked)}
                className="w-4 h-4 rounded text-[#2D9A6E] focus:ring-[#2D9A6E]"
              />
              Mark Add-ons as Paid
            </label>

            <button
              onClick={downloadInvoice}
              className="w-full sm:w-auto bg-[#0F1923] text-[#C9A84C] border border-[#C9A84C] px-5 py-2 rounded-md font-semibold text-[0.85rem] hover:bg-[#0F1923]/90 transition cursor-pointer"
            >
              📥 Download PDF Invoice
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
          <input
            type="date"
            required
            className={inputClass}
            min={new Date().toISOString().split("T")[0]}
            value={form.check_in_date}
            onChange={(e) =>
              setForm({ ...form, check_in_date: e.target.value })
            }
          />
        </div>
        <div>
          <label className={labelClass}>Check-out</label>
          <input
            type="date"
            required
            className={inputClass}
            min={form.check_in_date || new Date().toISOString().split("T")[0]}
            value={form.check_out_date}
            onChange={(e) =>
              setForm({ ...form, check_out_date: e.target.value })
            }
          />
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
        disabled={loading}
        className="w-full p-3 bg-[#0F1923] text-white border-none rounded-md font-inherit font-semibold text-[0.9rem] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
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

  const fetchReport = useCallback(async () => {
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
  }, [reportType, customStart, customEnd, showToast]);

  useEffect(() => {
    fetchReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      { align: "right" }
    );
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
      W - 18,
      33,
      { align: "right" }
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
      infoY
    );
    doc.text(
      `Total Add-on Revenue: Rs.${Number(s.total_addons || 0).toLocaleString()}`,
      18,
      infoY + 7
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
        { align: "right" }
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
      { align: "right" }
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
      `VVGrandPark_${reportTitle.replace(" ", "_")}_${reportData.startDate}_to_${reportData.endDate}.pdf`
    );
  }

  const customLabelClass =
    "text-[0.62rem] font-bold text-[#868E96] mb-1 tracking-[0.8px] uppercase";
  const customInputClass =
    "p-2 rounded-md border-[1.5px] border-[#E9ECEF] text-[0.82rem] font-inherit focus:outline-none text-[#212529]";
  const thClass =
    "px-3 py-2.5 text-left text-[0.6rem] font-bold text-[#868E96] uppercase tracking-[1px] border-b-[1.5px] border-[#E9ECEF] bg-[#F8F9FA] whitespace-nowrap";

  return (
    <div>
      {/* Configuration Section */}
      <div className="bg-white rounded-[14px] px-[22px] py-5 border border-[#E9ECEF] mb-5">
        <div className="font-serif text-[1rem] font-semibold text-[#0F1923] mb-4">
          Generate Report
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          {["weekly", "monthly", "custom"].map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
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
                <div className={customLabelClass}>Start Date</div>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className={customInputClass}
                />
              </div>
              <div className="flex flex-col">
                <div className={customLabelClass}>End Date</div>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className={customInputClass}
                />
              </div>
            </>
          )}

          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-5 py-[9px] rounded-md bg-[#C9A84C] text-white border-none text-[0.82rem] font-semibold cursor-pointer font-inherit disabled:opacity-70"
          >
            {loading ? "Loading..." : "Generate"}
          </button>
        </div>
      </div>

      {/* Metrics & Report Display */}
      {reportData && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5 mb-5">
            {[
              {
                label: "Total Bookings",
                val: reportData.summary.total_bookings || 0,
                color: "border-l-[#2471A3]",
              },
              {
                label: "Total Revenue",
                val: `Rs.${Number(reportData.summary.total_revenue || 0).toLocaleString()}`,
                color: "border-l-[#C9A84C]",
              },
              {
                label: "GST Collected",
                val: `Rs.${Number(reportData.summary.total_gst || 0).toLocaleString()}`,
                color: "border-l-[#2D9A6E]",
              },
              {
                label: "Add-on Revenue",
                val: `Rs.${Number(reportData.summary.total_addons || 0).toLocaleString()}`,
                color: "border-l-[#9B59B6]",
              },
              {
                label: "Confirmed",
                val: reportData.summary.confirmed || 0,
                color: "border-l-[#2D9A6E]",
              },
              {
                label: "Completed",
                val: reportData.summary.completed || 0,
                color: "border-l-[#2471A3]",
              },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className={`bg-white border border-[#E9ECEF] border-l-4 ${color} px-[18px] py-4 rounded-xl`}
              >
                <div className="text-[0.62rem]  font-bold text-[#868E96] tracking-[1px] uppercase mb-1.5">
                  {label}
                </div>
                <div className="font-body text-[1.4rem] font-semibold text-[#0F1923]">
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* PDF Download Wrapper */}
          <div className="mb-5">
            <button
              onClick={downloadReport}
              className="px-7 py-3 bg-[#0F1923] text-[#C9A84C] border-none rounded-md font-inherit font-bold text-[0.9rem] cursor-pointer flex items-center gap-2"
            >
              <DownloadIcon size={16} color="#C9A84C" />
              Download{" "}
              {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
              PDF
            </button>
          </div>

          {/* Detailed Data Table container */}
          <div className="bg-white rounded-[14px] px-[22px] py-5 border border-[#E9ECEF]">
            <div className="font-body text-[1rem] font-semibold text-[#0F1923] mb-4">
              Bookings ({reportData.startDate} → {reportData.endDate})
              <span className="text-[0.78rem] font-normal text-[#868E96] ml-2">
                ({reportData.bookings.length} records)
              </span>
            </div>
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
                      "Base",
                      "Addons",
                      "GST",
                      "Total",
                      "Status",
                    ].map((h) => (
                      <th key={h} className={thClass}>
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
                        className="p-[30px] text-center text-[#868E96] text-[0.85rem]"
                      >
                        No bookings in this period
                      </td>
                    </tr>
                  ) : (
                    reportData.bookings.map((b) => (
                      <tr
                        key={b.booking_id}
                        className="border-t border-[#F1F3F5]"
                      >
                        <td className="px-3 py-2.5 text-[0.75rem] text-[#868E96]">
                          #{b.booking_id}
                        </td>
                        <td className="px-3 py-2.5 text-[0.82rem] font-semibold text-[#0F1923] whitespace-nowrap">
                          {b.guest_name}
                        </td>
                        <td className="px-3 py-2.5 text-[0.78rem] text-[#495057]">
                          {b.room_type}
                        </td>
                        <td className="px-3 py-2.5 text-[0.78rem] text-[#495057] whitespace-nowrap">
                          {b.check_in_date?.slice(0, 10)}
                        </td>
                        <td className="px-3 py-2.5 text-[0.78rem] text-[#495057] whitespace-nowrap">
                          {b.check_out_date?.slice(0, 10)}
                        </td>
                        <td className="px-3 py-2.5 text-[0.78rem] text-[#495057]">
                          Rs.{Number(b.total_price || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-[0.78rem] text-[#C9A84C] font-semibold">
                          Rs.{Number(b.addon_charges || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-[0.78rem] text-[#868E96]">
                          Rs.{Number(b.gst_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-[0.85rem] font-bold text-[#0F1923] whitespace-nowrap">
                          Rs.
                          {Number(
                            b.final_total || b.total_price || 0
                          ).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-[3px] text-[0.6rem] font-bold uppercase tracking-wide ${
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
                {reportData.bookings.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#0F1923]">
                      <td
                        colSpan={8}
                        className="px-3 py-2.5 font-serif font-bold text-[#0F1923] text-[0.85rem]"
                      >
                        TOTAL REVENUE
                      </td>
                      <td
                        colSpan={2}
                        className="px-3 py-2.5 font-serif font-bold text-[#C9A84C] text-[1rem]"
                      >
                        Rs.
                        {Number(
                          reportData.summary.total_revenue || 0
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
  const [, setLoading] = useState(true);
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

  const checkedInBookings = bookings.filter(
    (b) => b.actual_checkin && !b.actual_checkout && b.status === "confirmed"
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
    bookings: "Bookings",
    checkins: "Check-in Details",
    book: "New Booking",
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
          {tab === "bookings" && (
            <div className="bg-white rounded-[14px] px-[22px] py-5 border border-[#E9ECEF]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <div>
                  <div className="font-serif text-[1rem] font-semibold text-[#0F1923]">
                    All Bookings ({bookings.length})
                  </div>
                  <div className="text-[0.78rem] font-normal text-[#868E96]">
                    {new Date().toLocaleDateString("en-IN")}
                  </div>
                </div>

                <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-[#868E96]">
                          No bookings found
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => (
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

          {tab === "book" && (
            <div>
              <div className="mb-4">
                <div className="font-serif text-[1.05rem] font-semibold text-[#0F1923]">New Booking — Select a Room</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((r) => {
                  const roomImage = r.image_url || r.image || r.photo || r.thumbnail || "/room-placeholder.jpg";
                  return (
                    <div key={r.room_id} className="bg-white rounded-[10px] overflow-hidden shadow-sm">
                      <div className="relative h-40 bg-gray-100">
                        <img
                          src={roomImage}
                          alt={r.room_type}
                          onError={(e) => { e.currentTarget.src = "/room-placeholder.jpg"; }}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute left-3 top-3 bg-[#0F1923] text-[#C9A84C] text-[0.62rem] px-2 py-1 rounded-md font-semibold">{(r.room_type || "").toUpperCase()}</div>
                        <div className="absolute right-3 top-3 bg-white/60 text-[#495057] text-[0.75rem] px-2 py-1 rounded-md">👥 {r.capacity || 2}</div>
                      </div>
                      <div className="px-4 py-3">
                        <div className="text-[0.9rem] font-body font-semibold text-[#0F1923]">Room {r.room_number || r.room_id}</div>
                        <div className="text-[0.82rem] text-[#868E96] mb-3">{r.description || "Cozy room with city view"}</div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[0.9rem] font-body font-semibold">Rs.{Number(r.price_per_night || 0).toLocaleString()}</div>
                            <div className="text-[0.68rem] text-red-600">+18% GST</div>
                          </div>
                          <div>
                              <button
  onClick={() => setBookingRoom(r)}
  className="px-3 py-1.5 bg-[#0F1923] text-white rounded-md transition-all duration-300 hover:bg-[#C9A84C] hover:text-black hover:-translate-y-[1px]"
>
  Book
</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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

      {bookingRoom && (
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
          className={`fixed bottom-6 right-6 z-[9999] text-white px-5 py-3 rounded-[10px] text-[0.85rem] font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.2)] ${
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
