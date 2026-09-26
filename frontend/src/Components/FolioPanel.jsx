import React, { useState, useEffect, useCallback } from "react";
import { formatRate } from "../utils/addonGst";

/* ═══════════════════════════════════════════════════════════════════════════
   THE FOLIO

   The guest's account for a stay: every line ever posted to it, in order,
   with what it was, when, at what rate, and what it came to.

   This is what a hotel front desk actually works from. The bill panel next to
   it shows the summary — room, add-ons, tax, balance — but when a guest says
   "what is this charge?", the answer is here and nowhere else.

   Three things it shows that the summary cannot:

     · Room posted PER NIGHT, so a rate that changed mid-stay is visible
       rather than averaged away.
     · Payments as lines, so "when did they pay, and how much" is answerable.
     · Voided lines, struck through. A charge that was removed stays on the
       record with its reason — a bill that can be silently edited is not a
       bill anyone can audit.
   ═══════════════════════════════════════════════════════════════════════ */

const money = (n) => {
  const v = Number(n || 0);
  const sign = v < 0 ? "-" : "";
  return `${sign}Rs.${Math.abs(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const shortDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const TYPE_STYLE = {
  ROOM: { label: "Room", cls: "bg-navy/10 text-navy" },
  ADDON: { label: "Add-on", cls: "bg-amber-50 text-amber-700" },
  VEHICLE: { label: "Vehicle", cls: "bg-blue-50 text-blue-600" },
  DISCOUNT: { label: "Discount", cls: "bg-emerald-50 text-emerald-700" },
  PAYMENT: { label: "Payment", cls: "bg-purple-50 text-purple-700" },
};

export default function FolioPanel({ bookingId, apiFetch, showToast, isAdmin, onChanged }) {
  const [folio, setFolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [showVoided, setShowVoided] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/folio`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the folio");
      setFolio(data);
    } catch (err) {
      showToast?.(err.message, "error");
      setFolio(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId, apiFetch, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function voidLine(item) {
    const reason = window.prompt(
      `Void "${item.label}" (${money(item.line_total)})?\n\nThe line stays on the folio, marked, with this reason:`,
      "Posted in error",
    );
    if (reason === null) return;

    setBusyId(item.item_id);
    try {
      const res = await apiFetch(
        `/api/bookings/${bookingId}/folio/${item.item_id}/void`,
        { method: "PATCH", body: JSON.stringify({ reason }) },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not void this line");
      showToast?.("Line voided", "success");
      await load();
      onChanged?.();
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-gray-50 p-5 text-center text-[0.82rem] text-gray-400">
        Loading folio...
      </div>
    );
  }

  if (!folio) return null;

  const items = folio.items || [];
  const visible = showVoided ? items : items.filter((i) => Number(i.voided) !== 1);
  const voidedCount = items.filter((i) => Number(i.voided) === 1).length;
  const t = folio.totals || {};

  return (
    <div className="rounded-xl bg-gray-50 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="font-display text-[0.9rem] font-semibold text-navy">
          Folio — Guest Account
        </div>
        {voidedCount > 0 && (
          <button
            onClick={() => setShowVoided((v) => !v)}
            className="text-[0.7rem] font-semibold text-gray-500 underline-offset-2 hover:underline"
          >
            {showVoided ? "Hide" : "Show"} {voidedCount} voided
          </button>
        )}
      </div>
      <div className="mb-3 text-[0.7rem] text-gray-400">
        Every charge and payment posted to this stay, in order.
      </div>

      {/* The ledger and the bill must agree. If they ever do not, say so
          loudly rather than quietly showing one of them. */}
      {folio.in_sync === false && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[0.74rem] text-amber-900">
          <strong>Folio out of step with the bill.</strong> Ledger{" "}
          {money(t.grossTotal)} vs bill {money(folio.stored?.total_amount)}. The
          bill is the authority — an admin can rebuild the folio from it.
        </div>
      )}

      {visible.length === 0 ? (
        <div className="py-4 text-center text-[0.78rem] text-gray-400">
          Nothing posted yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full border-collapse text-[0.76rem]">
            <thead>
              <tr className="bg-gray-50 text-gray-400">
                <th className="px-2.5 py-2 text-left font-bold uppercase tracking-wide">Date</th>
                <th className="px-2.5 py-2 text-left font-bold uppercase tracking-wide">Type</th>
                <th className="px-2.5 py-2 text-left font-bold uppercase tracking-wide">Description</th>
                <th className="px-2.5 py-2 text-right font-bold uppercase tracking-wide">Taxable</th>
                <th className="px-2.5 py-2 text-right font-bold uppercase tracking-wide">GST</th>
                <th className="px-2.5 py-2 text-right font-bold uppercase tracking-wide">Amount</th>
                {isAdmin && <th className="px-2.5 py-2" />}
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const isVoid = Number(item.voided) === 1;
                const style = TYPE_STYLE[item.item_type] || {
                  label: item.item_type,
                  cls: "bg-gray-100 text-gray-600",
                };
                return (
                  <tr
                    key={item.item_id}
                    className={`border-t border-gray-100 ${isVoid ? "opacity-45" : ""}`}
                  >
                    <td className="whitespace-nowrap px-2.5 py-2 text-gray-500">
                      {shortDate(item.service_date || item.created_at)}
                    </td>
                    <td className="px-2.5 py-2">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase ${style.cls}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-2.5 py-2">
                      <span className={`text-navy ${isVoid ? "line-through" : ""}`}>
                        {item.label}
                      </span>
                      {Number(item.quantity) > 1 && (
                        <span className="text-gray-400">
                          {" "}
                          ({Number(item.quantity)} × {money(item.unit_price)})
                        </span>
                      )}
                      {item.payment_mode && (
                        <span className="text-gray-400"> · {item.payment_mode}</span>
                      )}
                      {isVoid && (
                        <div className="text-[0.66rem] italic text-red-500">
                          Voided{item.void_reason ? ` — ${item.void_reason}` : ""}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2 text-right text-gray-600">
                      {item.item_type === "PAYMENT" ? "—" : money(item.taxable_amount)}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2 text-right text-gray-600">
                      {item.item_type === "PAYMENT"
                        ? "—"
                        : `${money(item.gst_amount)}${
                            Number(item.gst_rate) ? ` (${formatRate(item.gst_rate)})` : ""
                          }`}
                    </td>
                    <td
                      className={`whitespace-nowrap px-2.5 py-2 text-right font-bold ${
                        Number(item.line_total) < 0 ? "text-emerald-600" : "text-navy"
                      }`}
                    >
                      {money(item.line_total)}
                    </td>
                    {isAdmin && (
                      <td className="px-2.5 py-2 text-right">
                        {!isVoid && item.item_type !== "PAYMENT" && (
                          <button
                            onClick={() => voidLine(item)}
                            disabled={busyId === item.item_id}
                            title="Void this line"
                            className="text-[0.68rem] font-bold text-red-600 hover:text-red-700 disabled:opacity-40"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals, every one of them derived from the lines above */}
      <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3.5 py-3">
        {[
          ["Taxable value", money(t.taxableTotal)],
          ["GST", money(t.gstTotal)],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between py-0.5 text-[0.78rem]">
            <span className="text-gray-500">{label}</span>
            <span className="font-semibold text-navy">{val}</span>
          </div>
        ))}

        <div className="mt-1 flex justify-between border-t border-gray-200 pt-1.5 text-[0.82rem]">
          <span className="font-semibold text-navy">Total charges</span>
          <span className="font-bold text-navy">{money(t.grossTotal)}</span>
        </div>
        <div className="flex justify-between py-0.5 text-[0.78rem]">
          <span className="text-gray-500">Paid</span>
          <span className="font-semibold text-emerald-600">- {money(t.paid)}</span>
        </div>
        <div
          className={`mt-1.5 flex justify-between rounded-md px-2.5 py-2 text-[0.85rem] font-bold ${
            Number(t.balance) > 0
              ? "bg-amber-50 text-amber-800"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          <span>{Number(t.balance) > 0 ? "Balance due" : "Settled"}</span>
          <span>{money(t.balance)}</span>
        </div>
      </div>

      {/* Rate-wise GST, straight off the ledger */}
      {(folio.gstByRate || []).length > 1 && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3.5 py-3">
          <div className="mb-1.5 text-[0.66rem] font-bold uppercase tracking-widest text-gray-400">
            GST Summary (rate-wise)
          </div>
          {folio.gstByRate.map((r) => (
            <div key={r.gstRate} className="flex justify-between py-0.5 text-[0.76rem]">
              <span className="text-gray-500">
                {formatRate(r.gstRate)} on {money(r.taxable)}
              </span>
              <span className="font-semibold text-navy">{money(r.gst)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}