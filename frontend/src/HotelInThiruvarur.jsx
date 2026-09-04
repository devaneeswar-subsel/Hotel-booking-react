import React, { useEffect, useState } from "react";
import Footer from "./Footer";

/* ─────────────────────────────────────────────────────────────────────────────
   HotelInThiruvarur.jsx

   A standalone SEO landing page targeting the search "hotel in Thiruvarur".
   Rendered at /hotel-in-thiruvarur (see hotelPageAliases below) and linked
   from the footer under Policies.

   The page injects its own <title>, meta description, canonical link and
   Hotel + FAQPage structured data so Google can read it without the rest of
   the app being server-rendered.
   ──────────────────────────────────────────────────────────────────────────── */

const PAGE_URL = "https://www.vvgrandpark.com/hotel-in-thiruvarur";
const PAGE_TITLE =
  "Hotel in Thiruvarur | VV Grand Park Residency — Rooms from ₹2,000";
const PAGE_DESCRIPTION =
  "Looking for a hotel in Thiruvarur? VV Grand Park Residency offers clean, comfortable AC rooms near Thyagaraja Temple and Navajeevan Hospital. Deluxe rooms from ₹2,000 + GST. Free parking, free Wi-Fi, 24/7 front desk. Book direct on +91 93849 82510.";

const hotelPageAliases = {
  "/hotel-in-thiruvarur": true,
  "/hotels-in-thiruvarur": true,
  "/thiruvarur-hotel": true,
  "/best-hotel-in-thiruvarur": true,
};

export function isHotelSeoPage(pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return Boolean(hotelPageAliases[normalized.toLowerCase()]);
}

/* ── content ──────────────────────────────────────────────────────────────── */
const HIGHLIGHTS = [
  { label: "Comfortable Rooms", detail: "Clean AC rooms, fresh linen daily" },
  { label: "Prime Location", detail: "Near Thyagaraja Temple & bus stand" },
  { label: "Family Friendly", detail: "Extra beds and child-friendly rooms" },
  { label: "Free Parking", detail: "On-site parking for cars and two-wheelers" },
  { label: "24 Hour Check-in", detail: "Arrive any time, day or night" },
];

const ROOMS = [
  {
    name: "Deluxe Room",
    price: "₹2,000",
    priceNote: "single occupancy + 18% GST",
    double: "₹2,300 for double occupancy",
    detail:
      "A comfortable air-conditioned room with a double bed, TV, hot water and free Wi-Fi. Suited to couples, solo travellers and short business stays in Thiruvarur.",
  },
  {
    name: "Suite Room",
    price: "₹4,500",
    priceNote: "per night + 18% GST",
    double: "Same rate for single or double occupancy",
    detail:
      "A larger room with additional seating space, ideal for families visiting Thiruvarur for temple functions, weddings or longer stays.",
  },
  {
    name: "Suite with Balcony",
    price: "₹4,500",
    priceNote: "per night + 18% GST",
    double: "Same rate for single or double occupancy",
    detail:
      "Our suite with a private balcony, offering extra light and open space. A good choice for guests staying several nights in Thiruvarur.",
  },
];

const FACILITIES = [
  "Free Wi-Fi",
  "Air Conditioning",
  "Free Parking",
  "24/7 Front Desk",
  "CCTV Security",
  "Hot Water",
  "Daily Housekeeping",
  "Family Rooms",
];

const NEARBY = [
  {
    name: "Thiruvarur Thyagaraja Temple",
    distance: "1.2 km",
    time: "5 mins",
    detail:
      "One of Tamil Nadu's most important Shiva temples, home to the largest temple chariot in the state.",
  },
  {
    name: "Kamalalayam Tank",
    distance: "1.5 km",
    time: "6 mins",
    detail:
      "Among the largest temple tanks in India, next to the Thyagaraja Temple complex.",
  },
  {
    name: "Vanjiyur Amman Temple",
    distance: "1.3 km",
    time: "5 mins",
    detail: "A well-known local temple visited throughout the year.",
  },
  {
    name: "Thiruvarur Bus Stand & Junction",
    distance: "1.5 km",
    time: "6 mins",
    detail:
      "Convenient for guests arriving by bus or train from Thanjavur, Kumbakonam and Nagapattinam.",
  },
  {
    name: "Navajeevan Hospital",
    distance: "300 m",
    time: "2 mins walk",
    detail:
      "Directly nearby, convenient for families accompanying patients.",
  },
];

