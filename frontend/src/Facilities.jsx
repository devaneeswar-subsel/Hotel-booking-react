import React from "react";
import "./App.css";
import {
  WifiIcon,
  SwimmingIcon,
  DumbbellIcon,
  CoffeeIcon,
  CarIcon,
  SparklesIcon,
  PhoneIcon,
  AwardIcon,
} from "./Icons";

const facilities = [
  { icon: SwimmingIcon, name: "Infinity Pool", desc: "Heated year-round" },
  { icon: SparklesIcon, name: "Spa & Wellness", desc: "Full-body therapy" },
  { icon: DumbbellIcon, name: "Fitness Center", desc: "Open 24 hours" },
  { icon: CoffeeIcon, name: "Fine Dining", desc: "Multi-cuisine" },
  { icon: CarIcon, name: "Valet Parking", desc: "Secure & free" },
  { icon: WifiIcon, name: "High-Speed WiFi", desc: "Fibre broadband" },
  { icon: PhoneIcon, name: "24/7 Concierge", desc: "Always available" },
  { icon: AwardIcon, name: "Airport Transfer", desc: "Private luxury car" },
];

export default function Facilities() {
  return (
    <div className="section" id="facilities">
      <div className="section-eyebrow">
        <span>Amenities</span>
      </div>
      <h2 className="section-title">
        World-Class <em>Facilities</em>
      </h2>

      <div className="facilities-grid">
        {facilities.map(({ icon: FacilityIcon, name, desc }, i) => (
          <div className="facility-card" key={i}>
            <div className="facility-icon">
              <FacilityIcon size={20} />
            </div>
            <div className="facility-name">{name}</div>
            <div className="facility-desc">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
