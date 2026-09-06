import React, { useState, useMemo } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   BookingCalendar.jsx

   Two months side by side, showing who is arriving, staying and leaving on
   each day. Built from the bookings already loaded by the dashboard, so it
   needs no extra API call.

     green  = checking in that day
     blue   = mid-stay
     red    = checking out that day
   ──────────────────────────────────────────────────────────────────────────── */

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// local YYYY-MM-DD — never use toISOString here, it shifts by timezone
const keyOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const parseDay = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay()); // back to Sunday

  const weeks = [];
  const cursor = new Date(start);

  for (let w = 0; w < 6; w += 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    // stop once we have covered the month and closed the week
    if (cursor.getMonth() !== month && cursor > new Date(year, month + 1, 0))
      break;
  }
  return weeks;
}

function MonthGrid({ year, month, eventsByDay, today, onSelectBooking }) {
  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="font-display text-[0.95rem] font-bold text-navy">
          {MONTHS[month]} {year}
        </div>
      </div>

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

                  {events.slice(0, 3).map((ev) => (
                    <button
                      key={`${ev.booking_id}-${ev.kind}`}
                      onClick={() => onSelectBooking?.(ev.booking_id)}
                      className="mb-0.5 block w-full cursor-pointer border-none bg-transparent p-0 text-left"
                      title={`${ev.guest_name} · ${ev.room_type} · ${
                        ev.kind === "in"
                          ? "Check-in"
                          : ev.kind === "out"
                            ? "Check-out"
                            : "Staying"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            ev.kind === "in"
                              ? "bg-emerald-500"
                              : ev.kind === "out"
                                ? "bg-red-500"
                                : "bg-blue-500"
                          }`}
                        />
                        <span className="truncate text-[0.68rem] font-semibold text-navy">
                          {ev.guest_name}
                        </span>
                      </span>
                      <span className="block truncate pl-2.5 text-[0.6rem] text-gray-400">
                        {ev.room_type}
                      </span>
                    </button>
                  ))}

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

export default function BookingCalendar({ bookings = [], onSelectBooking }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // which two months are on screen; 0 = this month and next
  const [offset, setOffset] = useState(0);

  const anchor = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    return d;
  }, [today, offset]);

  const secondMonth = useMemo(
    () => new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
    [anchor],
  );

  /*
   * Expand each booking into one event per night: check-in on the first day,
   * check-out on the last, "staying" in between. Cancelled bookings are left
   * out — they no longer occupy the room.
   */
  const eventsByDay = useMemo(() => {
    const map = new Map();

    bookings.forEach((b) => {
      if (b.status === "cancelled") return;

      const start = parseDay(b.check_in_date);
      const end = parseDay(b.check_out_date);
      if (!start || !end) return;

      const cursor = new Date(start);
      let guard = 0;

      while (cursor <= end && guard < 400) {
        const key = keyOf(cursor);
        const kind =
          keyOf(cursor) === keyOf(start)
            ? "in"
            : keyOf(cursor) === keyOf(end)
              ? "out"
              : "stay";

        if (!map.has(key)) map.set(key, []);
        map.get(key).push({
          booking_id: b.booking_id,
          guest_name: b.guest_name || "Guest",
          room_type: b.room_type || "Room",
          kind,
        });

        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
    });

    // arrivals first, then departures, then mid-stay
    const order = { in: 0, out: 1, stay: 2 };
    map.forEach((list) => list.sort((a, z) => order[a.kind] - order[z.kind]));

    return map;
  }, [bookings]);

  const rangeLabel = `${MONTHS[anchor.getMonth()].slice(0, 3)} ${anchor.getFullYear()} - ${MONTHS[
    secondMonth.getMonth()
  ].slice(0, 3)} ${secondMonth.getFullYear()}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-[1rem] font-semibold text-navy">
            Booking Calendar
          </div>
          <div className="text-[0.78rem] text-gray-500">
            View daily bookings for the next two months
          </div>
        </div>

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

      {/* legend */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-4 text-[0.74rem] text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Check-in
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Stay
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Check-out
        </span>
      </div>

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