// ─────────────────────────────────────────────────────────────────────────────
//  invoicePdf.js — shared invoice generator (extracted from AdminDashboard)
//  Usage: await printInvoicePdf(booking, { paymentMode, showToast });
// ─────────────────────────────────────────────────────────────────────────────
const GST_RATE = 0.18;

export async function printInvoicePdf(
  booking,
  { paymentMode = "Online", showToast = () => {} } = {},
) {
    if (!booking) return;
    const b = booking;
    const selectedPaymentMode = paymentMode;
    const addonsForPdf = b.addons || [];
    const isAddonPaid =
      addonsForPdf.length > 0 && addonsForPdf.every((a) => a.paid === 1);
    const isCancelled = b.status === "cancelled";
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
  const basePrice = Number(b.total_price || 0);

const roomGstPdf =
  Math.round(basePrice * GST_RATE * 100) / 100;

const roomTotalPdf =
  Math.round((basePrice + roomGstPdf) * 100) / 100;

const advancePaidPdf = Number(b.advance_paid || 0);
const balancePaidPdf = Number(b.balance_paid || 0);

const paymentTotalPdf = Number(
  b.total_amount || b.final_total || roomTotalPdf
);

// Room booking remaining balance
const roomRemainingPdf = Math.max(
  0,
  Math.round(
    (paymentTotalPdf - advancePaidPdf - balancePaidPdf) * 100
  ) / 100
);

// Add-ons
const addonTotalPdf = Number(b.addon_charges || 0);

const addonGstPdf =
  Math.round(addonTotalPdf * GST_RATE * 100) / 100;

// Only unpaid add-ons
const unpaidAddonTotalPdf =
  (b.addons || [])
    .filter((addon) => addon.paid !== 1)
    .reduce(
      (sum, addon) => sum + Number(addon.amount || 0),
      0
    );

const unpaidAddonGstPdf =
  Math.round(unpaidAddonTotalPdf * GST_RATE * 100) / 100;

// Final remaining amount
const remainingPdf = Math.round(
  (roomRemainingPdf +
    unpaidAddonTotalPdf +
    unpaidAddonGstPdf) *
    100
) / 100;

// Grand total
const grandTotalPdf = Math.round(
  (paymentTotalPdf + addonTotalPdf + addonGstPdf) *
    100
) / 100;
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
    doc.text("vvgrandpark.com", W / 2 + 8, 57);
    doc.text("3/4/D, Thanjai Saalai, Thiruvarur - 610004", W / 2 + 8, 63);
    doc.text("+91 93849 82510 | vvgrandpark@gmail.com", W / 2 + 8, 69);

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
      {
        label: "GST (18%)",
        val: `Rs.${Math.round(roomGstPdf).toLocaleString()}`,
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
    doc.setFillColor(...(isCancelled ? [252, 232, 232] : [232, 248, 240]));
    doc.rect(SX - 1, y - 4, R - SX + 3, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...(isCancelled ? [192, 57, 43] : [45, 154, 110]));
    doc.text(
      isCancelled ? "Refunded (Cancelled)" : "Amount Already Paid",
      SX,
      y + 1,
    );
 doc.text(
  `Rs.${Math.round(
    advancePaidPdf + balancePaidPdf
  ).toLocaleString()}`,
  R,
  y + 1,
  {
    align: "right",
  }
);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.text("ADD-ON CHARGES", L, y + 1);
    y += 6;
    [
      { label: "Add-on Charges", val: `Rs.${addonTotalPdf.toLocaleString()}` },
      {
        label: "GST on Add-ons (18%)",
        val: `Rs.${Math.round(addonGstPdf).toLocaleString()}`,
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
    doc.text(`Rs.${Math.round(remainingPdf).toLocaleString()}`, R, y + 1, {
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
      isCancelled ? "Rs.0" : `Rs.${Math.round(grandTotalPdf).toLocaleString()}`,
      (SX - 1 + R) / 2,
      y + 13,
      { align: "center" },
    );

    // Terms & Conditions
    y += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("TERMS & CONDITIONS", L, y);
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.2);
    doc.line(L, y + 2.5, R, y + 2.5);
    y += 6;

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

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.6);
    doc.setTextColor(120, 120, 120);

    const colWidth = (R - L - 6) / 2;
    const drawColumn = (items, x, startY) => {
      let colY = startY;
      items.forEach((term) => {
        const lines = doc.splitTextToSize(term, colWidth);
        doc.text(lines, x, colY);
        colY += lines.length * 3.1 + 1;
      });
      return colY;
    };

    const leftEndY = drawColumn(terms.slice(0, 10), L, y);
    const rightEndY = drawColumn(terms.slice(10), L + colWidth + 6, y);
    y = Math.max(leftEndY, rightEndY);

    const footerY = Math.max(282, y + 6);
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
      "3/4/D, Thanjai Saalai, Thiruvarur - 610004",
      W / 2,
      footerY + 11,
      { align: "center" },
    );
    doc.text(
      "+91 93849 82510  |  vvgrandpark@gmail.com  |  vvgrandpark.com",
      W / 2,
      footerY + 17,
      { align: "center" },
    );

    if (isCancelled) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.18 }));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(60);
      doc.setTextColor(192, 57, 43);
      doc.text("CANCELLED", W / 2, 160, {
        align: "center",
        angle: 30,
      });
      doc.restoreGraphicsState();
    }

   // Print invoice instead of downloading
doc.autoPrint();

const pdfBlob = doc.output("blob");
const pdfUrl = URL.createObjectURL(pdfBlob);

const printWindow = window.open(pdfUrl, "_blank");

if (!printWindow) {
  showToast("Please allow pop-ups to print the invoice.", "error");
  URL.revokeObjectURL(pdfUrl);
  return;
}

setTimeout(() => {
  URL.revokeObjectURL(pdfUrl);
}, 60000);
}