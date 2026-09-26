import React, { useState, useEffect, useCallback } from "react";
import {
  addonLineRate,
  addonLineTaxable,
  addonLineGst,
  addonLineTotal,
  previewAddonLine,
  formatRate,
  LEGACY_ADDON_GST_PERCENT,
} from "../utils/addonGst";

/* ═══════════════════════════════════════════════════════════════════════════
   ADD-ON ENTRY

   The add-on composer and the posted-charge list, shared by the manager's
   booking modal and the admin check-in screen so the two can never drift.

   Before this existed each screen had its own hardcoded

       const PRESET_ADDONS = ["Food & Beverages", "Laundry", ...]

   which meant adding a service, or changing a rate, needed a code change in
   two files. The chips are now the admin's configured catalog: picking one
   fills in its rate and its default amount, and the tax is shown before the
   charge is posted, not after.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Load the add-on catalog once per screen.
 *
 * Falls back to an empty list on failure rather than throwing: a catalog that
 * will not load must not stop the desk from posting a charge, and a free-text
 * charge still works — the backend matches it by name, and taxes it at the
 * pre-feature rate if it matches nothing.
 */
export function useAddonCatalog(apiFetch) {
  const [catalog, setCatalog] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/addon-catalog");
      const data = await res.json();
      setCatalog(Array.isArray(data) ? data : []);
    } catch {
      setCatalog([]);
    } finally {
      setLoaded(true);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  return { catalog, catalogLoaded: loaded, reloadCatalog: load };
}

const money = (n) => `Rs.${Number(n || 0).toLocaleString("en-IN")}`;

/*
 * Loose name matching, mirroring resolveAddonGstRate in backend/server.js.
 * Ignores punctuation and spacing and drops a trailing plural, so a typed
 * "Food & Beverages" resolves to the configured "Food & Beverage" service
 * rather than falling through to the default rate.
 */
const normaliseName = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .join(" ");

/**
 * One posted charge, with its quantity, its rate and its tax.
 *
 * The rate shown is the one stored ON THE LINE, which is the rate the charge
 * was actually billed at — not whatever the catalog says today.
 */
