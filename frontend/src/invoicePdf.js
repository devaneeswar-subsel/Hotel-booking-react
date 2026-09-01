// ─────────────────────────────────────────────────────────────────────────────
//  invoicePdf.js — shared invoice generator
//  Usage: await printInvoicePdf(booking, { paymentMode, showToast });
//
//  Print-safe design: no dark fills, black/grey text only, hairline borders.
//  Renders correctly on a black-and-white printer and flows onto extra pages
//  when there are many add-on charges.
// ─────────────────────────────────────────────────────────────────────────────
const GST_RATE = 0.18;

// page geometry (A4, mm)
const W = 210;
const H = 297;
const L = 18; // left margin
const R = W - 18; // right margin
const TOP = 20; // first baseline on a continuation page
const BOTTOM = 272; // last usable y before the footer zone

// column positions
const C_DESC = L + 3;
const C_DETAIL = 108;
const C_DESC_W = C_DETAIL - C_DESC - 4;
const C_DETAIL_W = 45;

const money = (v) => `Rs.${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

export async function printInvoicePdf(
  booking,
  { paymentMode = "Online", showToast = () => {} } = {},
) {
  if (!booking) return;

  // callers pass either a plain string or an option object — normalise both,
  // otherwise the invoice prints "[object Object]" as the payment mode
  const payLabel =
    typeof paymentMode === "string"
      ? paymentMode
      : paymentMode?.label || paymentMode?.name || paymentMode?.value || "Online";

  const b = booking;
  const addons = b.addons || [];
  const isAddonPaid = addons.length > 0 && addons.every((a) => a.paid === 1);
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

  const unpaidAddonTotal = addons
    .filter((a) => a.paid !== 1)
    .reduce((s, a) => s + Number(a.amount || 0), 0);
  const unpaidAddonGst = Math.round(unpaidAddonTotal * GST_RATE * 100) / 100;

  const remaining =
    Math.round((roomRemaining + unpaidAddonTotal + unpaidAddonGst) * 100) / 100;
  const grandTotal =
    Math.round((paymentTotal + addonTotal + addonGst) * 100) / 100;

  const invNo = `INV-${String(b.booking_id).padStart(5, "0")}`;
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = 0;
  let page = 1;

  /* ── greyscale helpers ───────────────────────────────────────────────── */
  const ink = (g) => doc.setTextColor(g, g, g); // 0 = black, 130 = grey
  const stroke = (g, w = 0.2) => {
    doc.setDrawColor(g, g, g);
    doc.setLineWidth(w);
  };

  /* ── page management ─────────────────────────────────────────────────── */
  function pageHeader(continuation) {
    doc.setFont("times", "bold");
    doc.setFontSize(continuation ? 12 : 17);
    ink(0);
    doc.text("VV GRAND PARK", L, continuation ? 14 : 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    ink(110);
    doc.text("RESIDENCY", L, continuation ? 18 : 21);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(continuation ? 11 : 17);
    ink(0);
    doc.text("INVOICE", R, continuation ? 14 : 16, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    ink(90);
    doc.text(
      continuation ? `${invNo} — page ${page}` : invNo,
      R,
      continuation ? 18 : 21,
      { align: "right" },
    );
    if (!continuation) doc.text(`Date: ${today}`, R, 26, { align: "right" });

    const rule = continuation ? 22 : 30;
    stroke(0, 0.5);
    doc.line(L, rule, R, rule);
    return rule + (continuation ? 8 : 10);
  }

  function newPage() {
    doc.addPage();
    page += 1;
    y = pageHeader(true);
  }

  // reserve `need` mm; break to a new page if it will not fit
  function ensure(need) {
    if (y + need > BOTTOM) newPage();
  }

  /* ── header ──────────────────────────────────────────────────────────── */
  y = pageHeader(false);

  /* ── bill to / from ──────────────────────────────────────────────────── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  ink(110);
  doc.text("BILL TO", L, y);
  doc.text("FROM", W / 2 + 8, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  ink(0);
  doc.text(b.guest_name || "Guest", L, y);
  doc.text("VV Grand Park Residency", W / 2 + 8, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  ink(70);
  // long emails wrap instead of colliding with the FROM column
  const emailLines = doc.splitTextToSize(b.email || "", W / 2 - L - 12);
  doc.text(emailLines, L, y);
  doc.text("vvgrandpark.com", W / 2 + 8, y);

  let leftY = y + emailLines.length * 4;
  if (b.phone) {
    doc.text(String(b.phone), L, leftY);
    leftY += 4;
  }
  doc.text("3/4/D, Thanjai Saalai, Thiruvarur - 610004", W / 2 + 8, y + 6);
  doc.text("+91 93849 82510 | vvgrandpark@gmail.com", W / 2 + 8, y + 12);

  y = Math.max(leftY, y + 16) + 6;

  /* ── line-item table ─────────────────────────────────────────────────── */
  function tableHead() {
    stroke(0, 0.3);
    doc.rect(L, y, R - L, 8); // bordered header, no fill
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ink(0);
    doc.text("DESCRIPTION", C_DESC, y + 5.3);
    doc.text("DETAILS", C_DETAIL, y + 5.3);
    doc.text("AMOUNT", R - 3, y + 5.3, { align: "right" });
    y += 8;
  }

  // one row, wrapping both text columns and growing to fit
  function tableRow(desc, detail, amount, bold) {
    const dLines = doc.splitTextToSize(String(desc ?? ""), C_DESC_W);
    const tLines = doc.splitTextToSize(String(detail ?? ""), C_DETAIL_W);
    const rows = Math.max(dLines.length, tLines.length);
    const h = Math.max(8, rows * 4 + 4);

    if (y + h > BOTTOM) {
      newPage();
      tableHead();
    }

    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8);
    ink(0);
    doc.text(dLines, C_DESC, y + 5);
    ink(70);
    doc.text(tLines, C_DETAIL, y + 5);
    ink(0);
    doc.setFont("helvetica", "bold");
    doc.text(String(amount), R - 3, y + 5, { align: "right" });

    y += h;
    stroke(200, 0.15); // hairline separator instead of a filled band
    doc.line(L, y, R, y);
  }

  function sectionRow(label) {
    if (y + 9 > BOTTOM) {
      newPage();
      tableHead();
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    ink(60);
    doc.text(label, C_DESC, y + 5.5);
    y += 8;
    stroke(160, 0.2);
    doc.line(L, y, R, y);
  }

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

  if (addons.length) {
    sectionRow("ADD-ON CHARGES");
    addons.forEach((a) => {
      tableRow(
        a.label,
        a.created_at ? new Date(a.created_at).toLocaleDateString("en-IN") : "",
        money(a.amount),
      );
    });
  }

  /* ── summary ─────────────────────────────────────────────────────────── */
  const SX = W - 92; // left edge of the summary column
  ensure(70); // keep the whole summary block together
  y += 8;

  function sumHead(label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    ink(110);
    doc.text(label, SX, y);
    y += 5.5;
  }

  function sumRow(label, val) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    ink(90);
    doc.text(label, SX, y);
    doc.setFont("helvetica", "bold");
    ink(20);
    doc.text(val, R, y, { align: "right" });
    y += 5.5;
  }

  // bordered emphasis row — reads clearly in black and white
  function sumBox(label, val, dashed) {
    stroke(0, dashed ? 0.2 : 0.4);
    doc.rect(SX - 2, y - 4.2, R - SX + 2, 7.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    ink(0);
    doc.text(label, SX, y);
    doc.text(val, R - 2, y, { align: "right" });
    y += 9;
  }

  sumHead("BOOKING PAYMENT");
  sumRow("Room Charges", money(basePrice));
  sumRow("GST (18%)", money(roomGst));
  sumBox(
    isCancelled ? "Refunded (Cancelled)" : "Amount Already Paid",
    money(advancePaid + balancePaid),
  );

  // NOTE: the old version drew this heading at the same y as the box above,
  // which is why the two lines overlapped on the printed invoice.
  sumHead("ADD-ON CHARGES");
  sumRow("Add-on Charges", money(addonTotal));
  sumRow("GST on Add-ons (18%)", money(addonGst));
  const addonWithGst = Math.round((addonTotal + addonGst) * 100) / 100;
  if (remaining > 0) {
    sumBox("Remaining to Pay", money(remaining));
  } else if (addonWithGst > 0) {
    // everything settled — show what was collected, not a meaningless zero
    sumBox("Add-ons Paid", money(addonWithGst));
  } else {
    sumBox("Fully Settled", money(0));
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  ink(110);
  doc.text(
    `Payment Mode: ${payLabel}   Status: ${isAddonPaid || remaining <= 0 ? "PAID" : "PENDING"}`,
    SX,
    y,
  );
  y += 7;

  // grand total: heavy border, black text
  stroke(0, 0.8);
  doc.rect(SX - 2, y, R - SX + 2, 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  ink(60);
  doc.text("GRAND TOTAL", (SX - 2 + R) / 2, y + 6, { align: "center" });
  doc.setFontSize(12);
  ink(0);
  doc.text(
    isCancelled ? "Rs.0" : money(grandTotal),
    (SX - 2 + R) / 2,
    y + 12.5,
    { align: "center" },
  );
  y += 22;

  /* ── terms & conditions ──────────────────────────────────────────────── */
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

  const colW = (R - L - 6) / 2;

  // measure first so the block is never split across pages awkwardly
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  const measure = (items) =>
    items.reduce(
      (h, t) => h + doc.splitTextToSize(t, colW).length * 3.1 + 1,
      0,
    );
  const termsHeight =
    Math.max(measure(terms.slice(0, 10)), measure(terms.slice(10))) + 10;

  // terms may run closer to the page edge than body content, since the footer
  // sits on whichever page they finish on
  const TERMS_BOTTOM = 284;
  if (y + termsHeight > TERMS_BOTTOM) newPage();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  ink(60);
  doc.text("TERMS & CONDITIONS", L, y);
  stroke(0, 0.3);
  doc.line(L, y + 2.5, R, y + 2.5);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  ink(110);

  const drawCol = (items, x, startY) => {
    let cy = startY;
    items.forEach((t) => {
      const lines = doc.splitTextToSize(t, colW);
      doc.text(lines, x, cy);
      cy += lines.length * 3.1 + 1;
    });
    return cy;
  };

  y = Math.max(
    drawCol(terms.slice(0, 10), L, y),
    drawCol(terms.slice(10), L + colW + 6, y),
  );

  /* ── footer (last page only) ─────────────────────────────────────────── */
  const footerY = Math.min(Math.max(278, y + 6), H - 16);
  stroke(0, 0.3);
  doc.line(L, footerY, R, footerY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  ink(90);
  doc.text(
    "Thank you for choosing VV Grand Park Residency. We look forward to welcoming you again.",
    W / 2,
    footerY + 5,
    { align: "center" },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    "3/4/D, Thanjai Saalai, Thiruvarur - 610004  |  +91 93849 82510  |  vvgrandpark.com",
    W / 2,
    footerY + 10,
    { align: "center" },
  );

  /* ── cancelled watermark ─────────────────────────────────────────────── */
  if (isCancelled) {
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p += 1) {
      doc.setPage(p);
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.12 }));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(60);
      ink(0);
      doc.text("CANCELLED", W / 2, 160, { align: "center", angle: 30 });
      doc.restoreGraphicsState();
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