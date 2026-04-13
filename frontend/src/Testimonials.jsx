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

  useEffect(() => {
    fetch(`${API}/api/reviews`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setReviews(data);
      })
      .catch(() => {});
  }, []);

  const displayReviews =
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
      : STATIC_REVIEWS;

  return (
    <div className="section">
      <div className="section-eyebrow">
        <span>Guest Reviews</span>
      </div>
      <h2 className="section-title">
        Words from <em>Our Guests</em>
      </h2>

      {reviews.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", gap: 3 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} style={{ color: "#C9A84C", fontSize: "1.1rem" }}>
                ★
              </span>
            ))}
          </div>
          <span
            style={{
              fontSize: "0.85rem",
              color: "var(--gray-600)",
              fontWeight: 500,
            }}
          >
            {(
              reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            ).toFixed(1)}{" "}
            · {reviews.length} verified review{reviews.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="testimonials-grid">
        {displayReviews.map((t, i) => (
          <div className="testimonial-card" key={i}>
            <div className="testimonial-quote">"</div>
            <div className="testimonial-stars">
              {Array(t.rating)
                .fill(0)
                .map((_, j) => (
                  <StarIcon key={j} size={14} filled color="var(--gold)" />
                ))}
            </div>
            <p className="testimonial-text">{t.text}</p>
            <div className="testimonial-author">
              <div className="author-avatar">{t.initials}</div>
              <div>
                <div className="author-name">{t.name}</div>
                <div className="author-location">
                  <MapPinIcon size={11} color="var(--gray-400)" />
                  {t.location}
                  {t.room_type && (
                    <span
                      style={{
                        marginLeft: 6,
                        background: "var(--gray-100)",
                        padding: "1px 6px",
                        borderRadius: 3,
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        color: "var(--navy)",
                      }}
                    >
                      {t.room_type}
                    </span>
                  )}
                </div>
              </div>
              {t.isReal && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "0.65rem",
                    color: "#2D9A6E",
                    fontWeight: 700,
                    background: "#E8F8F0",
                    padding: "2px 8px",
                    borderRadius: 3,
                  }}
                >
                  ✓ Verified
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
