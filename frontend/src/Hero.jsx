import React, { useState, useEffect } from "react";
import "./App.css";
import { motion } from "framer-motion";
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

const phrases = ["Comfort", "Elegance", "Serenity", "Indulgence", "Perfection"];

const stats = [
  { num: "20+", label: "Luxury Rooms" },
  { num: "4.9", label: "Guest Rating" },
  { num: "24/7", label: "Guest Assistance" },
  { num: "100 %", label: "AC Rooms " },
];

const navLinks = [
  { label: "Home", id: "home", href: "/#home" },
  { label: "Rooms", id: "rooms", href: "/#rooms" },
  { label: "Facilities", id: "facilities", href: "/#facilities" },
  { label: "Gallery", id: "gallery", href: "/#gallery" },
  {
    label: "Nearby Attractions",
    id: "nearby-attractions",
    href: "/#nearby-attractions",
  },
  { label: "Contact", id: "contact", href: "/#contact" },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.6, delay, ease: "easeOut" },
});

export default function Hero({ user, onAuthClick, onLogout, onMyBookings }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIndex((i) => (i + 1) % phrases.length);
        setVisible(true);
      }, 400);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const handleSectionLink = (event, id) => {
    if (window.location.pathname !== "/") return;

    event.preventDefault();
    scrollTo(id);
    window.history.pushState(null, "", `/#${id}`);
  };

  return (
    <>
      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 3%",
          height: 68,
          background: scrolled ? "rgba(15,25,35,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.3)" : "none",
          transition: "all 0.3s ease",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        {/* Logo — flex-shrink: 0 so it never squishes */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <img
            src="/logo.png"
            alt="VV Grand Park"
            style={{ height: 38, width: 38, objectFit: "contain" }}
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
                fontSize: "0.88rem",
                fontWeight: 700,
                letterSpacing: 2,
                color: "#fff",
                whiteSpace: "nowrap",
              }}
            >
              VV GRAND PARK
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.52rem",
                letterSpacing: 3,
                color: "var(--gold-light)",
                whiteSpace: "nowrap",
              }}
            >
              RESIDENCY
            </span>
          </div>
        </div>

        {/* Desktop Links — centered, flex-shrink allowed */}
        <div
          className="hero-nav-links"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flex: "1 1 auto",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(event) => handleSectionLink(event, link.id)}
              style={{
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                padding: "4px 0",
                textDecoration: "none",
                transition: "color 0.3s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--gold-light)")}
              onMouseLeave={(e) =>
                (e.target.style.color = "rgba(255,255,255,0.75)")
              }
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Actions — flex-shrink: 0 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {user ? (
            <>
              <div
                className="hero-nav-actions"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "5px 10px",
                  fontSize: "0.78rem",
                  color: "#fff",
                  whiteSpace: "nowrap",
                }}
              >
                <UserIcon size={13} color="rgba(255,255,255,0.7)" />
                {user.name.split(" ")[0]}
              </div>
              <button
                className="hero-nav-actions"
                onClick={onMyBookings}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  borderRadius: 6,
                  padding: "6px 13px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background:
                    user.role === "admin"
                      ? "var(--gold)"
                      : "rgba(255,255,255,0.05)",
                  color: user.role === "admin" ? "var(--navy)" : "#fff",
                  border:
                    user.role === "admin"
                      ? "none"
                      : "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {user.role === "admin" ? (
                  <SettingsIcon size={13} />
                ) : (
                  <BookingIcon size={13} />
                )}
                {user.role === "admin" ? "Admin Panel" : "My Bookings"}
              </button>
              <button
                className="hero-nav-actions"
                onClick={onLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  padding: "6px 10px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <LogOutIcon size={13} />
              </button>
            </>
          ) : (
            <button
              className="hero-nav-actions"
              onClick={onAuthClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 6,
                padding: "7px 18px",
                fontSize: "0.78rem",
                fontWeight: 500,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Sign In <ArrowRightIcon size={13} />
            </button>
          )}

          {/* Hamburger */}
          <button
            className="hero-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: 6,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {menuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU ── */}
      <div
        style={{
          position: "fixed",
          top: 68,
          left: 0,
          right: 0,
          zIndex: 40,
          background: "var(--navy)",
          maxHeight: menuOpen ? 500 : 0,
          overflow: "hidden",
          opacity: menuOpen ? 1 : 0,
          transition: "all 0.3s ease",
          borderTop: menuOpen ? "1px solid rgba(255,255,255,0.1)" : "none",
          padding: menuOpen ? "20px 6%" : "0 6%",
        }}
      >
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-display)",
            fontSize: "0.75rem",
            letterSpacing: 1,
            color: "var(--gold-light)",
            marginBottom: 12,
          }}
        >
          VV GRAND PARK RESIDENCY
        </span>
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={(event) => handleSectionLink(event, link.id)}
            style={{
              display: "block",
              padding: "12px 0",
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              textDecoration: "none",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {link.label}
          </a>
        ))}
        {user ? (
          <>
            <span
              onClick={() => {
                onMyBookings();
                setMenuOpen(false);
              }}
              style={{
                display: "block",
                padding: "12px 0",
                fontSize: "0.9rem",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {user.role === "admin" ? "Admin Panel" : "My Bookings"}
            </span>
            <span
              onClick={() => {
                onLogout();
                setMenuOpen(false);
              }}
              style={{
                display: "block",
                padding: "12px 0",
                fontSize: "0.9rem",
                color: "#fca5a5",
                cursor: "pointer",
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
            style={{
              display: "block",
              padding: "12px 0",
              fontSize: "0.9rem",
              color: "var(--gold-light)",
              cursor: "pointer",
            }}
          >
            Sign In
          </span>
        )}
      </div>

      {/* ── HERO ── */}
      <div
        id="home"
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          overflowX: "hidden",
          backgroundImage: "url('/hotel-hero.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          /* Top padding clears navbar, bottom padding balances */
          paddingTop: "clamp(100px, 14vw, 160px)",
          paddingBottom: "clamp(48px, 7vw, 96px)",
          boxSizing: "border-box",
        }}
      >
        {/* Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(15,25,35,0.45) 0%, rgba(15,25,35,0.1) 40%, rgba(15,25,35,0.85) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "92%",
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          {/* Badge */}
          <motion.div
            {...fadeUp(0)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(0,0,0,0.3)",
              padding: "7px 14px",
              marginBottom: 18,
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 1,
                width: 30,
                background: "var(--gold)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: 2,
                color: "var(--gold-light)",
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              VV Grand Park Residency — Premium Hospitality
            </span>
          </motion.div>

          {/* Heading — tighter clamp so it doesn't overflow at 100% */}
          <motion.h1
            {...fadeUp(0.15)}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 4.5vw, 4.5rem)",
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: "-0.5px",
              color: "#fff",
              marginBottom: 18,
              maxWidth: 600,
            }}
          >
            Where Luxury
            <br />
            Meets
            <br />
            <em
              style={{
                fontStyle: "italic",
                color: "var(--gold-light)",
                display: "inline-block",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(10px)",
                transition: "opacity 400ms ease, transform 400ms ease",
              }}
            >
              {phrases[phraseIndex]}
            </em>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            {...fadeUp(0.3)}
            style={{
              fontSize: "clamp(0.82rem, 1.2vw, 1rem)",
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.65)",
              maxWidth: 440,
              marginBottom: 28,
            }}
          >
            Experience world-class hospitality at VV Grand Park Residency —
            breathtaking views, curated amenities, and moments you'll carry
            forever.
          </motion.p>

          {/* Buttons */}
          <motion.div
            {...fadeUp(0.4)}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 36,
            }}
          >
            <button className="btn btn-gold" onClick={() => scrollTo("rooms")}>
              Explore Rooms <ArrowRightIcon size={15} />
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => scrollTo("calendar")}
            >
              <CalendarIcon size={15} /> Check Availability
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            {...fadeUp(0.5)}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "14px 36px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: 20,
            }}
          >
            {stats.map((s, i) => (
              <div key={i}>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(1.2rem, 2.5vw, 1.7rem)",
                    fontWeight: 600,
                    color: "#fff",
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  {s.num}
                </div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── RESPONSIVE STYLES ── */}
      <style>{`
        .hero-nav-links { display: flex !important; }
        .hero-nav-actions { display: flex !important; }
        .hero-hamburger { display: none !important; }

        /* Switch to hamburger early enough for the expanded nav menu */
        @media (max-width: 1080px) {
          .hero-nav-links { display: none !important; }
          .hero-nav-actions { display: none !important; }
          .hero-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}
