import React from "react";
import "./App.css";

export default function Hero() {
  return (
    <div
      className="hero"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1566073771259-6a8506099945')",
      }}
    >
      <div className="navbar">
        <h2>GLAMOUR</h2>

        <div className="nav-links">
          <span>Home</span>
          <span>Rooms</span>
          <span>Facilities</span>
        </div>

        <button className="btn">Booking →</button>
      </div>

      <div className="hero-text">
        <h1>Book Your Comfort Room Today!</h1>
      </div>
    </div>
  );
}