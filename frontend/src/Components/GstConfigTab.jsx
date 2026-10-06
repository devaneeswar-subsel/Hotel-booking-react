import React, { useState, useEffect, useCallback } from "react";
import { CheckIcon, XIcon } from "../Icons";
import {
  ROOM_GST_LOWER_PERCENT,
  ROOM_GST_UPPER_PERCENT,
  ROOM_GST_SLAB_THRESHOLD,
} from "../utils/billing";
import { formatRate } from "../utils/addonGst";

/* ═══════════════════════════════════════════════════════════════════════════
   GST CONFIGURATION

   Where the admin sets the GST rate for each chargeable service. Food &
   Beverage, Laundry, Extra Bed and Room Service ship at 5%; new services are
   added here and are immediately available in the manager's add-on picker.

   THE ONE THING TO UNDERSTAND ABOUT EDITING A RATE

   Changing a rate here changes what the NEXT charge is billed at. It does not
   touch a charge that has already been posted to a guest — each of those
   carries the rate that applied on the day it was posted.

   That is deliberate. If editing a rate rewrote past charges, a guest who
   settled a Rs.1,000 laundry bill at 5% would find their invoice reprinting
   at 12% the moment someone changed the rate, and it would no longer match
   the money the hotel actually took. Freezing the rate on the charge keeps
   every past bill reconcilable.
   ═══════════════════════════════════════════════════════════════════════ */

/* A GST slab that is not one of the real ones is nearly always a typo. */
const COMMON_SLABS = [0, 5, 12, 18, 28];

