import React from "react";
import "./App.css";
import { MapPinIcon, PhoneIcon, MailIcon } from "./Icons";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="footer-logo" style={{ alignItems: "center" }}>
            <img
              src="/logo.png"
              alt="VV Grand Park Residency"
              style={{
                height: "48px",
                width: "48px",
                objectFit: "contain",
                filter: "brightness(1.1) sepia(0.3)",
                mixBlendMode: "screen",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                lineHeight: 1.1,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "2px",
                }}
              >
                VV GRAND PARK
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "0.55rem",
                  fontWeight: 400,
                  color: "var(--gold)",
                  letterSpacing: "3px",
                }}
              >
                RESIDENCY
              </span>
            </div>
          </div>
          <p className="footer-tagline">
            VV Grand Park Residency — where every stay becomes a story.
            Experience true luxury, curated for the discerning traveller.
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            {["FB", "IG", "TW"].map((s) => (
              <div
                key={s}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  transition: "all 0.22s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--gold)";
                  e.currentTarget.style.color = "var(--gold)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                }}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="footer-col">
          <h4>Navigate</h4>
          <ul>
            <li>
              <span>Rooms & Suites</span>
            </li>
            <li>
              <span>Dining</span>
            </li>
            <li>
              <span>Spa & Wellness</span>
            </li>
            <li>
              <span>Events</span>
            </li>
            <li>
              <span>Gallery</span>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Policies</h4>
          <ul>
            <li>
              <span>Privacy Policy</span>
            </li>
            <li>
              <span>Terms of Service</span>
            </li>
            <li>
              <span>Cancellation Policy</span>
            </li>
            <li>
              <span>FAQ</span>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Contact</h4>
          <ul>
            <li>
              <span>
                <MapPinIcon size={13} color="rgba(255,255,255,0.4)" />
                123 Palace Road, Chennai
              </span>
            </li>
            <li>
              <a href="tel:+911234567890">
                <PhoneIcon size={13} color="rgba(255,255,255,0.4)" />
                +91 12345 67890
              </a>
            </li>
            <li>
              <a href="mailto:hello@vvgrandpark.com">
                <MailIcon size={13} color="rgba(255,255,255,0.4)" />
                hello@vvgrandpark.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      <hr className="footer-divider" />

      <div className="footer-bottom">
        <span>© 2026 VV Grand Park Residency. All rights reserved.</span>
        <span>Crafted with care for exceptional guests.</span>
      </div>
    </footer>
  );
}