const FAQS = [
  {
    q: "Is VV Grand Park Residency a good hotel in Thiruvarur?",
    a: "VV Grand Park Residency is a comfortable, well-maintained hotel in the centre of Thiruvarur, Tamil Nadu. We offer clean air-conditioned rooms, free parking, free Wi-Fi and a 24-hour front desk, and we are located close to the Thyagaraja Temple, the bus stand and Navajeevan Hospital.",
  },
  {
    q: "What are the check-in and check-out timings?",
    a: "Check-in and check-out are available 24 hours. Your stay is counted as 24 hours from the actual time you check in, so you are free to arrive at any hour without paying for an extra night.",
  },
  {
    q: "What is the room tariff at your hotel in Thiruvarur?",
    a: "Deluxe rooms start at ₹2,000 plus 18% GST for single occupancy and ₹2,300 plus 18% GST for two guests. Suite rooms and the suite with balcony are ₹4,500 plus 18% GST. Booking directly through our website or by phone gets you our best available rate.",
  },
  {
    q: "Do you have a parking facility?",
    a: "Yes. Free on-site parking is available for both cars and two-wheelers, and the premises are covered by CCTV.",
  },
  {
    q: "Is food available at the hotel?",
    a: "Room service is available during the stay, and several restaurants serving South Indian and North Indian food are within a short walk of the hotel.",
  },
  {
    q: "How far is the hotel from Thiruvarur Temple?",
    a: "The Thyagaraja Temple is approximately 1.2 km away, about a five-minute drive or a fifteen-minute walk from the hotel.",
  },
  {
    q: "How do I book a room at your Thiruvarur hotel?",
    a: "You can book directly on this website, or call us on +91 93849 82510 or +91 90032 51115. Direct bookings avoid third-party commission and get the best rate.",
  },
];

/* ── structured data for Google ───────────────────────────────────────────── */
function buildStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Hotel",
        "@id": `${PAGE_URL}#hotel`,
        name: "VV Grand Park Residency",
        description: PAGE_DESCRIPTION,
        url: PAGE_URL,
        telephone: ["+91-9384982510", "+91-9003251115"],
        email: "vvgrandpark@gmail.com",
        priceRange: "₹₹",
        currenciesAccepted: "INR",
        paymentAccepted: "Cash, Credit Card, Debit Card, UPI",
        checkinTime: "00:00",
        checkoutTime: "23:59",
        address: {
          "@type": "PostalAddress",
          streetAddress: "3/4/D, Thanjai Saalai, near Navajeevan Hospital",
          addressLocality: "Thiruvarur",
          addressRegion: "Tamil Nadu",
          postalCode: "610004",
          addressCountry: "IN",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 10.7724,
          longitude: 79.6368,
        },
        amenityFeature: FACILITIES.map((name) => ({
          "@type": "LocationFeatureSpecification",
          name,
          value: true,
        })),
        makesOffer: ROOMS.map((room) => ({
          "@type": "Offer",
          name: room.name,
          priceCurrency: "INR",
          price: room.price.replace(/[^0-9]/g, ""),
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${PAGE_URL}#faq`,
        mainEntity: FAQS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.vvgrandpark.com/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Hotel in Thiruvarur",
            item: PAGE_URL,
          },
        ],
      },
    ],
  };
}

