/* ═══════════════════════════════════════════════════════════════════════════
   BILLING — the single source of truth for every rupee shown in the app.

   Before this file existed, `const GST_RATE = 0.18` was copy-pasted into
   eight different components and each one did its own arithmetic. When the
   discount model changed, some files were updated and some were not, so the
   admin screen, the manager screen and the invoice PDF all showed different
   totals for the same booking.

   Every component must now import from here. Do not add a local GST_RATE
   or a local Math.round(x * 0.18) anywhere else.

   ── THE DISCOUNT MODEL ───────────────────────────────────────────────────
   A discount reduces the room's TAXABLE VALUE first. GST is then charged on
   the reduced amount. This is what a GST invoice requires: the tax follows
   the discounted value, it is not charged on the full tariff.

       tariff            3000
       - discount         500
       = taxable value   2500
       + GST @18%         450
       = total           2950

   The wrong way (GST on the full tariff, discount off the gross) gives 3040
   and overcharges the guest by the GST on the discount.
   ═══════════════════════════════════════════════════════════════════════ */

export const GST_RATE = 0.18;

/** Round to 2 decimal places (paise). Every money value goes through this. */
export const money2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * The nightly rate for a room at a given occupancy.
 *
 * Rooms with a `price_double` charge that rate from 2 guests upward. Rooms
 * that leave it null charge `price_per_night` at every occupancy, so older
 * rooms are unaffected.
 *
 * This mirrors resolveNightlyRate() in backend/server.js exactly. Any form
 * that previews a price MUST use this, otherwise the quote shown to the guest
 * differs from what the backend actually charges.
 */
export function nightlyRate(room, guestCount) {
  const single = Number(room?.price_per_night || 0);
  const double = Number(room?.price_double || 0);
  const guests = Math.max(1, Number(guestCount) || 1);
  return guests >= 2 && double > 0 ? double : single;
}

/**
 * The full bill for a room stay.
 *
 * @param {number} tariff    room rate x nights, before any discount
 * @param {number} discount  booking-time discount (pre-tax)
 * @param {number} addons    add-on charges — taxed, never discounted
 * @param {number} checkoutDiscount  discount applied at checkout (pre-tax)
 *
 * Returns every figure a screen or invoice needs, already rounded.
 */
export function computeRoomBill({
  tariff = 0,
  discount = 0,
  addons = 0,
  checkoutDiscount = 0,
} = {}) {
  const roomTariff = money2(tariff);
  const bookingDiscount = money2(discount);
  const coDiscount = money2(checkoutDiscount);
  const addonCharges = money2(addons);

  // The discount can never take the room below zero.
  const totalDiscount = Math.min(
    money2(bookingDiscount + coDiscount),
    roomTariff,
  );

  const roomTaxable = money2(roomTariff - totalDiscount);
  const taxable = money2(roomTaxable + addonCharges);
  const gst = money2(taxable * GST_RATE);
  const total = money2(taxable + gst);

  return {
    roomTariff,        // 3000 — what the room costs before discount
    bookingDiscount,   // 500
    checkoutDiscount: coDiscount,
    totalDiscount,     // 500
    roomTaxable,       // 2500 — room value GST is charged on
    addonCharges,      // add-ons, taxed separately but at the same rate
    taxable,           // 2500 + add-ons
    gst,               // 450
    total,             // 2950
  };
}

/**
 * Read a saved booking row and produce the same shape as computeRoomBill.
 *
 * Prefers the values the backend already stored (taxable_amount, gst_amount,
 * total_amount) so a screen never recomputes a figure the server has already
 * decided. Falls back to recomputing only for rows written before the
 * taxable_amount column existed.
 */
export function billFromBooking(b = {}) {
  const tariff = money2(b.total_price);
  const bookingDiscount = money2(b.discount_applied ? b.discount_amount : 0);
  const coDiscount = money2(
    b.checkout_discount_applied ? b.checkout_discount_amount : 0,
  );
  const addons = money2(b.addon_charges);

  const computed = computeRoomBill({
    tariff,
    discount: bookingDiscount,
    addons,
    checkoutDiscount: coDiscount,
  });

  // Trust the stored columns when the backend has written them.
  const storedTaxable =
    b.taxable_amount != null ? money2(b.taxable_amount) : null;
  const storedGst = Number(b.gst_amount) > 0 ? money2(b.gst_amount) : null;
  const storedTotal =
    Number(b.total_amount) > 0
      ? money2(b.total_amount)
      : Number(b.final_total) > 0
        ? money2(b.final_total)
        : null;

  return {
    ...computed,
    roomTaxable: storedTaxable ?? computed.roomTaxable,
    gst: storedGst ?? computed.gst,
    total: storedTotal ?? computed.total,
  };
}

/**
 * What the guest still owes, and what they have already paid.
 * Kept here so no screen has to remember the advance/balance rules.
 */
export function paymentSplit(b = {}) {
  const bill = billFromBooking(b);
  const advancePaid = money2(b.advance_paid);
  const balancePaid = money2(b.balance_paid);
  const paid = money2(advancePaid + balancePaid);

  // The backend writes remaining_amount on every payment event; prefer it.
  const stored = Number(b.remaining_amount);
  const derived = Math.max(0, money2(bill.total - paid));
  const status = String(b.payment_status || "").toUpperCase();

  const remaining =
    status === "PAID" ? 0 : Number.isFinite(stored) && stored > 0 ? money2(stored) : derived;

  return { ...bill, advancePaid, balancePaid, paid, remaining };
}

/**
 * The real cost of a checkout discount to the hotel.
 * Because the discount is pre-tax, the guest also stops paying the GST that
 * was charged on it — so a Rs.500 discount reduces the bill by Rs.590.
 */
export function checkoutDiscountImpact(amount) {
  const base = money2(amount);
  const gst = money2(base * GST_RATE);
  return { base, gst, total: money2(base + gst) };
}

/** Largest checkout discount that fits inside an outstanding balance. */
export function maxCheckoutDiscount(remaining) {
  return Math.max(0, money2(money2(remaining) / (1 + GST_RATE)));
}