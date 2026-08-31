// ─────────────────────────────────────────────────────────────────────────────
//  invoicePdf.js — shared invoice generator (extracted from AdminDashboard)
//  Usage: await printInvoicePdf(booking, { paymentMode, showToast });
// ─────────────────────────────────────────────────────────────────────────────
const GST_RATE = 0.18;

export async function printInvoicePdf(
  booking,
  paymentMode = "Online",
  showToast = () => {},
) {
  if (!booking) return;

  const b = booking;
  const selectedPaymentMode = paymentMode;
  const addonsForPdf = b.addons || [];

  const isAddonPaid =
    addonsForPdf.length > 0 &&
    addonsForPdf.every((a) => a.paid === 1);

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
          (new Date(b.check_out_date) -
            new Date(b.check_in_date)) /
            86400000,
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
    b.total_amount ||
      b.final_total ||
      roomTotalPdf,
  );

  // Room booking remaining balance
  const roomRemainingPdf = Math.max(
    0,
    Math.round(
      (paymentTotalPdf -
        advancePaidPdf -
        balancePaidPdf) *
        100,
    ) / 100,
  );

  // Add-ons
  const addonTotalPdf = Number(
    b.addon_charges || 0,
  );

  const addonGstPdf =
    Math.round(addonTotalPdf * GST_RATE * 100) /
    100;

  // Only unpaid add-ons
  const unpaidAddonTotalPdf =
    (b.addons || [])
      .filter((addon) => addon.paid !== 1)
      .reduce(
        (sum, addon) =>
          sum + Number(addon.amount || 0),
        0,
      );

  const unpaidAddonGstPdf =
    Math.round(
      unpaidAddonTotalPdf * GST_RATE * 100,
    ) / 100;

  // Final remaining amount
  const remainingPdf =
    Math.round(
      (roomRemainingPdf +
        unpaidAddonTotalPdf +
        unpaidAddonGstPdf) *
        100,
    ) / 100;

  // Grand total
  const grandTotalPdf =
    Math.round(
      (paymentTotalPdf +
        addonTotalPdf +
        addonGstPdf) *
        100,
    ) / 100;

  const invNo = `INV-${String(
    b.booking_id,
  ).padStart(5, "0")}`;

  const today = new Date().toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  const W = 210;
  const L = 18;
  const R = W - 18;

  // =====================================================
  // PAGE BORDER
  // =====================================================

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, 297, "F");

  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(0.45);

  doc.rect(
    8,
    8,
    W - 16,
    281,
    "S",
  );

  // =====================================================
  // HEADER - COMPACT
  // =====================================================

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(120, 90, 35);

  doc.text(
    "VV GRAND PARK",
    L,
    15,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(120, 100, 70);

  doc.text(
    "RESIDENCY",
    L + 17,
    20,
  );

  // Small decorative line
  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(0.25);

  doc.line(
    L,
    22,
    L + 52,
    22,
  );

  // Invoice heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(25, 25, 25);

  doc.text(
    "INVOICE",
    R,
    14,
    {
      align: "right",
    },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);

  doc.text(
    invNo,
    R,
    19,
    {
      align: "right",
    },
  );

  doc.text(
    `Date: ${today}`,
    R,
    23,
    {
      align: "right",
    },
  );

  // Header separator
  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(0.3);

  doc.line(
    L,
    28,
    R,
    28,
  );

  // =====================================================
  // BILL TO / FROM - COMPACT
  // =====================================================

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(130, 130, 130);

  doc.text(
    "BILL TO",
    L,
    35,
  );

  doc.text(
    "FROM",
    W / 2 + 8,
    35,
  );

  // Guest name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(20, 25, 30);

  doc.text(
    b.guest_name || "Guest",
    L,
    41,
  );

  // Guest details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(75, 80, 85);

  if (b.email) {
    doc.text(
      b.email,
      L,
      46,
    );
  }

  if (b.phone) {
    doc.text(
      b.phone,
      L,
      51,
    );
  }

  // Hotel details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(20, 25, 30);

  doc.text(
    "VV Grand Park Residency",
    W / 2 + 8,
    41,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(75, 80, 85);

  doc.text(
    "vvgrandpark.com",
    W / 2 + 8,
    46,
  );

  doc.text(
    "3/4/D, Thanjai Saalai, Thiruvarur - 610004",
    W / 2 + 8,
    51,
  );

  doc.text(
    "+91 93849 82510 | vvgrandpark@gmail.com",
    W / 2 + 8,
    56,
  );

  // =====================================================
  // MAIN TABLE
  // =====================================================

  const tableTop = 63;

  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(0.35);

  doc.roundedRect(
    L,
    tableTop,
    W - 36,
    8,
    1.2,
    1.2,
    "S",
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.7);
  doc.setTextColor(80, 70, 50);

  doc.text(
    "DESCRIPTION",
    L + 4,
    tableTop + 5.2,
  );

  doc.text(
    "DETAILS",
    108,
    tableTop + 5.2,
  );

  doc.text(
    "AMOUNT",
    R,
    tableTop + 5.2,
    {
      align: "right",
    },
  );

  const rows = [
    {
      desc: `${b.room_type} — Room ${
        b.room_number || b.room_id
      }`,
      detail: `${nights} night${
        nights > 1 ? "s" : ""
      }`,
      amount: `Rs.${basePrice.toLocaleString()}`,
    },

    {
      desc: "Check-in",
      detail: ci,
      amount: "—",
    },

    {
      desc: "Check-out",
      detail: co,
      amount: "—",
    },

    ...(b.hours_spent
      ? [
          {
            desc: "Hours Stayed",
            detail: `${b.hours_spent} hrs`,
            amount: "—",
          },
        ]
      : []),

    {
      desc: "Guests",
      detail: `${b.guest_count || 1}`,
      amount: "—",
    },
  ];

  let y = tableTop + 13;

  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(
        248,
        249,
        250,
      );

      doc.rect(
        L,
        y - 4.2,
        W - 36,
        6.5,
        "F",
      );
    }

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(7);

    doc.setTextColor(
      25,
      25,
      25,
    );

    doc.text(
      row.desc,
      L + 4,
      y,
    );

    doc.setTextColor(
      80,
      80,
      80,
    );

    doc.text(
      String(row.detail),
      108,
      y,
    );

    doc.text(
      row.amount,
      R,
      y,
      {
        align: "right",
      },
    );

    y += 6.5;
  });

  // =====================================================
  // ADD-ON CHARGES
  // =====================================================

  if (
    b.addons &&
    b.addons.length > 0
  ) {
    y += 1.5;

    doc.setFillColor(
      248,
      249,
      250,
    );

    doc.setDrawColor(
      210,
      210,
      210,
    );

    doc.roundedRect(
      L,
      y - 4,
      W - 36,
      7,
      1,
      1,
      "FD",
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(6.7);

    doc.setTextColor(
      85,
      85,
      85,
    );

    doc.text(
      "ADD-ON CHARGES",
      L + 4,
      y + 0.5,
    );

    y += 6;

    b.addons.forEach(
      (addon, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(
            250,
            250,
            250,
          );

          doc.rect(
            L,
            y - 4,
            W - 36,
            6,
            "F",
          );
        }

        doc.setFont(
          "helvetica",
          "normal",
        );

        doc.setFontSize(6.8);

        doc.setTextColor(
          30,
          30,
          30,
        );

        doc.text(
          addon.label,
          L + 4,
          y,
        );

        doc.setTextColor(
          90,
          90,
          90,
        );

        doc.text(
          new Date(
            addon.created_at,
          ).toLocaleDateString(
            "en-IN",
          ),
          108,
          y,
        );

        doc.text(
          `Rs.${Number(
            addon.amount,
          ).toLocaleString()}`,
          R,
          y,
          {
            align: "right",
          },
        );

        y += 6;
      },
    );
  }

  // =====================================================
  // PAYMENT SECTION
  // =====================================================

  y += 4;

  doc.setDrawColor(
    220,
    220,
    220,
  );

  doc.setLineWidth(0.25);

  doc.line(
    L,
    y,
    R,
    y,
  );

  y += 4;

  const SX = W - 90;

  // Left heading
  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(6);

  doc.setTextColor(
    150,
    150,
    150,
  );

  doc.text(
    "BOOKING PAYMENT — ALREADY PAID",
    L,
    y,
  );

  // Right heading
  doc.text(
    "ADD-ON CHARGES",
    SX,
    y,
  );

  y += 5;

  // Room payment
  [
    {
      label: "Room Charges",
      val: `Rs.${basePrice.toLocaleString()}`,
    },

    {
      label: "GST (18%)",
      val: `Rs.${Math.round(
        roomGstPdf,
      ).toLocaleString()}`,
    },
  ].forEach(
    ({ label, val }) => {
      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.setFontSize(7);

      doc.setTextColor(
        110,
        110,
        110,
      );

      doc.text(
        label,
        SX,
        y,
      );

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setTextColor(
        30,
        30,
        30,
      );

      doc.text(
        val,
        R,
        y,
        {
          align: "right",
        },
      );

      y += 5;
    },
  );

  // Add-on payment
  const addonStartY = y - 10;

  [
    {
      label: "Add-on Charges",
      val: `Rs.${addonTotalPdf.toLocaleString()}`,
    },

    {
      label: "GST on Add-ons (18%)",
      val: `Rs.${Math.round(
        addonGstPdf,
      ).toLocaleString()}`,
    },
  ].forEach(
    ({ label, val }, index) => {
      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.setFontSize(7);

      doc.setTextColor(
        110,
        110,
        110,
      );

      doc.text(
        label,
        SX,
        addonStartY +
          index * 5,
      );

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setTextColor(
        30,
        30,
        30,
      );

      doc.text(
        val,
        R,
        addonStartY +
          index * 5,
        {
          align: "right",
        },
      );
    },
  );

  // =====================================================
  // AMOUNT ALREADY PAID
  // =====================================================

  const paidY = y + 1;

  doc.setDrawColor(
    isCancelled
      ? 192
      : 45,
    isCancelled
      ? 57
      : 154,
    isCancelled
      ? 43
      : 110,
  );

  doc.setLineWidth(0.35);

  doc.roundedRect(
    L,
    paidY - 4,
    92,
    7,
    1.2,
    1.2,
    "S",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(7.5);

  doc.setTextColor(
    isCancelled
      ? 192
      : 45,
    isCancelled
      ? 57
      : 154,
    isCancelled
      ? 43
      : 110,
  );

  doc.text(
    isCancelled
      ? "Refunded (Cancelled)"
      : "Amount Already Paid",
    L + 3,
    paidY + 1,
  );

  doc.text(
    `Rs.${Math.round(
      advancePaidPdf +
        balancePaidPdf,
    ).toLocaleString()}`,
    L + 89,
    paidY + 1,
    {
      align: "right",
    },
  );

  // =====================================================
  // REMAINING TO PAY
  // =====================================================



  const remTxt = isAddonPaid
    ? [45, 154, 110]
    : [180, 120, 20];

  doc.setDrawColor(
    ...remTxt,
  );

  doc.setLineWidth(0.35);

  doc.roundedRect(
    SX - 1,
    paidY - 4,
    R - SX + 1,
    7,
    1.2,
    1.2,
    "S",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(7.5);

  doc.setTextColor(
    ...remTxt,
  );

  doc.text(
    isAddonPaid
      ? "Add-ons Paid"
      : "Remaining to Pay",
    SX + 2,
    paidY + 1,
  );

  doc.text(
    `Rs.${Math.round(
      remainingPdf,
    ).toLocaleString()}`,
    R - 2,
    paidY + 1,
    {
      align: "right",
    },
  );

  y = paidY + 12;

  // =====================================================
  // PAYMENT MODE / STATUS
  // =====================================================

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(6.8);

  doc.setTextColor(
    110,
    110,
    110,
  );

  doc.text(
    `Payment Mode: ${selectedPaymentMode}   Status: ${
      isAddonPaid
        ? "PAID"
        : "PENDING"
    }`,
    L,
    y,
  );

  // =====================================================
  // GRAND TOTAL
  // =====================================================

  y += 5;

  doc.setDrawColor(
    201,
    168,
    76,
  );

  doc.setLineWidth(0.45);

  doc.roundedRect(
    SX - 1,
    y,
    R - SX + 1,
    12,
    1.5,
    1.5,
    "S",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(6.5);

  doc.setTextColor(
    80,
    70,
    50,
  );

  doc.text(
    "GRAND TOTAL",
    SX + 4,
    y + 7,
  );

  doc.setFontSize(9.5);

  doc.setTextColor(
    20,
    25,
    30,
  );

  doc.text(
    isCancelled
      ? "Rs.0"
      : `Rs.${Math.round(
          grandTotalPdf,
        ).toLocaleString()}`,
    R - 3,
    y + 7,
    {
      align: "right",
    },
  );

  y += 17;

  // =====================================================
  // TERMS & CONDITIONS
  // =====================================================

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(6.8);

  doc.setTextColor(
    80,
    80,
    80,
  );

  doc.text(
    "TERMS & CONDITIONS",
    L,
    y,
  );

  doc.setDrawColor(
    201,
    168,
    76,
  );

  doc.setLineWidth(0.2);

  doc.line(
    L,
    y + 2.5,
    R,
    y + 2.5,
  );

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

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(5.1);

  doc.setTextColor(
    105,
    105,
    105,
  );

  const colWidth =
    (R - L - 6) / 2;

  const drawColumn = (
    items,
    x,
    startY,
  ) => {
    let colY = startY;

    items.forEach(
      (term) => {
        const lines =
          doc.splitTextToSize(
            term,
            colWidth,
          );

        doc.text(
          lines,
          x,
          colY,
        );

        colY +=
          lines.length * 2.65 +
          0.5;
      },
    );

    return colY;
  };

  const leftEndY =
    drawColumn(
      terms.slice(0, 10),
      L,
      y,
    );

  const rightEndY =
    drawColumn(
      terms.slice(10),
      L + colWidth + 6,
      y,
    );

  y = Math.max(
    leftEndY,
    rightEndY,
  );

  // =====================================================
  // FOOTER
  // =====================================================

  // Keep footer safely inside A4
  const footerY = Math.min(
    Math.max(y + 4, 270),
    274,
  );

  doc.setDrawColor(
    201,
    168,
    76,
  );

  doc.setLineWidth(0.3);

  doc.line(
    L,
    footerY,
    R,
    footerY,
  );

  doc.setFont(
    "helvetica",
    "italic",
  );

  doc.setFontSize(6.5);

  doc.setTextColor(
    134,
    142,
    150,
  );

  doc.text(
    "Thank you for choosing VV Grand Park Residency. We look forward to welcoming you again.",
    W / 2,
    footerY + 5,
    {
      align: "center",
    },
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(6.5);

  doc.text(
    "3/4/D, Thanjai Saalai, Thiruvarur - 610004",
    W / 2,
    footerY + 10,
    {
      align: "center",
    },
  );

  doc.text(
    "+91 93849 82510  |  vvgrandpark@gmail.com  |  vvgrandpark.com",
    W / 2,
    footerY + 15,
    {
      align: "center",
    },
  );

  // =====================================================
  // CANCELLED WATERMARK
  // =====================================================

  if (isCancelled) {
    doc.saveGraphicsState();

    doc.setGState(
      new doc.GState({
        opacity: 0.18,
      }),
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(60);

    doc.setTextColor(
      192,
      57,
      43,
    );

    doc.text(
      "CANCELLED",
      W / 2,
      160,
      {
        align: "center",
        angle: 30,
      },
    );

    doc.restoreGraphicsState();
  }

  // =====================================================
  // PRINT INVOICE
  // =====================================================

  doc.autoPrint();

  const pdfBlob =
    doc.output("blob");

  const pdfUrl =
    URL.createObjectURL(
      pdfBlob,
    );

  const printWindow =
    window.open(
      pdfUrl,
      "_blank",
    );

  if (!printWindow) {
    showToast(
      "Please allow pop-ups to print the invoice.",
      "error",
    );

    URL.revokeObjectURL(
      pdfUrl,
    );

    return;
  }

  setTimeout(() => {
    URL.revokeObjectURL(
      pdfUrl,
    );
  }, 60000);
}