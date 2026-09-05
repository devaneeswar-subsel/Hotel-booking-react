import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const API = process.env.REACT_APP_API_URL;

/* ─────────────────────────────────────────────────────────────────────────────
   Gallery.jsx

   A carousel of the hotel's real room photographs, pulled from the rooms API
   (image_url plus image2..image5 on each room). Falls back to a small set of
   stock shots only if the API is unreachable, so the section never renders
   empty.
   ──────────────────────────────────────────────────────────────────────────── */

const FALLBACK = [
  {
    src: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200",
    label: "Deluxe Room",
  },
  {
    src: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200",
    label: "Suite Room",
  },
  {
    src: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200",
    label: "Suite with Balcony",
  },
];

const AUTOPLAY_MS = 4000;

export default function Gallery() {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  /* ── collect every room photo the hotel has uploaded ──────────────────── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API}/api/rooms`);
        if (!res.ok) throw new Error("rooms unavailable");
        const rooms = await res.json();

        const collected = [];
        (Array.isArray(rooms) ? rooms : []).forEach((room) => {
          [
            room.image_url,
            room.image2,
            room.image3,
            room.image4,
            room.image5,
          ].forEach((src) => {
            if (src && String(src).trim()) {
              collected.push({
                src,
                label: room.room_number
                  ? `${room.room_type} — Room ${room.room_number}`
                  : room.room_type || "Our Rooms",
              });
            }
          });
        });

        if (!cancelled) setSlides(collected.length ? collected : FALLBACK);
      } catch {
        if (!cancelled) setSlides(FALLBACK);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const count = slides.length;

  const go = useCallback(
    (next) => {
      if (!count) return;
      setIndex((i) => (next + count) % count);
    },
    [count],
  );

  /* ── autoplay, paused on hover or focus ──────────────────────────────── */
  useEffect(() => {
    if (paused || count <= 1) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, count]);

  /* ── keyboard and swipe ──────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.6, delay, ease: "easeOut" },
  });

  if (!count) return null;

  return (
    <section
      id="gallery"
      className="mx-auto max-w-7xl px-6 pt-20 md:px-8 lg:px-12"
    >
      <motion.div {...fadeUp(0)} className="section-eyebrow mb-3">
        <span className="text-sm font-medium uppercase tracking-[3px] text-amber-500">
          Photo Tour
        </span>
      </motion.div>

      <motion.h2
        {...fadeUp(0.15)}
        className="section-title mb-10 font-serif text-4xl font-bold text-slate-900"
      >
        Our <em className="text-amber-500">Rooms</em>
      </motion.h2>

      <div
        className="relative overflow-hidden rounded-2xl bg-slate-900"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const delta = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(delta) > 45) go(index + (delta < 0 ? 1 : -1));
          touchStartX.current = null;
        }}
      >
        {/* track */}
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((img, i) => (
            <div key={`${img.src}-${i}`} className="w-full shrink-0">
              <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
                <img
                  src={img.src}
                  alt={img.label}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(15,25,35,0.75)] to-transparent p-5">
                  <span className="text-sm font-semibold text-white">
                    {img.label}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* arrows */}
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-900 shadow transition hover:bg-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              aria-label="Next photo"
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-900 shadow transition hover:bg-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* dots */}
        {count > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-amber-400" : "w-1.5 bg-white/55"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* thumbnails */}
      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {slides.map((img, i) => (
            <button
              key={`thumb-${img.src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === index ? "border-amber-400" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={img.src}
                alt={img.label}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}