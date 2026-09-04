// ─────────────────────────────────────────────────────────────────────────────
//  invoicePdf.js — branded invoice generator
//
//  Usage:
//  await printInvoicePdf(booking, {
//    paymentMode,
//    showToast,
//    checkoutDiscount,
//  });
//
//  Page 1: header, bill-to/from, line items, summary, grand total.
//  Extra pages are inserted automatically when there are many add-ons.
//  Terms & Conditions page removed.
//  The invoice date is read at print time, so it is always today's date.
// ─────────────────────────────────────────────────────────────────────────────

const GST_RATE = 0.18;

// page geometry (A4, mm)
const W = 210;
const H = 297;
const L = 15;
const R = W - 15;
const FOOTER_TOP = 277;
const BOTTOM = 270;

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

const money = (v) =>
  `Rs.${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

// invoice numbers are year-prefixed, e.g. INV-2026-0037
function formatBookingId(booking) {
  const year = new Date(
    booking.created_at || Date.now(),
  ).getFullYear();

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
    return null;
  }
}

export async function printInvoicePdf(
  booking,
  {
    paymentMode = "Online",
    showToast = () => {},
    checkoutDiscount = 0,
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

// Booking dates — always use the dates selected during booking.
// Do not replace them with actual check-in / check-out timestamps.
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
            (new Date(b.check_out_date) -
              new Date(b.check_in_date)) /
              86400000,
          ),
        )
      : 1;

  // actual time in the room
  let stayLabel = "";

  if (b.actual_checkin && b.actual_checkout) {
    const mins = Math.max(
      0,
      Math.round(
        (new Date(b.actual_checkout) -
          new Date(b.actual_checkin)) /
          60000,
      ),
    );

    const h = Math.floor(mins / 60);
    const m = mins % 60;

    stayLabel =
      h > 0 ? `${h} hr ${m} min` : `${m} min`;
  }

  // guests actually recorded at check-in,
  // falling back to the booked count
  const guestRows = b.guests || [];

  const adultCount =
    guestRows.filter(
      (g) => g.guest_type === "adult",
    ).length ||
    Number(b.adults_count) ||
    Number(b.guest_count) ||
    1;

  const childCount =
    guestRows.filter(
      (g) => g.guest_type === "child",
    ).length ||
    Number(b.children_count) ||
    0;

  const guestSummary = [
    `${adultCount} Adult${
      adultCount === 1 ? "" : "s"
    }`,
    childCount > 0
      ? `${childCount} Child${
          childCount === 1 ? "" : "ren"
        }`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  /* ── amounts ─────────────────────────────────────────────────────────── */

  // Original room price before booking discount
  const basePrice = Number(b.total_price || 0);

  // ─────────────────────────────────────────────────────────────────────
  // ORIGINAL BOOKING DISCOUNT
  // This is the discount applied when the booking was created.
  // It must remain separate from checkout discount.
  // ─────────────────────────────────────────────────────────────────────
  const discountAmount = Math.max(
    0,
    Number(
      b.discount_applied
        ? b.discount_amount
        : 0,
    ) || 0,
  );

  // const discountedRoomAmount = Math.max(
  //   0,
  //   basePrice - discountAmount,
  // );

  // GST is charged on the FULL room tariff; the booking discount is deducted
  // from the gross total afterwards, so it reduces the bill 1:1
  const roomGst = Math.round(basePrice * GST_RATE * 100) / 100;

  const grossRoomTotal = Math.round((basePrice + roomGst) * 100) / 100;

  const roomTotal = Math.max(
    0,
    Math.round((grossRoomTotal - discountAmount) * 100) / 100,
  );

  // Payments already made
  const advancePaid = Number(
    b.advance_paid || 0,
  );

  const balancePaid = Number(
    b.balance_paid || 0,
  );

  // Existing persisted booking total.
  // This already represents the booking's original
  // payable amount and should NOT have checkout discount
  // applied to it a second time.
  const paymentTotal = Number(
    b.total_amount ||
      b.final_total ||
      roomTotal,
  );

  const roomRemaining = Math.max(
    0,
    Math.round(
      (paymentTotal -
        advancePaid -
        balancePaid) *
        100,
    ) / 100,
  );

  // ─────────────────────────────────────────────────────────────────────
  // CHECKOUT DISCOUNT
  //
  // This is a SECOND, separate discount applied at checkout.
  //
  // checkoutDiscount:
  //   Base room discount amount
  //
  // checkoutDiscountGst:
  //   GST reduction caused by checkout discount
  //
  // checkoutDiscountImpact:
  //   Total reduction from the final payable amount
  // ─────────────────────────────────────────────────────────────────────

  const persistedCheckoutDiscount = Number(
    b.checkout_discount_amount || 0,
  );

  const suppliedCheckoutDiscount = Number(
    checkoutDiscount || 0,
  );

  const rawCheckoutDiscount =
    suppliedCheckoutDiscount > 0
      ? suppliedCheckoutDiscount
      : persistedCheckoutDiscount;

  // The outstanding balance already includes GST, so the checkout discount
  // reduces it 1:1 — no tax is recalculated.
  const appliedCheckoutDiscount = Math.min(
    Math.max(0, rawCheckoutDiscount),
    roomRemaining,
  );

  // const checkoutDiscountGst = 0;

  const checkoutDiscountImpact =
    Math.round(appliedCheckoutDiscount * 100) / 100;

  // Final room balance after checkout discount
  const finalRoomRemaining = Math.max(
    0,
    Math.round(
      (roomRemaining -
        checkoutDiscountImpact) *
        100,
    ) / 100,
  );

  // ─────────────────────────────────────────────────────────────────────
  // ADD-ONS
  // ─────────────────────────────────────────────────────────────────────

  const addonTotal = Number(
    b.addon_charges || 0,
  );

  const addonGst =
    Math.round(
      addonTotal * GST_RATE * 100,
    ) / 100;

  const addonWithGst =
    Math.round(
      (addonTotal + addonGst) *
        100,
    ) / 100;

  const unpaidAddonTotal = addons
    .filter((a) => a.paid !== 1)
    .reduce(
      (s, a) =>
        s + Number(a.amount || 0),
      0,
    );

  const unpaidAddonGst =
    Math.round(
      unpaidAddonTotal *
        GST_RATE *
        100,
    ) / 100;

  // Final amount still payable after checkout discount
  const remaining =
    Math.round(
      (finalRoomRemaining +
        unpaidAddonTotal +
        unpaidAddonGst) *
        100,
    ) / 100;

  // Final invoice grand total after both discounts
  //
  // Original booking discount is already reflected in
  // paymentTotal.
  //
  // Checkout discount is deducted separately here.
  const grandTotal = Math.max(
    0,
    Math.round(
      (
        paymentTotal +
        addonTotal +
        addonGst -
        checkoutDiscountImpact
      ) *
        100,
    ) / 100,
  );

  const advanceMode =
    b.advance_payment_mode ||
    b.payment_method ||
    "—";

  const balanceMode =
    b.balance_payment_mode ||
    payLabel;

  // const fmtStamp = (d) =>
    // d
    //   ? new Date(d).toLocaleString(
    //       "en-IN",
    //       {
    //         day: "2-digit",
    //         month: "short",
    //         year: "numeric",
    //         hour: "2-digit",
    //         minute: "2-digit",
    //       },
    //     )
    //   : "—";

  const invNo =
    `INV-${formatBookingId(b)}`;

  // read at print time
  const today =
    new Date().toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );

  const logo = await loadLogo();

  const { jsPDF } =
    await import("jspdf");

  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
  });

  let y = 0;
  let page = 1;

  /* ── paint helpers ───────────────────────────────────────────────────── */

  const ink = (c) =>
    doc.setTextColor(
      c[0],
      c[1],
      c[2],
    );

  const fill = (c) =>
    doc.setFillColor(
      c[0],
      c[1],
      c[2],
    );

  const stroke = (
    c,
    w = 0.2,
  ) => {
    doc.setDrawColor(
      c[0],
      c[1],
      c[2],
    );

    doc.setLineWidth(w);
  };

  function watermark() {
    if (!logo) return;

    try {
      doc.saveGraphicsState();

      doc.setGState(
        new doc.GState({
          opacity: 0.06,
        }),
      );

      doc.addImage(
        logo,
        "PNG",
        22,
        165,
        78,
        78,
      );

      doc.restoreGraphicsState();
    } catch {
      // ignore
    }
  }

  function footerBar() {
    fill(NAVY_DARK);

    doc.rect(
      0,
      FOOTER_TOP,
      W,
      H - FOOTER_TOP,
      "F",
    );

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(8);

    ink(WHITE);

    doc.setFontSize(7.5);

    doc.text(
      "+91 93849 82510  |  +91 90032 51115",
      L,
      FOOTER_TOP + 8,
    );

    doc.text(
      "vvgrandpark@gmail.com  |  vvgrandpark.com",
      L,
      FOOTER_TOP + 13,
    );

    doc.setFont(
      "helvetica",
      "italic",
    );

    doc.setFontSize(8);

    ink(GOLD_SOFT);

    doc.text(
      "Thank you for choosing",
      R,
      FOOTER_TOP + 8,
      {
        align: "right",
      },
    );

    doc.text(
      "VV Grand Park Residency.",
      R,
      FOOTER_TOP + 13,
      {
        align: "right",
      },
    );
  }

  /* ── page header ─────────────────────────────────────────────────────── */

  function pageHeader(
    continuation,
  ) {
    const top =
      continuation ? 6 : 7;

    if (logo) {
      try {
        doc.addImage(
          logo,
          "PNG",
          L,
          top - 2,
          22,
          22,
        );
      } catch {
        // ignore
      }
    }

    const tx = logo
      ? L + 27
      : L;

    doc.setFont(
      "times",
      "bold",
    );

    doc.setFontSize(22);

    ink(NAVY);

    doc.text(
      "VV GRAND PARK",
      tx,
      top + 9,
    );

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(8);

    ink(NAVY);

    doc.text(
      "R E S I D E N C Y",
      tx + 1,
      top + 15,
    );

    stroke(
      GOLD_SOFT,
      0.4,
    );

    doc.line(
      tx + 1,
      top + 18,
      tx + 55,
      top + 18,
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(19);

    ink(NAVY);

    doc.text(
      "INVOICE",
      R,
      top + 8,
      {
        align: "right",
      },
    );

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(9);

    ink(GOLD);

    doc.text(
      continuation
        ? `${invNo} — page ${page}`
        : invNo,
      R,
      top + 14,
      {
        align: "right",
      },
    );

    if (!continuation) {
      doc.setFontSize(8.5);

      ink(GREY);

      doc.text(
        `Date: ${today}`,
        R,
        top + 20,
        {
          align: "right",
        },
      );
    }

    const rule =
      top + 22;

    stroke(GOLD, 0.7);

    doc.line(
      L,
      rule,
      R,
      rule,
    );

    return rule + 7;
  }

  function newPage() {
    watermark();
    footerBar();

    doc.addPage();

    page += 1;

    y = pageHeader(true);
  }

  y = pageHeader(false);

  /* ── bill to / from ──────────────────────────────────────────────────── */

  const FX = 105;

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(7.5);

  ink(GOLD);

  doc.text(
    "BILL TO",
    L + 13,
    y,
  );

  doc.text(
    "FROM",
    FX,
    y,
  );

  y += 7;

  // guest crest
  fill(CREAM);

  stroke(
    GOLD_SOFT,
    0.3,
  );

  doc.circle(
    L + 5,
    y + 1,
    5.5,
    "FD",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(9);

  ink(GOLD);

  doc.text(
    (
      b.guest_name ||
      "G"
    )
      .charAt(0)
      .toUpperCase(),
    L + 5,
    y + 2.5,
    {
      align: "center",
    },
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(12);

  ink(NAVY);

  doc.text(
    b.guest_name ||
      "Guest",
    L + 13,
    y + 2,
  );

  doc.text(
    "VV Grand Park Residency",
    FX,
    y + 2,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(8.5);

  ink(GREY);

  const emailLines =
    doc.splitTextToSize(
      b.email || "",
      80,
    );

  doc.text(
    emailLines,
    L + 13,
    y + 9,
  );

  let leftY =
    y +
    9 +
    emailLines.length *
      4.5;

  if (b.phone) {
    doc.text(
      String(b.phone),
      L + 13,
      leftY,
    );

    leftY += 4.5;
  }

  doc.text(
    "vvgrandpark.com",
    FX,
    y + 9,
  );

  doc.text(
    "3/4/D, Thanjai Saalai, Thiruvarur - 610004",
    FX,
    y + 16,
  );

  doc.text(
    "+91 93849 82510 |+91 90032 51115  |  vvgrandpark@gmail.com",
    FX,
    y + 23,
  );

  y =
    Math.max(
      leftY,
      y + 28,
    ) + 6;

  /* ── line-item table ─────────────────────────────────────────────────── */

  let stripe = 0;

  function tableHead() {
    fill(GOLD);

    doc.rect(
      L,
      y,
      R - L,
      9,
      "F",
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(8);

    ink(WHITE);

    doc.text(
      "DESCRIPTION",
      C_DESC,
      y + 6,
    );

    doc.text(
      "DETAILS",
      C_DETAIL,
      y + 6,
    );

    doc.text(
      "AMOUNT",
      R - 4,
      y + 6,
      {
        align: "right",
      },
    );

    y += 9;
  }

  function tableRow(
    desc,
    detail,
    amount,
  ) {
    const dLines =
      doc.splitTextToSize(
        String(desc ?? ""),
        C_DESC_W,
      );

    const tLines =
      doc.splitTextToSize(
        String(detail ?? ""),
        C_DETAIL_W,
      );

    const h = Math.max(
      9,
      Math.max(
        dLines.length,
        tLines.length,
      ) *
        4.4 +
        4.5,
    );

    if (
      y + h >
      BOTTOM
    ) {
      newPage();
      tableHead();
    }

    if (stripe % 2 === 1) {
      fill(CREAM);

      doc.rect(
        L,
        y,
        R - L,
        h,
        "F",
      );
    }

    stripe += 1;

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(8.5);

    ink(NAVY);

    doc.text(
      dLines,
      C_DESC,
      y + 5.8,
    );

    doc.setFont(
      "helvetica",
      "normal",
    );

    ink(GREY);

    doc.text(
      tLines,
      C_DETAIL,
      y + 5.8,
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    ink(NAVY);

    doc.text(
      String(amount),
      R - 4,
      y + 5.8,
      {
        align: "right",
      },
    );

    y += h;

    stroke(
      GOLD_SOFT,
      0.15,
    );

    doc.line(
      L,
      y,
      R,
      y,
    );
  }

  function sectionRow(label) {
    if (
      y + 9 >
      BOTTOM
    ) {
      newPage();
      tableHead();
    }

    fill(CREAM);

    doc.rect(
      L,
      y,
      R - L,
      8,
      "F",
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(7.5);

    ink(GOLD);

    doc.text(
      label,
      C_DESC,
      y + 5.5,
    );

    y += 8;

    stroke(
      GOLD_SOFT,
      0.2,
    );

    doc.line(
      L,
      y,
      R,
      y,
    );

    stripe = 0;
  }

  stroke(
    GOLD_SOFT,
    0.3,
  );

  tableHead();

  tableRow(
    `${b.room_type} — Room ${
      b.room_number ||
      b.room_id
    }`,
    `${nights} night${
      nights > 1 ? "s" : ""
    }`,
    money(basePrice),
  );

  tableRow(
    "Check-in",
    ci,
    "—",
  );

  tableRow(
    "Check-out",
    co,
    "—",
  );

  if (stayLabel) {
    tableRow(
      "Time Stayed",
      stayLabel,
      "—",
    );
  }

  tableRow(
    "Guests",
    guestSummary,
    "—",
  );

// payment history
if (
  advancePaid > 0 ||
  balancePaid > 0
) {
  sectionRow(
    "PAYMENT HISTORY",
  );

  if (advancePaid > 0) {
    tableRow(
      `Advance Payment`,
      advanceMode,
      money(advancePaid),
    );
  }

  if (balancePaid > 0) {
    tableRow(
      `Balance Payment`,
      balanceMode,
      money(balancePaid),
    );
  }
}
// add-ons
if (addons.length) {
  sectionRow(
    "ADD-ON CHARGES",
  );

  addons.forEach((a) => {
    tableRow(
      a.label,
      "",
      money(a.amount),
    );
  });
}

  /* ── summary ─────────────────────────────────────────────────────────── */

  const SX = 100;

  /*
   * The summary block runs from BOOKING PAYMENT down to the GRAND TOTAL box.
   * Its height varies with which discount sections apply, so measure it
   * instead of guessing — a fixed reserve pushed the grand total under the
   * footer bar whenever both discounts were present.
   *   heading 6.5 | row 6 | boxed row 10 | payment-mode line 9 | total box 24
   */
  const summaryHeight =
    8 +
    6.5 + // BOOKING PAYMENT heading
    6 * 2 + // room charges + GST
    (discountAmount > 0 ? 6 * 2 : 0) + // discount + total before discount
    (appliedCheckoutDiscount > 0 ? 6.5 + 6 + 10 : 0) + // checkout section
    (advancePaid > 0 ? 6 : 0) +
    (balancePaid > 0 ? 6 : 0) +
    10 + // amount already paid box
    6.5 +
    6 * 2 + // add-on heading + two rows
    10 + // remaining box
    9 + // payment mode line
    24; // grand total box

  if (y + summaryHeight > BOTTOM) {
    newPage();
  }

  y += 8;

  function sumHead(label) {
    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(7.5);

    ink(GOLD);

    doc.text(
      label,
      SX,
      y,
    );

    y += 6.5;
  }

  function sumRow(
    label,
    val,
  ) {
    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(8.5);

    ink(GREY);

    doc.text(
      label,
      SX,
      y,
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    ink(NAVY);

    doc.text(
      val,
      R,
      y,
      {
        align: "right",
      },
    );

    y += 6;
  }

  function sumBox(
    label,
    val,
  ) {
    fill(CREAM);

    stroke(
      GOLD,
      0.5,
    );

    doc.rect(
      SX - 3,
      y - 4.6,
      R - SX + 3,
      8.5,
      "FD",
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(8.5);

    ink(NAVY);

    doc.text(
      label,
      SX,
      y,
    );

    ink(GOLD);

    doc.text(
      val,
      R - 3,
      y,
      {
        align: "right",
      },
    );

    y += 10;
  }

  /* ─────────────────────────────────────────────────────────────────────
     BOOKING PAYMENT
     ─────────────────────────────────────────────────────────────────── */

  sumHead(
    "BOOKING PAYMENT",
  );

  // Original room tariff
  sumRow(
    "Room Charges",
    money(basePrice),
  );

  // GST is charged on the full tariff
  sumRow(
    "GST (18%)",
    money(roomGst),
  );

  // ...then the booking discount comes off the gross total
  if (
    discountAmount > 0
  ) {
    sumRow(
      "Total before discount",
      money(grossRoomTotal),
    );

    sumRow(
      "Booking Discount",
      `- ${money(
        discountAmount,
      )}`,
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
     CHECKOUT DISCOUNT
     ─────────────────────────────────────────────────────────────────── */

  if (
    appliedCheckoutDiscount >
    0
  ) {
    sumHead(
      "CHECKOUT / FINAL DISCOUNT",
    );

    sumRow(
      "Checkout Discount",
      `- ${money(
        appliedCheckoutDiscount,
      )}`,
    );

    sumBox(
      "Final Balance / Payable",
      money(
        finalRoomRemaining,
      ),
    );
  }

  // Payment history
  if (advancePaid > 0) {
    sumRow(
      `Advance — ${advanceMode}`,
      money(advancePaid),
    );
  }

  if (balancePaid > 0) {
    sumRow(
      `Balance — ${balanceMode}`,
      money(balancePaid),
    );
  }

  sumBox(
    isCancelled
      ? "Refunded (Cancelled)"
      : "Amount Already Paid",
    money(
      advancePaid +
        balancePaid,
    ),
  );

  /* ─────────────────────────────────────────────────────────────────────
     ADD-ON CHARGES
     ─────────────────────────────────────────────────────────────────── */

  sumHead(
    "ADD-ON CHARGES",
  );

  sumRow(
    "Add-on Charges",
    money(addonTotal),
  );

  sumRow(
    "GST on Add-ons (18%)",
    money(addonGst),
  );

  if (
    remaining > 0
  ) {
    sumBox(
      "Remaining to Pay",
      money(remaining),
    );
  } else if (
    addonWithGst > 0
  ) {
    sumBox(
      "Add-ons Paid",
      money(addonWithGst),
    );
  } else {
    sumBox(
      "Fully Settled",
      money(0),
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
     PAYMENT STATUS
     ─────────────────────────────────────────────────────────────────── */

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(8);

  ink(GREY);

  doc.text(
    "Payment Mode:",
    SX,
    y,
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  ink(GOLD);

  doc.text(
    payLabel,
    SX + 22,
    y,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  ink(GREY);

  doc.text(
    "Status:",
    SX + 48,
    y,
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  ink(GOLD);

  doc.text(
    remaining <= 0
      ? "PAID"
      : "PENDING",
    SX + 59,
    y,
  );

  y += 9;

  // the box is 20mm tall — if it will not clear the footer, move it over
  if (y + 22 > BOTTOM) {
    newPage();
  }

  /* ─────────────────────────────────────────────────────────────────────
     GRAND TOTAL
     ─────────────────────────────────────────────────────────────────── */

  fill(CREAM);

  stroke(
    GOLD,
    1.1,
  );

  doc.rect(
    SX - 3,
    y,
    R - SX + 3,
    20,
    "FD",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(9);

  ink(GOLD);

  doc.text(
    "GRAND TOTAL",
    (SX - 3 + R) / 2,
    y + 7.5,
    {
      align: "center",
    },
  );

  doc.setFontSize(18);

  doc.text(
    isCancelled
      ? "Rs.0"
      : money(grandTotal),
    (SX - 3 + R) / 2,
    y + 16.5,
    {
      align: "center",
    },
  );

  watermark();
  footerBar();

  /* ── cancelled watermark ─────────────────────────────────────────────── */

  if (isCancelled) {
    const total =
      doc.getNumberOfPages();

    for (
      let p = 1;
      p <= total;
      p += 1
    ) {
      doc.setPage(p);

      try {
        doc.saveGraphicsState();

        doc.setGState(
          new doc.GState({
            opacity: 0.13,
          }),
        );

        doc.setFont(
          "helvetica",
          "bold",
        );

        doc.setFontSize(58);

        ink([
          200,
          40,
          40,
        ]);

        doc.text(
          "CANCELLED",
          W / 2,
          150,
          {
            align: "center",
            angle: 30,
          },
        );

        doc.restoreGraphicsState();
      } catch {
        // skip on older jsPDF
      }
    }
  }

  /* ── print ───────────────────────────────────────────────────────────── */

  doc.autoPrint();

  const pdfUrl =
    URL.createObjectURL(
      doc.output("blob"),
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

  setTimeout(
    () =>
      URL.revokeObjectURL(
        pdfUrl,
      ),
    60000,
  );
}