export default function GstConfigTab({ apiFetch, showToast }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  // the row currently open for editing, held separately so a half-typed rate
  // never leaks into the list behind it
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", gst_rate: "", default_amount: "", hsn_sac: "" });

  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState({ name: "", gst_rate: "5", default_amount: "", hsn_sac: "" });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/addon-catalog");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load GST configuration");
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(svc) {
    setEditingId(svc.catalog_id);
    setEditDraft({
      name: svc.name ?? "",
      gst_rate: String(svc.gst_rate ?? ""),
      default_amount: svc.default_amount == null ? "" : String(svc.default_amount),
      hsn_sac: svc.hsn_sac ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({ name: "", gst_rate: "", default_amount: "", hsn_sac: "" });
  }

  async function patchService(id, body, successMessage) {
    setSavingId(id);
    try {
      const res = await apiFetch(`/api/admin/addon-catalog/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      setServices((list) =>
        list.map((s) => (s.catalog_id === id ? { ...s, ...data } : s)),
      );
      if (successMessage) showToast(successMessage, "success");
      return true;
    } catch (err) {
      showToast(err.message, "error");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function saveEdit(svc) {
    const rate = Number(editDraft.gst_rate);
    if (!editDraft.name.trim()) return showToast("Service name is required", "error");
    if (!Number.isFinite(rate) || rate < 0 || rate > 28)
      return showToast("GST rate must be between 0 and 28", "error");

    const ok = await patchService(
      svc.catalog_id,
      {
        name: editDraft.name.trim(),
        gst_rate: rate,
        default_amount: editDraft.default_amount === "" ? null : Number(editDraft.default_amount),
        hsn_sac: editDraft.hsn_sac.trim() || null,
      },
      `${editDraft.name.trim()} saved at ${formatRate(rate)}`,
    );
    if (ok) cancelEdit();
  }

  async function toggleActive(svc) {
    await patchService(
      svc.catalog_id,
      { is_active: Number(svc.is_active) ? 0 : 1 },
      Number(svc.is_active)
        ? `${svc.name} deactivated — it will not appear in the add-on picker`
        : `${svc.name} reactivated`,
    );
  }

  async function removeService(svc) {
    const charged = Number(svc.times_charged || 0);
    const question = charged
      ? `"${svc.name}" has been charged on ${charged} booking(s), so it will be deactivated rather than deleted — past bills keep their history. Continue?`
      : `Delete "${svc.name}"? It has never been charged, so nothing is affected.`;
    if (!window.confirm(question)) return;

    setSavingId(svc.catalog_id);
    try {
      const res = await apiFetch(`/api/admin/addon-catalog/${svc.catalog_id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove service");
      showToast(data.message, "success");
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSavingId(null);
    }
  }

  async function addService() {
    const rate = Number(newDraft.gst_rate);
    if (!newDraft.name.trim()) return showToast("Service name is required", "error");
    if (!Number.isFinite(rate) || rate < 0 || rate > 28)
      return showToast("GST rate must be between 0 and 28", "error");

    setAdding(true);
    try {
      const res = await apiFetch("/api/admin/addon-catalog", {
        method: "POST",
        body: JSON.stringify({
          name: newDraft.name.trim(),
          gst_rate: rate,
          default_amount: newDraft.default_amount === "" ? null : Number(newDraft.default_amount),
          hsn_sac: newDraft.hsn_sac.trim() || null,
          sort_order: (services.length + 1) * 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add service");
      showToast(`${data.name} added at ${formatRate(data.gst_rate)}`, "success");
      setNewDraft({ name: "", gst_rate: "5", default_amount: "", hsn_sac: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAdding(false);
    }
  }

  // ── shared classes, matching the rest of the dashboard ──
  const thCls =
    "px-3.5 py-2.5 text-left text-[0.62rem] font-bold text-gray-400 uppercase tracking-[1px] border-b-[1.5px] border-gray-200 bg-gray-50 whitespace-nowrap";
  const tdCls = "px-3.5 py-[11px] align-middle";
  const inputCls =
    "px-2.5 py-1.5 rounded-md border-[1.5px] border-gray-200 text-[0.82rem] focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/10 transition";

  const activeCount = services.filter((s) => Number(s.is_active)).length;

  if (loading) {
    return (
      <div className="text-gray-400 text-[0.85rem] py-10 text-center">
        Loading GST configuration...
      </div>
    );
  }

  return (
    <div>
      {/* ── Heading ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="font-display text-[1rem] font-semibold text-navy">
            GST Configuration
          </div>
          <div className="text-[0.78rem] text-gray-500 mt-1">
            The GST rate charged on each add-on service. {activeCount} active
            service{activeCount === 1 ? "" : "s"}.
          </div>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="bg-gold text-white px-4 py-2 rounded-md text-[0.82rem] font-semibold whitespace-nowrap hover:bg-gold/90 transition-colors"
        >
          {showAdd ? "Cancel" : "+ Add Service"}
        </button>
      </div>

      {/* ── How a rate change behaves ── */}
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="text-[0.72rem] font-bold uppercase tracking-wide text-amber-800 mb-1">
          How a rate change applies
        </div>
        <div className="text-[0.78rem] leading-relaxed text-amber-900">
          Editing a rate affects charges posted <strong>from now on</strong>.
          Charges already on a guest's bill keep the rate they were posted at,
          so settled invoices continue to match the money collected. Room
          tariff is taxed separately — {ROOM_GST_LOWER_PERCENT}% at or below
          Rs.{ROOM_GST_SLAB_THRESHOLD.toLocaleString("en-IN")} a night and{" "}
          {ROOM_GST_UPPER_PERCENT}% above, or whatever rate is set on the room
          itself — and is configured per room under Rooms, not here.
        </div>
      </div>

      {/* ── Add form ── */}
      {showAdd && (
        <div className="mb-5 rounded-xl border-[1.5px] border-gray-200 bg-gray-50 p-5">
          <div className="font-display text-[0.9rem] font-semibold text-navy mb-4">
            New Add-on Service
          </div>
          <div className="flex flex-wrap gap-3 mb-3">
            <div className="flex flex-col gap-1 flex-[2_1_200px]">
              <label className="text-[0.68rem] font-bold uppercase tracking-wide text-gray-400">
                Service name
              </label>
              <input
                value={newDraft.name}
                onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
                placeholder="e.g. Airport Transfer"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1 flex-[1_1_110px]">
              <label className="text-[0.68rem] font-bold uppercase tracking-wide text-gray-400">
                GST rate %
              </label>
              <input
                value={newDraft.gst_rate}
                onChange={(e) => setNewDraft({ ...newDraft, gst_rate: e.target.value })}
                type="number"
                min="0"
                max="28"
                step="0.01"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1 flex-[1_1_120px]">
              <label className="text-[0.68rem] font-bold uppercase tracking-wide text-gray-400">
                Default amount ₹
              </label>
              <input
                value={newDraft.default_amount}
                onChange={(e) =>
                  setNewDraft({ ...newDraft, default_amount: e.target.value })
                }
                type="number"
                min="0"
                placeholder="optional"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1 flex-[1_1_110px]">
              <label className="text-[0.68rem] font-bold uppercase tracking-wide text-gray-400">
                SAC code
              </label>
              <input
                value={newDraft.hsn_sac}
                onChange={(e) => setNewDraft({ ...newDraft, hsn_sac: e.target.value })}
                placeholder="optional"
                className={inputCls}
              />
            </div>
          </div>

          {/* quick slab picker — a typo'd rate is the easiest mistake to make */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <span className="text-[0.7rem] text-gray-400 mr-1">Common slabs:</span>
            {COMMON_SLABS.map((slab) => (
              <button
                key={slab}
                type="button"
                onClick={() => setNewDraft({ ...newDraft, gst_rate: String(slab) })}
                className={`px-2.5 py-1 rounded-full text-[0.7rem] font-semibold border-[1.5px] transition-colors ${
                  Number(newDraft.gst_rate) === slab
                    ? "bg-navy text-gold border-navy"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {slab}%
              </button>
            ))}
          </div>

          <button
            onClick={addService}
            disabled={adding}
            className="bg-navy text-white px-5 py-2 rounded-md text-[0.82rem] font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? "Adding..." : "Add Service"}
          </button>
        </div>
      )}

      {/* ── Service table ── */}
      <div className="overflow-x-auto rounded-xl border-[1.5px] border-gray-200 bg-white">
        <table className="w-full border-collapse min-w-[720px]">
          <thead>
            <tr>
              <th className={thCls}>Service</th>
              <th className={thCls}>GST Rate</th>
              <th className={thCls}>Default Amount</th>
              <th className={thCls}>SAC</th>
              <th className={thCls}>Times Charged</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 && (
              <tr>
                <td className="px-3.5 py-8 text-center text-gray-400 text-[0.82rem]" colSpan={7}>
                  No services configured yet.
                </td>
              </tr>
            )}

            {services.map((svc) => {
              const editing = editingId === svc.catalog_id;
              const busy = savingId === svc.catalog_id;
              const inactive = !Number(svc.is_active);

              return (
                <tr
                  key={svc.catalog_id}
                  className={`border-b border-gray-100 last:border-b-0 ${
                    inactive ? "bg-gray-50/60" : ""
                  }`}
                >
                  <td className={tdCls}>
                    {editing ? (
                      <input
                        value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        className={`${inputCls} w-full min-w-[150px]`}
                      />
                    ) : (
                      <span
                        className={`text-[0.85rem] font-semibold ${
                          inactive ? "text-gray-400 line-through" : "text-navy"
                        }`}
                      >
                        {svc.name}
                      </span>
                    )}
                  </td>

                  <td className={tdCls}>
                    {editing ? (
                      <input
                        value={editDraft.gst_rate}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, gst_rate: e.target.value })
                        }
                        type="number"
                        min="0"
                        max="28"
                        step="0.01"
                        className={`${inputCls} w-[92px]`}
                      />
                    ) : (
                      <span className="inline-block rounded bg-navy/5 px-2.5 py-0.5 text-[0.75rem] font-bold text-navy">
                        {formatRate(svc.gst_rate)}
                      </span>
                    )}
                  </td>

                  <td className={tdCls}>
                    {editing ? (
                      <input
                        value={editDraft.default_amount}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, default_amount: e.target.value })
                        }
                        type="number"
                        min="0"
                        placeholder="—"
                        className={`${inputCls} w-[110px]`}
                      />
                    ) : (
                      <span className="text-[0.82rem] text-gray-600">
                        {svc.default_amount == null
                          ? "—"
                          : `Rs.${Number(svc.default_amount).toLocaleString("en-IN")}`}
                      </span>
                    )}
                  </td>

                  <td className={tdCls}>
                    {editing ? (
                      <input
                        value={editDraft.hsn_sac}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, hsn_sac: e.target.value })
                        }
                        placeholder="—"
                        className={`${inputCls} w-[100px]`}
                      />
                    ) : (
                      <span className="text-[0.8rem] text-gray-500">
                        {svc.hsn_sac || "—"}
                      </span>
                    )}
                  </td>

                  <td className={tdCls}>
                    <span className="text-[0.82rem] text-gray-600">
                      {Number(svc.times_charged || 0)}
                    </span>
                  </td>

                  <td className={tdCls}>
                    <span
                      className={`inline-block whitespace-nowrap px-2.5 py-0.5 rounded text-[0.62rem] font-bold uppercase ${
                        inactive
                          ? "bg-gray-100 text-gray-500"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {inactive ? "inactive" : "active"}
                    </span>
                  </td>

                  <td className={tdCls}>
                    {editing ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveEdit(svc)}
                          disabled={busy}
                          title="Save"
                          className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[0.72rem] font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          <CheckIcon /> Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={busy}
                          title="Cancel"
                          className="flex items-center gap-1 rounded-md border-[1.5px] border-gray-200 px-2.5 py-1.5 text-[0.72rem] font-bold text-gray-500 hover:border-gray-300 transition-colors disabled:opacity-50"
                        >
                          <XIcon /> Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => startEdit(svc)}
                          disabled={busy}
                          className="rounded-md border-[1.5px] border-gray-200 px-2.5 py-1.5 text-[0.72rem] font-bold text-navy hover:border-navy/40 transition-colors disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(svc)}
                          disabled={busy}
                          className="rounded-md border-[1.5px] border-gray-200 px-2.5 py-1.5 text-[0.72rem] font-bold text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-50"
                        >
                          {inactive ? "Reactivate" : "Deactivate"}
                        </button>
                        <button
                          onClick={() => removeService(svc)}
                          disabled={busy}
                          className="rounded-md px-2.5 py-1.5 text-[0.72rem] font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[0.72rem] text-gray-400">
        A service that has already been charged is deactivated rather than
        deleted, so past invoices keep their history.
      </div>
    </div>
  );
}