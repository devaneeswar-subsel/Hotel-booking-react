import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  GridIcon,
  HomeIcon,
  MapPinIcon,
  SparklesIcon,
} from "./Icons";

const imageBase = "/nearby attaraction";
const carouselIntervalMs = 6000;

const categories = [
  { id: "all", label: "All Places", icon: GridIcon },
  { id: "temple", label: "Temples", icon: HomeIcon },
  { id: "nature", label: "Nature", icon: SparklesIcon },
  { id: "heritage", label: "Heritage", icon: HomeIcon },
  { id: "religious", label: "Religious", icon: MapPinIcon },
];

const attractions = [
  {
    title: "Thiyagaraja Swamy Temple",
    distance: "3-4 km from hotel",
    category: "temple",
    featured: true,
    fixedImage: true,
    images: [`${imageBase}/Thyagaraja Swamy Temple.png`],
    desc: "One of Thiruvarur's most iconic Shiva temples, known for its magnificent architecture, Kamalalayam tank and grand temple chariot.",
  },
  {
    title: "Tamilnadu Tajmahal",
    distance: "5-6 km from hotel",
    category: "heritage",
    featured: true,
    fixedImage: true,
    images: [`${imageBase}/taj.webp`, `${imageBase}/taj1.webp`],
    desc: "An eternal symbol of love and one of the Seven Wonders of the World, the Taj Mahal is a masterpiece of Mughal architecture.",
  },
  {
    title: "Engan Murugan Temple",
    distance: "10 km from hotel",
    category: "temple",
    images: [
      `${imageBase}/engan 1.jpg`,
      `${imageBase}/engan 2.jpg`,
      `${imageBase}/engan.jpg`,
    ],
  },
  {
    title: "Sri Saranatha Perumal Temple",
    distance: "25 km from hotel",
    category: "temple",
    images: [
      `${imageBase}/Thirucherai 1.jpg`,
      `${imageBase}/Thirucherai 2.jpg`,
      `${imageBase}/Thirucherai.jpg`,
    ],
  },
  {
    title: "Thirukkannamangai Temple",
    distance: "7 km from hotel",
    category: "temple",
    images: [
      `${imageBase}/thirukanamangai.webp`,
      `${imageBase}/thirukanamangai (1).webp`,
      `${imageBase}/thirukanamangai.png`,
      `${imageBase}/thirukanamangai (1).png`,
    ],
  },
  {
    title: "Nachiyar Kovil",
    distance: "29 km from hotel",
    category: "temple",
    images: [
      `${imageBase}/nachiyar 1.jpg`,
      `${imageBase}/nachiyar 2.jpg`,
      `${imageBase}/nachiyar.jpg`,
    ],
  },
  {
    title: "Koothanur Saraswathi Amman Temple",
    distance: "21 km from hotel",
    category: "temple",
    images: [
      `${imageBase}/koothanur.png`,
      `${imageBase}/koothanur (1).png`,
    ],
  },
  {
    title: "Rajagopalaswamy Temple, Mannargudi",
    distance: "28-30 km from hotel",
    category: "temple",
    images: [
      `${imageBase}/mannarkudi.png`,
      `${imageBase}/mannarkudi (1).png`,
      `${imageBase}/mannarkudi (1).jpeg`,
    ],
  },
  {
    title: "Vaduvoor Bird Sanctuary",
    distance: "30 km from hotel",
    featured: true,
    category: "nature",
    desc:"Vaduvoor Bird Sanctuary — A peaceful wetland sanctuary known for its rich birdlife, especially migratory birds, making it a great spot for nature and birdwatching.",
    images: [
      `${imageBase}/vadovur.webp`,
      `${imageBase}/vadoovur.webp`,
      `${imageBase}/vaduvoor.png`,
    ],
  },
  {
    title: "Velankanni Basilica",
    distance: "30-35 km from hotel",
    category: "religious",
    featured: true,
    desc:"Velankanni Basilica — A historic pilgrimage site, renowned for the miraculous stories of the Madonna and Child, healing, and the rescue of Portuguese sailors from a storm.",
    images: [
      `${imageBase}/velankanni.webp`,
      `${imageBase}/velankanni1.webp`,
      `${imageBase}/velankanni2.webp`,
    ],
  },
  {
    title: "Nagore Dargah",
    distance: "30 km from hotel",
    category: "religious",
    images: [
      `${imageBase}/nagore.webp`,
      `${imageBase}/nagore1.webp`,
    ],
  },
  {
    title: "Muthupettai Mangrove Forest",
    distance: "55-60 km from hotel",
    category: "nature",
    images: [
      `${imageBase}/muthupet.webp`,
      `${imageBase}/muthupet1.webp`,
      `${imageBase}/muthupet2.webp`,
    ],
  },
  {
    title: "Tharangambadi (Tranquebar)",
    distance: "51 km from hotel",
    category: "heritage",
    images: [
      `${imageBase}/tharangampadi.webp`,
      `${imageBase}/tharangampadi1.webp`,
      `${imageBase}/tharangampadi2.webp`,
    ],
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.55, delay, ease: "easeOut" },
});

