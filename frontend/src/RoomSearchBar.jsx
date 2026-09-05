import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

/* ─────────────────────────────────────────────────────────────────────────────
   RoomSearchBar.jsx

   Check-in / check-out / guests / room type, then Search.
   Purely presentational — it hands the chosen criteria back to Rooms.jsx,
   which does the fetching and the availability maths.
   ──────────────────────────────────────────────────────────────────────────── */

const ROOM_TYPES = [
  "All Room Types",
  "Deluxe Room",
  "Suite Room",
  "Suite with Balcony",
];

const fmtLocal = (d) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`
    : "";

const dayName = (d) =>
  d ? d.toLocaleDateString("en-IN", { weekday: "short" }) : "";

function Stepper({ label, value, onChange, min, max }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[0.82rem] text-[#3A4A5C]">{label}</span>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#D9DEE5] text-[1rem] font-bold text-[#0F1923] transition hover:bg-[#F5F6F8] disabled:opacity-35"
        >
          −
        </button>
        <span className="w-5 text-center text-[0.9rem] font-bold text-[#0F1923]">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#D9DEE5] text-[1rem] font-bold text-[#0F1923] transition hover:bg-[#F5F6F8] disabled:opacity-35"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function RoomSearchBar({ onSearch, searching }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomType, setRoomType] = useState("All Room Types");
  const [guestsOpen, setGuestsOpen] = useState(false);

  function submit() {
    if (!checkIn || !checkOut) return;
    onSearch({
      check_in: fmtLocal(checkIn),
      check_out: fmtLocal(checkOut),
      adults,
      children,
      type: roomType === "All Room Types" ? "" : roomType,
    });
  }

  const cell =
    "flex flex-1 items-center gap-2.5 px-4 py-3 min-w-[150px]";
  const cellLabel =
    "block text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#8A95A3]";
  const cellValue = "block text-[0.9rem] font-bold text-[#0F1923]";

  return (
    <div className="relative z-30 mx-auto mb-10 max-w-6xl">
      <div className="flex flex-col gap-px overflow-visible rounded-2xl border border-[#E9ECEF] bg-white shadow-[0_10px_40px_rgba(15,25,35,0.10)] md:flex-row md:items-stretch">
        {/* check-in */}
        <div className={`${cell} border-b border-[#F0F3F7] md:border-b-0 md:border-r`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          <div className="min-w-0">
            <span className={cellLabel}>Check-in</span>
            <DatePicker
              selected={checkIn}
              onChange={(d) => {
                setCheckIn(d);
                if (d && checkOut && d >= checkOut) {
                  const next = new Date(d);
                  next.setDate(next.getDate() + 1);
                  setCheckOut(next);
                }
              }}
              minDate={today}
              dateFormat="dd MMM yyyy"
              className={`${cellValue} w-full cursor-pointer border-none bg-transparent p-0 outline-none`}
            />
            <span className="block text-[0.68rem] text-[#8A95A3]">
              {dayName(checkIn)}
            </span>
          </div>
        </div>

        {/* check-out */}
        <div className={`${cell} border-b border-[#F0F3F7] md:border-b-0 md:border-r`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          <div className="min-w-0">
            <span className={cellLabel}>Check-out</span>
            <DatePicker
              selected={checkOut}
              onChange={setCheckOut}
              minDate={
                checkIn
                  ? new Date(checkIn.getTime() + 86400000)
                  : tomorrow
              }
              dateFormat="dd MMM yyyy"
              className={`${cellValue} w-full cursor-pointer border-none bg-transparent p-0 outline-none`}
            />
            <span className="block text-[0.68rem] text-[#8A95A3]">
              {dayName(checkOut)}
            </span>
          </div>
        </div>

        {/* guests */}
        <div className={`relative ${cell} border-b border-[#F0F3F7] md:border-b-0 md:border-r`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.8">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          </svg>
          <button
            type="button"
            onClick={() => setGuestsOpen((o) => !o)}
            className="min-w-0 flex-1 cursor-pointer border-none bg-transparent p-0 text-left"
          >
            <span className={cellLabel}>Guests</span>
            <span className={cellValue}>
              {adults} Adult{adults === 1 ? "" : "s"}, {children} Child
              {children === 1 ? "" : "ren"}
            </span>
          </button>

          {guestsOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setGuestsOpen(false)}
              />
              <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-20 rounded-xl border border-[#E9ECEF] bg-white p-3.5 shadow-[0_12px_36px_rgba(15,25,35,0.16)]">
                <Stepper label="Adults" value={adults} onChange={setAdults} min={1} max={20} />
                <div className="my-1 border-t border-[#F0F3F7]" />
                <Stepper label="Children" value={children} onChange={setChildren} min={0} max={10} />
                <button
                  type="button"
                  onClick={() => setGuestsOpen(false)}
                  className="mt-2.5 w-full rounded-lg bg-[#0F1923] py-2 text-[0.78rem] font-bold text-[#E8D5A3]"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>

        {/* room type */}
        <div className={`${cell} border-b border-[#F0F3F7] md:border-b-0 md:border-r`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.8">
            <path d="M2 17v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5M2 17h20M2 17v3M22 17v3M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
          </svg>
          <div className="min-w-0 flex-1">
            <span className={cellLabel}>Room Type</span>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className={`${cellValue} w-full cursor-pointer border-none bg-transparent p-0 outline-none`}
            >
              {ROOM_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* search */}
        <button
          type="button"
          onClick={submit}
          disabled={searching}
          className="flex items-center justify-center gap-2 rounded-b-2xl bg-[#0F1923] px-7 py-4 text-[0.88rem] font-bold text-white transition hover:bg-[#1C2B3A] disabled:opacity-60 md:rounded-b-none md:rounded-r-2xl"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          {searching ? "Searching..." : "Search Rooms"}
        </button>
      </div>
    </div>
  );
}