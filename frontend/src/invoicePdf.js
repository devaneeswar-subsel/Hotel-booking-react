// ─────────────────────────────────────────────────────────────────────────────
//  invoicePdf.js — branded invoice generator
//  Usage: await printInvoicePdf(booking, { paymentMode, showToast });
//
//  Page 1: header, bill-to/from, line items, summary, grand total.
//  Page 2: terms & conditions in two columns.
//  Extra pages are inserted automatically when there are many add-ons.
//  The invoice date is read at print time, so it is always today's date.
// ─────────────────────────────────────────────────────────────────────────────
const GST_RATE = 0.18;

// page geometry (A4, mm)
const W = 210;
const H = 297;
const L = 15;
const R = W - 15;
const FOOTER_TOP = 268; // navy bar starts here
const BOTTOM = 258; // last usable y for content

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

/* load the hotel crest from /public so it can be embedded in the PDF */
async function loadLogo() {
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null; // header falls back to text only
  }
}

export async function printInvoicePdf(
  booking,
  { paymentMode = "Online", showToast = () => {} } = {},
) {
  if (!booking) return;

  const payLabel =
    typeof paymentMode === "string"
      ? paymentMode
      : paymentMode?.label || paymentMode?.name || paymentMode?.value || "Online";

  const b = booking;
  const addons = b.addons || [];
  const isCancelled = b.status === "cancelled";

  const ci = b.actual_checkin
    ? new Date(b.actual_checkin).toLocaleString("en-IN")
    : b.check_in_date?.slice(0, 10);
  const co = b.actual_checkout
    ? new Date(b.actual_checkout).toLocaleString("en-IN")
    : b.check_out_date?.slice(0, 10);

  const nights =
    b.check_in_date && b.check_out_date
      ? Math.max(
          1,
          Math.ceil(
            (new Date(b.check_out_date) - new Date(b.check_in_date)) / 86400000,
          ),
        )
      : 1;

  // actual time in the room — minutes below an hour, "2 hr 15 min" above
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

  // guests actually recorded at check-in, falling back to the booked count
  const guestRows = b.guests || [];
  const adultCount =
    guestRows.filter((g) => g.guest_type === "adult").length ||
    Number(b.adults_count) ||
    Number(b.guest_count) ||
    1;
  const childCount =
    guestRows.filter((g) => g.guest_type === "child").length ||
    Number(b.children_count) ||
    0;
  const guestSummary = [
    `${adultCount} Adult${adultCount === 1 ? "" : "s"}`,
    childCount > 0 ? `${childCount} Child${childCount === 1 ? "" : "ren"}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  /* ── amounts ─────────────────────────────────────────────────────────── */
  const basePrice = Number(b.total_price || 0);
  const roomGst = Math.round(basePrice * GST_RATE * 100) / 100;
  const roomTotal = Math.round((basePrice + roomGst) * 100) / 100;

  const advancePaid = Number(b.advance_paid || 0);
  const balancePaid = Number(b.balance_paid || 0);
  const paymentTotal = Number(b.total_amount || b.final_total || roomTotal);

  const roomRemaining = Math.max(
    0,
    Math.round((paymentTotal - advancePaid - balancePaid) * 100) / 100,
  );

  const addonTotal = Number(b.addon_charges || 0);
  const addonGst = Math.round(addonTotal * GST_RATE * 100) / 100;
  const addonWithGst = Math.round((addonTotal + addonGst) * 100) / 100;

  const unpaidAddonTotal = addons
    .filter((a) => a.paid !== 1)
    .reduce((s, a) => s + Number(a.amount || 0), 0);
  const unpaidAddonGst = Math.round(unpaidAddonTotal * GST_RATE * 100) / 100;

  const remaining =
    Math.round((roomRemaining + unpaidAddonTotal + unpaidAddonGst) * 100) / 100;
  const grandTotal =
    Math.round((paymentTotal + addonTotal + addonGst) * 100) / 100;

  const advanceMode = b.advance_payment_mode || b.payment_method || "—";
  const balanceMode = b.balance_payment_mode || payLabel;

  const fmtStamp = (d) =>
    d
      ? new Date(d).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const invNo = `INV-${formatBookingId(b)}`;
  // read at print time — printing tomorrow shows tomorrow's date
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const logo = await loadLogo();
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

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
      doc.addImage(logo, "PNG", 22, 165, 78, 78);
      doc.restoreGraphicsState();
    } catch {
      /* older jsPDF without GState — skip the watermark */
    }
  }

  function footerBar(withContact) {
    fill(NAVY_DARK);
    doc.rect(0, FOOTER_TOP, W, H - FOOTER_TOP, "F");

    if (withContact) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      ink(WHITE);
      doc.text("+91 93849 82510", L, FOOTER_TOP + 11);
      doc.text("vvgrandpark@gmail.com", L + 45, FOOTER_TOP + 11);
      doc.text("vvgrandpark.com", L + 105, FOOTER_TOP + 11);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      ink(GOLD_SOFT);
      doc.text("Thank you for choosing", R, FOOTER_TOP + 8, { align: "right" });
      doc.text("VV Grand Park Residency.", R, FOOTER_TOP + 13, {
        align: "right",
      });
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      ink(GOLD_SOFT);
      doc.text("Thank you for staying with us!", L, FOOTER_TOP + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      ink(WHITE);
      doc.text("We look forward to welcoming you again.", R, FOOTER_TOP + 12, {
        align: "right",
      });
    }
  }

  /* ── page header ─────────────────────────────────────────────────────── */
  function pageHeader(continuation) {
    const top = continuation ? 10 : 11;

    if (logo) {
      try {
        doc.addImage(logo, "PNG", L, top - 2, 22, 22);
      } catch {
        /* ignore a bad image and keep the text header */
      }
    }

    const tx = logo ? L + 27 : L;
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    ink(NAVY);
    doc.text("VV GRAND PARK", tx, top + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    ink(NAVY);
    doc.text("R E S I D E N C Y", tx + 1, top + 15);

    // small rule under the wordmark
    stroke(GOLD_SOFT, 0.4);
    doc.line(tx + 1, top + 18, tx + 55, top + 18);

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

    const rule = top + 25;
    stroke(GOLD, 0.7);
    doc.line(L, rule, R, rule);
    return rule + 10;
  }

  function newPage(contact) {
    watermark();
    footerBar(contact);
    doc.addPage();
    page += 1;
    y = pageHeader(true);
  }

  y = pageHeader(false);

  /* ── bill to / from ──────────────────────────────────────────────────── */
  const FX = 105; // "FROM" column x

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  ink(GOLD);
  doc.text("BILL TO", L + 13, y);
  doc.text("FROM", FX, y);
  y += 7;

  // small crest beside the guest name
  fill(CREAM);
  stroke(GOLD_SOFT, 0.3);
  doc.circle(L + 5, y + 1, 5.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  ink(GOLD);
  doc.text((b.guest_name || "G").charAt(0).toUpperCase(), L + 5, y + 2.5, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  ink(NAVY);
  doc.text(b.guest_name || "Guest", L + 13, y + 2);
  doc.text("VV Grand Park Residency", FX, y + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  ink(GREY);
  const emailLines = doc.splitTextToSize(b.email || "", 80);
  doc.text(emailLines, L + 13, y + 9);
  let leftY = y + 9 + emailLines.length * 4.5;
  if (b.phone) {
    doc.text(String(b.phone), L + 13, leftY);
    leftY += 4.5;
  }

  doc.text("vvgrandpark.com", FX, y + 9);
  doc.text("3/4/D, Thanjai Saalai, Thiruvarur - 610004", FX, y + 16);
  doc.text("+91 93849 82510  |  vvgrandpark@gmail.com", FX, y + 23);

  y = Math.max(leftY, y + 28) + 6;

  /* ── line-item table ─────────────────────────────────────────────────── */
  let stripe = 0;

  function tableHead() {
    fill(GOLD);
    doc.rect(L, y, R - L, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    ink(WHITE);
    doc.text("DESCRIPTION", C_DESC, y + 6);
    doc.text("DETAILS", C_DETAIL, y + 6);
    doc.text("AMOUNT", R - 4, y + 6, { align: "right" });
    y += 9;
  }

  function tableRow(desc, detail, amount) {
    const dLines = doc.splitTextToSize(String(desc ?? ""), C_DESC_W);
    const tLines = doc.splitTextToSize(String(detail ?? ""), C_DETAIL_W);
    const h = Math.max(9, Math.max(dLines.length, tLines.length) * 4.4 + 4.5);

    if (y + h > BOTTOM) {
      newPage(false);
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
    doc.text(dLines, C_DESC, y + 5.8);

    doc.setFont("helvetica", "normal");
    ink(GREY);
    doc.text(tLines, C_DETAIL, y + 5.8);

    doc.setFont("helvetica", "bold");
    ink(NAVY);
    doc.text(String(amount), R - 4, y + 5.8, { align: "right" });

    y += h;
    stroke(GOLD_SOFT, 0.15);
    doc.line(L, y, R, y);
  }

  function sectionRow(label) {
    if (y + 9 > BOTTOM) {
      newPage(false);
      tableHead();
    }
    fill(CREAM);
    doc.rect(L, y, R - L, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ink(GOLD);
    doc.text(label, C_DESC, y + 5.5);
    y += 8;
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

  // payment history — each instalment with its own mode and date
  if (advancePaid > 0 || balancePaid > 0) {
    sectionRow("PAYMENT HISTORY");
    if (advancePaid > 0)
      tableRow(
        `Advance Payment — ${advanceMode}`,
        fmtStamp(b.advance_paid_at || b.created_at),
        money(advancePaid),
      );
    if (balancePaid > 0)
      tableRow(
        `Balance Payment — ${balanceMode}`,
        fmtStamp(b.balance_paid_at),
        money(balancePaid),
      );
  }

  if (addons.length) {
    sectionRow("ADD-ON CHARGES");
    addons.forEach((a) =>
      tableRow(
        a.label,
        a.created_at ? new Date(a.created_at).toLocaleDateString("en-IN") : "",
        money(a.amount),
      ),
    );
  }

  /* ── summary ─────────────────────────────────────────────────────────── */
  const SX = 100;
  // the summary block (two sections + payment line + grand total) is ~96mm;
  // reserving less lets the grand-total box collide with the footer bar
  if (y + 100 > BOTTOM) newPage(false);
  y += 10;

  function sumHead(label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ink(GOLD);
    doc.text(label, SX, y);
    y += 6.5;
  }

  function sumRow(label, val) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    ink(GREY);
    doc.text(label, SX, y);
    doc.setFont("helvetica", "bold");
    ink(NAVY);
    doc.text(val, R, y, { align: "right" });
    y += 6;
  }

  function sumBox(label, val) {
    fill(CREAM);
    stroke(GOLD, 0.5);
    doc.rect(SX - 3, y - 4.6, R - SX + 3, 8.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    ink(NAVY);
    doc.text(label, SX, y);
    ink(GOLD);
    doc.text(val, R - 3, y, { align: "right" });
    y += 10;
  }

  sumHead("BOOKING PAYMENT");
  sumRow("Room Charges", money(basePrice));
  sumRow("GST (18%)", money(roomGst));
  if (advancePaid > 0)
    sumRow(`Advance — ${advanceMode}`, money(advancePaid));
  if (balancePaid > 0)
    sumRow(`Balance — ${balanceMode}`, money(balancePaid));
  sumBox(
    isCancelled ? "Refunded (Cancelled)" : "Amount Already Paid",
    money(advancePaid + balancePaid),
  );

  sumHead("ADD-ON CHARGES");
  sumRow("Add-on Charges", money(addonTotal));
  sumRow("GST on Add-ons (18%)", money(addonGst));
  if (remaining > 0) sumBox("Remaining to Pay", money(remaining));
  else if (addonWithGst > 0) sumBox("Add-ons Paid", money(addonWithGst));
  else sumBox("Fully Settled", money(0));

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
  y += 9;

  // grand total
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

  watermark();
  footerBar(false);

  /* ── terms & conditions (own page) ───────────────────────────────────── */
  doc.addPage();
  page += 1;
  y = pageHeader(true);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  ink(NAVY);
  doc.text("TERMS & CONDITIONS", L, y);
  stroke(GOLD, 0.6);
  doc.line(L, y + 3.5, R, y + 3.5);
  y += 11;

  const terms = [
    "A valid government-issued photo ID must be presented at check-in.",
    "Check-in time: 1:00 PM | Check-out time: 11:00 AM.",
    "Early check-in and late check-out are subject to availability and may incur additional charges.",
    "Pets, outside food and beverages, alcohol, and smoking are not permitted on the hotel premises.",
    "Cancellations must be made at least 48 hours before the scheduled check-in time to be eligible for a refund, subject to the applicable booking rate and cancellation policy.",
    "For no-shows or cancellations made within 48 hours of check-in, a cancellation charge equivalent to the first night's room tariff may apply, subject to the booking terms.",
    "Eligible refunds will be processed to the original payment method within 5-7 working days. The actual credit time may vary depending on the bank or payment provider.",
    "Personal and identification data is processed in accordance with applicable data protection and privacy laws for purposes including booking management, guest services, payment processing, security, and legal or regulatory compliance.",
    "Payments are securely processed through Razorpay and its payment partners. The hotel does not store full card details. Personal data is not sold to third parties.",
    "Full Terms & Conditions, Privacy Policy, and Cancellation Policy are available at: https://vvgrandpark.com/policies",
    "Please verify the booking dates, room type, guest count, tariff, and contact details shown on this invoice and report any discrepancy promptly.",
    "Vehicle pickup and drop-off requests are subject to availability, applicable charges, and separate confirmation by the hotel.",
    "Guests are responsible for room keycards and hotel property provided during their stay. Reasonable charges may apply for loss or damage caused during the stay.",
    "Hotel policies may be updated from time to time for legal, safety, or operational reasons. The terms applicable at the time of booking will generally apply unless a change is required by applicable law or safety requirements.",
    "For booking assistance or invoice corrections, please contact the hotel as soon as possible and preferably before check-in.",
    "The room tariff does not include additional services or charges unless expressly included in the booking, including transport, minibar, laundry, unapproved extras, or damage to hotel property.",
    "Visitors are permitted only with hotel approval and may be required to provide valid identification.",
    "All guests must comply with hotel quiet hours, safety instructions, and reasonable house rules during their stay.",
    "Lost-property claims will be handled in accordance with hotel records, hotel policy, and applicable law.",
    "This is an electronically generated invoice and does not require a physical signature where permitted under applicable law.",
  ];

  const colGap = 10;
  const colW = (R - L - colGap) / 2;
  const textW = colW - 8;

  const drawTerms = (items, startIndex, x, startY) => {
    let cy = startY;
    items.forEach((t, i) => {
      const lines = doc.splitTextToSize(t, textW);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      ink(GOLD);
      doc.text(`${startIndex + i + 1}.`, x, cy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      ink(NAVY);
      doc.text(lines, x + 7, cy);
      cy += lines.length * 3.7 + 3.2;
    });
    return cy;
  };

  drawTerms(terms.slice(0, 10), 0, L, y);
  drawTerms(terms.slice(10), 10, L + colW + colGap, y);

  watermark();
  footerBar(true);

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
        /* skip on older jsPDF */
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