function labelFor(category) {
  const labels = {
    heritage: "Heritage",
    nature: "Nature",
    religious: "Religious",
    temple: "Temple",
  };

  return labels[category] || category;
}

function normalizeSlides(images = []) {
  const slides = images.length ? images : ["/Thyagaraja Swamy Temple.png"];

  return slides.length > 1 ? slides : [slides[0], slides[0]];
}

function AttractionCarousel({
  images,
  title,
  className,
  fixed = false,
}) {
  const slides = useMemo(
    () =>
      fixed
        ? [images?.[0] || "/Thyagaraja Swamy Temple.png"]
        : normalizeSlides(images),
    [fixed, images],
  );

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    setActiveSlide(0);
  }, [title, slides.length]);

  useEffect(() => {
    if (fixed || slides.length < 2) return undefined;

    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, carouselIntervalMs);

    return () => clearInterval(timer);
  }, [fixed, slides.length]);

  const showPrevious = () => {
    setActiveSlide(
      (current) => (current - 1 + slides.length) % slides.length,
    );
  };

  const showNext = () => {
    setActiveSlide((current) => (current + 1) % slides.length);
  };

  return (
    <div
      className={`relative overflow-hidden bg-[#EDE7DA] ${className}`}
    >
      <motion.img
        key={`${title}-${activeSlide}`}
        src={slides[activeSlide]}
        alt={title}
        loading="lazy"
        initial={{ opacity: 0.72, scale: 1.03 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        onError={(event) => {
          event.currentTarget.src = "/hotel-hero.webp";
        }}
        className="h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/28 to-transparent" />

      {!fixed && (
        <>
          <button
            type="button"
            aria-label={`Previous ${title} image`}
            onClick={showPrevious}
            className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-[#0F1923]/55 text-white opacity-0 shadow-[0_6px_16px_rgba(15,25,35,0.2)] backdrop-blur transition group-hover:opacity-100"
          >
            <ArrowLeftIcon size={14} color="currentColor" />
          </button>

          <button
            type="button"
            aria-label={`Next ${title} image`}
            onClick={showNext}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-[#0F1923]/55 text-white opacity-0 shadow-[0_6px_16px_rgba(15,25,35,0.2)] backdrop-blur transition group-hover:opacity-100"
          >
            <ArrowRightIcon size={14} color="currentColor" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {slides.map((slide, index) => (
              <button
                key={`${slide}-${index}`}
                type="button"
                aria-label={`Show ${title} image ${index + 1}`}
                onClick={() => setActiveSlide(index)}
                className={`h-1.5 rounded-full transition ${
                  activeSlide === index
                    ? "w-5 bg-white"
                    : "w-1.5 bg-white/55"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function NearbyAttractions() {
  const [active, setActive] = useState("all");

  // Filter attractions based on selected tab
  const visibleAttractions = useMemo(() => {
    if (active === "all") {
      return attractions;
    }

    return attractions.filter(
      (item) => item.category === active,
    );
  }, [active]);

  // Featured attraction for selected category
  const featuredAttractions = useMemo(() => {
    return visibleAttractions.filter(
      (item) => item.featured,
    );
  }, [visibleAttractions]);

  // All other attractions for selected category
  const regularAttractions = useMemo(() => {
    return visibleAttractions.filter(
      (item) => !item.featured,
    );
  }, [visibleAttractions]);

  return (
    <section
      id="nearby-attractions"
      className="mx-auto max-w-6xl px-5 pt-20 md:px-8 lg:px-0"
    >
      {/* Heading */}
      <motion.div
        {...fadeUp(0)}
        className="text-center"
      >
        <SparklesIcon
          size={30}
          color="#C9A84C"
          className="mx-auto mb-1 opacity-85"
        />

        <div className="mb-3 flex items-center justify-center gap-3 text-[0.72rem] font-bold uppercase tracking-[4px] text-[#C9A84C]">
          <span className="h-px w-6 bg-[#C9A84C]/50" />
          Explore Around
          <span className="h-px w-6 bg-[#C9A84C]/50" />
        </div>

        <h2 className="font-serif text-[clamp(2.45rem,5.4vw,4.45rem)] font-bold leading-none text-[#0F1923]">
          Nearby{" "}
          <em className="font-normal text-[#B8872F]">
            Attractions
          </em>
        </h2>

        <p className="mx-auto mt-4 max-w-[560px] text-[0.97rem] leading-7 text-[#6C757D]">
          Discover temples, heritage, nature and cultural places near VV
          Grand Park Residency, Thiruvarur.
        </p>
      </motion.div>

      {/* Category Tabs */}
      <motion.div
        {...fadeUp(0.08)}
        className="mt-7 flex flex-wrap items-center justify-center gap-4"
      >
        {categories.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`flex min-w-[112px] items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-[0.8rem] font-semibold transition ${
                isActive
                  ? "border-[#0F1923] bg-[#0F1923] text-white shadow-[0_8px_18px_rgba(15,25,35,0.14)]"
                  : "border-[#E4DED2] bg-white/70 text-[#495057] shadow-[0_5px_14px_rgba(15,25,35,0.04)] hover:border-[#C9A84C] hover:text-[#0F1923]"
              }`}
            >
              <Icon
                size={14}
                color={isActive ? "#C9A84C" : "#6C757D"}
              />
              {label}
            </button>
          );
        })}
      </motion.div>

  {featuredAttractions.length > 0 && (
  <div
    className={
      active === "all"
        ? "mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2"
        : "mt-8 space-y-6"
    }
  >
    {featuredAttractions.slice(0, 2).map((item, index) => (
      <motion.article
        key={item.title}
        {...fadeUp(0.12 + index * 0.04)}
        className="group overflow-hidden rounded-[14px] border border-[#E4DED2] bg-white shadow-[0_18px_48px_rgba(15,25,35,0.09)] transition hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,25,35,0.13)]"
      >
        {active === "all" ? (
          /* ================================
             ALL PLACES — NORMAL 2 COLUMN CARD
             ================================ */
          <>
            <AttractionCarousel
              title={item.title}
              images={item.images}
              fixed={item.fixedImage}
              className="h-[205px] md:h-[230px]"
            />

            <div className="relative overflow-hidden px-5 py-5 md:px-6 md:py-6">
              <div className="pointer-events-none absolute -right-11 top-8 h-44 w-44 rounded-full border border-[#C9A84C]/10" />

              <div className="pointer-events-none absolute -right-5 top-16 h-28 w-28 rounded-full border border-[#C9A84C]/10" />

              <span className="relative mb-3 inline-flex rounded bg-[#B8872F] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[1px] text-white">
                Featured
              </span>

              <h3 className="relative font-serif text-[1.55rem] font-bold leading-tight text-[#0F1923] md:text-[1.75rem]">
                {item.title}
              </h3>

              <div className="relative mt-2.5 flex items-center gap-1.5 text-[0.82rem] text-[#6C757D]">
                <MapPinIcon
                  size={14}
                  color="#B8872F"
                />
                {item.distance}
              </div>

              <p className="relative mt-3 min-h-[78px] max-w-[460px] text-[0.9rem] leading-7 text-[#495057]">
                {item.desc}
              </p>
            </div>
          </>
        ) : (
          /* ==================================
             CATEGORY — SINGLE HORIZONTAL CARD
             ================================== */
          <div className="grid grid-cols-1 md:grid-cols-[42%_58%]">
            {/* LEFT — IMAGE */}
            <AttractionCarousel
              title={item.title}
              images={item.images}
              fixed={item.fixedImage}
              className="h-[250px] md:h-full md:min-h-[310px]"
            />

            {/* RIGHT — CONTENT */}
            <div className="relative flex flex-col justify-center overflow-hidden px-6 py-7 md:px-8 md:py-10">
              <div className="pointer-events-none absolute -right-12 top-8 h-44 w-44 rounded-full border border-[#C9A84C]/10" />

              <div className="pointer-events-none absolute -right-5 top-16 h-28 w-28 rounded-full border border-[#C9A84C]/10" />

              <div className="relative">
                <span className="mb-3 inline-flex rounded bg-[#B8872F] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[1px] text-white">
                  Featured
                </span>

                <h3 className="font-serif text-[1.7rem] font-bold leading-tight text-[#0F1923] md:text-[2.1rem]">
                  {item.title}
                </h3>

                <div className="mt-3 flex items-center gap-1.5 text-[0.85rem] text-[#6C757D]">
                  <MapPinIcon
                    size={15}
                    color="#B8872F"
                  />
                  {item.distance}
                </div>

                <p className="mt-4 max-w-[540px] text-[0.95rem] leading-7 text-[#495057]">
                  {item.desc}
                </p>

                <div className="mt-6 flex items-center gap-2">
                  <span className="h-px w-9 bg-[#C9A84C]" />

                  <span className="text-[0.65rem] font-bold uppercase tracking-[1.8px] text-[#B8872F]">
                    Explore Nearby
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.article>
    ))}
  </div>
)}

      {/* ================= ALL FILTERED ATTRACTIONS ================= */}
      {regularAttractions.length > 0 && (
        <div className="mt-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-10 bg-[#C9A84C]" />

            <span className="text-[0.7rem] font-bold uppercase tracking-[2px] text-[#B8872F]">
              {active === "all"
                ? "Explore More Places"
                : `More ${labelFor(active)} Attractions`}
            </span>

            <span className="h-px flex-1 bg-[#E4DED2]" />
          </div>

   {/* Shows only the first 8 filtered attractions */}
<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
  {regularAttractions.slice(0, 8).map((item, index) => (
    <motion.article
      key={item.title}
      {...fadeUp(0.05 + index * 0.03)}
      className="group overflow-hidden rounded-[10px] border border-[#E4DED2] bg-white shadow-[0_10px_28px_rgba(15,25,35,0.07)] transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,25,35,0.12)]"
    >
      <AttractionCarousel
        title={item.title}
        images={item.images}
        className="h-[150px]"
      />

      <div className="px-4 py-3.5">
        <h3 className="min-h-[42px] font-serif text-[1rem] font-bold leading-snug text-[#0F1923]">
          {item.title}
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5 text-[0.72rem] text-[#6C757D]">
          <MapPinIcon
            size={12}
            color="#B8872F"
          />
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
        </div>
      )}
    </section>
  );
}