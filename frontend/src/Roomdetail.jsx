import React, { useState } from "react";
import "./App.css";

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--c-bg)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* TOP NAV */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#fff",
          borderBottom: "1px solid var(--c-border)",
          padding: "0 2rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "1.5px solid var(--c-border)",
            borderRadius: "8px",
            padding: "8px 16px",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            color: "var(--c-dark)",
            transition: "all 0.2s",
          }}
        >
          ← Back to Rooms
        </button>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1rem",
            color: "var(--c-dark)",
          }}
        >
          {room.room_type} — Room {room.room_number || room.room_id}
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          {/* LEFT — IMAGES */}
          <div>
            {/* Main Image */}
            <div
              style={{
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                height: "460px",
                marginBottom: "12px",
                position: "relative",
              }}
            >
              <img
                src={images[activeImg]}
                alt={room.room_type}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "opacity 0.3s",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  left: "16px",
                  background: "rgba(108,99,255,0.9)",
                  color: "#fff",
                  padding: "4px 14px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  backdropFilter: "blur(4px)",
                }}
              >
                {room.room_type}
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div style={{ display: "flex", gap: "10px" }}>
              {images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setActiveImg(i)}
                  style={{
                    width: "80px",
                    height: "60px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    cursor: "pointer",
                    flexShrink: 0,
                    border:
                      activeImg === i
                        ? "3px solid var(--c-primary)"
                        : "2px solid transparent",
                    transition: "border 0.2s",
                    opacity: activeImg === i ? 1 : 0.7,
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

            {/* Room Info */}
            <div style={{ marginTop: "2rem" }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Room {room.room_number || room.room_id} — {room.room_type}
              </div>
              <p
                style={{
                  color: "var(--c-muted)",
                  lineHeight: 1.7,
                  marginBottom: "1.5rem",
                }}
              >
                {room.description ||
                  "A beautifully furnished room combining modern aesthetics with premium comfort. Every detail has been carefully curated to ensure an unforgettable stay."}
              </p>

              {/* Amenities */}
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "1rem",
                  marginBottom: "12px",
                }}
              >
                Room Amenities
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {extra.amenities.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#F3F4FF",
                      color: "var(--c-primary)",
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    ✓ {a}
                  </div>
                ))}
              </div>

              {/* Policies */}
              <div
                style={{
                  marginTop: "2rem",
                  background: "#fff",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--c-border)",
                  padding: "1.25rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1rem",
                    marginBottom: "12px",
                  }}
                >
                  Hotel Policies
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    fontSize: "0.85rem",
                    color: "var(--c-muted)",
                  }}
                >
                  <div>🕐 Check-in: 2:00 PM</div>
                  <div>🕐 Check-out: 11:00 AM</div>
                  <div>🚭 Non-smoking room</div>
                  <div>🐾 No pets allowed</div>
                  <div>❌ No cancellation fee if cancelled 48hrs prior</div>
                  <div>🍳 Breakfast available at extra cost</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — BOOKING CARD */}
          <div style={{ position: "sticky", top: "80px" }}>
            <div
              style={{
                background: "#fff",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--c-border)",
                boxShadow: "var(--shadow-md)",
                overflow: "hidden",
              }}
            >
              {/* Price Header */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, var(--c-primary) 0%, #43C6AC 100%)",
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "0.8rem",
                    marginBottom: "4px",
                  }}
                >
                  Starting from
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "2.2rem",
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  ₹{Number(room.price_per_night).toLocaleString()}
                  <span
                    style={{ fontSize: "1rem", fontWeight: 400, opacity: 0.8 }}
                  >
                    {" "}
                    /night
                  </span>
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "0.8rem",
                    marginTop: "4px",
                  }}
                >
                  👤 Up to {room.capacity || 2} guests
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
                  { icon: "🛏", label: "Type", val: room.room_type },
                  { icon: "👤", label: "Guests", val: room.capacity || 2 },
                  { icon: "⭐", label: "Rating", val: "4.9" },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "14px",
                      textAlign: "center",
                      borderRight: i < 2 ? "1px solid var(--c-border)" : "none",
                    }}
                  >
                    <div style={{ fontSize: "1.2rem" }}>{s.icon}</div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--c-muted)",
                        marginTop: "2px",
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--c-dark)",
                      }}
                    >
                      {s.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Book Button */}
              <div style={{ padding: "1.25rem" }}>
                <button
                  className="book-btn"
                  style={{
                    width: "100%",
                    fontSize: "1rem",
                    padding: "14px",
                    marginTop: 0,
                  }}
                  onClick={() => {
                    if (!user) {
                      onAuthPrompt();
                      return;
                    }
                    onBook(room);
                  }}
                >
                  Book Now →
                </button>
                <p
                  style={{
                    textAlign: "center",
                    fontSize: "0.75rem",
                    color: "var(--c-muted)",
                    marginTop: "10px",
                  }}
                >
                  Free cancellation · No hidden charges
                </p>
              </div>

              {/* Price Breakdown */}
              <div style={{ padding: "0 1.25rem 1.25rem" }}>
                <div
                  style={{
                    background: "#F9FAFF",
                    borderRadius: "10px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--c-muted)",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Price Estimate
                  </div>
                  {[1, 2, 3, 5, 7].map((n) => (
                    <div
                      key={n}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        padding: "3px 0",
                        color: "var(--c-muted)",
                      }}
                    >
                      <span>
                        {n} night{n > 1 ? "s" : ""}
                      </span>
                      <span style={{ fontWeight: 600, color: "var(--c-dark)" }}>
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
                gap: "16px",
                marginTop: "16px",
              }}
            >
              {["🔒 Secure", "✅ Verified", "🏆 Best Price"].map((b, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--c-muted)",
                    fontWeight: 500,
                  }}
                >
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