/* ── small pieces ─────────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
      {children}
    </p>
  );
}

function Faq({ item, open, onToggle }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E8E0D1] bg-white">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
      >
        <span className="text-[0.9rem] font-semibold text-[#0F1923]">
          {item.q}
        </span>
        <span className="shrink-0 text-[1.1rem] font-bold text-[#C9A84C]">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="border-t border-[#F0EBDF] px-4 py-3.5 text-[0.86rem] leading-relaxed text-[#4A5561]">
          {item.a}
        </div>
      )}
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────────────────── */
export default function HotelInThiruvarur() {
  const [openFaq, setOpenFaq] = useState(0);

  // inject title, meta, canonical and JSON-LD; clean up on unmount so the
  // rest of the SPA is not left with this page's tags
  useEffect(() => {
    const previousTitle = document.title;
    document.title = PAGE_TITLE;

    const created = [];

    const setMeta = (attr, key, content) => {
      let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
        created.push(tag);
      }
      const previous = tag.getAttribute("content");
      tag.setAttribute("content", content);
      return () => {
        if (previous !== null) tag.setAttribute("content", previous);
      };
    };

    const restores = [
      setMeta("name", "description", PAGE_DESCRIPTION),
      setMeta("property", "og:title", PAGE_TITLE),
      setMeta("property", "og:description", PAGE_DESCRIPTION),
      setMeta("property", "og:url", PAGE_URL),
      setMeta("property", "og:type", "website"),
    ];

    let canonical = document.head.querySelector('link[rel="canonical"]');
    const previousCanonical = canonical ? canonical.getAttribute("href") : null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
      created.push(canonical);
    }
    canonical.setAttribute("href", PAGE_URL);

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify(buildStructuredData());
    document.head.appendChild(ld);
    created.push(ld);

    return () => {
      document.title = previousTitle;
      restores.forEach((restore) => restore());
      if (previousCanonical !== null && canonical)
        canonical.setAttribute("href", previousCanonical);
      created.forEach((node) => node.remove());
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FBF9F5]">
      {/* ── nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#1C2B3A] bg-[#0F1923]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <a href="/" className="flex items-center gap-2.5 no-underline">
            <img
              src="/logo.png"
              alt="VV Grand Park Residency, hotel in Thiruvarur"
              className="h-9 w-9 object-contain"
            />
            <span className="leading-tight">
              <span className="block font-display text-[0.86rem] font-bold tracking-[2px] text-white">
                VV GRAND PARK
              </span>
              <span className="block font-display text-[0.52rem] tracking-[3px] text-[#E8D5A3]">
                RESIDENCY
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-5 md:flex">
            {[
              ["Home", "/"],
              ["Rooms", "/#rooms"],
              ["Facilities", "/#facilities"],
              ["Gallery", "/#gallery"],
              ["Contact", "/#contact"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-[0.78rem] text-white/70 no-underline transition-colors hover:text-[#E8D5A3]"
              >
                {label}
              </a>
            ))}
          </nav>

          <a
            href="/#rooms"
            className="rounded-md bg-[#C9A84C] px-4 py-2 text-[0.76rem] font-bold text-[#0F1923] no-underline"
          >
            Book Now →
          </a>
        </div>
      </header>

      {/* ── hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0F1923]">
        <img
          src="/hotel-hero.webp"
          alt="VV Grand Park Residency — hotel in Thiruvarur, Tamil Nadu"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#E8D5A3]">
            A comfortable stay in the heart of Thiruvarur
          </p>

          <h1 className="m-0 max-w-2xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            Hotel in <span className="text-[#E8D5A3]">Thiruvarur</span>
          </h1>

          <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-white/70">
            Experience comfort, convenience and warm hospitality at VV Grand
            Park Residency — a preferred hotel in Thiruvarur for business
            travellers, families and temple visitors. Clean air-conditioned
            rooms from ₹2,000 per night, minutes from the Thyagaraja Temple.
          </p>

          <div className="mt-7 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-5">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.label}
                className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2.5"
              >
                <div className="text-[0.74rem] font-bold text-white">
                  {h.label}
                </div>
                <div className="mt-0.5 text-[0.64rem] leading-snug text-white/55">
                  {h.detail}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="/#rooms"
              className="rounded-lg bg-[#C9A84C] px-6 py-3 text-[0.86rem] font-bold text-[#0F1923] no-underline"
            >
              Book Your Stay →
            </a>
            <a
              href="tel:+919384982510"
              className="rounded-lg border border-white/25 px-6 py-3 text-[0.86rem] font-bold text-white no-underline"
            >
              Call +91 93849 82510
            </a>
          </div>
        </div>
      </section>

      {/* ── intro ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <SectionLabel>About the hotel</SectionLabel>
        <h2 className="m-0 max-w-3xl font-display text-2xl font-bold text-[#0F1923] sm:text-3xl">
          Why guests choose our hotel in Thiruvarur
        </h2>
        <div className="mt-4 max-w-3xl space-y-3 text-[0.92rem] leading-relaxed text-[#4A5561]">
          <p>
            VV Grand Park Residency is a comfortable hotel in Thiruvarur, Tamil
            Nadu, located at Thanjai Saalai near Navajeevan Hospital. We are
            about 1.2 km from the Thiruvarur Thyagaraja Temple and 1.5 km from
            the bus stand and railway junction, which makes us convenient for
            temple visits, hospital stays and business travel alike.
          </p>
          <p>
            Every room is air-conditioned and cleaned daily, with hot water,
            free Wi-Fi and television. Parking is free on site, the front desk
            is staffed 24 hours, and check-in and check-out are available at
            any time of day — useful if you are arriving on a late bus or an
            early morning train.
          </p>
          <p>
            Booking directly with us on this website or by phone avoids
            third-party commission, so you get our best available rate on every
            room.
          </p>
        </div>
      </section>

      {/* ── rooms ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-6xl px-5">
          <SectionLabel>Our rooms</SectionLabel>
          <h2 className="m-0 font-display text-2xl font-bold text-[#0F1923] sm:text-3xl">
            Room types and tariff in Thiruvarur
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {ROOMS.map((room) => (
              <article
                key={room.name}
                className="rounded-2xl border border-[#E8E0D1] bg-[#FBF9F5] p-5"
              >
                <h3 className="m-0 font-display text-lg font-bold text-[#0F1923]">
                  {room.name}
                </h3>
                <p className="mt-2 text-[0.85rem] leading-relaxed text-[#4A5561]">
                  {room.detail}
                </p>
                <div className="mt-4 border-t border-[#E8E0D1] pt-3">
                  <span className="text-xl font-extrabold text-[#0F1923]">
                    {room.price}
                  </span>
                  <span className="ml-1 text-[0.72rem] text-[#8A95A3]">
                    {room.priceNote}
                  </span>
                  <div className="mt-1 text-[0.72rem] text-[#8A95A3]">
                    {room.double}
                  </div>
                </div>
                <a
                  href="/#rooms"
                  className="mt-4 inline-block rounded-lg bg-[#0F1923] px-4 py-2 text-[0.78rem] font-bold text-[#E8D5A3] no-underline"
                >
                  Check availability →
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── facilities ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <SectionLabel>Hotel facilities</SectionLabel>
        <h2 className="m-0 font-display text-2xl font-bold text-[#0F1923] sm:text-3xl">
          Everything you need for a pleasant stay
        </h2>
        <ul className="mt-6 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
          {FACILITIES.map((f) => (
            <li
              key={f}
              className="rounded-xl border border-[#E8E0D1] bg-white px-4 py-3 text-[0.84rem] font-semibold text-[#0F1923]"
            >
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* ── nearby ──────────────────────────────────────────────────────── */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-6xl px-5">
          <SectionLabel>Explore</SectionLabel>
          <h2 className="m-0 font-display text-2xl font-bold text-[#0F1923] sm:text-3xl">
            Places near our Thiruvarur hotel
          </h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NEARBY.map((place) => (
              <article
                key={place.name}
                className="rounded-xl border border-[#E8E0D1] bg-[#FBF9F5] p-4"
              >
                <h3 className="m-0 text-[0.95rem] font-bold text-[#0F1923]">
                  {place.name}
                </h3>
                <p className="mt-1 text-[0.72rem] font-semibold text-[#C9A84C]">
                  {place.distance} · {place.time}
                </p>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-[#4A5561]">
                  {place.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── faq + location ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <SectionLabel>Frequently asked questions</SectionLabel>
            <h2 className="m-0 mb-5 font-display text-2xl font-bold text-[#0F1923] sm:text-3xl">
              Hotel in Thiruvarur — FAQs
            </h2>
            <div className="space-y-2.5">
              {FAQS.map((item, i) => (
                <Faq
                  key={item.q}
                  item={item}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
                />
              ))}
            </div>
          </div>

          <aside>
            <h2 className="m-0 mb-4 font-display text-xl font-bold text-[#0F1923]">
              Our location
            </h2>
            <div className="overflow-hidden rounded-xl border border-[#E8E0D1]">
              <iframe
                title="VV Grand Park Residency location in Thiruvarur"
                src="https://www.google.com/maps?q=VV+Grand+Park+Residency,+Thanjai+Saalai,+Thiruvarur,+Tamil+Nadu+610004&output=embed"
                width="100%"
                height="230"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <address className="mt-4 not-italic text-[0.86rem] leading-relaxed text-[#4A5561]">
              3/4/D, Thanjai Saalai, near Navajeevan Hospital,
              <br />
              Thiruvarur — 610004, Tamil Nadu, India
            </address>
            <p className="mt-2 text-[0.86rem]">
              <a
                href="tel:+919384982510"
                className="font-semibold text-[#0F1923] no-underline"
              >
                +91 93849 82510
              </a>
              <span className="text-[#8A95A3]"> · </span>
              <a
                href="tel:+919003251115"
                className="font-semibold text-[#0F1923] no-underline"
              >
                +91 90032 51115
              </a>
            </p>
          </aside>
        </div>
      </section>

      {/* ── closing CTA ─────────────────────────────────────────────────── */}
      <section className="bg-[#0F1923] py-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5">
          <div>
            <h2 className="m-0 font-display text-2xl font-bold text-white sm:text-3xl">
              Ready for a comfortable stay in Thiruvarur?
            </h2>
            <p className="mt-2 text-[0.88rem] text-white/60">
              Book directly on our website for the best rate and a
              hassle-free experience.
            </p>
          </div>
          <a
            href="/#rooms"
            className="rounded-lg bg-[#C9A84C] px-7 py-3.5 text-[0.9rem] font-bold text-[#0F1923] no-underline"
          >
            Book Now →
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}