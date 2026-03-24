import React from "react";
import "./App.css";

const testimonials = [
  {
    initials: "AK",
    name: "Arjun Kumar",
    location: "Mumbai, India",
    rating: 5,
    text: "Absolutely stunning hotel! The rooms were immaculate and the staff went above and beyond. Will definitely be coming back.",
  },
  {
    initials: "PS",
    name: "Priya Sharma",
    location: "Bangalore, India",
    rating: 5,
    text: "The spa experience alone was worth every rupee. Glamour Hotel truly lives up to its name — pure luxury at its finest.",
  },
  {
    initials: "RV",
    name: "Rahul Verma",
    location: "Chennai, India",
    rating: 5,
    text: "From the moment we checked in to checkout, the experience was flawless. The rooftop view at sunset is breathtaking!",
  },
  {
    initials: "SN",
    name: "Sneha Nair",
    location: "Kochi, India",
    rating: 5,
    text: "Best hotel stay I've ever had. The Presidential Suite was beyond our expectations — a dream come true for our anniversary.",
  },
];

export default function Testimonials() {
  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Guest Reviews</div>
          <h2>
            Words from <span>Our Guests</span>
          </h2>
        </div>
      </div>

      <div className="testimonials-grid">
        {testimonials.map((t, i) => (
          <div className="testimonial-card" key={i}>
            <div className="testimonial-stars">{"⭐".repeat(t.rating)}</div>
            <p className="testimonial-text">"{t.text}"</p>
            <div className="testimonial-author">
              <div className="author-avatar">{t.initials}</div>
              <div>
                <div className="author-name">{t.name}</div>
                <div className="author-location">{t.location}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
