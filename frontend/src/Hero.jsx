import React from "react";
import "./App.css";

export default function Hero({ user, onAuthClick, onLogout }) {
  return (
    <div
      className="hero"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600')",
      }}
    >
      {/* NAVBAR */}
      <div className="navbar">
        <div className="nav-logo">GLAMOUR</div>

        <div className="nav-links">
          <span onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Home
          </span>
          <span
            onClick={() =>
              document
                .getElementById("rooms")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Rooms
          </span>
          <span
            onClick={() =>
              document
                .getElementById("facilities")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Facilities
          </span>
          <span
            onClick={() =>
              document
                .getElementById("gallery")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Gallery
          </span>
        </div>

        <div className="nav-actions">
          {user ? (
            <>
              <div className="nav-user-pill">👤 {user.name.split(" ")[0]}</div>
              <button
                className="btn btn-white"
                style={{ fontSize: "0.85rem", padding: "8px 18px" }}
                onClick={onLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <button className="btn btn-white" onClick={onAuthClick}>
              Login / Register →
            </button>
          )}
        </div>
      </div>

      {/* HERO TEXT */}
      <div className="hero-text">
        <h1>
          Experience True
          <br />
          Luxury & Comfort
        </h1>
        <p>
          Premium rooms, world-class facilities, and unforgettable stays await
          you.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            onClick={() =>
              document
                .getElementById("rooms")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Browse Rooms →
          </button>
          <button
            className="btn"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.35)",
              backdropFilter: "blur(8px)",
            }}
            onClick={() =>
              document
                .getElementById("calendar")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Check Availability
          </button>
        </div>

        <div className="hero-badges">
          <div className="hero-badge">⭐ 4.9 Rating</div>
          <div className="hero-badge">🏆 Award Winning</div>
          <div className="hero-badge">🛎 24/7 Service</div>
        </div>
      </div>
    </div>
  );
}
