import React, { useEffect, useMemo, useState } from "react";
import { getPaginationItems } from "../pagination";

const VEHICLE_OPTIONS = ["4-seater", "7-seater", "12-seater"];
const STATUS_OPTIONS = ["pending", "assigned", "picked_up", "completed", "cancelled"];

const statusLabel = (status) => (status || "pending").replaceAll("_", " ");

export default function VehicleCustomers({ bookings, apiFetch, onRefresh, showToast }) {
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const vehicleBookings = useMemo(
    () => bookings.filter((booking) => booking.vehicle_type && booking.vehicle_type !== "none"),
    [bookings],
  );
  const filteredBookings = vehicleBookings.filter((booking) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [booking.guest_name, booking.email, booking.phone, booking.pickup_location, booking.dropoff_location]
      .some((value) => String(value || "").toLowerCase().includes(term));
    return (
      matchesSearch &&
      (vehicleFilter === "all" || booking.vehicle_type === vehicleFilter) &&
      (statusFilter === "all" || (booking.vehicle_status || "pending") === statusFilter)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / itemsPerPage));
  const visibleBookings = filteredBookings.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  useEffect(() => {
    setPage((current) => Math.min(Math.max(current, 1), totalPages));
  }, [totalPages]);

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function startEditing(booking) {
    if (booking.status === "cancelled") return;
    setEditingId(booking.booking_id);
    setDraft({
      vehicle_type: booking.vehicle_type,
      vehicle_price: booking.vehicle_price || 0,
      pickup_location: booking.pickup_location || "",
      dropoff_location: booking.dropoff_location || "",
      vehicle_status: booking.vehicle_status || "pending",
    });
  }

  async function saveVehicle(bookingId) {
    if (!draft.vehicle_price || Number(draft.vehicle_price) < 0) {
      showToast?.("Enter a valid vehicle price", "error");
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch(`/api/manager/bookings/${bookingId}/vehicle`, {
        method: "PATCH",
        body: JSON.stringify({ ...draft, vehicle_price: Number(draft.vehicle_price) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update vehicle details");
      showToast?.("Vehicle details updated", "success");
      setEditingId(null);
      onRefresh?.();
    } catch (error) {
      showToast?.(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-[#0F1923]">Vehicle Customers</h2>
          <p className="mt-1 text-xs text-[#868E96]">Manage local pickup/drop requests, route, pricing, and pickup status.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} placeholder="Search customer or route" className="rounded-lg border border-[#E9ECEF] px-3 py-2 text-xs outline-none focus:border-[#C9A84C]" />
          <select value={vehicleFilter} onChange={(event) => updateFilter(setVehicleFilter, event.target.value)} className="rounded-lg border border-[#E9ECEF] px-3 py-2 text-xs">
            <option value="all">All seaters</option>
            {VEHICLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => updateFilter(setStatusFilter, event.target.value)} className="rounded-lg border border-[#E9ECEF] px-3 py-2 text-xs">
            <option value="all">All pickup statuses</option>
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
          <thead>
            <tr>{["Customer", "Seater", "From", "To", "Pickup status", "Booking", "Action"].map((heading) => <th key={heading} className="px-2 py-2 text-[0.58rem] uppercase tracking-[0.7px] text-[#868E96]">{heading}</th>)}</tr>
          </thead>
          <tbody>
            {!filteredBookings.length ? (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-[#868E96]">No vehicle customers match these filters.</td></tr>
            ) : visibleBookings.map((booking) => {
              const editing = editingId === booking.booking_id;
              const isCancelled = booking.status === "cancelled";
              return (
                <tr key={booking.booking_id} className={`border-t border-[#F1F3F5] align-top ${isCancelled ? "opacity-60" : ""}`}>
                  <td className="w-[20%] px-2 py-2"><div className="truncate text-xs font-semibold text-[#0F1923]">{booking.guest_name}</div><div className="truncate text-[0.65rem] text-[#868E96]">{booking.phone || booking.email}</div></td>
                  <td className="w-[12%] px-2 py-2 text-xs text-[#495057]">{editing ? <select value={draft.vehicle_type} onChange={(event) => setDraft({ ...draft, vehicle_type: event.target.value })} className="w-full rounded border border-gray-200 px-1 py-1 text-[0.68rem]">{VEHICLE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select> : booking.vehicle_type}</td>
                  <td className="w-[16%] px-2 py-2 text-xs text-[#495057]">{editing ? <input value={draft.pickup_location} onChange={(event) => setDraft({ ...draft, pickup_location: event.target.value })} placeholder="Pickup" className="w-full rounded border border-gray-200 px-1 py-1 text-[0.68rem]" /> : <span className="block truncate">{booking.pickup_location || "Not set"}</span>}</td>
                  <td className="w-[16%] px-2 py-2 text-xs text-[#495057]">{editing ? <input value={draft.dropoff_location} onChange={(event) => setDraft({ ...draft, dropoff_location: event.target.value })} placeholder="Drop-off" className="w-full rounded border border-gray-200 px-1 py-1 text-[0.68rem]" /> : <span className="block truncate">{booking.dropoff_location || "Not set"}</span>}</td>
                  <td className="w-[15%] px-2 py-2">{editing ? <select value={draft.vehicle_status} onChange={(event) => setDraft({ ...draft, vehicle_status: event.target.value })} className="w-full rounded border border-gray-200 px-1 py-1 text-[0.68rem]">{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}</select> : <span className={`inline-block max-w-full truncate rounded px-1.5 py-1 text-[0.62rem] font-semibold capitalize ${isCancelled ? "bg-[#FBE9E7] text-[#C0392B]" : "bg-[#EAF2FB] text-[#2471A3]"}`}>{statusLabel(booking.vehicle_status)}</span>}</td>
                  <td className="w-[11%] px-2 py-2 text-[0.65rem] text-[#868E96]">#{booking.booking_id} · <span className={isCancelled ? "font-semibold text-[#C0392B]" : ""}>{booking.status}</span><br />{booking.check_in_date?.slice(0, 10)}</td>
                  <td className="w-[10%] px-2 py-2">
                    <div className="flex flex-col items-start gap-1">
                      {editing && <input type="number" min="0" value={draft.vehicle_price} onChange={(event) => setDraft({ ...draft, vehicle_price: event.target.value })} placeholder="Price" className="w-full rounded border border-gray-200 px-1 py-1 text-[0.68rem]" />}
                      {editing ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveVehicle(booking.booking_id)} disabled={saving} className="rounded bg-[#0F1923] px-2 py-1 text-[0.65rem] font-semibold text-white disabled:opacity-50">{saving ? "..." : "Save"}</button>
                          <button onClick={() => setEditingId(null)} className="rounded border border-gray-200 px-2 py-1 text-[0.65rem]">Cancel</button>
                        </div>
                      ) : isCancelled ? (
                        <span className="rounded border border-[#F1D4D0] px-2 py-1 text-[0.65rem] font-semibold text-[#C0392B]">Cancelled</span>
                      ) : (
                        <button onClick={() => startEditing(booking)} className="rounded border border-[#0F1923] px-2 py-1 text-[0.65rem] font-semibold text-[#0F1923]">Edit</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-[#F1F3F5] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[#868E96]">
          Showing {Math.min((page - 1) * itemsPerPage + 1, filteredBookings.length)}-{Math.min(page * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} vehicle bookings
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded border border-[#E9ECEF] px-2.5 py-1.5 text-xs text-[#495057] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
          {getPaginationItems(page, totalPages).map((item) => (
            item?.type === "ellipsis" ? (
              <span key={item.key} className="px-1.5 text-xs text-[#868E96]">...</span>
            ) : (
              <button key={`page-${item}`} onClick={() => setPage(item)} className={`h-7 min-w-7 rounded px-2 text-xs font-semibold ${page === item ? "bg-[#0F1923] text-white" : "border border-[#E9ECEF] text-[#495057] hover:bg-[#F8F9FA]"}`}>{item}</button>
            )
          ))}
          <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="rounded border border-[#E9ECEF] px-2.5 py-1.5 text-xs text-[#495057] disabled:cursor-not-allowed disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}