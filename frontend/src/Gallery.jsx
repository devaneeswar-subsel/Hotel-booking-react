import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion } from "framer-motion";

const API = process.env.REACT_APP_API_URL;

/* ─────────────────────────────────────────────────────────────────────────────
   Gallery.jsx

   A carousel of the hotel's real room photographs, pulled from the rooms API
   (image_url plus image2..image5 on each room). Room-type pills let the user
   switch which type's photos (5–6 max) are shown in the carousel. Falls back
   to a small set of stock shots only if the API is unreachable, so the
   section never renders empty.
   ──────────────────────────────────────────────────────────────────────────── */

const FALLBACK_TYPE = "Our Rooms";
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
const MAX_PER_TYPE = 5; // show at most 5-6 images per selected room type

export default function Gallery() {
  // photosByType: { [roomType]: [{ src, label }] }
  const [photosByType, setPhotosByType] = useState({});
  const [groups, setGroups] = useState([]); // [{ type, count }]
  const [selectedType, setSelectedType] = useState(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);

  /* ── collect every room photo the hotel has uploaded, grouped by type ──── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API}/api/rooms`);
        if (!res.ok) throw new Error("rooms unavailable");
        const rooms = await res.json();

        const byType = new Map();
        const seenSrc = new Map(); // per-type dedupe: type -> Set(src)

        (Array.isArray(rooms) ? rooms : []).forEach((room) => {
          const type = room.room_type || "Our Rooms";
          if (!byType.has(type)) {
            byType.set(type, []);
            seenSrc.set(type, new Set());
          }

          [
            room.image_url,
            room.image2,
            room.image3,
            room.image4,
            room.image5,
          ].forEach((src) => {
            const clean = src && String(src).trim();
            const seen = seenSrc.get(type);
            const bucket = byType.get(type);
            // the same photo can be reused across rooms of a type; cap at
            // MAX_PER_TYPE so the carousel stays to 5-6 images per type
            if (clean && !seen.has(clean) && bucket.length < MAX_PER_TYPE) {
              seen.add(clean);
              bucket.push({ src: clean, label: type });
            }
          });
        });

        // keep the categories in a sensible order rather than DB order
        const ORDER = ["Deluxe Room", "Suite Room", "Suite with Balcony"];
        const ordered = [
          ...ORDER.filter((t) => byType.has(t)),
          ...[...byType.keys()].filter((t) => !ORDER.includes(t)),
        ];

        const photosObj = {};
        ordered.forEach((t) => {
          photosObj[t] = byType.get(t) || [];
        });

        const groupList = ordered
          .map((t) => ({ type: t, count: (byType.get(t) || []).length }))
          .filter((g) => g.count > 0);

        if (!cancelled) {
          if (groupList.length) {
            setPhotosByType(photosObj);
            setGroups(groupList);
            setSelectedType(groupList[0].type);
          } else {
            setPhotosByType({ [FALLBACK_TYPE]: FALLBACK });
            setGroups([{ type: FALLBACK_TYPE, count: FALLBACK.length }]);
            setSelectedType(FALLBACK_TYPE);
          }
        }
      } catch {
        if (!cancelled) {
          setPhotosByType({ [FALLBACK_TYPE]: FALLBACK });
          setGroups([{ type: FALLBACK_TYPE, count: FALLBACK.length }]);
          setSelectedType(FALLBACK_TYPE);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // only the currently selected room type's photos drive the carousel
  const slides = useMemo(
    () => (selectedType ? photosByType[selectedType] || [] : []),
    [selectedType, photosByType],
  );
  const count = slides.length;

  // reset to the first photo whenever the selected room type changes
  useEffect(() => {
    setIndex(0);
  }, [selectedType]);

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

      {/* switch which room type's carousel is shown */}
      {groups.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {groups.map((g) => {
            const active = selectedType === g.type;
            return (
              <button
                key={g.type}
                type="button"
                onClick={() => setSelectedType(g.type)}
                className={`rounded-full border px-4 py-1.5 text-[0.78rem] font-semibold transition ${
                  active
                    ? "border-amber-400 bg-amber-400 text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-amber-300"
                }`}
              >
                {g.type}
                <span className="ml-1.5 opacity-60">{g.count}</span>
              </button>
            );
          })}
        </div>
      )}

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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              aria-label="Next photo"
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-900 shadow transition hover:bg-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
                i === index
                  ? "border-amber-400"
                  : "border-transparent opacity-60 hover:opacity-100"
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
