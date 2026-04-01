import React, { useState, useEffect } from "react";
import "./App.css";
import {
  ArrowRightIcon,
  CalendarIcon,
  MenuIcon,
  XIcon,
  UserIcon,
  LogOutIcon,
  SettingsIcon,
  BookingIcon,
} from "./Icons";

export default function Hero({ user, onAuthClick, onLogout, onMyBookings }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <>
      {/* NAVBAR */}
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div
          className="nav-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <img
            src="/logo.png"
            alt="VV Grand Park Residency"
            style={{
              height: "44px",
              width: "44px",
              objectFit: "contain",
              filter: "brightness(1.1)",
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
                fontSize: "0.6rem",
                fontWeight: 400,
                color: "var(--gold-light)",
                letterSpacing: "3px",
              }}
            >
              RESIDENCY
            </span>
          </div>
        </div>

        <div className="nav-links">
          <span onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Home
          </span>
          <span onClick={() => scrollTo("rooms")}>Rooms</span>
          <span onClick={() => scrollTo("facilities")}>Facilities</span>
          <span onClick={() => scrollTo("gallery")}>Gallery</span>
        </div>

        <div className="nav-actions">
          {user ? (
            <>
              <div className="nav-user-pill">
                <UserIcon size={14} color="rgba(255,255,255,0.7)" />
                {user.name.split(" ")[0]}
              </div>
              {user.role === "admin" ? (
                <button
                  className="btn btn-gold"
                  style={{ padding: "8px 18px", fontSize: "0.78rem" }}
                  onClick={onMyBookings}
                >
                  <SettingsIcon size={14} />
                  Admin Panel
                </button>
              ) : (
                <button
                  className="btn btn-ghost"
                  style={{ padding: "8px 18px", fontSize: "0.78rem" }}
                  onClick={onMyBookings}
                >
                  <BookingIcon size={14} />
                  My Bookings
                </button>
              )}
              <button
                className="btn btn-ghost"
                style={{ padding: "8px 14px", fontSize: "0.78rem" }}
                onClick={onLogout}
              >
                <LogOutIcon size={14} />
              </button>
            </>
          ) : (
            <button
              className="btn btn-ghost"
              style={{ padding: "9px 20px", fontSize: "0.8rem" }}
              onClick={onAuthClick}
            >
              Sign In
              <ArrowRightIcon size={14} />
            </button>
          )}

          {/* Hamburger */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div className={`nav-mobile-menu ${menuOpen ? "open" : ""}`}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--gold-light)",
            fontSize: "0.85rem",
            letterSpacing: "1px",
            marginBottom: "4px",
          }}
        >
          VV GRAND PARK RESIDENCY
        </span>
        <span
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setMenuOpen(false);
          }}
        >
          Home
        </span>
        <span onClick={() => scrollTo("rooms")}>Rooms</span>
        <span onClick={() => scrollTo("facilities")}>Facilities</span>
        <span onClick={() => scrollTo("gallery")}>Gallery</span>
        {user ? (
          <>
            <span
              onClick={() => {
                onMyBookings();
                setMenuOpen(false);
              }}
            >
              {user.role === "admin" ? "Admin Panel" : "My Bookings"}
            </span>
            <span
              onClick={() => {
                onLogout();
                setMenuOpen(false);
              }}
            >
              Sign Out
            </span>
          </>
        ) : (
          <span
            onClick={() => {
              onAuthClick();
              setMenuOpen(false);
            }}
          >
            Sign In
          </span>
        )}
      </div>

      {/* HERO */}
      <div
        className="hero"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1800')",
        }}
      >
        <div className="hero-overlay" />

        <div className="hero-content">
          <div className="hero-eyebrow">
            <div className="hero-eyebrow-line" />
            <span>VV Grand Park Residency — Premium Hospitality</span>
          </div>

          <h1>
            Where Luxury
            <br />
            Meets <em>Comfort</em>
          </h1>

          <p className="hero-sub">
            Experience world-class hospitality at VV Grand Park Residency —
            breathtaking views, curated amenities, and moments you'll carry
            forever.
          </p>

          <div className="hero-actions">
            <button className="btn btn-gold" onClick={() => scrollTo("rooms")}>
              Explore Rooms
              <ArrowRightIcon size={16} />
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => scrollTo("calendar")}
            >
              <CalendarIcon size={16} />
              Check Availability
            </button>
          </div>

          <div className="hero-stats">
            {[
              { num: "250+", label: "Luxury Rooms" },
              { num: "4.9", label: "Guest Rating" },
              { num: "25+", label: "Years of Excellence" },
              { num: "18K+", label: "Happy Guests" },
            ].map((s, i) => (
              <div key={i}>
                <div className="hero-stat-number">{s.num}</div>
                <div className="hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
