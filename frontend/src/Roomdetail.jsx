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
    <div
      style={{
        minHeight: "100vh",
        background: "var(--c-bg)",
        fontFamily: "var(--font-body)",
      }}
    >
      <style>{`
        .rd-layout {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 2rem;
          align-items: start;
        }
        .rd-sticky { position: sticky; top: 80px; }
        .rd-main-img { height: 460px; }
        .rd-policies-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 16px;
        }
        .rd-nav { padding: 0 2rem; }
        .rd-book-btn {
          width: 100%;
          padding: 15px;
          background: #1a1a2e;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: background 0.2s, transform 0.15s;
          font-family: var(--font-body);
        }
        .rd-book-btn:hover { background: #2d2d4e; transform: translateY(-1px); }
        .rd-book-btn:active { transform: translateY(0); }
        .rd-price-row:not(:last-child) { border-bottom: 1px solid var(--c-border); }
        @media (max-width: 768px) {
          .rd-layout { grid-template-columns: 1fr; }
          .rd-sticky { position: static; order: -1; }
          .rd-main-img { height: 260px; }
          .rd-policies-grid { grid-template-columns: 1fr; }
          .rd-nav { padding: 0 1rem; }
          .rd-content { padding: 1rem !important; }
        }
        @media (max-width: 480px) {
          .rd-main-img { height: 210px; }
        }
      `}</style>

      {/* ── TOP NAV ── */}
      <div
        className="rd-nav"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#fff",
          borderBottom: "1px solid var(--c-border)",
          height: "64px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "1.5px solid var(--c-border)",
            borderRadius: "8px",
            padding: "8px 14px",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontSize: "0.85rem",
            color: "var(--c-dark)",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          <IconArrowLeft /> Back to Rooms
        </button>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1rem",
            color: "var(--c-dark)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {room.room_type} — Room {room.room_number || room.room_id}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div
        className="rd-content"
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem" }}
      >
        <div className="rd-layout">
          {/* ── LEFT: IMAGES + INFO ── */}
          <div>
            {/* Main image */}
            <div
              className="rd-main-img"
              style={{
                borderRadius: "14px",
                overflow: "hidden",
                marginBottom: "10px",
                position: "relative",
              }}
            >
              <img
                src={images[activeImg]}
                alt={room.room_type}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "14px",
                  left: "14px",
                  background: "var(--c-primary)",
                  color: "#fff",
                  padding: "4px 14px",
                  borderRadius: "20px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                }}
              >
                {room.room_type}
              </div>
            </div>

            {/* Thumbnails */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                overflowX: "auto",
                paddingBottom: "4px",
              }}
            >
              {images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setActiveImg(i)}
                  style={{
                    width: "78px",
                    height: "58px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    cursor: "pointer",
                    flexShrink: 0,
                    border:
                      activeImg === i
                        ? "2.5px solid var(--c-primary)"
                        : "2px solid transparent",
                    opacity: activeImg === i ? 1 : 0.6,
                    transition: "all 0.2s",
                  }}
                >
                  <img
                    src={img}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Room title + desc */}
            <div style={{ marginTop: "2rem" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  marginBottom: "8px",
                  color: "var(--c-dark)",
                }}
              >
                Room {room.room_number || room.room_id} — {room.room_type}
              </h2>
              <p
                style={{
                  color: "var(--c-muted)",
                  lineHeight: 1.75,
                  marginBottom: "1.75rem",
                  fontSize: "0.92rem",
                }}
              >
                {room.description ||
                  "A beautifully furnished room combining modern aesthetics with premium comfort. Every detail has been carefully curated to ensure an unforgettable stay."}
              </p>

              {/* Amenities */}
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "1rem",
                  marginBottom: "14px",
                  color: "var(--c-dark)",
                }}
              >
                Room Amenities
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {extra.amenities.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#F3F4FF",
                      color: "var(--c-primary)",
                      padding: "7px 14px",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      border: "1px solid #E0E1FF",
                    }}
                  >
                    <span style={{ color: "var(--c-primary)" }}>
                      <IconCheck />
                    </span>
                    {a}
                  </div>
                ))}
              </div>

              {/* Policies */}
              <div
                style={{
                  marginTop: "2rem",
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid var(--c-border)",
                  padding: "1.25rem",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1rem",
                    marginBottom: "14px",
                    color: "var(--c-dark)",
                  }}
                >
                  Hotel Policies
                </h3>
                <div className="rd-policies-grid">
                  {policies.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        fontSize: "0.83rem",
                        color: "var(--c-muted)",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--c-primary)",
                          marginTop: "1px",
                          flexShrink: 0,
                        }}
                      >
                        {p.icon}
                      </span>
                      {p.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: BOOKING CARD ── */}
          <div className="rd-sticky">
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                border: "1px solid var(--c-border)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              {/* Price block — dark background so text is always visible */}
              <div
                style={{
                  background: "#1a1a2e",
                  padding: "1.5rem 1.5rem 1.25rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                  }}
                >
                  Starting from
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "2.4rem",
                      fontWeight: 800,
                      color: "#fff",
                      lineHeight: 1,
                    }}
                  >
                    ₹{Number(room.price_per_night).toLocaleString()}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "rgba(255,255,255,0.5)",
                      fontWeight: 400,
                    }}
                  >
                    /night
                  </span>
                </div>
                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "rgba(255,255,255,0.55)",
                    fontSize: "0.78rem",
                  }}
                >
                  <IconUsers />
                  Up to {room.capacity || 2} guests
                </div>
              </div>

              {/* Quick Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  borderBottom: "1px solid var(--c-border)",
                }}
              >
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
                    style={{
                      padding: "14px 10px",
                      textAlign: "center",
                      borderRight: i < 2 ? "1px solid var(--c-border)" : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        color: "var(--c-primary)",
                        marginBottom: "4px",
                      }}
                    >
                      {s.icon}
                    </div>
                    <div
                      style={{
                        fontSize: "0.67rem",
                        color: "var(--c-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "var(--c-dark)",
                        marginTop: "2px",
                      }}
                    >
                      {s.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Book button */}
              <div style={{ padding: "1.25rem 1.25rem 0.75rem" }}>
                <button
                  className="rd-book-btn"
                  onClick={() => {
                    if (!user) {
                      onAuthPrompt();
                      return;
                    }
                    onBook(room);
                  }}
                >
                  Book Now
                </button>
                <p
                  style={{
                    textAlign: "center",
                    fontSize: "0.73rem",
                    color: "var(--c-muted)",
                    marginTop: "8px",
                  }}
                >
                  Free cancellation · No hidden charges
                </p>
              </div>

              {/* Price Estimate */}
              <div style={{ padding: "0 1.25rem 1.25rem" }}>
                <div
                  style={{
                    background: "#F8F9FF",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "1px solid var(--c-border)",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--c-border)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "var(--c-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                      background: "#F0F1FA",
                    }}
                  >
                    Price Estimate
                  </div>
                  {[1, 2, 3, 5, 7].map((n) => (
                    <div
                      key={n}
                      className="rd-price-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "9px 14px",
                        fontSize: "0.82rem",
                      }}
                    >
                      <span style={{ color: "var(--c-muted)" }}>
                        {n} night{n > 1 ? "s" : ""}
                      </span>
                      <span style={{ fontWeight: 700, color: "var(--c-dark)" }}>
                        ₹{(room.price_per_night * n).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "20px",
                marginTop: "14px",
              }}
            >
              {[
                { icon: <IconShield />, label: "Secure" },
                { icon: <IconBadge />, label: "Verified" },
                { icon: <IconTag />, label: "Best Price" },
              ].map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "0.73rem",
                    color: "var(--c-muted)",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ color: "var(--c-primary)" }}>{b.icon}</span>
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
