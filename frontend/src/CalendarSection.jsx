import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";
import { CalendarIcon, SearchIcon, CheckIcon } from "./Icons";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
export default function CalendarSection({ onViewRooms }) {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [step, setStep] = useState("checkin");
  const [roomType, setRoomType] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAllRooms, setShowAllRooms] = useState(false);
  function handleDateChange(date) {
    if (step === "checkin") {
      setCheckIn(date);
      setCheckOut(null);
      setResults(null);
      setStep("checkout");
    } else {
      if (date <= checkIn) return;
      setCheckOut(date);
      setStep("checkin");
    }
  }

  function fmt(d) {
    if (!d) return "—";

    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const nights =
    checkIn && checkOut
      ? Math.ceil((checkOut - checkIn) / 86400000)
      : 0;

  async function checkAvailability() {
    if (!checkIn || !checkOut) return;
    setLoading(true);
    setResults(null);

    try {
      const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
      };
      const p = new URLSearchParams({
        check_in: formatLocalDate(checkIn),
        check_out: formatLocalDate(checkOut),
      });
      if (roomType) p.set("type", roomType);

      const res = await fetch(`${API}/api/rooms?${p}`);
      const data = await res.json();
      const available = Array.isArray(data) ? data : [];
      setResults(available);
      setShowAllRooms(false);
      onViewRooms?.(available.map((r) => r.room_id));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }   // <-- Missing brace

  function tileClass({ date, view }) {
    if (view !== "month") return null;

    if (checkIn && date.toDateString() === checkIn.toDateString())
      return "cal-checkin";

    if (checkOut && date.toDateString() === checkOut.toDateString())
      return "cal-checkout";

    if (checkIn && checkOut && date > checkIn && date < checkOut)
      return "cal-range";

    return null;
  }

  return (
    <>
      <style>{`
        .cal-checkin{
          background: var(--navy) !important;
          color:#fff !important;
          border-radius:6px !important;
        }

        .cal-checkout{
          background: var(--gold) !important;
          color:var(--navy) !important;
          border-radius:6px !important;
        }

        .cal-range{
          background: rgba(15,25,35,.08) !important;
          color: var(--navy) !important;
        }
      `}</style>

      <section
        id="calendar"
        className="bg-[var(--navy)] px-4 md:px-8 lg:px-12  py-20"
      >
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-[60px]">
          {/* INFO */}
          <div>
            <div className="section-eyebrow">
              <span className="text-[var(--gold-light)]">
                Availability
              </span>
            </div>

            <h2 className="mb-4 font-[var(--font-display)] text-[clamp(1.8rem,3vw,2.4rem)] font-semibold leading-tight text-white">
              Check Your
              <br />
              Available Dates
            </h2>

            <p className="mb-6 text-[0.88rem] leading-[1.75] text-white/55">
              Select your check-in date first, then your check-out date.
              We'll show you available rooms for your stay.
            </p>

            {/* Check In */}
            <div className="mb-3 rounded-[var(--radius-md)] border border-[rgba(201,168,76,0.2)] bg-white/5 px-[18px] py-[14px]">
              <div className="mb-1 text-[0.65rem] uppercase tracking-[2px] text-[var(--gold)]">
                Check-in
              </div>

              <div className="font-[var(--font-display)] text-[1.05rem] font-medium text-white">
                {checkIn ? (
                  fmt(checkIn)
                ) : (
                  <span className="text-[0.9rem] text-white/35">
                    Select on calendar →
                  </span>
                )}
              </div>
            </div>

            {/* Check Out */}
            {checkIn && (
              <div className="mb-3 rounded-[var(--radius-md)] border border-[rgba(201,168,76,0.2)] bg-white/5 px-[18px] py-[14px]">
                <div className="mb-1 text-[0.65rem] uppercase tracking-[2px] text-[var(--gold)]">
                  Check-out
                </div>

                <div className="font-[var(--font-display)] text-[1.05rem] font-medium text-white">
                  {checkOut ? (
                    fmt(checkOut)
                  ) : (
                    <span className="text-[0.9rem] text-white/35">
                      Select on calendar →
                    </span>
                  )}
                </div>
              </div>
            )}

            {nights > 0 && (
              <p className="mb-4 mt-1 text-[0.78rem] text-white/40">
                {nights} night{nights > 1 ? "s" : ""} selected
              </p>
            )}

            {/* Room Type */}
            <div className="mb-4">
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full rounded-md border border-[rgba(201,168,76,0.25)] bg-white/10 px-4 py-2.5 text-[0.85rem] text-white/75 outline-none"
              >
                <option value="" className="text-black">
                  All Room Types
                </option>

                {[
                  "Standard",
                  "Deluxe",
                  "Suite",
                  "Luxury",
                  "Presidential",
                ].map((t) => (
                  <option
                    key={t}
                    value={t}
                    className="text-black"
                  >
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Button */}
            <button
              onClick={checkAvailability}
              disabled={!checkIn || !checkOut || loading}
              className={`flex w-full items-center justify-center gap-2 rounded-md bg-[var(--gold)] px-5 py-3 font-medium text-[var(--navy)] transition ${!checkIn || !checkOut
                ? "pointer-events-none opacity-50"
                : "hover:brightness-105"
                }`}
            >
              <SearchIcon size={15} />
              {loading ? "Checking..." : "Check Availability"}
            </button>

            {/* Results */}
            {/* {results !== null && (
              <div className="mt-5 rounded-[var(--radius-md)] border border-[rgba(201,168,76,0.2)] bg-white/5 px-[18px] py-[14px] text-white">
                {results.length === 0 ? (
                  <div className="text-[0.88rem] text-white/50">
                    No rooms available for these dates.
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center gap-1.5 text-[0.88rem] font-semibold text-[var(--gold-light)]">
                      <CheckIcon
                        size={15}
                        color="var(--gold)"
                      />
                      {results.length} room
                      {results.length > 1 ? "s" : ""} available
                    </div>

                    {results.slice(0, 6).map((r) => (
                      <div
                        key={r.room_id}
                        className="flex justify-between border-t border-white/5 py-1.5 text-[0.78rem] text-white/60"
                      >
                        <span>
                          {r.room_type} — Room{" "}
                          {r.room_number || r.room_id}
                        </span>

                        <span className="font-semibold text-white">
                          ₹
                          {Number(
                            r.price_per_night
                          ).toLocaleString()}
                          /night
                        </span>
                      </div>
                    ))}
                    {results.length > 4  && (
                      <button
                        onClick={() =>
                          document
                            .getElementById("rooms-section")
                            ?.scrollIntoView({ behavior: "smooth" })
                        }
                        className="mt-2 text-[0.72rem] text-[var(--gold)] underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0 font-inherit hover:text-white transition"
                      >
                        +{results.length - 4} more available — view all rooms ↓
                      </button>
                    )}
                  </>
                )}
              </div>
            )} */}
            {loading ? (
              <div className="mt-5 rounded-[var(--radius-md)] border border-[rgba(201,168,76,0.2)] bg-white/5 px-[18px] py-[16px]">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
                  <span className="text-[0.88rem] text-white/70">
                    Checking room availability...
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse flex justify-between border-t border-white/5 py-2"
                    >
                      <div className="h-3 w-32 rounded bg-white/10" />
                      <div className="h-3 w-20 rounded bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              results !== null && (
                <div className="mt-5 rounded-[var(--radius-md)] border border-[rgba(201,168,76,0.2)] bg-white/5 px-[18px] py-[14px] text-white">
                  {results.length === 0 ? (
                    <div className="text-[0.88rem] text-white/50">
                      No rooms available for these dates.
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center gap-1.5 text-[0.88rem] font-semibold text-[var(--gold-light)]">
                        <CheckIcon
                          size={15}
                          color="var(--gold)"
                        />
                        {results.length} room
                        {results.length > 1 ? "s" : ""} available
                      </div>

                      {(showAllRooms ? results : results.slice(0, 2)).map((r) => (
                        <div
                          key={r.room_id}
                          className="flex justify-between border-t border-white/5 py-1.5 text-[0.78rem] text-white/60"
                        >
                          <span>
                            {r.room_type} — Room{" "}
                            {r.room_number || r.room_id}
                          </span>

                          <span className="font-semibold text-white">
                            ₹
                            {Number(
                              r.price_per_night
                            ).toLocaleString()}
                            /night
                          </span>
                        </div>
                      ))}
                      {results.length > 2 && (
                        <button
                          onClick={() => setShowAllRooms(!showAllRooms)}
                          className="mt-2 text-[0.72rem] text-[var(--gold)] underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0 font-inherit hover:text-white transition"
                        >
                          {showAllRooms
                            ? "Show Less ↑"
                            : `+${results.length - 2} more available — View More ↓`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            )}
          </div>

          {/* Calendar */}
          <div className="rounded-[var(--radius-lg)] bg-white p-7 shadow-[var(--shadow-lg)]">
            <div className="mb-[14px] flex items-center justify-between">
              <div className="flex items-center gap-2 font-[var(--font-display)] text-[0.9rem] font-semibold text-[var(--navy)]">
                <CalendarIcon
                  size={16}
                  color="var(--navy)"
                />

                {step === "checkin"
                  ? "Select Check-in Date"
                  : "Select Check-out Date"}
              </div>

              {(checkIn || checkOut) && (
                <button
                  onClick={() => {
                    setCheckIn(null);
                    setCheckOut(null);
                    setStep("checkin");
                    setResults(null);
                  }}
                  className="text-[0.78rem] text-[var(--gray-400)] transition hover:text-[var(--navy)]"
                >
                  Reset
                </button>
              )}
            </div>

            <Calendar
              onChange={handleDateChange}
              value={checkIn}
              minDate={new Date()}
              tileClassName={tileClass}
              tileDisabled={({ date }) =>
                step === "checkout" &&
                checkIn &&
                date <= checkIn
              }
            />
          </div>
        </div>
      </section>
    </>
  );
}