import React, { useState, useEffect } from "react";
import "./App.css";
import { StarIcon, MapPinIcon } from "./Icons";

const API = process.env.REACT_APP_API_URL;

const STATIC_REVIEWS = [
  {
    initials: "AK",
    name: "Arjun Kumar",
    location: "Mumbai",
    rating: 5,
    text: "The most exquisite stay I've ever experienced. Every detail was carefully crafted — from the bedding to the breathtaking view. Truly five-star in every sense.",
  },
  {
    initials: "PS",
    name: "Priya Sharma",
    location: "Bangalore",
    rating: 5,
    text: "The spa alone made the trip worth it. The staff remembered our preferences from day one. This is what luxury hospitality actually feels like.",
  },
  {
    initials: "RV",
    name: "Rahul Verma",
    location: "Chennai",
    rating: 5,
    text: "Celebrated our anniversary here. The rooftop dinner at sunset was unforgettable. Impeccable service, stunning rooms, and food that rivalled the finest restaurants.",
  },
];

export default function Testimonials() {
  const [reviews, setReviews] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/reviews`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setReviews(data);
      })
      .catch(() => {});
  }, []);

  const displayReviews = (
    reviews.length > 0
      ? reviews.map((r) => ({
          initials: r.guest_name
            ?.split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
          name: r.guest_name,
          location: "India",
          rating: r.rating,
          text: r.review_text,
          room_type: r.room_type,
          isReal: true,
        }))
      : STATIC_REVIEWS
  ).slice(0, 5); // max 5 reviews

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  const totalReviews =
    reviews.length > 0 ? reviews.length : STATIC_REVIEWS.length;

  return (
    <div className="section">
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div className="section-eyebrow">
          <span>Guest Reviews</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Words from <em>Our Guests</em>
          </h2>
          {/* Rating Summary */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--navy)",
              padding: "12px 20px",
              borderRadius: 12,
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1,
                }}
              >
                {avgRating}
              </div>
              <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    style={{ color: "#C9A84C", fontSize: "0.75rem" }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div
              style={{
                width: 1,
                height: 36,
                background: "rgba(255,255,255,0.12)",
              }}
            />
            <div>
              <div
                style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff" }}
              >
                {totalReviews} Reviews
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 2,
                }}
              >
                Verified Guests
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Grid — max height with scroll on mobile */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {displayReviews.map((t, i) => (
          <div
            key={i}
            style={{
              background: "#fff",
              border: "1px solid var(--gray-200)",
              borderRadius: 16,
              padding: "24px",
              boxShadow: "0 2px 12px rgba(15,25,35,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "default",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow =
                "0 8px 28px rgba(15,25,35,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 12px rgba(15,25,35,0.06)";
            }}
          >
            {/* Gold accent top bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, var(--gold), var(--gold-light))`,
                opacity: t.isReal ? 1 : 0.4,
              }}
            />

            {/* Stars */}
            <div style={{ display: "flex", gap: 3, paddingTop: 4 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  style={{
                    color: s <= t.rating ? "#C9A84C" : "#E9ECEF",
                    fontSize: "0.9rem",
                  }}
                >
                  ★
                </span>
              ))}
            </div>

            {/* Review text — max height with clamp */}
            <div
              style={{
                maxHeight: expanded === i ? "none" : "80px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--gray-600)",
                  lineHeight: 1.75,
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                "{t.text}"
              </p>
              {/* Fade out if text is long */}
              {t.text.length > 120 && expanded !== i && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 32,
                    background: "linear-gradient(transparent, #fff)",
                  }}
                />
              )}
            </div>

            {/* Read more / less */}
            {t.text.length > 120 && (
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--gold-dark)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  textAlign: "left",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.5px",
                }}
              >
                {expanded === i ? "Show less ↑" : "Read more ↓"}
              </button>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: "var(--gray-100)" }} />

            {/* Author */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--navy)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--gold-light)",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-display)",
                  flexShrink: 0,
                }}
              >
                {t.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--navy)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--gray-400)",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <MapPinIcon size={10} color="var(--gray-400)" />
                    {t.location}
                  </span>
                  {t.room_type && (
                    <span
                      style={{
                        background: "var(--gray-100)",
                        padding: "1px 7px",
                        borderRadius: 3,
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        color: "var(--navy)",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      {t.room_type}
                    </span>
                  )}
                </div>
              </div>
              {t.isReal && (
                <div
                  style={{
                    flexShrink: 0,
                    fontSize: "0.6rem",
                    color: "#2D9A6E",
                    fontWeight: 700,
                    background: "#E8F8F0",
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: "1px solid #BBF0D6",
                    letterSpacing: "0.3px",
                  }}
                >
                  ✓ Verified
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show count if more than 5 */}
      {reviews.length > 5 && (
        <div
          style={{
            textAlign: "center",
            marginTop: 28,
            fontSize: "0.82rem",
            color: "var(--gray-400)",
          }}
        >
          Showing 5 most recent reviews · {reviews.length} total
        </div>
      )}
    </div>
  );
}
