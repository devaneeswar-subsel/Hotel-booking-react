import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";
import { CalendarIcon, SearchIcon, CheckIcon } from "./Icons";

const API = "http://localhost:5000";

export default function CalendarSection() {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [step, setStep] = useState("checkin");
  const [roomType, setRoomType] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

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
    checkIn && checkOut ? Math.ceil((checkOut - checkIn) / 86400000) : 0;

  async function checkAvailability() {
    if (!checkIn || !checkOut) return;
    setLoading(true);
    setResults(null);
    try {
      const p = new URLSearchParams({
        check_in: checkIn.toISOString().split("T")[0],
        check_out: checkOut.toISOString().split("T")[0],
      });
      if (roomType) p.set("type", roomType);
      const res = await fetch(`${API}/api/rooms?${p}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

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
        .cal-checkin  { background: var(--navy) !important; color: #fff !important; border-radius: 6px !important; }
        .cal-checkout { background: var(--gold) !important; color: var(--navy) !important; border-radius: 6px !important; }
        .cal-range    { background: rgba(15,25,35,0.08) !important; color: var(--navy) !important; border-radius: 0 !important; }
      `}</style>

      <div className="calendar-section" id="calendar">
        <div className="calendar-inner">
          {/* INFO */}
          <div className="calendar-info">
            <div className="section-eyebrow">
              <span>Availability</span>
            </div>
            <h2>
              Check Your
              <br />
              Available Dates
            </h2>
            <p>
              Select your check-in date first, then your check-out date. We'll
              show you available rooms for your stay.
            </p>

            {checkIn && (
              <div className="date-card">
                <div className="date-card-label">Check-in</div>
                <div className="date-card-value">{fmt(checkIn)}</div>
              </div>
            )}
            {!checkIn && (
              <div className="date-card">
                <div className="date-card-label">Check-in</div>
                <div
                  className="date-card-value"
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: "0.9rem",
                  }}
                >
                  Select on calendar →
                </div>
              </div>
            )}

            {checkIn && (
              <div className="date-card">
                <div className="date-card-label">Check-out</div>
                <div className="date-card-value">
                  {checkOut ? (
                    fmt(checkOut)
                  ) : (
                    <span
                      style={{
                        color: "rgba(255,255,255,0.35)",
                        fontSize: "0.9rem",
                      }}
                    >
                      Select on calendar →
                    </span>
                  )}
                </div>
              </div>
            )}

            {nights > 0 && (
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "rgba(255,255,255,0.4)",
                  margin: "4px 0 16px",
                }}
              >
                {nights} night{nights > 1 ? "s" : ""} selected
              </p>
            )}

            <div style={{ marginBottom: "16px" }}>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  border: "1px solid rgba(201,168,76,0.25)",
                  background: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.75)",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                <option value="" style={{ color: "#000" }}>
                  All Room Types
                </option>
                {["Standard", "Deluxe", "Suite", "Luxury", "Presidential"].map(
                  (t) => (
                    <option key={t} value={t} style={{ color: "#000" }}>
                      {t}
                    </option>
                  ),
                )}
              </select>
            </div>

            <button
              className="btn btn-gold"
              onClick={checkAvailability}
              disabled={!checkIn || !checkOut || loading}
              style={{
                opacity: !checkIn || !checkOut ? 0.5 : 1,
                pointerEvents: !checkIn || !checkOut ? "none" : "auto",
              }}
            >
              <SearchIcon size={15} />
              {loading ? "Checking..." : "Check Availability"}
            </button>

            {/* RESULTS */}
            {results !== null && (
              <div className="avail-result" style={{ marginTop: "20px" }}>
                {results.length === 0 ? (
                  <div
                    className="avail-result-title"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    No rooms available for these dates.
                  </div>
                ) : (
                  <>
                    <div className="avail-result-title">
                      <CheckIcon size={15} color="var(--gold)" />
                      {results.length} room{results.length > 1 ? "s" : ""}{" "}
                      available
                    </div>
                    {results.slice(0, 4).map((r) => (
                      <div className="avail-item" key={r.room_id}>
                        <span>
                          {r.room_type} — Room {r.room_number || r.room_id}
                        </span>
                        <span>
                          ₹{Number(r.price_per_night).toLocaleString()}/night
                        </span>
                      </div>
                    ))}
                    {results.length > 4 && (
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "rgba(255,255,255,0.35)",
                          marginTop: "6px",
                        }}
                      >
                        +{results.length - 4} more — scroll to rooms above
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* CALENDAR */}
          <div className="calendar-widget">
            <div className="calendar-widget-header">
              <div
                className="calendar-widget-title"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <CalendarIcon size={16} color="var(--navy)" />
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
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--gray-400)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                  }}
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
                step === "checkout" && checkIn && date <= checkIn
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
