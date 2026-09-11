
import React, { useState, useMemo } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   BookingCalendar.jsx

   Two months side by side, showing only:
     green = checking in that day
     red   = checking out that day

   Cancelled and completed bookings are not shown.
   Built from the bookings already loaded by the dashboard.
   ──────────────────────────────────────────────────────────────────────────── */

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Local YYYY-MM-DD — never use toISOString here,
// because it can shift the date due to timezone.
const keyOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const parseDay = (value) => {
  if (!value) return null;

  const [y, m, d] = String(value)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!y || !m || !d) return null;

  return new Date(y, m - 1, d);
};

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);

  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());

  const weeks = [];
  const cursor = new Date(start);

  for (let w = 0; w < 6; w += 1) {
    const week = [];

    for (let d = 0; d < 7; d += 1) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push(week);

    // Stop once the month is fully covered.
    if (
      cursor.getMonth() !== month &&
      cursor > new Date(year, month + 1, 0)
    ) {
      break;
    }
  }

  return weeks;
}

function MonthGrid({
  year,
  month,
  eventsByDay,
  today,
  onSelectBooking,
}) {
  const weeks = useMemo(
    () => buildMonthGrid(year, month),
    [year, month],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Month header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="font-display text-[0.95rem] font-bold text-navy">
          {MONTHS[month]} {year}
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[0.66rem] font-semibold uppercase tracking-wide text-gray-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const inMonth = day.getMonth() === month;
              const key = keyOf(day);
              const events = eventsByDay.get(key) || [];
              const isToday = key === keyOf(today);

              return (
                <div
                  key={key}
                  className={`min-h-[74px] border-b border-r border-gray-100 p-1.5 ${
                    inMonth ? "" : "bg-gray-50/60"
                  } ${isToday ? "bg-amber-50" : ""}`}
                >
                  {/* Date */}
                  <div
                    className={`mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[0.7rem] font-semibold ${
                      isToday
                        ? "bg-gold text-white"
                        : inMonth
                          ? "text-navy"
                          : "text-gray-300"
                    }`}
                  >
                    {day.getDate()}
                  </div>

                  {/* Check-in / Check-out only */}
                  {events.slice(0, 3).map((ev) => (
                    <button
                      key={`${ev.booking_id}-${ev.kind}`}
                      onClick={() =>
                        onSelectBooking?.(ev.booking_id)
                      }
                      className="mb-0.5 block w-full cursor-pointer border-none bg-transparent p-0 text-left"
                      title={`${ev.guest_name} · ${ev.room_type} · ${
                        ev.kind === "in"
                          ? "Check-in"
                          : "Check-out"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {/* Event dot */}
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            ev.kind === "in"
                              ? "bg-emerald-500"
                              : "bg-red-500"
                          }`}
                        />

                        {/* Guest name */}
                        <span className="truncate text-[0.68rem] font-semibold text-navy">
                          {ev.guest_name}
                        </span>
                      </span>

                      {/* Room */}
                      <span className="block truncate pl-2.5 text-[0.6rem] text-gray-400">
                        {ev.room_type}
                      </span>

                      {/* Event type */}
                      <span className="block truncate pl-2.5 text-[0.55rem] font-medium text-gray-400">
                        {ev.kind === "in"
                          ? "Check-in"
                          : "Check-out"}
                      </span>
                    </button>
                  ))}

                  {/* More events */}
                  {events.length > 3 && (
                    <span className="pl-2.5 text-[0.6rem] font-semibold text-gray-400">
                      +{events.length - 3} more
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BookingCalendar({
  bookings = [],
  onSelectBooking,
}) {
  const today = useMemo(() => {
    const d = new Date();

    d.setHours(0, 0, 0, 0);

    return d;
  }, []);

  // 0 = current month + next month
  const [offset, setOffset] = useState(0);

  const anchor = useMemo(() => {
    return new Date(
      today.getFullYear(),
      today.getMonth() + offset,
      1,
    );
  }, [today, offset]);

  const secondMonth = useMemo(
    () =>
      new Date(
        anchor.getFullYear(),
        anchor.getMonth() + 1,
        1,
      ),
    [anchor],
  );

  /*
   * Create only TWO events for every active booking:
   *
   * 1. Check-in date
   * 2. Check-out date
   *
   * No "stay" events.
   *
   * Cancelled and completed bookings are ignored.
   */
  const eventsByDay = useMemo(() => {
    const map = new Map();

    bookings.forEach((b) => {
      // Do not show cancelled or completed bookings.
      if (
        b.status === "cancelled" ||
        b.status === "completed"
      ) {
        return;
      }

      const start = parseDay(b.check_in_date);
      const end = parseDay(b.check_out_date);

      if (!start || !end) return;

      // ─────────────────────────────────────────────
      // CHECK-IN
      // ─────────────────────────────────────────────
      const startKey = keyOf(start);

      if (!map.has(startKey)) {
        map.set(startKey, []);
      }

      map.get(startKey).push({
        booking_id: b.booking_id,
        guest_name: b.guest_name || "Guest",
        room_type: b.room_type || "Room",
        kind: "in",
      });

      // ─────────────────────────────────────────────
      // CHECK-OUT
      // ─────────────────────────────────────────────
      const endKey = keyOf(end);

      if (!map.has(endKey)) {
        map.set(endKey, []);
      }

      map.get(endKey).push({
        booking_id: b.booking_id,
        guest_name: b.guest_name || "Guest",
        room_type: b.room_type || "Room",
        kind: "out",
      });
    });

    // Check-in first, then check-out.
    const order = {
      in: 0,
      out: 1,
    };

    map.forEach((list) => {
      list.sort(
        (a, z) => order[a.kind] - order[z.kind],
      );
    });

    return map;
  }, [bookings]);

  const rangeLabel = `${MONTHS[anchor.getMonth()].slice(
    0,
    3,
  )} ${anchor.getFullYear()} - ${MONTHS[
    secondMonth.getMonth()
  ].slice(0, 3)} ${secondMonth.getFullYear()}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-[1rem] font-semibold text-navy">
            Booking Calendar
          </div>

          <div className="text-[0.78rem] text-gray-500">
            View check-in and check-out dates for the next two
            months
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-navy transition hover:bg-gray-50"
            aria-label="Previous months"
          >
            ‹
          </button>

          <span className="min-w-[150px] rounded-lg border border-gray-200 px-3 py-1.5 text-center text-[0.8rem] font-semibold text-navy">
            {rangeLabel}
          </span>

          <button
            onClick={() => setOffset((o) => o + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-navy transition hover:bg-gray-50"
            aria-label="Next months"
          >
            ›
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-4 text-[0.74rem] text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Check-in
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Check-out
        </span>
      </div>

      {/* Two months */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MonthGrid
          year={anchor.getFullYear()}
          month={anchor.getMonth()}
          eventsByDay={eventsByDay}
          today={today}
          onSelectBooking={onSelectBooking}
        />

        <MonthGrid
          year={secondMonth.getFullYear()}
          month={secondMonth.getMonth()}
          eventsByDay={eventsByDay}
          today={today}
          onSelectBooking={onSelectBooking}
        />
      </div>
    </div>
  );
}
