import React, { useState } from "react";
import { useEffect } from "react";
import "./App.css";
import { motion } from "framer-motion";
// ── SVG Icons ──────────────────────────────────────────────────────────────
const IconBed = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" />
    <path d="M2 9h20v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9z" />
    <path d="M6 9V6" />
    <path d="M18 9V6" />
    <path d="M2 13h20" />
  </svg>
);
const IconUsers = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconStar = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="#F59E0B"
    stroke="#F59E0B"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconCheck = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconArrowLeft = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);
const IconShield = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconBadge = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);
const IconTag = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);
const IconClock = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconSmoke = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M20 15H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z" />
    <path d="M18 15V9" />
  </svg>
);
const IconX = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCoffee = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="1" x2="6" y2="4" />
    <line x1="10" y1="1" x2="10" y2="4" />
    <line x1="14" y1="1" x2="14" y2="4" />
  </svg>
);

// ── Room Data ───────────────────────────────────────────────────────────────
const ROOM_EXTRAS = {
  Standard: {
    amenities: [
      "Free WiFi",
      "Air Conditioning",
      "Flat-screen TV",
      "Room Service",
      "Private Bathroom",
      "Daily Housekeeping",
    ],
    images: [
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=900",
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=900",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900",
    ],
  },
  Deluxe: {
    amenities: [
      "Free WiFi",
      "Air Conditioning",
      "King Bed",
      "Mini Bar",
      "Bathtub & Shower",
      "City View",
      "Room Service",
      "Wardrobe",
    ],
    images: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=900",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=900",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900",
    ],
  },
  Suite: {
    amenities: [
      "Free WiFi",
      "Living Room",
      "King Bed",
      "Jacuzzi",
      "Sea View",
      "Mini Bar",
      "Butler Service",
      "Premium Toiletries",
      "Smart TV",
    ],
    images: [
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=900",
      "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=900",
      "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=900",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=900",
    ],
  },
  Luxury: {
    amenities: [
      "Free WiFi",
      "Private Balcony",
      "King Bed",
      "Whirlpool",
      "Panoramic View",
      "In-room Dining",
      "Butler Service",
      "Premium Bar",
      "Smart Controls",
    ],
    images: [
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=900",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900",
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=900",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900",
    ],
  },
  Presidential: {
    amenities: [
      "Free WiFi",
      "Private Pool",
      "Multiple Bedrooms",
      "Full Kitchen",
      "Private Terrace",
      "24/7 Butler",
      "Limousine Service",
      "Spa Access",
      "Personal Chef",
      "Smart Home",
    ],
    images: [
      "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=900",
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=900",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=900",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=900",
    ],
  },
};

