import React from "react";
import "./App.css";

const facilities = [
  { icon: "🏊", name: "Swimming Pool", desc: "Heated infinity pool" },
  { icon: "💆", name: "Spa & Wellness", desc: "Full-body relaxation" },
  { icon: "🏋️", name: "Fitness Center", desc: "24/7 modern gym" },
  { icon: "🍽️", name: "Fine Dining", desc: "Multi-cuisine restaurant" },
  { icon: "🅿️", name: "Free Parking", desc: "Secured valet parking" },
  { icon: "📶", name: "High-Speed WiFi", desc: "Fibre across all rooms" },
  { icon: "🛎️", name: "24/7 Concierge", desc: "Always at your service" },
  { icon: "✈️", name: "Airport Transfer", desc: "Pickup & drop service" },
];

export default function Facilities() {
  return (
    <div className="section" id="facilities">
      <div className="section-header">
        <div>
          <div className="section-label">What We Offer</div>
          <h2>
            World-Class <span>Facilities</span>
          </h2>
        </div>
      </div>

      <div className="facilities-grid">
        {facilities.map((f, i) => (
          <div className="facility-card" key={i}>
            <div className="facility-icon">{f.icon}</div>
            <div>
              <div className="facility-name">{f.name}</div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--c-muted)",
                  marginTop: "4px",
                  transition: "color 0.25s",
                }}
              >
                {f.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
