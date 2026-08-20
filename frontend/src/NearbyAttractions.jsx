import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GridIcon,
  HomeIcon,
  MapPinIcon,
  SparklesIcon,
} from "./Icons";

const categories = [
  { id: "all", label: "All Places", icon: GridIcon },
  { id: "temple", label: "Temples", icon: HomeIcon },
  { id: "nature", label: "Nature", icon: SparklesIcon },
  { id: "heritage", label: "Heritage", icon: HomeIcon },
  { id: "religious", label: "Religious", icon: MapPinIcon },
];

const attractions = [
  {
    title: "Thyagaraja Swamy Temple",
    distance: "3-4 km from hotel",
    category: "temple",
    tag: "Featured",
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80",
    desc: "One of Thiruvarur's most iconic Shiva temples, known for its magnificent architecture, Kamalalayam tank and grand temple chariot.",
  },
  {
    title: "Thirukkannamangai Temple",
    distance: "7 km from hotel",
    category: "temple",
    image:
      "https://images.unsplash.com/photo-1592639296346-560c37a0f711?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Koothanur Saraswathi Temple",
    distance: "21 km from hotel",
    category: "temple",
    image:
      "https://images.unsplash.com/photo-1609948543911-7f01ff385be5?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Rajagopalaswamy Temple, Mannargudi",
    distance: "28-30 km from hotel",
    category: "temple",
    image:
      "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Vaduvoor Bird Sanctuary",
    distance: "30 km from hotel",
    category: "nature",
    image:
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Velankanni Basilica",
    distance: "30-35 km from hotel",
    category: "religious",
    image:
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Nagore Dargah",
    distance: "30 km from hotel",
    category: "religious",
    image:
      "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Muthupet Mangrove Forest",
    distance: "55-60 km from hotel",
    category: "nature",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Tharangambadi (Tranquebar)",
    distance: "51 km from hotel",
    category: "heritage",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, delay, ease: "easeOut" },
});

function labelFor(category) {
  return categories.find((item) => item.id === category)?.label || category;
}

export default function NearbyAttractions() {
  const [active, setActive] = useState("all");

  const visibleAttractions = useMemo(
    () =>
      active === "all"
        ? attractions.slice(1)
        : attractions.filter((item) => item.category === active),
    [active],
  );
  const featured = attractions[0];

  return (
    <section
      id="nearby-attractions"
      className="mx-auto max-w-7xl px-6 pt-20 md:px-8 lg:px-12"
    >
      <motion.div {...fadeUp(0)} className="text-center">
        <div className="mb-3 flex items-center justify-center gap-3 text-[0.72rem] font-bold uppercase tracking-[4px] text-[#C9A84C]">
          <span className="h-px w-8 bg-[#C9A84C]/50" />
          Explore Around
          <span className="h-px w-8 bg-[#C9A84C]/50" />
        </div>
        <h2 className="font-serif text-[clamp(2.2rem,5vw,4.2rem)] font-bold leading-none text-[#0F1923]">
          Nearby <em className="font-normal text-[#B8872F]">Attractions</em>
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[0.95rem] leading-7 text-[#6C757D]">
          Discover temples, heritage, nature and cultural places near VV Grand
          Park Residency, Thiruvarur.
        </p>
      </motion.div>

      <motion.div
        {...fadeUp(0.08)}
        className="mt-7 flex flex-wrap items-center justify-center gap-3"
      >
        {categories.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[0.78rem] font-semibold transition ${
                isActive
                  ? "border-[#0F1923] bg-[#0F1923] text-white shadow-[0_8px_18px_rgba(15,25,35,0.14)]"
                  : "border-[#E4DED2] bg-white text-[#495057] hover:border-[#C9A84C] hover:text-[#0F1923]"
              }`}
            >
              <Icon size={14} color={isActive ? "#C9A84C" : "#6C757D"} />
              {label}
            </button>
          );
        })}
      </motion.div>

      <motion.div
        {...fadeUp(0.15)}
        className="mt-7 overflow-hidden rounded-[10px] border border-[#E4DED2] bg-white shadow-[0_18px_48px_rgba(15,25,35,0.09)]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr]">
          <div className="h-[250px] overflow-hidden lg:h-[330px]">
            <img
              src={featured.image}
              alt={featured.title}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = "/hotel-hero.webp";
              }}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="relative flex flex-col justify-center overflow-hidden px-6 py-7 md:px-8">
            <div className="absolute -right-10 top-8 h-44 w-44 rounded-full border border-[#C9A84C]/10" />
            <span className="mb-4 w-fit rounded bg-[#B8872F] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[1px] text-white">
              {featured.tag}
            </span>
            <h3 className="font-serif text-[1.55rem] font-bold leading-tight text-[#0F1923] md:text-[2rem]">
              {featured.title}
            </h3>
            <div className="mt-3 flex items-center gap-1.5 text-[0.82rem] text-[#6C757D]">
              <MapPinIcon size={14} color="#B8872F" />
              {featured.distance}
            </div>
            <p className="mt-4 max-w-[410px] text-[0.92rem] leading-7 text-[#495057]">
              {featured.desc}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visibleAttractions.slice(0, 8).map((item, index) => (
          <motion.article
            key={item.title}
            {...fadeUp(0.05 + index * 0.03)}
            className="group overflow-hidden rounded-[10px] border border-[#E4DED2] bg-white shadow-[0_10px_28px_rgba(15,25,35,0.07)] transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,25,35,0.12)]"
          >
            <div className="h-[150px] overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = "/hotel-hero.webp";
                }}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
            </div>
            <div className="px-4 py-3.5">
              <h3 className="min-h-[42px] font-serif text-[1rem] font-bold leading-snug text-[#0F1923]">
                {item.title}
              </h3>
              <div className="mt-1.5 flex items-center gap-1.5 text-[0.72rem] text-[#6C757D]">
                <MapPinIcon size={12} color="#B8872F" />
                {item.distance}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[0.62rem] font-bold uppercase tracking-[1.1px] text-[#B8872F]">
                  {labelFor(item.category)}
                </span>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
