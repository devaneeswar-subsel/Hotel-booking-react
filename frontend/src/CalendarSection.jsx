import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

function CalendarSection() {
  const [date, setDate] = useState(new Date());

  return (
    <div className="calendar-section">
      <h2>Check Your Availability Room</h2>

      <div className="calendar-box">
        <Calendar onChange={setDate} value={date} />
      </div>
    </div>
  );
}

export default CalendarSection;