export function AddonLineRow({ line, onRemove, removable = true }) {
  const rate = addonLineRate(line);
  const taxable = addonLineTaxable(line);
  const gst = addonLineGst(line);
  const total = addonLineTotal(line);
  const qty = Number(line.quantity ?? 1);
  const unit = line.unit_price != null ? Number(line.unit_price) : taxable;
  const isPaid = Number(line.paid) === 1;
  const isLegacy = line.gst_rate == null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="min-w-0">
        <div className="text-[0.82rem] font-medium text-navy truncate">
          {line.label}
        </div>
        <div className="mt-0.5 text-[0.68rem] text-gray-500">
          {qty > 1 && <>{qty} × {money(unit)} · </>}
          {money(taxable)} + {formatRate(rate)} GST {money(gst)}
          {isLegacy && (
            <span
              className="ml-1 text-gray-400"
              title={`Posted before per-service GST was configured, so it was billed at the room rate of ${formatRate(LEGACY_ADDON_GST_PERCENT)}.`}
            >
              (legacy rate)
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <div className="text-[0.85rem] font-bold text-navy">{money(total)}</div>
          <div className="text-[0.62rem] text-gray-400">incl. GST</div>
        </div>
        {isPaid ? (
          <span className="text-[0.62rem] font-bold uppercase tracking-wide text-emerald-600">
            Paid
          </span>
        ) : (
          removable && (
            <button
              onClick={onRemove}
              title="Remove this charge"
              className="text-[0.72rem] font-bold text-red-600 transition-colors hover:text-red-700"
            >
              ✕
            </button>
          )
        )}
      </div>
    </div>
  );
}

/**
 * The composer: catalog chips, quantity, amount, and a live tax preview.
 *
 * `onSubmit` receives the request body for POST /addons. It sends catalog_id
 * when a configured service was picked so the backend reads the rate from the
 * catalog rather than trusting the browser, and falls back to a plain label
 * for a one-off charge.
 */
export function AddonComposer({
  catalog = [],
  disabled = false,
  submitting = false,
  onSubmit,
  inputCls,
}) {
  const [selected, setSelected] = useState(null); // catalog row, or null
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState("1");

  const baseInput =
    inputCls ||
    "px-3 py-2 rounded-md border-[1.5px] border-gray-200 text-[0.82rem] focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/10 transition disabled:opacity-50 disabled:cursor-not-allowed";

  /*
   * The rate the preview uses. A picked service uses its configured rate. A
   * typed label that exactly matches a service picks that service's rate up
   * too, so the free-text field behaves the same as the chip. Anything else
   * is a one-off and falls back to the pre-feature rate — the same number the
   * backend will settle on, so the preview never lies.
   */
  const typedMatch =
    catalog.find(
      (c) => c.name.trim().toLowerCase() === label.trim().toLowerCase(),
    ) ||
    // Same forgiving pass the backend does — punctuation, spacing and a
    // trailing plural. "Food & Beverages" finds "Food & Beverage". Keeping
    // the two in step means the previewed rate is always the rate charged.
    catalog.find((c) => normaliseName(c.name) === normaliseName(label));

  const effective = selected || typedMatch || null;
  const rate = effective ? Number(effective.gst_rate) : LEGACY_ADDON_GST_PERCENT;

  const preview = previewAddonLine({
    quantity: qty,
    unitPrice: amount,
    gstRate: rate,
  });

  function pick(service) {
    // tapping the selected chip again clears it
    if (selected?.catalog_id === service.catalog_id) {
      setSelected(null);
      setLabel("");
      return;
    }
    setSelected(service);
    setLabel(service.name);
    if (service.default_amount != null && amount === "") {
      setAmount(String(service.default_amount));
    }
  }

  function submit() {
    if (!label.trim() || !Number(amount)) return;
    onSubmit({
      catalog_id: effective ? effective.catalog_id : undefined,
      label: label.trim(),
      quantity: Number(qty) || 1,
      unit_price: Number(amount),
      // kept for the old API shape — the backend derives it anyway
      amount: preview.taxable,
    });
    setSelected(null);
    setLabel("");
    setAmount("");
    setQty("1");
  }

  const canSubmit = Boolean(label.trim()) && Number(amount) > 0 && !disabled && !submitting;

  return (
    <>
      {/* Catalog chips — each shows the rate it will charge at */}
      {catalog.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {catalog.map((service) => {
            const active = selected?.catalog_id === service.catalog_id;
            return (
              <button
                key={service.catalog_id}
                type="button"
                onClick={() => pick(service)}
                disabled={disabled}
                className={`rounded-full border-[1.5px] px-3 py-1 text-[0.72rem] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  active
                    ? "border-navy bg-navy text-gold"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {service.name}
                <span className={active ? "text-gold/70" : "text-gray-400"}>
                  {" "}
                  · {formatRate(service.gst_rate)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Label / qty / amount */}
      <div className="mb-2 flex flex-wrap gap-2">
        <input
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setSelected(null);
          }}
          disabled={disabled}
          placeholder="Label (e.g. Airport Transfer)"
          className={`${baseInput} flex-[2_1_140px]`}
        />
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          disabled={disabled}
          type="number"
          min="1"
          step="1"
          title="Quantity"
          placeholder="Qty"
          className={`${baseInput} flex-[0_1_70px]`}
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={disabled}
          type="number"
          min="0"
          placeholder="Rate ₹"
          title="Price per unit, before GST"
          className={`${baseInput} flex-[1_1_90px]`}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="whitespace-nowrap rounded-md bg-gold px-4 py-2 text-[0.82rem] font-semibold text-white transition-colors hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Adding..." : "+ Add"}
        </button>
      </div>

      {/* Live tax preview — what the guest will actually be charged */}
      {Number(amount) > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-navy/[0.04] px-3 py-2 text-[0.72rem] text-gray-600">
          <span>
            Taxable <strong className="text-navy">{money(preview.taxable)}</strong>
          </span>
          <span>
            GST {formatRate(rate)}{" "}
            <strong className="text-navy">{money(preview.gst)}</strong>
          </span>
          <span className="ml-auto">
            Guest pays{" "}
            <strong className="text-navy">{money(preview.total)}</strong>
          </span>
          {!effective && (
            <div className="w-full text-[0.68rem] text-gray-400">
              Not a configured service — taxed at{" "}
              {formatRate(LEGACY_ADDON_GST_PERCENT)}. Add it under GST
              Configuration to set its own rate.
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * The rate-wise GST table.
 *
 * A bill that carries more than one rate has to show the taxable value and
 * the tax under each rate separately — that is what a GST invoice requires,
 * and it is what lets the client reconcile a bill against their returns.
 * Renders nothing when everything sits at one rate, so a simple bill stays
 * simple.
 */
export function GstRateSummary({ rows = [], title = "GST Summary" }) {
  if (rows.length < 2) return null;

  const totalTaxable = rows.reduce((s, r) => s + Number(r.taxable || 0), 0);
  const totalGst = rows.reduce((s, r) => s + Number(r.gst || 0), 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">
        {title}
      </div>
      <table className="w-full border-collapse text-[0.76rem]">
        <thead>
          <tr className="text-gray-400">
            <th className="py-1 text-left font-semibold">Rate</th>
            <th className="py-1 text-right font-semibold">Taxable</th>
            <th className="py-1 text-right font-semibold">GST</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.gstRate} className="border-t border-gray-100">
              <td className="py-1.5 text-navy">{formatRate(r.gstRate)}</td>
              <td className="py-1.5 text-right text-gray-600">{money(r.taxable)}</td>
              <td className="py-1.5 text-right font-semibold text-navy">
                {money(r.gst)}
              </td>
            </tr>
          ))}
          <tr className="border-t-[1.5px] border-gray-200">
            <td className="py-1.5 font-bold text-navy">Total</td>
            <td className="py-1.5 text-right font-bold text-navy">
              {money(totalTaxable)}
            </td>
            <td className="py-1.5 text-right font-bold text-navy">
              {money(totalGst)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}