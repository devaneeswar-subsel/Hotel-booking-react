// ─────────────────────────────────────────────────────────────────────────────
//  invoicePdf.js — branded invoice generator (single-page layout)
//
//  Usage:
//  await printInvoicePdf(booking, { paymentMode, showToast, checkoutDiscount });
//
//  Fits on ONE page for normal bookings. A second page is added only when the
//  content genuinely cannot fit (many add-ons).
// ─────────────────────────────────────────────────────────────────────────────

import { HOTEL_GSTIN, roomGstRate, roomGstPercent } from "./utils/billing";
import {
  summariseAddons,
  gstSummaryRows,
  addonLineRate,
  addonLineTaxable,
  addonLineGst,
  formatRate,
} from "./utils/addonGst";

// page geometry (A4, mm)
const W = 210;
const H = 297;
const L = 15;
const R = W - 15;
const FOOTER_TOP = 277;
const BOTTOM = 270;

// vertical rhythm (mm) — kept in one place so the height estimate matches
const ROW = 5.2; // summary row
const HEAD = 5.5; // summary heading
const BOX = 9; // boxed summary row

// palette
const NAVY = [22, 42, 78];
const NAVY_DARK = [15, 27, 50];
const GOLD = [193, 134, 43];
const GOLD_SOFT = [222, 178, 92];
const CREAM = [253, 249, 240];
const GREY = [95, 100, 108];
const WHITE = [255, 255, 255];

// column positions
const C_DESC = L + 4;
const C_DETAIL = 100;
const C_DESC_W = C_DETAIL - C_DESC - 4;
const C_DETAIL_W = 48;

