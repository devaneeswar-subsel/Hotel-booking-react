import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";

const API = "http://localhost:5000";

export default function CalendarSection() {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [step, setStep] = useState("checkin"); // "checkin" | "checkout"
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
      if (date <= checkIn) return; // must be after check-in
      setCheckOut(date);
      setStep("checkin");
    }
  }

  function formatDate(d) {
    if (!d) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function toISO(d) {
    return d.toISOString().split("T")[0];
  }

  async function checkAvailability() {
    if (!checkIn || !checkOut) return;
    setLoading(true);
    setResults(null);
    try {
      const params = new URLSearchParams({
        check_in: toISO(checkIn),
        check_out: toISO(checkOut),
      });
      if (roomType) params.set("type", roomType);
      const res = await fetch(`${API}/api/rooms?${params}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const nights =
    checkIn && checkOut ? Math.ceil((checkOut - checkIn) / 86400000) : 0;

  // Tile class — highlight selected range
  function tileClassName({ date, view }) {
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
        .cal-checkin  { background: #6C63FF !important; color: #fff !important; border-radius: 10px !important; }
        .cal-checkout { background: #FF6584 !important; color: #fff !important; border-radius: 10px !important; }
        .cal-range    { background: #EEF0FF !important; color: #6C63FF !important; border-radius: 0 !important; }
      `}</style>

      <div className="calendar-section" id="calendar">
        <div className="calendar-inner">
          {/* LEFT INFO */}
          <div className="calendar-info">
            <div
              className="section-label"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Availability
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

            {/* Date display */}
            <div className="selected-date">
              <div className="date-label">Check-in</div>
              <div className="date-value">
                {checkIn ? formatDate(checkIn) : "Select on calendar →"}
              </div>
            </div>

            {checkIn && (
              <div className="selected-date" style={{ marginTop: "10px" }}>
                <div className="date-label">Check-out</div>
                <div className="date-value">
                  {checkOut ? formatDate(checkOut) : "Now pick check-out →"}
                </div>
              </div>
            )}

            {nights > 0 && (
              <div
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "0.85rem",
                  margin: "8px 0 16px",
                }}
              >
                {nights} night{nights > 1 ? "s" : ""} selected
              </div>
            )}

            {/* Room type filter */}
            <div style={{ marginBottom: "16px" }}>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1.5px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                <option value="" style={{ color: "#000" }}>
                  All Room Types
                </option>
                <option style={{ color: "#000" }}>Standard</option>
                <option style={{ color: "#000" }}>Deluxe</option>
                <option style={{ color: "#000" }}>Suite</option>
                <option style={{ color: "#000" }}>Luxury</option>
                <option style={{ color: "#000" }}>Presidential</option>
              </select>
            </div>

            <button
              className="btn btn-white"
              onClick={checkAvailability}
              disabled={!checkIn || !checkOut || loading}
              style={{ opacity: !checkIn || !checkOut ? 0.6 : 1 }}
            >
              {loading ? "Checking..." : "Check Availability →"}
            </button>

            {/* Results */}
            {results !== null && (
              <div style={{ marginTop: "20px" }}>
                {results.length === 0 ? (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      color: "#fff",
                      fontSize: "0.875rem",
                    }}
                  >
                    😔 No rooms available for these dates.
                  </div>
                ) : (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      color: "#fff",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "1rem",
                        marginBottom: "10px",
                      }}
                    >
                      ✅ {results.length} room{results.length > 1 ? "s" : ""}{" "}
                      available!
                    </div>
                    {results.slice(0, 3).map((r) => (
                      <div
                        key={r.room_id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.82rem",
                          padding: "5px 0",
                          borderTop: "1px solid rgba(255,255,255,0.15)",
                        }}
                      >
                        <span>
                          {r.room_type} — Room {r.room_number || r.room_id}
                        </span>
                        <span style={{ fontWeight: 700 }}>
                          ₹{Number(r.price_per_night).toLocaleString()}/night
                        </span>
                      </div>
                    ))}
                    {results.length > 3 && (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          opacity: 0.7,
                          marginTop: "6px",
                        }}
                      >
                        + {results.length - 3} more. Scroll to Rooms ↑
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT CALENDAR */}
          <div className="calendar-widget">
            <div
              style={{
                marginBottom: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  color: "var(--c-dark)",
                }}
              >
                {step === "checkin" ? "Select Check-in" : "Select Check-out"}
              </span>
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
                    color: "var(--c-muted)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
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
              tileClassName={tileClassName}
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