// ── Component ───────────────────────────────────────────────────────────────
export default function RoomDetail({
  room,
  user,
  onBack,
  onBook,
  onAuthPrompt,
}) {
  const [activeImg, setActiveImg] = useState(0);
  const [imgLoading, setImgLoading] = useState(false);
  const extra = ROOM_EXTRAS[room.room_type] || ROOM_EXTRAS.Standard;
  const images = room.image_url
    ? [room.image_url, ...extra.images.slice(1)]
    : extra.images;
 useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const policies = [
    { icon: <IconClock />, text: "Check-in from 2:00 PM" },
    { icon: <IconClock />, text: "Check-out by 11:00 AM" },
    { icon: <IconSmoke />, text: "Non-smoking room" },
    { icon: <IconX />, text: "No pets allowed" },
    { icon: <IconCheck />, text: "Free cancellation within 48 hrs" },
    { icon: <IconCoffee />, text: "Breakfast available (extra charge)" },
  ];

  const handleThumbClick = (i) => {
    if (i === activeImg) return;
    setImgLoading(true);
    setActiveImg(i);
  };
  return (
  <div className="min-h-screen bg-[var(--c-bg)] font-[var(--font-body)]">

    {/* TOP NAV */}
    <div className="sticky top-0 z-[100] flex h-16 items-center justify-between gap-3 border-b border-[var(--gold)]/15 bg-[var(--navy)] px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onBack}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-[var(--gold)] bg-[var(--gold)]/10 px-3.5 py-2 text-sm font-medium text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--navy)]"
        >
          <IconArrowLeft />
          <span className="hidden sm:inline">Back to Rooms</span>
        </button>

        <div className="h-4 w-px flex-shrink-0 bg-[var(--gold)]/20" />

        <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-[var(--font-display)] text-base font-bold text-white">
          {room.room_type}
          <span className="ml-1.5 text-[0.85rem] font-normal text-white/40">
            — Room {room.room_number || room.room_id}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[var(--gold)] bg-[var(--gold)]/8 px-3 py-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
        <span className="text-[0.68rem] font-semibold uppercase tracking-[1.5px] text-[var(--gold)]">
          Premium Room
        </span>
      </div>
    </div>

    {/* MAIN CONTENT */}
    <div className="mx-auto max-w-[1280px] px-4 py-6 md:p-8">
      <div className="grid grid-cols-1 gap-8 items-start lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* LEFT SECTION */}
        <div className="w-full min-w-0">

          {/* Main Image */}
          <div className="relative mb-2.5 h-[240px] overflow-hidden rounded-[14px] sm:h-[320px] md:h-[380px] lg:h-[420px]">
            <img
              src={images[activeImg]}
              alt={room.room_type}
              onLoad={() => setImgLoading(false)}
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                imgLoading ? "opacity-0" : "opacity-100"
              }`}
            />
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--navy)]/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gold)]/30 border-t-[var(--gold)]" />
                  <span className="text-[0.7rem] uppercase tracking-[2px] text-[var(--gold)]/70">Loading</span>
                </div>
              </div>
            )}
            <div className="absolute left-3.5 top-3.5 rounded-full border border-[var(--gold)] bg-[var(--navy)] px-3.5 py-1 text-xs font-bold text-[var(--gold)]">
              {room.room_type}
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <div
                key={i}
                onClick={() => handleThumbClick(i)}
                className={`relative h-[58px] w-[78px] flex-shrink-0 cursor-pointer overflow-hidden rounded-lg transition-all ${
                  activeImg === i
                    ? "border-[2.5px] border-[var(--gold)] opacity-100"
                    : "border-2 border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
                {activeImg === i && <div className="absolute inset-0 bg-[var(--gold)]/10" />}
              </div>
            ))}
          </div>

          {/* Title & Description */}
          <div className="mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="mb-1 flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-[var(--gold)]" />
                <h2 className="font-[var(--font-display)] text-2xl font-bold text-[var(--c-dark)]">
                  Room {room.room_number || room.room_id} — {room.room_type}
                </h2>
              </div>
              <p className="mb-7 mt-3 text-[0.92rem] leading-7 text-[var(--c-muted)]">
                {room.description || "A beautifully furnished room combining modern aesthetics with premium comfort. Every detail has been carefully curated to ensure an unforgettable stay."}
              </p>
            </motion.div>

            {/* Amenities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            >
              <div className="mb-3.5 flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-[var(--gold)]" />
                <h3 className="font-[var(--font-display)] text-base font-bold text-[var(--c-dark)]">
                  Room Amenities
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {extra.amenities.map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" }}
                    whileHover={{ scale: 1.05 }}
                    className="flex cursor-default items-center gap-1.5 rounded-xl border border-[var(--gold)]/25 bg-[var(--navy)] px-3.5 py-2 text-[0.8rem] font-semibold text-[var(--gold)]"
                  >
                    <IconCheck />
                    {a}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Policies */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mt-8 rounded-2xl border border-[var(--gold)]/20 bg-[var(--navy)] p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-[var(--gold)]" />
                <h3 className="font-[var(--font-display)] text-base font-bold text-white">
                  Hotel Policies
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {policies.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.4, delay: i * 0.07, ease: "easeOut" }}
                    whileHover={{ scale: 1.02 }}
                    className="flex cursor-default items-center gap-3 rounded-xl border border-[var(--gold)] bg-white/5 px-3.5 py-2.5 transition-colors hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/10"
                  >
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--gold)]/15 text-[var(--gold)]">
                      {p.icon}
                    </span>
                    <span className="text-[0.8rem] leading-snug text-white/70">
                      {p.text}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="order-first w-full self-start xl:sticky xl:top-20 xl:order-last">
          <div className="overflow-hidden rounded-2xl border border-[var(--gold)]/20 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">

            {/* Price Header */}
            <div className="relative overflow-hidden bg-[var(--navy)] px-6 py-6">
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--gold)]/10 blur-2xl" />
              <div className="mb-1.5 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                <span className="text-[0.68rem] font-semibold uppercase tracking-[2px] text-white/40">
                  Starting from
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-[var(--font-display)] text-[2.4rem] font-extrabold leading-none text-white">
                  ₹{Number(room.price_per_night).toLocaleString()}
                </span>
                <span className="text-sm text-white/40">/night</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[0.78rem] text-white/50">
                  <IconUsers />
                  Up to {room.capacity || 2} guests
                </div>
                <div className="rounded-full border border-[var(--gold)] bg-[var(--gold)]/10 px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--gold)]">
                  Best Price
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/30 to-transparent" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 border-b border-[var(--c-border)] bg-white">
              {[
                { icon: <IconBed />, label: "Type", val: room.room_type },
                { icon: <IconUsers />, label: "Guests", val: room.capacity || 2 },
                { icon: <IconStar />, label: "Rating", val: "4.9" },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`flex min-w-0 flex-col items-center gap-1.5 px-2 py-4 ${
                    i < 2 ? "border-r border-[var(--c-border)]" : ""
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--gold)]/10 text-[var(--gold)]">
                    {s.icon}
                  </div>
                  <div className="w-full truncate text-center text-[0.82rem] font-bold text-[var(--navy)]">
                    {s.val}
                  </div>
                  <div className="text-[0.63rem] uppercase tracking-[1.5px] text-[var(--c-muted)]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Book Button */}
            <div className="bg-white px-5 pb-3 pt-5">
              <button
                onClick={() => { if (!user) { onAuthPrompt(); return; } onBook(room); }}
                className="w-full rounded-xl py-4 text-base font-bold transition-all hover:-translate-y-[1px]"
                style={{ backgroundColor: "#0f1923", color: "white" }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = "#c9a84c"; e.target.style.color = "black"; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = "#0f1923"; e.target.style.color = "white"; }}
              >
                Book Now
              </button>
              <p className="mt-2 text-center text-xs text-[var(--c-muted)]">
                Free cancellation · No hidden charges
              </p>
            </div>

            {/* Price Estimate */}
            <div className="bg-white px-5 pb-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="overflow-hidden rounded-2xl border border-[var(--gold)]/20"
              >
                <div className="flex items-center justify-between bg-[var(--gold)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-1 rounded-full bg-[var(--navy)]" />
                    <span className="text-[0.7rem] font-bold uppercase tracking-[2px] text-[var(--navy)]">
                      Price Estimate
                    </span>
                  </div>
                  <span className="text-[0.68rem] font-medium text-[var(--navy)]/60">per room</span>
                </div>
                <div className="divide-y divide-[var(--gold)]/10 bg-[var(--navy)]">
                  {[1, 2, 3, 5, 7].map((n, i) => (
                    <motion.div
                      key={n}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
                      whileHover={{ backgroundColor: "rgba(201,168,76,0.08)" }}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--gold)]/15 text-[0.68rem] font-bold text-[var(--gold)]">
                          {n}
                        </div>
                        <span className="text-[0.82rem] text-white/50">night{n > 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-[0.88rem] font-bold text-[var(--gold)]">
                        ₹{(room.price_per_night * n).toLocaleString()}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-3.5 flex justify-center gap-5">
            {[
              { icon: <IconShield />, label: "Secure" },
              { icon: <IconBadge />, label: "Verified" },
              { icon: <IconTag />, label: "Best Price" },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-1 text-xs font-medium text-[var(--c-muted)]">
                <span className="text-[var(--gold)]">{b.icon}</span>
                {b.label}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  </div>
);
}
