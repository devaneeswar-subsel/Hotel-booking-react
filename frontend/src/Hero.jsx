import React, { useState, useEffect } from "react";
import "./App.css";
import StatItem from "./Components/StatItem";
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
import HeroHeading from "./Components/HeroHeading";
const stats = [
  { target: 250, suffix: "+", label: "Luxury Rooms", decimals: 0 },
  { target: 4.9, suffix: "", label: "Guest Rating", decimals: 1 },
  { target: 25, suffix: "+", label: "Years of Excellence", decimals: 0 },
  { target: 18, suffix: "K+", label: "Happy Guests", decimals: 0 },
];
export default function Hero({ user, onAuthClick, onLogout, onMyBookings }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.6, delay, ease: "easeOut" },
});

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
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[4%] py-5 transition-all duration-300 ${scrolled
            ? "bg-[rgba(15,25,35,0.95)] backdrop-blur-md shadow-lg"
            : "bg-transparent"
          }`}
      >
        {/* Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex cursor-pointer items-center gap-3"
        >
          <img
            src="/logo.png"
            alt="VV Grand Park Residency"
            className="h-11 w-11 object-contain brightness-110 mix-blend-screen"
          />

          <div className="flex flex-col leading-[1.1]">
            <span
              className="
          font-[var(--font-display)]
          text-[1rem]
          font-bold
          tracking-[2px]
          text-white
        "
            >
              VV GRAND PARK
            </span>

            <span
              className="
          font-[var(--font-display)]
          text-[0.6rem]
          font-normal
          tracking-[3px]
          text-[var(--gold-light)]
        "
            >
              RESIDENCY
            </span>
          </div>
        </div>

        {/* Desktop Links with Premium Center-Out Underline Animations */}
        <div className="hidden items-center gap-8 lg:flex">
          <span
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="group relative cursor-pointer py-1 text-[0.85rem] font-medium text-white/75 transition-colors duration-300 hover:text-[var(--gold-light)]"
          >
            Home
            <span className="absolute bottom-0 left-0 h-[2px] w-full origin-center scale-x-0 bg-[var(--gold-light)] transition-transform duration-300 group-hover:scale-x-100" />
          </span>

          <span
            onClick={() => scrollTo("rooms")}
            className="group relative cursor-pointer py-1 text-[0.85rem] font-medium text-white/75 transition-colors duration-300 hover:text-[var(--gold-light)]"
          >
            Rooms
            <span className="absolute bottom-0 left-0 h-[2px] w-full origin-center scale-x-0 bg-[var(--gold-light)] transition-transform duration-300 group-hover:scale-x-100" />
          </span>

          <span
            onClick={() => scrollTo("facilities")}
            className="group relative cursor-pointer py-1 text-[0.85rem] font-medium text-white/75 transition-colors duration-300 hover:text-[var(--gold-light)]"
          >
            Facilities
            <span className="absolute bottom-0 left-0 h-[2px] w-full origin-center scale-x-0 bg-[var(--gold-light)] transition-transform duration-300 group-hover:scale-x-100" />
          </span>

          <span
            onClick={() => scrollTo("gallery")}
            className="group relative cursor-pointer py-1 text-[0.85rem] font-medium text-white/75 transition-colors duration-300 hover:text-[var(--gold-light)]"
          >
            Gallery
            <span className="absolute bottom-0 left-0 h-[2px] w-full origin-center scale-x-0 bg-[var(--gold-light)] transition-transform duration-300 group-hover:scale-x-100" />
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* User Pill */}
              <div
                className="
            hidden
            md:flex
            items-center
            gap-2
            rounded-full
            border
            border-white/10
            bg-white/5
            px-3
            py-2
            text-[0.8rem]
            font-medium
            text-white
          "
              >
                <UserIcon size={14} color="rgba(255,255,255,0.7)" />
                {user.name.split(" ")[0]}
              </div>

              {/* Admin/User Button */}
              {user.role === "admin" ? (
                <button
                  onClick={onMyBookings}
                  className="
              hidden
              md:flex
              items-center
              gap-2
              rounded-md
              bg-[var(--gold)]
              px-[18px]
              py-2
              text-[0.78rem]
              font-semibold
              text-[var(--navy)]
              transition
              hover:brightness-105
            "
                >
                  <SettingsIcon size={14} />
                  Admin Panel
                </button>
              ) : (
                <button
                  onClick={onMyBookings}
                  className="
              hidden
              md:flex
              items-center
              gap-2
              rounded-md
              border
              border-white/15
              bg-white/5
              px-[18px]
              py-2
              text-[0.78rem]
              font-medium
              text-white
              transition
              hover:bg-white/10
            "
                >
                  <BookingIcon size={14} />
                  My Bookings
                </button>
              )}

              {/* Logout */}
              <button
                onClick={onLogout}
                className="
            hidden
            md:flex
            items-center
            justify-center
            rounded-md
            border
            border-white/15
            bg-white/5
            px-[14px]
            py-2
            text-white
            transition
            hover:bg-white/10
          "
              >
                <LogOutIcon size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={onAuthClick}
              className="
          hidden
          md:flex
          items-center
          gap-2
          rounded-md
          border
          border-white/15
          bg-white/5
          px-5
          py-[9px]
          text-[0.8rem]
          font-medium
          text-white
          transition
          hover:bg-white/10
        "
            >
              Sign In
              <ArrowRightIcon size={14} />
            </button>
          )}

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="
        flex
        h-10
        w-10
        items-center
        justify-center
        rounded-md
        border
        border-white/15
        bg-white/5
        text-white
        lg:hidden
      "
          >
            {menuOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </nav>
      {/* MOBILE MENU */}
      <div
        className={`fixed left-0 right-0 top-[72px] z-40 flex flex-col gap-1 overflow-hidden bg-[var(--navy)] px-6 transition-all duration-300 lg:hidden ${menuOpen
            ? "max-h-[500px] border-t border-white/10 py-6 opacity-100"
            : "max-h-0 py-0 opacity-0"
          }`}
      >
        <span
          className="
      mb-1
      font-[var(--font-display)]
      text-[0.85rem]
      tracking-[1px]
      text-[var(--gold-light)]
    "
        >
          VV GRAND PARK RESIDENCY
        </span>

        <span
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setMenuOpen(false);
          }}
          className="
      cursor-pointer
      py-3
      text-[0.9rem]
      text-white/80
      transition
      hover:text-[var(--gold-light)]
    "
        >
          Home
        </span>

        <span
          onClick={() => scrollTo("rooms")}
          className="
      cursor-pointer
      py-3
      text-[0.9rem]
      text-white/80
      transition
      hover:text-[var(--gold-light)]
    "
        >
          Rooms
        </span>

        <span
          onClick={() => scrollTo("facilities")}
          className="
      cursor-pointer
      py-3
      text-[0.9rem]
      text-white/80
      transition
      hover:text-[var(--gold-light)]
    "
        >
          Facilities
        </span>

        <span
          onClick={() => scrollTo("gallery")}
          className="
      cursor-pointer
      py-3
      text-[0.9rem]
      text-white/80
      transition
      hover:text-[var(--gold-light)]
    "
        >
          Gallery
        </span>

        {user ? (
          <>
            <span
              onClick={() => {
                onMyBookings();
                setMenuOpen(false);
              }}
              className="
          cursor-pointer
          py-3
          text-[0.9rem]
          text-white/80
          transition
          hover:text-[var(--gold-light)]
        "
            >
              {user.role === "admin"
                ? "Admin Panel"
                : "My Bookings"}
            </span>

            <span
              onClick={() => {
                onLogout();
                setMenuOpen(false);
              }}
              className="
          cursor-pointer
          py-3
          text-[0.9rem]
          text-red-300
          transition
          hover:text-red-200
        "
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
            className="
        cursor-pointer
        py-3
        text-[0.9rem]
        text-[var(--gold-light)]
        transition
        hover:text-[var(--gold)]
      "
          >
            Sign In
          </span>
        )}
      </div>

      {/* HERO */}
      {/* HERO */}
      <div
        className="relative flex h-screen min-h-[680px] items-end overflow-hidden bg-cover bg-center pb-20"
        style={{
          backgroundImage: "url('/hotel-hero.webp')",
        }}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
        to bottom,
        rgba(15,25,35,0.25) 0%,
        rgba(15,25,35,0.15) 40%,
        rgba(15,25,35,0.75) 100%
      )`,
          }}
        />

        {/* Content */}
        <div className="relative z-[2] mx-auto w-[92%] max-w-[1200px]">
          {/* Eyebrow */}
{/* Badge */}
<motion.div {...fadeUp(0)} className="mb-[18px] inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-2">
  <div className="h-px w-9 bg-[var(--gold)]" />
  <span className="text-[0.68rem] font-medium uppercase tracking-[3px] text-[var(--gold-light)]">
    VV Grand Park Residency — Premium Hospitality
  </span>
