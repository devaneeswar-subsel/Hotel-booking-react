import React from "react";
import "./App.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <h3>GLAMOUR</h3>
          <p>
            Where luxury meets comfort. Experience world-class hospitality in
            the heart of the city. Your dream stay awaits.
          </p>
        </div>

        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li>
              <a href="#rooms">Rooms</a>
            </li>
            <li>
              <a href="#facilities">Facilities</a>
            </li>
            <li>
              <a href="#gallery">Gallery</a>
            </li>
            <li>
              <a href="#calendar">Availability</a>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Contact</h4>
          <ul>
            <li>
              <a href="tel:+911234567890">+91 12345 67890</a>
            </li>
            <li>
              <a href="mailto:hello@glamourhotel.com">hello@glamourhotel.com</a>
            </li>
            <li>
              <a href="#">123 Palace Road, Chennai</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        © 2026 Glamour Hotel. All rights reserved.
      </div>
    </footer>
  );
}