const money = (v) => `Rs.${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

// invoice numbers are year-prefixed, e.g. INV-2026-0037
function formatBookingId(booking) {
  const year = new Date(booking.created_at || Date.now()).getFullYear();
  return `${year}-${String(booking.booking_id).padStart(4, "0")}`;
}

/* load the hotel crest from /public so it can be embedded in the PDF.
 *
 * It is re-drawn onto a canvas at least LOGO_MIN_PX wide (high-quality
 * smoothing, transparency kept) so the crest is embedded at print resolution
 * instead of being stretched by the PDF viewer. A logo that is already large
 * is used untouched. NOTE: this cannot add detail that /public/logo.png does
 * not have — for the sharpest result use a source of 1000px or more. */
const LOGO_MIN_PX = 1200;

async function loadLogo() {
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();

    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });

      if (!img.width || img.width >= LOGO_MIN_PX) return dataUrl;

      const scale = LOGO_MIN_PX / img.width;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      return canvas.toDataURL("image/png");
    } catch {
      return dataUrl;
    }
  } catch {
    return null;
  }
}

export async function printInvoicePdf(
  booking,
  {
    paymentMode = "Online",
    showToast = () => {},
    checkoutDiscount = 0,
    // Signature block. Off by default; only the admin dashboard passes true.
    showSignature = false,
  } = {},
) {
  if (!booking) return;

  const payLabel =
    typeof paymentMode === "string"
      ? paymentMode
      : paymentMode?.label ||
        paymentMode?.name ||
        paymentMode?.value ||
        "Online";

  const b = booking;
  const addons = b.addons || [];
  const isCancelled = b.status === "cancelled";

  // Booking dates — always the dates selected during booking.
  const ci = b.check_in_date
    ? new Date(b.check_in_date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const co = b.check_out_date
    ? new Date(b.check_out_date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const nights =
    b.check_in_date && b.check_out_date
      ? Math.max(
          1,
          Math.ceil(
            (new Date(b.check_out_date) - new Date(b.check_in_date)) / 86400000,
          ),
        )
      : 1;

  // actual time in the room
  let stayLabel = "";
  if (b.actual_checkin && b.actual_checkout) {
    const mins = Math.max(
      0,
      Math.round(
        (new Date(b.actual_checkout) - new Date(b.actual_checkin)) / 60000,
      ),
    );
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    stayLabel = h > 0 ? `${h} hr ${m} min` : `${m} min`;
  }

  // Head count recorded at check-in (counts win over named rows).
  const guestRows = b.guests || [];

  const adultCount =
    Number(b.adults_count) ||
    guestRows.filter((g) => g.guest_type === "adult").length ||
    Number(b.guest_count) ||
    1;

  const childCount =
    b.children_count != null
      ? Number(b.children_count)
      : guestRows.filter((g) => g.guest_type === "child").length || 0;

  const guestSummary = [
    `${adultCount} Adult${adultCount === 1 ? "" : "s"}`,
    childCount > 0
      ? `${childCount} Child${childCount === 1 ? "" : "ren"}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  /* ── amounts ─────────────────────────────────────────────────────────── */

  const basePrice = Number(b.total_price || 0);

  const discountAmount = Math.max(
    0,
    Number(b.discount_applied ? b.discount_amount : 0) || 0,
  );

  // PRE-TAX DISCOUNT MODEL
  const discountedRoomAmount = Math.max(
    0,
    Math.round((basePrice - discountAmount) * 100) / 100,
  );

  const invoiceGstEnabled = Number(b.gst_enabled ?? 1) !== 0;

  // PER-ROOM GST: the rate frozen onto THIS booking when it was sold.
  const invoiceRoomRate = roomGstRate(b);
  const invoiceRoomPercent = roomGstPercent(b);

  const roomGst =
    Math.round(discountedRoomAmount * invoiceRoomRate * 100) / 100;

  const roomTotal = Math.max(
    0,
    Math.round((discountedRoomAmount + roomGst) * 100) / 100,
  );

  const advancePaid = Number(b.advance_paid || 0);
  const balancePaid = Number(b.balance_paid || 0);

  // Balance before any checkout discount (derived, not read from total_amount).
  const roomRemaining = Math.max(
    0,
    Math.round((roomTotal - advancePaid - balancePaid) * 100) / 100,
  );

  const persistedCheckoutDiscount = Number(b.checkout_discount_amount || 0);
  const suppliedCheckoutDiscount = Number(checkoutDiscount || 0);
  const rawCheckoutDiscount =
    suppliedCheckoutDiscount > 0
      ? suppliedCheckoutDiscount
      : persistedCheckoutDiscount;

  const maxCheckoutDiscount = invoiceGstEnabled
    ? Math.round((roomRemaining / (1 + invoiceRoomRate)) * 100) / 100
    : Math.round(roomRemaining * 100) / 100;

  const appliedCheckoutDiscount = Math.min(
    Math.max(0, rawCheckoutDiscount),
    maxCheckoutDiscount,
  );

  const checkoutDiscountGst = invoiceGstEnabled
    ? Math.round(appliedCheckoutDiscount * invoiceRoomRate * 100) / 100
    : 0;

  const checkoutDiscountImpact =
    Math.round((appliedCheckoutDiscount + checkoutDiscountGst) * 100) / 100;

  // ── ADD-ONS (per-service GST) ──
  const addonSummary = summariseAddons(addons);

  const addonTotal = Number(b.addon_charges || 0);

  const addonGst = invoiceGstEnabled
    ? b.addon_gst_amount != null
      ? Math.round(Number(b.addon_gst_amount) * 100) / 100
      : addonSummary.gst
    : 0;

  const addonWithGst = Math.round((addonTotal + addonGst) * 100) / 100;

  const paidSoFar = Math.round((advancePaid + balancePaid) * 100) / 100;

  const finalRoomTaxable = Math.max(
    0,
    Math.round((discountedRoomAmount - appliedCheckoutDiscount) * 100) / 100,
  );

  const taxableTotal = Math.round((finalRoomTaxable + addonTotal) * 100) / 100;

  const totalGst = invoiceGstEnabled
    ? Math.round((finalRoomTaxable * invoiceRoomRate + addonGst) * 100) / 100
    : 0;

  const gstRateRows = gstSummaryRows({
    roomTaxable: finalRoomTaxable,
    roomRatePercent: invoiceRoomPercent,
    addonSummary,
    gstEnabled: invoiceGstEnabled,
  });

  const grandTotal = Math.max(
    0,
    Math.round((taxableTotal + totalGst) * 100) / 100,
  );

  const remaining = Math.max(
    0,
    Math.round((grandTotal - paidSoFar) * 100) / 100,
  );

  const advanceMode = b.advance_payment_mode || b.payment_method || "—";
  const balanceMode = b.balance_payment_mode || payLabel;

  const invNo = `INV-${formatBookingId(b)}`;

  // e.g. VV_Grand_Park_Invoice_INV-2026-0054 — used as the PDF title, which
  // browsers use as the tab title and as the default "Save as PDF" file name.
  const fileName = `VV_Grand_Park_Invoice_${invNo}`;

  // read at print time
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const logo = await loadLogo();

  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setProperties({
    title: fileName,
    subject: `Invoice ${invNo}`,
    author: "VV Grand Park Residency",
    creator: "VV Grand Park Residency",
  });

  let y = 0;
  let page = 1;

  /* ── paint helpers ───────────────────────────────────────────────────── */

  const ink = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c, w = 0.2) => {
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(w);
  };

  function watermark() {
    if (!logo) return;
    try {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.06 }));
      doc.addImage(logo, "PNG", 22, 165, 78, 78, "vvlogo", "NONE");
      doc.restoreGraphicsState();
    } catch {
      // ignore
    }
  }

  function footerBar() {
    fill(NAVY_DARK);
    doc.rect(0, FOOTER_TOP, W, H - FOOTER_TOP, "F");

    doc.setFont("helvetica", "normal");
    ink(WHITE);
    doc.setFontSize(7.5);
    doc.text("+91 93849 82510  |  +91 90032 51115", L, FOOTER_TOP + 8);
    doc.text("vvgrandpark@gmail.com  |  vvgrandpark.com", L, FOOTER_TOP + 13);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    ink(GOLD_SOFT);
    doc.text("Thank you for choosing", R, FOOTER_TOP + 8, { align: "right" });
    doc.text("VV Grand Park Residency.", R, FOOTER_TOP + 13, {
      align: "right",
    });
  }

  /* ── page header ─────────────────────────────────────────────────────── */

  function pageHeader(continuation) {
    const top = continuation ? 6 : 7;

    if (logo) {
      try {
        doc.addImage(logo, "PNG", L, top - 2, 22, 22, "vvlogo", "NONE");
      } catch {
        // ignore
      }
    }

    const tx = logo ? L + 27 : L;

    // Hotel details sit beside the crest (this replaces the old
    // "VV GRAND PARK / RESIDENCY / website" heading and the FROM block).
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    ink(NAVY);
    doc.text("VV Grand Park Residency", tx, top + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    ink(GREY);
    doc.text("3/4/D, Thanjai Saalai, Thiruvarur - 610004", tx, top + 10);
    doc.text("+91 93849 82510  |  +91 90032 51115", tx, top + 14.5);
    doc.text("vvgrandpark@gmail.com", tx, top + 19);

    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN: ${HOTEL_GSTIN}`, tx, top + 23.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    ink(NAVY);
    doc.text("INVOICE", R, top + 8, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    ink(GOLD);
    doc.text(continuation ? `${invNo} — page ${page}` : invNo, R, top + 14, {
      align: "right",
    });

    if (!continuation) {
      doc.setFontSize(8.5);
      ink(GREY);
      doc.text(`Date: ${today}`, R, top + 20, { align: "right" });
    }

    const rule = top + 27;
    stroke(GOLD, 0.7);
    doc.line(L, rule, R, rule);

    // was rule + 7 — the address block now starts higher
    return rule + 5;
  }

  function newPage() {
    watermark();
    footerBar();
    doc.addPage();
    page += 1;
    y = pageHeader(true);
  }

  y = pageHeader(false);

  /* ── BILL TO (hotel details now live in the letterhead) ─────────────── */

  // BILL TO sits in the right column, same position as before
  const FX = 105;
  const GUEST_X = FX + 13;
  const GUEST_W = R - GUEST_X;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  ink(GOLD);
  doc.text("BILL TO", GUEST_X, y);

  y += 6;

  // guest crest
  fill(CREAM);
  stroke(GOLD_SOFT, 0.3);
  doc.circle(FX + 5, y + 1, 5.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  ink(GOLD);
  doc.text((b.guest_name || "G").charAt(0).toUpperCase(), FX + 5, y + 2.5, {
    align: "center",
  });

  doc.setFontSize(12);
  ink(NAVY);
  doc.text(b.guest_name || "Guest", GUEST_X, y + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  ink(GREY);

  let guestY = y + 8;

  if (b.email) {
    const emailWrapped = doc.splitTextToSize(b.email, GUEST_W);
    doc.text(emailWrapped, GUEST_X, guestY);
    guestY += emailWrapped.length * 4.3;
  }

  if (b.phone) {
    doc.text(String(b.phone), GUEST_X, guestY);
    guestY += 4.3;
  }

  if (b.customer_address) {
    const addressLines = doc.splitTextToSize(
      String(b.customer_address),
      GUEST_W,
    );
    doc.text(addressLines, GUEST_X, guestY);
    guestY += addressLines.length * 4.3;
  }

  if (b.gst_number) {
    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN: ${b.gst_number}`, GUEST_X, guestY);
    doc.setFont("helvetica", "normal");
    guestY += 4.3;
  }

  // the table starts below the guest block (never overlapping the crest)
  y = Math.max(guestY, y + 9) + 3;

  /* ── line-item table ─────────────────────────────────────────────────── */

  let stripe = 0;

  function tableHead() {
    fill(GOLD);
    doc.rect(L, y, R - L, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    ink(WHITE);
    doc.text("DESCRIPTION", C_DESC, y + 5.4);
    doc.text("DETAILS", C_DETAIL, y + 5.4);
    doc.text("AMOUNT", R - 4, y + 5.4, { align: "right" });

    y += 8;
  }

  function tableRow(desc, detail, amount) {
    const dLines = doc.splitTextToSize(String(desc ?? ""), C_DESC_W);
    const tLines = doc.splitTextToSize(String(detail ?? ""), C_DETAIL_W);

    const h = Math.max(7.5, Math.max(dLines.length, tLines.length) * 4.2 + 3.2);

    if (y + h > BOTTOM) {
      newPage();
      tableHead();
    }

    if (stripe % 2 === 1) {
      fill(CREAM);
      doc.rect(L, y, R - L, h, "F");
    }
    stripe += 1;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    ink(NAVY);
    doc.text(dLines, C_DESC, y + 5);

    doc.setFont("helvetica", "normal");
    ink(GREY);
    doc.text(tLines, C_DETAIL, y + 5);

    doc.setFont("helvetica", "bold");
    ink(NAVY);
    doc.text(String(amount), R - 4, y + 5, { align: "right" });

    y += h;

    stroke(GOLD_SOFT, 0.15);
    doc.line(L, y, R, y);
  }

  function sectionRow(label) {
    if (y + 8 > BOTTOM) {
      newPage();
      tableHead();
    }

    fill(CREAM);
    doc.rect(L, y, R - L, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ink(GOLD);
    doc.text(label, C_DESC, y + 4.8);

    y += 7;

    stroke(GOLD_SOFT, 0.2);
    doc.line(L, y, R, y);

    stripe = 0;
  }

  stroke(GOLD_SOFT, 0.3);
  tableHead();

  tableRow(
    `${b.room_type} — Room ${b.room_number || b.room_id}`,
    `${nights} night${nights > 1 ? "s" : ""}`,
    money(basePrice),
  );
  tableRow("Check-in", ci, "—");
  tableRow("Check-out", co, "—");
  if (stayLabel) tableRow("Time Stayed", stayLabel, "—");
  tableRow("Guests", guestSummary, "—");

  // payment history
  if (advancePaid > 0 || balancePaid > 0) {
    sectionRow("PAYMENT HISTORY");
    if (advancePaid > 0) {
      tableRow("Advance Payment", advanceMode, money(advancePaid));
    }
    if (balancePaid > 0) {
      tableRow("Balance Payment", balanceMode, money(balancePaid));
    }
  }

  // add-ons — each line prints the rate it was billed at
  if (addons.length) {
    sectionRow("ADD-ON CHARGES");

    addons.forEach((a) => {
      const rate = addonLineRate(a);
      const qty = Number(a.quantity ?? 1);
      const unit =
        a.unit_price != null ? Number(a.unit_price) : addonLineTaxable(a);

      const detail = [
        qty > 1 ? `${qty} x ${money(unit)}` : null,
        `GST ${formatRate(rate)} ${money(addonLineGst(a))}`,
      ]
        .filter(Boolean)
        .join("   ");

      tableRow(a.label, detail, money(addonLineTaxable(a)));
    });
  }

  /* ── summary ─────────────────────────────────────────────────────────── */

  const SX = 100;

  // The ADD-ON block is only worth printing when there is something in it.
  const showAddonBlock = addons.length > 0 || addonTotal > 0;

  const addonGstRowCount = Math.max(1, addonSummary.byRate.length);
  const rateSummaryHeight =
    invoiceGstEnabled && gstRateRows.length > 1
      ? HEAD + ROW * (gstRateRows.length + 1)
      : 0;

  // Estimate of the whole summary (down to and including the grand total box)
  const summaryHeight =
    6 + // top gap
    HEAD +
    ROW * 2 + // room charges + GST
    (discountAmount > 0 ? ROW : 0) +
    (appliedCheckoutDiscount > 0 ? ROW : 0) +
    (discountAmount > 0 || appliedCheckoutDiscount > 0 ? ROW : 0) +
    (appliedCheckoutDiscount > 0 && invoiceGstEnabled ? HEAD + ROW * 2 : 0) +
    (advancePaid > 0 ? ROW : 0) +
    (balancePaid > 0 ? ROW : 0) +
    BOX + // amount already paid
    (showAddonBlock ? HEAD + ROW * (1 + addonGstRowCount) : 0) +
    rateSummaryHeight +
    BOX + // remaining / settled box
    8 + // payment mode line
    22; // grand total box

  if (y + summaryHeight > BOTTOM) {
    newPage();
  }

  y += 6;

  function sumHead(label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ink(GOLD);
    doc.text(label, SX, y);
    y += HEAD;
  }

  function sumRow(label, val) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    ink(GREY);
    doc.text(label, SX, y);

    doc.setFont("helvetica", "bold");
    ink(NAVY);
    doc.text(val, R, y, { align: "right" });

    y += ROW;
  }

  function sumBox(label, val) {
    fill(CREAM);
    stroke(GOLD, 0.5);
    doc.rect(SX - 3, y - 4.4, R - SX + 3, 8, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    ink(NAVY);
    doc.text(label, SX, y);

    ink(GOLD);
    doc.text(val, R - 3, y, { align: "right" });

    y += BOX;
  }

  /* BOOKING PAYMENT */

  sumHead("BOOKING PAYMENT");

  sumRow("Room Charges", money(basePrice));

  if (discountAmount > 0) {
    sumRow("Booking Discount", `- ${money(discountAmount)}`);
  }

  if (appliedCheckoutDiscount > 0) {
    sumRow("Checkout Discount", `- ${money(appliedCheckoutDiscount)}`);
  }

  if (discountAmount > 0 || appliedCheckoutDiscount > 0) {
    sumRow("Taxable Value (Room)", money(finalRoomTaxable));
  }

  if (invoiceGstEnabled) {
    sumRow(
      `GST on Room (${formatRate(invoiceRoomPercent)})`,
      money(Math.round(finalRoomTaxable * invoiceRoomRate * 100) / 100),
    );
  }

  /* CHECKOUT DISCOUNT */

  if (appliedCheckoutDiscount > 0 && invoiceGstEnabled) {
    sumHead("CHECKOUT / FINAL DISCOUNT");
    sumRow("GST reversed on discount", `- ${money(checkoutDiscountGst)}`);
    sumRow("Total guest saving", money(checkoutDiscountImpact));
  }

  // payment history
  if (advancePaid > 0) {
    sumRow(`Advance — ${advanceMode}`, money(advancePaid));
  }

  if (balancePaid > 0) {
    sumRow(`Balance — ${balanceMode}`, money(balancePaid));
  }

  sumBox(
    isCancelled ? "Refunded (Cancelled)" : "Amount Already Paid",
    money(advancePaid + balancePaid),
  );

  /* ADD-ON CHARGES — skipped entirely when there are none */

  if (showAddonBlock) {
    sumHead("ADD-ON CHARGES");

    sumRow("Add-on Charges", money(addonTotal));

    if (invoiceGstEnabled) {
      if (addonSummary.byRate.length > 1) {
        addonSummary.byRate.forEach((r) => {
          sumRow(`GST on Add-ons (${formatRate(r.gstRate)})`, money(r.gst));
        });
      } else {
        sumRow(
          addonSummary.byRate.length === 1
            ? `GST on Add-ons (${formatRate(addonSummary.byRate[0].gstRate)})`
            : "GST on Add-ons",
          money(addonGst),
        );
      }
    }
  }

  /* RATE-WISE GST SUMMARY — only when the bill carries 2+ rates */

  if (invoiceGstEnabled && gstRateRows.length > 1) {
    sumHead("GST SUMMARY (RATE-WISE)");

    gstRateRows.forEach((r) => {
      sumRow(`${formatRate(r.gstRate)} on ${money(r.taxable)}`, money(r.gst));
    });

    sumRow("Total GST", money(totalGst));
  }

  if (remaining > 0) {
    sumBox("Remaining to Pay", money(remaining));
  } else if (addonWithGst > 0) {
    sumBox("Add-ons Paid", money(addonWithGst));
  } else {
    sumBox("Fully Settled", money(0));
  }

  /* PAYMENT STATUS */

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  ink(GREY);
  doc.text("Payment Mode:", SX, y);

  doc.setFont("helvetica", "bold");
  ink(GOLD);
  doc.text(payLabel, SX + 22, y);

  doc.setFont("helvetica", "normal");
  ink(GREY);
  doc.text("Status:", SX + 48, y);

  doc.setFont("helvetica", "bold");
  ink(GOLD);
  doc.text(remaining <= 0 ? "PAID" : "PENDING", SX + 59, y);

  y += 8;

  // Only the grand total decides whether a new page is needed. The signature
  // no longer has a say — it sits beside the total (below), not under it.
  if (y + 22 > BOTTOM) {
    newPage();
  }

  /* GRAND TOTAL */

  fill(CREAM);
  stroke(GOLD, 1.1);
  doc.rect(SX - 3, y, R - SX + 3, 20, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  ink(GOLD);
  doc.text("GRAND TOTAL", (SX - 3 + R) / 2, y + 7.5, { align: "center" });

  doc.setFontSize(18);
  doc.text(
    isCancelled ? "Rs.0" : money(grandTotal),
    (SX - 3 + R) / 2,
    y + 16.5,
    { align: "center" },
  );

  /* AUTHORISED SIGNATORY (admin copy only)
   *
   * Drawn in the empty space to the LEFT of the grand total box, in the same
   * vertical band, so it costs no extra height and can never push the total
   * onto a second page. */

  if (showSignature) {
    const sigRight = SX - 3 - 8; // right edge, a little clear of the box
    const sigW = 55;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    ink(GREY);
    doc.text("For VV Grand Park Residency", sigRight, y + 3.5, {
      align: "right",
    });

    // space left blank for a physical signature
    stroke(GREY, 0.4);
    doc.line(sigRight - sigW, y + 14, sigRight, y + 14);

    doc.setFont("helvetica", "bold");
    ink(NAVY);
    doc.text("Authorised Signatory", sigRight, y + 18.5, { align: "right" });
  }

  watermark();
  footerBar();

  /* ── cancelled watermark ─────────────────────────────────────────────── */

  if (isCancelled) {
    const total = doc.getNumberOfPages();

    for (let p = 1; p <= total; p += 1) {
      doc.setPage(p);

      try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.13 }));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(58);
        ink([200, 40, 40]);
        doc.text("CANCELLED", W / 2, 150, { align: "center", angle: 30 });
        doc.restoreGraphicsState();
      } catch {
        // skip on older jsPDF
      }
    }
  }

  /* ── print ───────────────────────────────────────────────────────────── */

  doc.autoPrint();

  const pdfUrl = URL.createObjectURL(doc.output("blob"));

  const printWindow = window.open(pdfUrl, "_blank");

  if (!printWindow) {
    showToast("Please allow pop-ups to print the invoice.", "error");
    URL.revokeObjectURL(pdfUrl);
    return;
  }

  setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
}
