import React, { useEffect, useMemo, useState } from "react";
import { getPaginationItems } from "../pagination";

const VEHICLE_OPTIONS = ["4-seater", "7-seater", "12-seater"];

const STATUS_OPTIONS = [
  "pending",
  "assigned",
  "picked_up",
  "completed",
  "cancelled",
];

const statusLabel = (status) =>
  (status || "pending").replaceAll("_", " ");

/*
 * IMPORTANT:
 * Booking cancellation always has priority.
 *
 * If booking.status === "cancelled",
 * vehicle_status will ALWAYS be treated as "cancelled".
 */
const getVehicleStatus = (booking) => {
  if (booking?.status === "cancelled") {
    return "cancelled";
  }

  return booking?.vehicle_status || "pending";
};

export default function VehicleCustomers({
  bookings,
  apiFetch,
  onRefresh,
  showToast,
}) {
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const itemsPerPage = 8;

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  /* ================================================================
     VEHICLE BOOKINGS
  ================================================================= */

  const vehicleBookings = useMemo(
    () =>
      (bookings || []).filter(
        (booking) =>
          booking.vehicle_type &&
          booking.vehicle_type !== "none",
      ),
    [bookings],
  );

  /* ================================================================
     FILTER BOOKINGS
  ================================================================= */

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return vehicleBookings.filter((booking) => {
      /*
       * Always calculate vehicle status through getVehicleStatus().
       *
       * Therefore:
       *
       * booking.status = cancelled
       * vehicle_status = assigned
       *
       * becomes:
       *
       * vehicleStatus = cancelled
       */
      const vehicleStatus = getVehicleStatus(booking);

      const matchesSearch =
        !term ||
        [
          booking.guest_name,
          booking.email,
          booking.phone,
          booking.pickup_location,
          booking.dropoff_location,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(term),
        );

      const matchesVehicle =
        vehicleFilter === "all" ||
        booking.vehicle_type === vehicleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        vehicleStatus === statusFilter;

      return (
        matchesSearch &&
        matchesVehicle &&
        matchesStatus
      );
    });
  }, [
    vehicleBookings,
    search,
    vehicleFilter,
    statusFilter,
  ]);

  /* ================================================================
     PAGINATION
  ================================================================= */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredBookings.length / itemsPerPage,
    ),
  );

  const visibleBookings = filteredBookings.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  useEffect(() => {
    setPage((current) =>
      Math.min(
        Math.max(current, 1),
        totalPages,
      ),
    );
  }, [totalPages]);

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  /* ================================================================
     START EDITING
  ================================================================= */

  function startEditing(booking) {
    /*
     * Cancelled bookings cannot be edited.
     */
    if (
      booking.status === "cancelled" ||
      getVehicleStatus(booking) === "completed" ||
      getVehicleStatus(booking) === "cancelled"
    ) {
      return;
    }

    setEditingId(booking.booking_id);

    setDraft({
      vehicle_type: booking.vehicle_type,

      vehicle_price:
        booking.vehicle_price || 0,

      pickup_location:
        booking.pickup_location || "",

      dropoff_location:
        booking.dropoff_location || "",

      vehicle_status:
        getVehicleStatus(booking),
    });
  }

  /* ================================================================
     SAVE VEHICLE DETAILS
  ================================================================= */

  async function saveVehicle(bookingId) {
    /*
     * Find the current booking.
     *
     * This is important because if the booking was cancelled
     * while the edit screen was open, we still send
     * vehicle_status = cancelled.
     */
    const currentBooking = vehicleBookings.find(
      (booking) =>
        booking.booking_id === bookingId,
    );

    /*
     * If the booking is cancelled, force vehicle status
     * to cancelled before sending the API request.
     */
    const finalVehicleStatus =
      currentBooking?.status === "cancelled"
        ? "cancelled"
        : draft.vehicle_status || "pending";

    /*
     * Validate price.
     */
    if (
      draft.vehicle_price === "" ||
      draft.vehicle_price === null ||
      draft.vehicle_price === undefined ||
      Number(draft.vehicle_price) < 0
    ) {
      showToast?.(
        "Enter a valid vehicle price",
        "error",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await apiFetch(
        `/api/manager/bookings/${bookingId}/vehicle`,
        {
          method: "PATCH",

          body: JSON.stringify({
            ...draft,

            /*
             * IMPORTANT:
             * Automatically send cancelled when
             * the booking is cancelled.
             */
            vehicle_status: finalVehicleStatus,

            vehicle_price: Number(
              draft.vehicle_price,
            ),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to update vehicle details",
        );
      }

      showToast?.(
        "Vehicle details updated",
        "success",
      );

      setEditingId(null);
      setDraft({});

      onRefresh?.();
    } catch (error) {
      showToast?.(
        error.message ||
          "Unable to update vehicle details",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ================================================================
     RENDER
  ================================================================= */

  return (
    <div className="rounded-2xl border border-[#E9ECEF] bg-white p-5">

      {/* ============================================================
          HEADER
      ============================================================ */}

      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

        <div>
          <h2 className="font-display text-base font-semibold text-[#0F1923]">
            Vehicle Customers
          </h2>

          <p className="mt-1 text-xs text-[#868E96]">
            Manage local pickup/drop requests, route,
            pricing, and pickup status.
          </p>
        </div>

        {/* ==========================================================
            FILTERS
        ========================================================== */}

        <div className="grid gap-2 sm:grid-cols-3">

          {/* Search */}

          <input
            value={search}
            onChange={(event) =>
              updateFilter(
                setSearch,
                event.target.value,
              )
            }
            placeholder="Search customer or route"
            className="rounded-lg border border-[#E9ECEF] px-3 py-2 text-xs outline-none focus:border-[#C9A84C]"
          />

          {/* Vehicle filter */}

          <select
            value={vehicleFilter}
            onChange={(event) =>
              updateFilter(
                setVehicleFilter,
                event.target.value,
              )
            }
            className="rounded-lg border border-[#E9ECEF] px-3 py-2 text-xs"
          >
            <option value="all">
              All seaters
            </option>

            {VEHICLE_OPTIONS.map((option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>

          {/* Status filter */}

          <select
            value={statusFilter}
            onChange={(event) =>
              updateFilter(
                setStatusFilter,
                event.target.value,
              )
            }
            className="rounded-lg border border-[#E9ECEF] px-3 py-2 text-xs"
          >
            <option value="all">
              All pickup statuses
            </option>

            {STATUS_OPTIONS.map((option) => (
              <option
                key={option}
                value={option}
              >
                {statusLabel(option)}
              </option>
            ))}
          </select>

        </div>
      </div>

      {/* ============================================================
          TABLE
      ============================================================ */}

      <div className="overflow-x-auto">

        <table className="w-full min-w-[760px] table-fixed border-collapse text-left">

          {/* ========================================================
              TABLE HEADER
          ======================================================== */}

          <thead>
            <tr>
              {[
                "Customer",
                "Seater",
                "From",
                "To",
                "Pickup status",
                "Booking",
                "Action",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-2 py-2 text-[0.58rem] uppercase tracking-[0.7px] text-[#868E96]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          {/* ========================================================
              TABLE BODY
          ======================================================== */}

          <tbody>

            {!filteredBookings.length ? (

              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-sm text-[#868E96]"
                >
                  No vehicle customers match
                  these filters.
                </td>
              </tr>

            ) : (

              visibleBookings.map((booking) => {

                const editing =
                  editingId ===
                  booking.booking_id;

                /*
                 * Booking cancellation.
                 */

                const isCancelled =
                  booking.status === "cancelled";

                /*
                 * IMPORTANT:
                 *
                 * This guarantees that cancelled booking
                 * always displays cancelled vehicle status.
                 */

                const vehicleStatus =
                  getVehicleStatus(booking);

                return (
                  <tr
                    key={booking.booking_id}
                    className={`border-t border-[#F1F3F5] align-top ${
                      isCancelled
                        ? "opacity-60"
                        : ""
                    }`}
                  >

                    {/* =================================================
                        CUSTOMER
                    ================================================= */}

                    <td className="w-[20%] px-2 py-2">

                      <div className="truncate text-xs font-semibold text-[#0F1923]">
                        {booking.guest_name}
                      </div>

                      <div className="truncate text-[0.65rem] text-[#868E96]">
                        {booking.phone ||
                          booking.email}
                      </div>

                    </td>

                    {/* =================================================
                        SEATER
                    ================================================= */}

                    <td className="w-[12%] px-2 py-2 text-xs text-[#495057]">

                      {editing ? (

                        <select
                          value={
                            draft.vehicle_type
                          }
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              vehicle_type:
                                event.target.value,
                            })
                          }
                          className="w-full rounded border border-gray-200 px-1 py-1 text-[0.68rem]"
                        >
                          {VEHICLE_OPTIONS.map(
                            (option) => (
                              <option
                                key={option}
                                value={option}
                              >
                                {option}
                              </option>
                            ),
                          )}
                        </select>

                      ) : (

                        booking.vehicle_type

                      )}

                    </td>

                    {/* =================================================
                        FROM
                    ================================================= */}

                    <td className="w-[16%] px-2 py-2 text-xs text-[#495057]">

                      {editing ? (

                        <input
                          value={
                            draft.pickup_location
                          }
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              pickup_location:
                                event.target.value,
                            })
                          }
                          placeholder="Pickup"
                          className="w-full rounded border border-gray-200 px-1 py-1 text-[0.68rem]"
                        />

                      ) : (

                        <span className="block truncate">
                          {booking.pickup_location ||
                            "Not set"}
                        </span>

                      )}

                    </td>

                    {/* =================================================
                        TO
                    ================================================= */}

                    <td className="w-[16%] px-2 py-2 text-xs text-[#495057]">

                      {editing ? (

                        <input
                          value={
                            draft.dropoff_location
                          }
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              dropoff_location:
                                event.target.value,
                            })
                          }
                          placeholder="Drop-off"
                          className="w-full rounded border border-gray-200 px-1 py-1 text-[0.68rem]"
                        />

                      ) : (

                        <span className="block truncate">
                          {booking.dropoff_location ||
                            "Not set"}
                        </span>

                      )}

                    </td>

                    {/* =================================================
                        PICKUP STATUS
                    ================================================= */}

                    <td className="w-[15%] px-2 py-2">

                      {editing ? (

                        <select
                          /*
                           * IMPORTANT:
                           *
                           * If booking is cancelled,
                           * dropdown automatically shows
                           * cancelled.
                           */

                          value={
                            isCancelled
                              ? "cancelled"
                              : draft.vehicle_status
                          }

                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              vehicle_status:
                                event.target.value,
                            })
                          }

                          /*
                           * Cancelled booking cannot
                           * change vehicle status.
                           */

                          disabled={isCancelled}

                          className="w-full rounded border border-gray-200 px-1 py-1 text-[0.68rem] disabled:cursor-not-allowed disabled:bg-[#F8F9FA] disabled:text-[#C0392B]"
                        >

                          {STATUS_OPTIONS.map(
                            (option) => (
                              <option
                                key={option}
                                value={option}
                              >
                                {statusLabel(
                                  option,
                                )}
                              </option>
                            ),
                          )}

                        </select>

                      ) : (

                        <span
                          className={`inline-block max-w-full truncate rounded px-1.5 py-1 text-[0.62rem] font-semibold capitalize ${
                            isCancelled
                              ? "bg-[#FBE9E7] text-[#C0392B]"
                              : "bg-[#EAF2FB] text-[#2471A3]"
                          }`}
                        >
                          {statusLabel(
                            vehicleStatus,
                          )}
                        </span>

                      )}

                    </td>

                    {/* =================================================
                        BOOKING
                    ================================================= */}

                    <td className="w-[11%] px-2 py-2 text-[0.65rem] text-[#868E96]">

                      #
                      {booking.booking_id}

                      {" · "}

                      <span
                        className={
                          isCancelled
                            ? "font-semibold text-[#C0392B]"
                            : ""
                        }
                      >
                        {booking.status}
                      </span>

                      <br />

                      {booking.check_in_date?.slice(
                        0,
                        10,
                      )}

                    </td>

                    {/* =================================================
                        ACTION
                    ================================================= */}

                    <td className="w-[10%] px-2 py-2">

                      <div className="flex flex-col items-start gap-1">

                        {/* Vehicle price */}
                      {/* 
                        {editing && (
                          <input
                            type="number"
                            min="0"
                            value={
                              draft.vehicle_price
                            }
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                vehicle_price:
                                  event.target.value,
                              })
                            }
                            placeholder="Price"
                            className="w-full rounded border border-gray-200 px-1 py-1 text-[0.68rem]"
                          />
                        )} */}

                        {/* Save / Cancel */}

                        {editing ? (

                          <div className="flex gap-1">

                            <button
                              onClick={() =>
                                saveVehicle(
                                  booking.booking_id,
                                )
                              }
                              disabled={saving}
                              className="rounded bg-[#0F1923] px-2 py-1 text-[0.65rem] font-semibold text-white disabled:opacity-50"
                            >
                              {saving
                                ? "..."
                                : "Save"}
                            </button>

                            <button
                              onClick={() => {
                                setEditingId(
                                  null,
                                );
                                setDraft({});
                              }}
                              disabled={saving}
                              className="rounded border border-gray-200 px-2 py-1 text-[0.65rem]"
                            >
                              Cancel
                            </button>

                          </div>

                        ) : isCancelled ? (

                          <button
                            type="button"
                            disabled
                            className="cursor-not-allowed rounded border border-[#F1D4D0] bg-[#F8F9FA] px-2 py-1 text-[0.65rem] font-semibold text-[#C0392B] opacity-70"
                          >
                            Edit
                          </button>

                        ) : vehicleStatus === "completed" ||
                          vehicleStatus === "cancelled" ? (

                          <button
                            type="button"
                            disabled
                            className="cursor-not-allowed rounded border border-[#E9ECEF] bg-[#F8F9FA] px-2 py-1 text-[0.65rem] font-semibold text-[#ADB5BD]"
                          >
                            Edit
                          </button>

                        ) : (

                          <button
                            type="button"
                            onClick={() =>
                              startEditing(
                                booking,
                              )
                            }
                            className="rounded border border-[#0F1923] px-2 py-1 text-[0.65rem] font-semibold text-[#0F1923]"
                          >
                            Edit
                          </button>

                        )}

                      </div>

                    </td>

                  </tr>
                );
              })

            )}

          </tbody>
        </table>
      </div>

      {/* ==============================================================
          PAGINATION
      =============================================================== */}

      <div className="mt-4 flex flex-col gap-3 border-t border-[#F1F3F5] pt-4 sm:flex-row sm:items-center sm:justify-between">

        {/* Showing count */}

        <div className="text-xs text-[#868E96]">

          Showing{" "}

          {filteredBookings.length === 0
            ? 0
            : (page - 1) *
                itemsPerPage +
              1}

          -

          {Math.min(
            page * itemsPerPage,
            filteredBookings.length,
          )}

          {" "}of{" "}

          {filteredBookings.length}{" "}
          vehicle bookings

        </div>

        {/* Pagination controls */}

        <div className="flex items-center justify-end gap-1.5">

          {/* Previous */}

          <button
            onClick={() =>
              setPage((current) =>
                Math.max(
                  1,
                  current - 1,
                ),
              )
            }
            disabled={page === 1}
            className="rounded border border-[#E9ECEF] px-2.5 py-1.5 text-xs text-[#495057] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>

          {/* Page numbers */}

          {getPaginationItems(
            page,
            totalPages,
          ).map((item) =>
            item?.type === "ellipsis" ? (

              <span
                key={item.key}
                className="px-1.5 text-xs text-[#868E96]"
              >
                ...
              </span>

            ) : (

              <button
                key={`page-${item}`}
                onClick={() =>
                  setPage(item)
                }
                className={`h-7 min-w-7 rounded px-2 text-xs font-semibold ${
                  page === item
                    ? "bg-[#0F1923] text-white"
                    : "border border-[#E9ECEF] text-[#495057] hover:bg-[#F8F9FA]"
                }`}
              >
                {item}
              </button>

            ),
          )}

          {/* Next */}

          <button
            onClick={() =>
              setPage((current) =>
                Math.min(
                  totalPages,
                  current + 1,
                ),
              )
            }
            disabled={
              page === totalPages
            }
            className="rounded border border-[#E9ECEF] px-2.5 py-1.5 text-xs text-[#495057] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>

        </div>
      </div>

    </div>
  );
}