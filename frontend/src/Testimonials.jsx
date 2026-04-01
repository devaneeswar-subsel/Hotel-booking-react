import React from "react";
import "./App.css";
import { StarIcon, MapPinIcon } from "./Icons";

const testimonials = [
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
  {
    initials: "SN",
    name: "Sneha Nair",
    location: "Kochi",
    rating: 5,
    text: "From check-in to checkout, everything was seamless. The Presidential Suite exceeded every expectation. We've stayed at many luxury hotels — this is the finest.",
  },
];

export default function Testimonials() {
  return (
    <div className="section">
      <div className="section-eyebrow">
        <span>Guest Reviews</span>
      </div>
      <h2 className="section-title">
        Words from <em>Our Guests</em>
      </h2>

      <div className="testimonials-grid">
        {testimonials.map((t, i) => (
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
                  {t.location}, India
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