</motion.div>

{/* Heading */}
<motion.div {...fadeUp(0.15)}>
  <HeroHeading />
</motion.div>

{/* Subtitle */}
<motion.p
  {...fadeUp(0.3)}
  className="
    mb-[34px]
    max-w-[460px]
    text-[clamp(0.9rem,1.5vw,1.05rem)]
    leading-[1.75]
    text-white/65
  "
>
  Experience world-class hospitality at VV Grand Park Residency —
  breathtaking views, curated amenities, and moments you'll carry
  forever.
</motion.p>

          {/* Actions */}
          <div className="mb-12 flex flex-wrap gap-3">
            <button
              className="btn btn-gold"
              onClick={() => scrollTo("rooms")}
            >
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

          {/* Stats */}
          {/* <div className="flex flex-wrap gap-10 border-t border-white/10 pt-7">
      {[
        { num: "250+", label: "Luxury Rooms" },
        { num: "4.9", label: "Guest Rating" },
        { num: "25+", label: "Years of Excellence" },
        { num: "18K+", label: "Happy Guests" },
      ].map((s, i) => (
        <div key={i}>
          <div className="mb-1 font-[var(--font-display)] text-[1.8rem] font-semibold leading-none text-white">
            {s.num}
          </div>

          <div className="text-[0.68rem] uppercase tracking-[1.5px] text-white/45">
            {s.label}
          </div>
        </div>
      ))}
    </div> */}
          <div className="flex flex-wrap gap-x-10 gap-y-6 sm:gap-10 border-t border-white/10 pt-7">
            {stats.map((s, i) => (
              <StatItem key={i} {...s} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
