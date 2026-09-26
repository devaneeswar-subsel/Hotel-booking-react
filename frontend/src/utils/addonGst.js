/* ═══════════════════════════════════════════════════════════════════════════
   ADD-ON GST — per-service tax rates.

   The room is taxed at GST_RATE (12%). Add-ons are taxed at whatever rate the
   admin configured for that service on the dashboard's GST Configuration
   screen — 5% for Food & Beverage, Laundry, Extra Bed and Room Service.

   Because a bill can now carry more than one tax rate, three rules apply
   everywhere and are implemented once, here:

     1. THE RATE LIVES ON THE LINE, NOT ON THE CATALOG.
        Every posted charge stores the rate that applied when it was posted.
        Changing a rate in the dashboard affects the next charge, never one
        already on a bill. Nothing in this file ever looks a rate up from the
        catalog for an existing line.

     2. TAX IS SUMMED PER LINE, THEN ADDED.
        round(line1 x rate1) + round(line2 x rate2) — never
        round((line1 + line2) x someRate). This mirrors the backend exactly,
        so a screen and the server can never disagree by a paisa.

     3. A LINE WITH NO RATE IS A LEGACY LINE.
        Add-ons posted before per-service GST existed were billed at the room
        rate. LEGACY_ADDON_GST_PERCENT reproduces their old figure, so an old
        invoice reprints for exactly what the guest paid.

   Mirrors resolveAddonGstRate / computeAddonLine / getAddonTotals in
   backend/server.js.
   ═══════════════════════════════════════════════════════════════════════ */

import { GST_RATE, money2 } from "./billing";

/*
 * What add-ons were taxed at before this feature. The old code computed
 * (room + addons) x 12%, so 12 is the rate historical lines actually carried.
 * Keep equal to GST_RATE x 100.
 */
export const LEGACY_ADDON_GST_PERCENT = GST_RATE * 100;

/** The GST rate on one add-on line, as a percentage. */
export function addonLineRate(line = {}) {
  const rate = Number(line.gst_rate);
  return Number.isFinite(rate) ? rate : LEGACY_ADDON_GST_PERCENT;
}

/** The taxable value of one add-on line (quantity x unit price). */
export function addonLineTaxable(line = {}) {
  return money2(line.taxable_amount ?? line.amount ?? 0);
}

/** The GST on one add-on line — the stored figure wins, always. */
export function addonLineGst(line = {}) {
  if (line.gst_amount != null) return money2(line.gst_amount);
  return money2((addonLineTaxable(line) * addonLineRate(line)) / 100);
}

/** Taxable + GST for one line. */
export function addonLineTotal(line = {}) {
  return money2(addonLineTaxable(line) + addonLineGst(line));
}

/**
 * Roll a list of add-on lines up into the figures a screen or invoice needs,
 * including the rate-wise breakdown a multi-rate GST invoice has to print.
 *
 * @param {Array} lines  booking.addons
 * @returns {{
 *   taxable:number, gst:number, total:number,
 *   unpaidTaxable:number, unpaidGst:number, unpaidTotal:number,
 *   byRate:Array<{gstRate:number, taxable:number, gst:number}>
 * }}
 */
export function summariseAddons(lines = []) {
  let taxable = 0;
  let gst = 0;
  let unpaidTaxable = 0;
  let unpaidGst = 0;
  const buckets = new Map();

  for (const line of lines) {
    const lineTaxable = addonLineTaxable(line);
    const lineGst = addonLineGst(line);
    const rate = addonLineRate(line);

    taxable = money2(taxable + lineTaxable);
    gst = money2(gst + lineGst);

    if (Number(line.paid) !== 1) {
      unpaidTaxable = money2(unpaidTaxable + lineTaxable);
      unpaidGst = money2(unpaidGst + lineGst);
    }

    const bucket = buckets.get(rate) || { gstRate: rate, taxable: 0, gst: 0 };
    bucket.taxable = money2(bucket.taxable + lineTaxable);
    bucket.gst = money2(bucket.gst + lineGst);
    buckets.set(rate, bucket);
  }

  return {
    taxable,
    gst,
    total: money2(taxable + gst),
    unpaidTaxable,
    unpaidGst,
    unpaidTotal: money2(unpaidTaxable + unpaidGst),
    byRate: [...buckets.values()].sort((a, b) => a.gstRate - b.gstRate),
  };
}

/**
 * The add-on GST on a booking.
 *
 * Reads, in order of trust:
 *   1. addon_gst_amount — what the backend computed and stored
 *   2. the sum of the loaded add-on lines
 *   3. addon_charges x GST_RATE — the pre-feature figure, for a booking whose
 *      lines were not loaded and whose column predates this column existing
 *
 * Step 3 is what keeps a screen that only has the booking row (a list view,
 * a report) showing exactly what it showed before.
 */
export function bookingAddonGst(booking = {}) {
  if (booking.addon_gst_amount != null) return money2(booking.addon_gst_amount);
  if (Array.isArray(booking.addons) && booking.addons.length) {
    return summariseAddons(booking.addons).gst;
  }
  return money2(Number(booking.addon_charges || 0) * GST_RATE);
}

/**
 * The rate-wise GST table for a whole bill — room line included.
 *
 * A GST invoice that charges more than one rate has to show the taxable value
 * and tax under each rate separately. Returns [] when GST is off for the
 * booking, so the caller prints no tax section at all.
 */
export function gstSummaryRows({
  roomTaxable = 0,
  /*
   * The ROOM's rate for this booking, as a percentage. Rooms are taxed per
   * room now (12% up to Rs.7,500 a night, 18% above), and the rate is frozen
   * onto each booking — so the caller passes the booking's rate rather than
   * this function assuming one. Omitted, it is the 12% default.
   */
  roomRatePercent = GST_RATE * 100,
  addonLines = [],
  addonSummary = null,
  gstEnabled = true,
} = {}) {
  if (!gstEnabled) return [];

  const buckets = new Map();
  const add = (rate, taxable, gst) => {
    const key = Number(rate);
    const bucket = buckets.get(key) || { gstRate: key, taxable: 0, gst: 0 };
    bucket.taxable = money2(bucket.taxable + money2(taxable));
    bucket.gst = money2(bucket.gst + money2(gst));
    buckets.set(key, bucket);
  };

  const room = money2(roomTaxable);
  if (room > 0) {
    // The room bucket sits under ITS rate. When a room at 18% shares a bill
    // with add-ons at 5%, that is three lines on the invoice, not two.
    add(roomRatePercent, room, money2((room * roomRatePercent) / 100));
  }

  const summary = addonSummary || summariseAddons(addonLines);
  for (const b of summary.byRate) {
    if (b.taxable > 0 || b.gst > 0) add(b.gstRate, b.taxable, b.gst);
  }

  return [...buckets.values()].sort((a, b) => a.gstRate - b.gstRate);
}

/** "5%" / "12.5%" — trims a pointless ".00" without losing a real decimal. */
export function formatRate(rate) {
  const n = Number(rate) || 0;
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, "")}%`;
}

/**
 * Preview one line before it is posted — what the add-on form shows under the
 * inputs, so the person at the desk sees the tax before they commit it.
 */
export function previewAddonLine({ quantity = 1, unitPrice = 0, gstRate = 0 }) {
  const qty = Math.max(0, Number(quantity) || 0);
  const unit = money2(unitPrice);
  const rate = Math.max(0, Number(gstRate) || 0);
  const taxable = money2(qty * unit);
  const gst = money2((taxable * rate) / 100);
  return { quantity: qty, unitPrice: unit, gstRate: rate, taxable, gst, total: money2(taxable + gst) };
}