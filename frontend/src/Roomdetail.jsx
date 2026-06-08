import React, { useState } from "react";
import "./App.css";

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
  const extra = ROOM_EXTRAS[room.room_type] || ROOM_EXTRAS.Standard;
  const images = room.image_url
    ? [room.image_url, ...extra.images.slice(1)]
    : extra.images;

  const policies = [
    { icon: <IconClock />, text: "Check-in from 2:00 PM" },
    { icon: <IconClock />, text: "Check-out by 11:00 AM" },
    { icon: <IconSmoke />, text: "Non-smoking room" },
    { icon: <IconX />, text: "No pets allowed" },
    { icon: <IconCheck />, text: "Free cancellation within 48 hrs" },
    { icon: <IconCoffee />, text: "Breakfast available (extra charge)" },
  ];

  return (
  <div className="min-h-screen bg-[var(--c-bg)] font-[var(--font-body)]">
    
    {/* TOP NAV */}
    <div className="sticky top-0 z-[100] flex h-16 items-center gap-3 border-b border-[var(--c-border)] bg-white px-8 max-md:px-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--c-border)] px-3.5 py-2 text-sm text-[var(--c-dark)] transition-all hover:bg-gray-50"
      >
        <IconArrowLeft />
        Back to Rooms
      </button>

      <div className="overflow-hidden text-ellipsis whitespace-nowrap font-[var(--font-display)] text-base font-bold text-[var(--c-dark)]">
        {room.room_type} — Room {room.room_number || room.room_id}
      </div>
    </div>

    {/* MAIN CONTENT */}
    <div className="mx-auto max-w-[1100px] p-8 max-md:p-4">
      <div className="grid grid-cols-[1fr_360px] gap-8 items-start max-md:grid-cols-1">

        {/* LEFT SECTION */}
        <div>

          {/* Main Image */}
          <div className="relative mb-2.5 h-[460px] overflow-hidden rounded-[14px] max-md:h-[260px] max-[480px]:h-[210px]">
            <img
              src={images[activeImg]}
              alt={room.room_type}
              className="h-full w-full object-cover"
            />

            <div className="absolute left-3.5 top-3.5 rounded-full bg-[var(--c-primary)] px-3.5 py-1 text-xs font-bold text-white">
              {room.room_type}
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <div
                key={i}
                onClick={() => setActiveImg(i)}
                className={`h-[58px] w-[78px] flex-shrink-0 cursor-pointer overflow-hidden rounded-lg transition-all ${
                  activeImg === i
                    ? "border-[2.5px] border-[var(--c-primary)] opacity-100"
                    : "border-2 border-transparent opacity-60"
                }`}
              >
                <img
                  src={img}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Title & Description */}
          <div className="mt-8">
            <h2 className="mb-2 font-[var(--font-display)] text-2xl font-bold text-[var(--c-dark)]">
              Room {room.room_number || room.room_id} — {room.room_type}
            </h2>

            <p className="mb-7 text-[0.92rem] leading-7 text-[var(--c-muted)]">
              {room.description ||
                "A beautifully furnished room combining modern aesthetics with premium comfort. Every detail has been carefully curated to ensure an unforgettable stay."}
            </p>

            {/* Amenities */}
            <h3 className="mb-3.5 font-[var(--font-display)] text-base font-bold text-[var(--c-dark)]">
              Room Amenities
            </h3>

            <div className="flex flex-wrap gap-2">
              {extra.amenities.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E0E1FF] bg-[#F3F4FF] px-3.5 py-2 text-[0.8rem] font-semibold text-[var(--c-primary)]"
                >
                  <IconCheck />
                  {a}
                </div>
              ))}
            </div>

            {/* Policies */}
            <div className="mt-8 rounded-xl border border-[var(--c-border)] bg-white p-5">
              <h3 className="mb-3.5 font-[var(--font-display)] text-base font-bold text-[var(--c-dark)]">
                Hotel Policies
              </h3>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 max-md:grid-cols-1">
                {policies.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[0.83rem] text-[var(--c-muted)]"
                  >
                    <span className="mt-px flex-shrink-0 text-[var(--c-primary)]">
                      {p.icon}
                    </span>
                    {p.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="sticky top-20 max-md:static max-md:order-first">

          <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]">

            {/* Price Header */}
            <div className="bg-[#1a1a2e] px-6 py-6">
              <div className="mb-1.5 text-[0.72rem] font-semibold uppercase tracking-wider text-white/50">
                Starting from
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="font-[var(--font-display)] text-[2.4rem] font-extrabold leading-none text-white">
                  ₹{Number(room.price_per_night).toLocaleString()}
                </span>

                <span className="text-sm text-white/50">
                  /night
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 text-[0.78rem] text-white/60">
                <IconUsers />
                Up to {room.capacity || 2} guests
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 border-b border-[var(--c-border)]">
              {[
                { icon: <IconBed />, label: "Type", val: room.room_type },
                {
                  icon: <IconUsers />,
                  label: "Guests",
                  val: room.capacity || 2,
                },
                { icon: <IconStar />, label: "Rating", val: "4.9" },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`p-3 text-center ${
                    i < 2 ? "border-r border-[var(--c-border)]" : ""
                  }`}
                >
                  <div className="mb-1 flex justify-center text-[var(--c-primary)]">
                    {s.icon}
                  </div>

                  <div className="text-[0.67rem] uppercase tracking-wide text-[var(--c-muted)]">
                    {s.label}
                  </div>

                  <div className="mt-0.5 text-[0.82rem] font-bold text-[var(--c-dark)]">
                    {s.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Book Button */}
            <div className="px-5 pt-5 pb-3">
              <button
                onClick={() => {
                  if (!user) {
                    onAuthPrompt();
                    return;
                  }
                  onBook(room);
                }}
                className="w-full rounded-xl py-4 text-base font-bold transition-all hover:-translate-y-[1px]"
                style={{
                  backgroundColor: "#0f1923",
                  color: "white",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#c9a84c";
                  e.target.style.color = "black";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#0f1923";
                  e.target.style.color = "white";
                }}
              >
                Book Now
              </button>

              <p className="mt-2 text-center text-xs text-[var(--c-muted)]">
                Free cancellation · No hidden charges
              </p>
            </div>

            {/* Price Estimate */}
            <div className="px-5 pb-5">
              <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[#F8F9FF]">
                <div className="border-b border-[var(--c-border)] bg-[#F0F1FA] px-3.5 py-2.5 text-[0.7rem] font-bold uppercase tracking-wide text-[var(--c-muted)]">
                  Price Estimate
                </div>

                {[1, 2, 3, 5, 7].map((n) => (
                  <div
                    key={n}
                    className="flex items-center justify-between border-b border-[var(--c-border)] px-3.5 py-2.5 text-[0.82rem] last:border-b-0"
                  >
                    <span className="text-[var(--c-muted)]">
                      {n} night{n > 1 ? "s" : ""}
                    </span>

                    <span className="font-bold text-[var(--c-dark)]">
                      ₹{(room.price_per_night * n).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-3.5 flex justify-center gap-5">
            {[
              { icon: <IconShield />, label: "Secure" },
              { icon: <IconBadge />, label: "Verified" },
              { icon: <IconTag />, label: "Best Price" },
            ].map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-1 text-xs font-medium text-[var(--c-muted)]"
              >
                <span className="text-[var(--c-primary)]">{b.icon}</span>
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
