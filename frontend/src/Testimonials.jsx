import React, { useState, useEffect } from "react";
import { MapPinIcon } from "./Icons";
import { motion } from "framer-motion";
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
  const [expandedCards, setExpandedCards] = useState({});
  const [overflowingCards, setOverflowingCards] = useState({});
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.6, delay, ease: "easeOut" },
})
  const toggleExpand = (index) => {
    setExpandedCards((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  useEffect(() => {
    fetch(`${API}/api/reviews`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setReviews(data);
        }
      })
      .catch(() => { });
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
  ).slice(0, 3); // only 3 most recent

  useEffect(() => {
    const checkOverflow = () => {
      const newOverflow = {};
      document.querySelectorAll(".review-text").forEach((el, index) => {
        newOverflow[index] = el.scrollHeight > el.clientHeight;
      });
      setOverflowingCards(newOverflow);
    };

    // Small delay ensures the DOM elements have rendered completely with styles applied
    const timer = setTimeout(checkOverflow, 100);

    window.addEventListener("resize", checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [displayReviews]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  return (
    <div className="section">
      {/* Header Container */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
        <div>
  <motion.div {...fadeUp(0)} className="section-eyebrow">
    <span>Guest Reviews</span>
  </motion.div>

  <motion.h2 {...fadeUp(0.15)} className="section-title !mb-0">
    Words from <em className="not-italic">Our Guests</em>
  </motion.h2>
</div>

        {/* Rating Badge */}
        <div className="flex items-center gap-3 bg-[var(--navy)] px-5 py-3 rounded-xl shrink-0">
          <div>
            <div className="font-[var(--font-display)] text-3xl font-bold text-white leading-none">
              {avgRating}
            </div>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className="text-[#C9A84C] text-[0.75rem]">
                  ★
                </span>
              ))}
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-[1px] h-9 bg-white/10" />

          <div>
            <div className="text-[0.78rem] font-bold text-white">
              {reviews.length || STATIC_REVIEWS.length} Reviews
            </div>
            <div className="text-[0.65rem] text-white/40 mt-0.5">
              Verified Guests
            </div>
          </div>
        </div>
      </div>

      {/* 3 Cards Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
        {displayReviews.map((t, i) => (
          <motion.div
  key={i}
  className="relative overflow-hidden flex flex-col h-full gap-4 bg-white border border-[var(--gray-200)] rounded-2xl px-6 py-7 shadow-[0_2px_12px_rgba(15,25,35,0.06)]"
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.2 }}
  transition={{
    duration: 0.6,
    delay: i * 0.2,
    type: "spring",
    stiffness: 80,
  }}
  whileHover={{
    y: -6,
    transition: {
      type: "spring",
      stiffness: 300,
    },
  }}
>
            {/* Top Border Accent Decorator */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)]" />

            {/* Card Header: Quote + Stars */}
            <div className="flex justify-between items-center pt-1">
              <span className="font-[var(--font-display)] text-5xl text-[var(--gold-light)] leading-[0.8] select-none">
                "
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className="text-[0.9rem]"
                    style={{ color: s <= t.rating ? "#C9A84C" : "#E9ECEF" }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            {/* Review text snippet block */}
            <div className="flex-1">
              <p
                className={`review-text text-[0.875rem] text-[var(--gray-600)] leading-[1.75] italic m-0 text-justify ${
                  !expandedCards[i] ? "line-clamp-5" : ""
                }`}
              >
                {t.text}
              </p>

              {/* Show button if the text naturally overflows 5 lines OR if it's already expanded */}
              {(overflowingCards[i] || expandedCards[i]) && (
                <button
                  onClick={() => toggleExpand(i)}
                  className="mt-2 text-sm font-medium text-[#0f1923] hover:underline"
                >
                  {expandedCards[i] ? "Show Less" : "Show More"}
                </button>
              )}
            </div>

            {/* Push footer to bottom */}
            <div className="mt-auto">
              <div className="h-[1px] bg-[var(--gray-100)] mb-4" />

              <div className="flex items-center gap-3">
                {/* Initials Circle */}
                <div className="w-10 h-10 rounded-full bg-[var(--navy)] flex items-center justify-center text-[var(--gold-light)] font-bold text-[0.8rem] font-[var(--font-display)] shrink-0">
                  {t.initials}
                </div>

                {/* Name and Location */}
                <div className="flex-1 min-w-0">
                  <div className="text-[0.875rem] font-bold text-[var(--navy)] truncate">
                    {t.name}
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[0.68rem] text-[var(--gray-400)] flex items-center gap-0.5">
                      <MapPinIcon size={10} color="var(--gray-400)" />
                      {t.location}
                    </span>

                    {t.room_type && (
                      <span className="bg-[var(--gray-100)] px-1.5 py-[1px] rounded-[3px] text-[0.6rem] font-bold text-[var(--navy)] uppercase tracking-[0.5px]">
                        {t.room_type}
                      </span>
                    )}
                  </div>
                </div>

                {t.isReal && (
                  <span className="shrink-0 text-[0.6rem] text-[#2D9A6E] font-bold bg-[#E8F8F0] px-2 py-[3px] rounded border border-[#BBF0D6]">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}