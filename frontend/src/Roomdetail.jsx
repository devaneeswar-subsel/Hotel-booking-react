import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

// ─────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────

const IconBed = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" />
    <path d="M2 9h20v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9z" />
    <path d="M6 9V6" />
    <path d="M18 9V6" />
    <path d="M2 13h20" />
  </svg>
);

const IconUsers = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconUser = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const IconSettings = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6.6v-2.4h.24A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06A1.7 1.7 0 0 0 11.64 6a1.7 1.7 0 0 0 1.03-1.56V4h2.4v.44A1.7 1.7 0 0 0 16.1 6a1.7 1.7 0 0 0 1.88.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.34 10a1.7 1.7 0 0 0 1.56 1.03h.5v2.4h-.5A1.7 1.7 0 0 0 19.4 15Z" />
  </svg>
);

const IconBooking = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M8 14h2M14 14h2M8 17h2" />
  </svg>
);

const IconMenu = () => (
  <svg
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const IconXMenu = () => (
  <svg
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconStar = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="#F59E0B"
    stroke="#F59E0B"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconCheck = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconShield = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconBadge = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);

const IconTag = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const IconClock = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconSmoke = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M20 15H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z" />
    <path d="M18 15V9" />
  </svg>
);

const IconX = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCoffee = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="1" x2="6" y2="4" />
    <line x1="10" y1="1" x2="10" y2="4" />
    <line x1="14" y1="1" x2="14" y2="4" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// ROOM DATA
// ─────────────────────────────────────────────────────────────

const ROOM_EXTRAS = {
  Standard: {
    amenities: [
      "Complimentary breakfast",
      "24 hours room service",
      "LED TV",
      "Kettle",
      "Pure veg restaurant (VASAN’S CAFÉ)",
      "Ample space for parking",
      "Uninterrupted power supply with DG automatic",
      "24-hour hot water in bathroom",
      "Cab service (Tariff based on km basis)",
      "24 hours CCTV surveillance",
      "Free WiFi",
      "Air Conditioning",
      "Private Bathroom",
    ],
    images: [
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200",
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200",
    ],
  },

  Deluxe: {
    amenities: [
      "Free WiFi",
      "Air Conditioning",
      "King Bed",
      "Mini Bar",
      "Bathtub & Shower",
      "City View",
      "Room Service",
      "Wardrobe",
    ],
    images: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
    ],
  },

  Suite: {
    amenities: [
      "Complimentary breakfast",
      "24 hours room service",
      "LED TV",
      "Kettle",
      "Pure veg restaurant (VASAN’S CAFÉ)",
      "Ample space for parking",
      "Uninterrupted power supply with DG automatic",
      "24-hour hot water in bathroom",
      "Cab service (Tariff based on km basis)",
      "24 hours CCTV surveillance",
      "Suite Room Facilities",
      "Jacuzzi",
      "Microwave oven",
      "Fridge",
      "Free WiFi",
      "Living Room",
      "King Bed",
    ],
    images: [
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200",
      "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200",
      "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=1200",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200",
    ],
  },

  Luxury: {
    amenities: [
      "Free WiFi",
      "Private Balcony",
      "King Bed",
      "Whirlpool",
      "Panoramic View",
      "In-room Dining",
      "Butler Service",
      "Premium Bar",
      "Smart Controls",
    ],
    images: [
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200",
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200",
    ],
  },

  Presidential: {
    amenities: [
      "Free WiFi",
      "Private Pool",
      "Multiple Bedrooms",
      "Full Kitchen",
      "Private Terrace",
      "24/7 Butler",
      "Limousine Service",
      "Spa Access",
      "Personal Chef",
      "Smart Home",
    ],
    images: [
      "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=1200",
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// NAV LINKS
// ─────────────────────────────────────────────────────────────

const navLinks = [
  {
    label: "Home",
    id: "home",
    href: "/#home",
  },
  {
    label: "Rooms",
    id: "rooms",
    href: "/#rooms",
  },
  {
    label: "Facilities",
    id: "facilities",
    href: "/#facilities",
  },
  {
    label: "Gallery",
    id: "gallery",
    href: "/#gallery",
  },
  {
    label: "Nearby Attractions",
    id: "nearby-attractions",
    href: "/#nearby-attractions",
  },
  {
    label: "Contact",
    id: "contact",
    href: "/#contact",
  },
];

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function RoomDetail({
  room,
  user,
  onBack,
  onBook,
  onMyBookings,
}) {
  const [activeImg, setActiveImg] = useState(0);
  const [imgLoading, setImgLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const roomType = room?.room_type || "Standard";

  const extra =
    ROOM_EXTRAS[roomType] || ROOM_EXTRAS.Standard;

  const images = useMemo(() => {
    const roomImage = room?.image_url?.trim();

    if (roomImage) {
      return [
        roomImage,
        ...extra.images.filter(
          (image) => image !== roomImage
        ),
      ];
    }

    return extra.images;
  }, [room?.image_url, extra]);

  const price = Number(room?.price_per_night || 0);

  const formattedPrice = price.toLocaleString("en-IN");

  const capacity = Number(room?.capacity || 2);

  const isAdmin = user?.role === "admin";

  // ───────────────────────────────────────────────────────────
  // SCROLL TOP
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "auto",
    });

    setActiveImg(0);
    setImgLoading(true);
  }, [room?.room_id, room?.room_number]);

  // ───────────────────────────────────────────────────────────
  // NAVIGATION
  // ───────────────────────────────────────────────────────────

  const handleSectionLink = (event, id) => {
    event.preventDefault();

    setMenuOpen(false);

    if (id === "rooms") {
      if (onBack) {
        onBack();
        return;
      }

      window.location.href = "/#rooms";
      return;
    }

    if (id === "home") {
      window.location.href = "/";
      return;
    }

    if (window.location.pathname !== "/") {
      window.location.href = `/#${id}`;
      return;
    }

    const element = document.getElementById(id);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      window.history.pushState(
        null,
        "",
        `/#${id}`
      );
    }
  };

  // ───────────────────────────────────────────────────────────
  // IMAGE
  // ───────────────────────────────────────────────────────────

  const handleThumbClick = (index) => {
    if (index === activeImg) return;

    setImgLoading(true);
    setActiveImg(index);
  };

  const handleImageError = (event) => {
    const fallback =
      extra.images[activeImg] || extra.images[0];

    if (
      event.currentTarget.src !== fallback &&
      fallback
    ) {
      event.currentTarget.src = fallback;
      return;
    }

    setImgLoading(false);
  };

  // ───────────────────────────────────────────────────────────
  // BOOKINGS
  // ───────────────────────────────────────────────────────────

  const handleBookings = () => {
    setMenuOpen(false);

    if (onMyBookings) {
      onMyBookings();
      return;
    }

    window.location.href = "/my-bookings";
  };

  // ───────────────────────────────────────────────────────────
  // BOOK
  // ───────────────────────────────────────────────────────────

  const handleBook = () => {
    if (isAdmin) return;

    if (!user) {
      // Auth buttons are removed.
      // Booking will not continue without login.
      return;
    }

    if (onBook && room) {
      onBook(room);
    }
  };

  // ───────────────────────────────────────────────────────────
  // POLICIES
  // ───────────────────────────────────────────────────────────

  const policies = [
    {
      icon: <IconClock />,
      text: "Check In & Check Out time is 24 hours.",
    },
    {
      icon: <IconCheck />,
      text: "50% advance payment for confirmation, balance amount to be paid on or before arrival.",
    },
    {
      icon: <IconCheck />,
      text: "Taxes as applicable.",
    },
    {
      icon: <IconCheck />,
      text: "Child policy: Below 8 years - Complimentary, 9 to 12 Years - Child policy, 12 Years & above - Adult.",
    },
    {
      icon: <IconCheck />,
      text: "Accordingly to government regulations, a valid Photo ID has to be carried by every person above the age of 18. The identification proofs accepted are Driver’s License, Voters Card, Passport & Aadhar card.",
    },
    {
      icon: <IconCheck />,
      text: "The amount paid for room does not include charges for optional services and facilities such as lunch, dinner, snacks etc. These will be charged at the time of check-out from the Hotel.",
    },
    {
      icon: <IconX />,
      text: "We do not allow unmarried / unrelated couples to check-in. This is at the full discretion of the hotel management. No refund would be applicable in case the hotel denies check-in under such circumstances.",
    },
    {
      icon: <IconSmoke />,
      text: "Smoking & Alcoholic Beverages strictly prohibited inside our hotel premises.",
    },
    {
      icon: <IconX />,
      text: "Usage of electrical items other than facilities provided by residency is strictly prohibited.",
    },
    {
      icon: <IconCheck />,
      text: "In the Hotel Premises please refrain from gambling or any conduct corrupting public morals and safety or any speech which may cause an annoyance to other Guests.",
    },
    {
      icon: <IconCheck />,
      text: "Cancellation Policy / No Show: In case of cancellation / amendment a mail / written notice must be received by the hotel at least 03 days prior to the date of arrival or else retention charges will be applicable for all the booked room nights.",
    },
    {
      icon: <IconCheck />,
      text: "Retention charge of total booked room nights will be applicable if the guest does not check in on the designated date of arrival.",
    },
    {
      icon: <IconCheck />,
      text: "The Hotel reserves the right to change/amend the above policy from time to time.",
    },
    {
      icon: <IconCheck />,
      text: "Payment options: Cash / credit / debit cards / Razorpay / Mobile banking.",
    },
    {
      icon: <IconCoffee />,
      text: "Complimentary breakfast is available from 7.30am to 10.00am.",
    },
  ];

  // ───────────────────────────────────────────────────────────
  // NO ROOM
  // ───────────────────────────────────────────────────────────

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--c-bg)] px-5">
        <div className="w-full max-w-md rounded-2xl border border-[var(--gold)]/20 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">
            <IconBed />
          </div>

          <h1 className="font-[var(--font-display)] text-xl font-bold text-[var(--c-dark)]">
            Room Not Found
          </h1>

          <p className="mt-2 text-sm leading-6 text-[var(--c-muted)]">
            The selected room could not be found. Please return to the rooms section.
          </p>

          <button
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                window.location.href = "/#rooms";
              }
            }}
            className="mt-6 rounded-xl bg-[#0f1923] px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--gold)] hover:text-black"
          >
            Back to Rooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)] font-[var(--font-body)]">

      {/* ======================================================
          NAVBAR
      ====================================================== */}

      <nav
        className="
          fixed inset-x-0 top-0 z-[500]
          flex h-[68px] items-center
          bg-black
        "
      >
        <div
          className="
            mx-auto flex h-full w-full min-w-0
            items-center justify-between
            gap-3
            px-4 sm:px-6 lg:px-[3%]
          "
        >

          {/* LOGO */}

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="
              flex flex-shrink-0
              cursor-pointer
              items-center gap-2
              border-0 bg-transparent
              p-0 text-left
            "
            aria-label="VV Grand Park Residency Home"
          >
            <img
              src="/logo.png"
              alt="VV Grand Park Residency logo"
              className="
                h-[38px] w-[38px]
                object-contain
              "
            />

            <span className="flex flex-col leading-[1.1]">
              <span
                className="
                  whitespace-nowrap
                  font-[var(--font-display)]
                  text-[0.88rem]
                  font-bold
                  tracking-[2px]
                  text-white
                "
              >
                VV GRAND PARK
              </span>

              <span
                className="
                  whitespace-nowrap
                  font-[var(--font-display)]
                  text-[0.52rem]
                  tracking-[3px]
                  text-[var(--gold-light)]
                "
              >
                RESIDENCY
              </span>
            </span>
          </button>

          {/* DESKTOP NAV */}

          <div
            className="
              hidden min-w-0 flex-1
              items-center justify-center
              gap-4
              xl:flex
              2xl:gap-[22px]
            "
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(event) =>
                  handleSectionLink(event, link.id)
                }
                className="
                  whitespace-nowrap
                  px-0.5 py-1
                  text-[0.76rem]
                  font-medium
                  text-white/75
                  no-underline
                  transition-colors
                  duration-300
                  hover:text-[var(--gold-light)]
                "
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* ==================================================
              RIGHT SIDE
              BACK TO ROOMS
          ================================================== */}

          <div
            className="
              hidden
              flex-shrink-0
              items-center
              gap-2
              xl:flex
            "
          >
            <a
              href="/#rooms"
              onClick={(event) =>
                handleSectionLink(event, "rooms")
              }
              className="
                inline-flex
                items-center
                gap-2
                whitespace-nowrap
                rounded-full
                border
                border-[var(--gold)]
                bg-[var(--gold)]/10
                px-4
                py-2
                text-[0.74rem]
                font-semibold
                text-[var(--gold-light)]
                no-underline
                transition-all
                duration-200
                hover:bg-[var(--gold)]
                hover:text-black
              "
            >
              <span className="text-base leading-none">
                ←
              </span>

              <span>Back to Rooms</span>
            </a>

            {/* USER INFO - NO SIGN IN / SIGN OUT */}

            {user && (
              <>
                <div
                  className="
                    flex items-center gap-1.5
                    whitespace-nowrap
                    rounded-full
                    border border-white/10
                    bg-white/5
                    px-3 py-1.5
                    text-[0.76rem]
                    text-white
                  "
                >
                  <IconUser />

                  <span>
                    {user.name?.split(" ")[0] || "User"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleBookings}
                  className="
                    flex items-center gap-1.5
                    whitespace-nowrap
                    rounded-md
                    border border-white/15
                    bg-white/5
                    px-3 py-1.5
                    text-[0.74rem]
                    font-semibold
                    text-white
                    transition-all
                    duration-200
                    hover:border-[var(--gold)]
                    hover:text-[var(--gold-light)]
                  "
                >
                  {user.role === "admin" ? (
                    <IconSettings />
                  ) : (
                    <IconBooking />
                  )}

                  {user.role === "admin"
                    ? "Admin Panel"
                    : "My Bookings"}
                </button>
              </>
            )}
          </div>

          {/* MOBILE MENU BUTTON */}

          <button
            type="button"
            aria-label={
              menuOpen ? "Close menu" : "Open menu"
            }
            aria-expanded={menuOpen}
            onClick={() =>
              setMenuOpen((value) => !value)
            }
            className="
              flex h-[40px] w-[40px]
              flex-shrink-0
              items-center justify-center
              rounded-lg
              border border-white/15
              bg-white/5
              text-white
              transition-all duration-200
              hover:border-[var(--gold)]
              hover:text-[var(--gold-light)]
              xl:hidden
            "
          >
            {menuOpen ? (
              <IconXMenu />
            ) : (
              <IconMenu />
            )}
          </button>
        </div>
      </nav>

      {/* ======================================================
          MOBILE MENU
      ====================================================== */}

      <div
        className={[
          `
            fixed inset-x-0 top-[68px]
            z-[490]
            overflow-hidden
            border-b border-white/10
            bg-[var(--navy)]
            shadow-2xl
            transition-all duration-300
            xl:hidden
          `,
          menuOpen
            ? `
              max-h-[calc(100vh-68px)]
              opacity-100
            `
            : `
              pointer-events-none
              max-h-0
              opacity-0
            `,
        ].join(" ")}
      >
        <div
          className="
            max-h-[calc(100vh-68px)]
            overflow-y-auto
            px-6 py-5
            sm:px-8
          "
        >

          {/* MOBILE BACK TO ROOMS */}

          <a
            href="/#rooms"
            onClick={(event) =>
              handleSectionLink(event, "rooms")
            }
            className="
              mb-4
              flex
              items-center
              gap-2
              rounded-xl
              border
              border-[var(--gold)]/30
              bg-[var(--gold)]/10
              px-4
              py-3
              text-sm
              font-semibold
              text-[var(--gold-light)]
              no-underline
              transition-all
              duration-200
              hover:bg-[var(--gold)]
              hover:text-black
            "
          >
            <span className="text-lg leading-none">
              ←
            </span>

            <span>Back to Rooms</span>
          </a>

          <div
            className="
              mb-3
              font-[var(--font-display)]
              text-[0.7rem]
              font-medium
              tracking-[2px]
              text-[var(--gold-light)]
            "
          >
            VV GRAND PARK RESIDENCY
          </div>

          {/* MOBILE NAV LINKS */}

          <div className="border-t border-white/10">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(event) =>
                  handleSectionLink(event, link.id)
                }
                className="
                  block
                  border-b border-white/5
                  py-3.5
                  text-[0.9rem]
                  font-medium
                  text-white/80
                  no-underline
                  transition-colors
                  hover:text-[var(--gold-light)]
                "
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* MOBILE USER AREA */}

          {user && (
            <div className="mt-2 border-t border-white/10">

              <div
                className="
                  flex items-center gap-2
                  border-b border-white/5
                  py-3.5
                  text-[0.82rem]
                  text-white/50
                "
              >
                <IconUser />

                <span>
                  Signed in as{" "}
                  <strong className="font-semibold text-white">
                    {user.name?.split(" ")[0] || "User"}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleBookings}
                className="
                  flex w-full
                  items-center gap-2
                  border-b border-white/5
                  py-3.5
                  text-left
                  text-[0.9rem]
                  text-white/80
                  transition-colors
                  hover:text-[var(--gold-light)]
                "
              >
                {user.role === "admin" ? (
                  <IconSettings />
                ) : (
                  <IconBooking />
                )}

                {user.role === "admin"
                  ? "Admin Panel"
                  : "My Bookings"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main
        className="
          mx-auto
          max-w-[1280px]
          px-4
          pb-8
          pt-[92px]
          sm:px-6
          md:px-8
        "
      >
        <div
          className="
            grid
            grid-cols-1
            items-start
            gap-8
            lg:grid-cols-[minmax(0,1fr)_340px]
            xl:grid-cols-[minmax(0,1fr)_360px]
          "
        >

          {/* ==================================================
              LEFT CONTENT
          ================================================== */}

          <div className="w-full min-w-0">

            {/* MAIN IMAGE */}

            <div
              className="
                relative
                mb-2.5
                h-[240px]
                overflow-hidden
                rounded-[14px]
                bg-[var(--navy)]
                sm:h-[320px]
                md:h-[380px]
                lg:h-[420px]
              "
            >
              <img
                key={images[activeImg]}
                src={images[activeImg]}
                alt={`${roomType} at VV Grand Park Residency`}
                onLoad={() => setImgLoading(false)}
                onError={handleImageError}
                className="
                  h-full
                  w-full
                  object-cover
                  opacity-100
                  transition-opacity
                  duration-300
                "
              />

              {imgLoading && (
                <div
                  className="
                    absolute inset-0
                    flex items-center justify-center
                    bg-[var(--navy)]/60
                    backdrop-blur-sm
                  "
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="
                        h-8 w-8
                        animate-spin
                        rounded-full
                        border-2
                        border-[var(--gold)]/30
                        border-t-[var(--gold)]
                      "
                    />

                    <span
                      className="
                        text-[0.7rem]
                        uppercase
                        tracking-[2px]
                        text-[var(--gold)]/70
                      "
                    >
                      Loading
                    </span>
                  </div>
                </div>
              )}

              <div
                className="
                  absolute
                  left-3.5
                  top-3.5
                  rounded-full
                  border
                  border-[var(--gold)]
                  bg-[var(--navy)]/95
                  px-3.5 py-1
                  text-xs
                  font-bold
                  text-[var(--gold)]
                  shadow-lg
                "
              >
                {roomType}
              </div>
            </div>

            {/* THUMBNAILS */}

            <div
              className="
                flex
                gap-2
                overflow-x-auto
                pb-1
                scrollbar-thin
              "
            >
              {images.map((img, index) => (
                <button
                  key={`${img}-${index}`}
                  type="button"
                  onClick={() =>
                    handleThumbClick(index)
                  }
                  aria-label={`View image ${index + 1}`}
                  aria-current={
                    activeImg === index
                      ? "true"
                      : undefined
                  }
                  className={[
                    `
                      relative
                      h-[58px]
                      w-[78px]
                      flex-shrink-0
                      cursor-pointer
                      overflow-hidden
                      rounded-lg
                      bg-[var(--navy)]
                      transition-all
                      duration-200
                    `,
                    activeImg === index
                      ? `
                        border-[2.5px]
                        border-[var(--gold)]
                        opacity-100
                        ring-2
                        ring-[var(--gold)]/20
                      `
                      : `
                        border-2
                        border-transparent
                        opacity-50
                        hover:opacity-80
                      `,
                  ].join(" ")}
                >
                  <img
                    src={img}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.opacity =
                        "0";
                    }}
                    className="
                      h-full
                      w-full
                      object-cover
                    "
                  />

                  {activeImg === index && (
                    <div
                      className="
                        absolute inset-0
                        bg-[var(--gold)]/10
                      "
                    />
                  )}
                </button>
              ))}
            </div>

            {/* TITLE */}

            <div className="mt-8">
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                  amount: 0.2,
                }}
                transition={{
                  duration: 0.5,
                  ease: "easeOut",
                }}
              >
                <div className="mb-1 flex items-start gap-2">
                  <div
                    className="
                      mt-1
                      h-5 w-1
                      flex-shrink-0
                      rounded-full
                      bg-[var(--gold)]
                    "
                  />

                  <h1
                    className="
                      font-[var(--font-display)]
                      text-xl
                      font-bold
                      leading-tight
                      text-[var(--c-dark)]
                      sm:text-2xl
                    "
                  >
                    Room{" "}
                    {room.room_number || room.room_id}{" "}
                    — {roomType}
                  </h1>
                </div>

                <p
                  className="
                    mb-7
                    mt-3
                    text-[0.9rem]
                    leading-7
                    text-[var(--c-muted)]
                    sm:text-[0.92rem]
                  "
                >
                  {room.description ||
                    "A beautifully furnished room combining modern aesthetics with premium comfort. Every detail has been carefully curated to ensure an unforgettable stay."}
                </p>
              </motion.div>

              {/* AMENITIES */}

              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                  amount: 0.2,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.1,
                  ease: "easeOut",
                }}
              >
                <div
                  className="
                    mb-3.5
                    flex items-center gap-2
                  "
                >
                  <div
                    className="
                      h-4 w-1
                      rounded-full
                      bg-[var(--gold)]
                    "
                  />

                  <h2
                    className="
                      font-[var(--font-display)]
                      text-base
                      font-bold
                      text-[var(--c-dark)]
                    "
                  >
                    Room Amenities
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {extra.amenities.map(
                    (amenity, index) => (
                      <motion.div
                        key={amenity}
                        initial={{
                          opacity: 0,
                          scale: 0.9,
                        }}
                        whileInView={{
                          opacity: 1,
                          scale: 1,
                        }}
                        viewport={{
                          once: true,
                        }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.03,
                          ease: "easeOut",
                        }}
                        whileHover={{
                          scale: 1.03,
                        }}
                        className="
                          flex
                          cursor-default
                          items-center gap-1.5
                          rounded-xl
                          border
                          border-[var(--gold)]/25
                          bg-[var(--navy)]
                          px-3.5 py-2
                          text-[0.8rem]
                          font-semibold
                          text-[var(--gold)]
                        "
                      >
                        <IconCheck />
                        <span>{amenity}</span>
                      </motion.div>
                    )
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* ==================================================
              SIDEBAR
          ================================================== */}

          <aside
            className="
              order-first
              w-full
              self-start
              lg:order-last
              lg:sticky
              lg:top-[84px]
            "
          >
            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-[var(--gold)]/20
                bg-white
                shadow-[0_4px_24px_rgba(0,0,0,0.08)]
              "
            >

              {/* PRICE HEADER */}

              <div
                className="
                  relative
                  overflow-hidden
                  bg-[var(--navy)]
                  px-5 py-6
                  sm:px-6
                "
              >
                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-6
                    -top-6
                    h-24 w-24
                    rounded-full
                    bg-[var(--gold)]/10
                    blur-2xl
                  "
                />

                <div className="mb-1.5 flex items-center gap-2">
                  <div
                    className="
                      h-1.5 w-1.5
                      rounded-full
                      bg-[var(--gold)]
                    "
                  />

                  <span
                    className="
                      text-[0.68rem]
                      font-semibold
                      uppercase
                      tracking-[2px]
                      text-white/40
                    "
                  >
                    Starting from
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span
                    className="
                      font-[var(--font-display)]
                      text-[2rem]
                      font-extrabold
                      leading-none
                      text-white
                      sm:text-[2.4rem]
                    "
                  >
                    ₹{formattedPrice}
                  </span>

                  <span className="text-sm text-white/40">
                    /night
                  </span>
                </div>

                <div
                  className="
                    mt-3
                    flex items-center justify-between
                    gap-3
                  "
                >
                  <div
                    className="
                      flex items-center gap-1.5
                      text-[0.78rem]
                      text-white/50
                    "
                  >
                    <IconUsers />
                    Up to {capacity} guests
                  </div>

                  <div
                    className="
                      rounded-full
                      border
                      border-[var(--gold)]
                      bg-[var(--gold)]/10
                      px-2.5 py-1
                      text-[0.68rem]
                      font-semibold
                      text-[var(--gold)]
                    "
                  >
                    Best Price
                  </div>
                </div>

                <div
                  className="
                    absolute
                    bottom-0
                    left-0
                    right-0
                    h-px
                    bg-gradient-to-r
                    from-transparent
                    via-[var(--gold)]/30
                    to-transparent
                  "
                />
              </div>

              {/* STATS */}

              <div
                className="
                  grid
                  grid-cols-3
                  border-b
                  border-[var(--c-border)]
                  bg-white
                "
              >
                {[
                  {
                    icon: <IconBed />,
                    label: "Type",
                    val: roomType,
                  },
                  {
                    icon: <IconUsers />,
                    label: "Guests",
                    val: capacity,
                  },
                  {
                    icon: <IconStar />,
                    label: "Rating",
                    val: "4.9",
                  },
                ].map((stat, index) => (
                  <div
                    key={index}
                    className={[
                      `
                        flex
                        min-w-0
                        flex-col
                        items-center
                        gap-1.5
                        px-2 py-4
                      `,
                      index < 2
                        ? `
                          border-r
                          border-[var(--c-border)]
                        `
                        : "",
                    ].join(" ")}
                  >
                    <div
                      className="
                        flex
                        h-8 w-8
                        items-center
                        justify-center
                        rounded-xl
                        bg-[var(--gold)]/10
                        text-[var(--gold)]
                      "
                    >
                      {stat.icon}
                    </div>

                    <div
                      className="
                        w-full
                        truncate
                        text-center
                        text-[0.78rem]
                        font-bold
                        text-[var(--navy)]
                        sm:text-[0.82rem]
                      "
                    >
                      {stat.val}
                    </div>

                    <div
                      className="
                        text-[0.6rem]
                        uppercase
                        tracking-[1.5px]
                        text-[var(--c-muted)]
                      "
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* BOOK BUTTON */}

              <div className="bg-white px-5 pb-3 pt-5">
                <button
                  type="button"
                  onClick={handleBook}
                  disabled={isAdmin}
                  title={
                    isAdmin
                      ? "Admin cannot book from user room details"
                      : "Book this room"
                  }
                  className={[
                    `
                      w-full
                      rounded-xl
                      py-4
                      text-base
                      font-bold
                      transition-all
                      duration-200
                    `,
                    isAdmin
                      ? `
                        cursor-not-allowed
                        bg-[#DEE2E6]
                        text-[#868E96]
                      `
                      : `
                        bg-[#0f1923]
                        text-white
                        hover:-translate-y-[1px]
                        hover:bg-[var(--gold)]
                        hover:text-black
                        active:translate-y-0
                      `,
                  ].join(" ")}
                >
                  {isAdmin
                    ? "Admin Booking Disabled"
                    : "Book Now"}
                </button>

                <p
                  className="
                    mt-2
                    text-center
                    text-xs
                    leading-5
                    text-[var(--c-muted)]
                  "
                >
                  Less than 24 hours before check-in:
                  100% of the first night's room charge;
                  for booking cancellation and refund
                  requests, please contact the hotel
                  administration.
                </p>
              </div>

              {/* PRICE ESTIMATE */}

              <div className="bg-white px-5 pb-5">
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 16,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.2,
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeOut",
                  }}
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-[var(--gold)]/20
                  "
                >
                  <div
                    className="
                      flex items-center justify-between
                      bg-[var(--gold)]
                      px-4 py-3
                    "
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="
                          h-3.5 w-1
                          rounded-full
                          bg-[var(--navy)]
                        "
                      />

                      <span
                        className="
                          text-[0.7rem]
                          font-bold
                          uppercase
                          tracking-[2px]
                          text-[var(--navy)]
                        "
                      >
                        Price Estimate
                      </span>
                    </div>

                    <span
                      className="
                        text-[0.68rem]
                        font-medium
                        text-[var(--navy)]/60
                      "
                    >
                      per room
                    </span>
                  </div>

                  <div
                    className="
                      divide-y
                      divide-[var(--gold)]/10
                      bg-[var(--navy)]
                    "
                  >
                    {[1, 2, 3, 5, 7].map(
                      (n, index) => (
                        <motion.div
                          key={n}
                          initial={{
                            opacity: 0,
                            x: -12,
                          }}
                          whileInView={{
                            opacity: 1,
                            x: 0,
                          }}
                          viewport={{
                            once: true,
                          }}
                          transition={{
                            duration: 0.35,
                            delay: index * 0.06,
                            ease: "easeOut",
                          }}
                          whileHover={{
                            backgroundColor:
                              "rgba(201,168,76,0.08)",
                          }}
                          className="
                            flex
                            items-center
                            justify-between
                            px-4 py-3
                          "
                        >
                          <div
                            className="
                              flex
                              items-center
                              gap-2.5
                            "
                          >
                            <div
                              className="
                                flex
                                h-6 w-6
                                items-center
                                justify-center
                                rounded-lg
                                bg-[var(--gold)]/15
                                text-[0.68rem]
                                font-bold
                                text-[var(--gold)]
                              "
                            >
                              {n}
                            </div>

                            <span
                              className="
                                text-[0.82rem]
                                text-white/50
                              "
                            >
                              night{n > 1 ? "s" : ""}
                            </span>
                          </div>

                          <span
                            className="
                              text-[0.88rem]
                              font-bold
                              text-[var(--gold)]
                            "
                          >
                            ₹
                            {(price * n).toLocaleString(
                              "en-IN"
                            )}
                          </span>
                        </motion.div>
                      )
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* TRUST BADGES */}

            <div
              className="
                mt-3.5
                flex
                justify-center
                gap-4
                sm:gap-5
              "
            >
              {[
                {
                  icon: <IconShield />,
                  label: "Secure",
                },
                {
                  icon: <IconBadge />,
                  label: "Verified",
                },
                {
                  icon: <IconTag />,
                  label: "Best Price",
                },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="
                    flex
                    items-center
                    gap-1
                    text-xs
                    font-medium
                    text-[var(--c-muted)]
                  "
                >
                  <span className="text-[var(--gold)]">
                    {badge.icon}
                  </span>

                  {badge.label}
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* ======================================================
            HOTEL POLICIES
        ====================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 24,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.2,
          }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
          className="
            mt-12
            w-full
            rounded-2xl
            border
            border-[var(--gold)]/20
            bg-[var(--navy)]
            p-4
            sm:p-5
          "
        >
          <div
            className="
              mb-4
              flex items-center gap-2
            "
          >
            <div
              className="
                h-4 w-1
                rounded-full
                bg-[var(--gold)]
              "
            />

            <h2
              className="
                font-[var(--font-display)]
                text-base
                font-bold
                text-white
              "
            >
              Hotel Policies
            </h2>
          </div>

          <div
            className="
              grid
              w-full
              grid-cols-1
              gap-2.5
              md:grid-cols-2
            "
          >
            {policies.map(
              (policy, index) => (
                <motion.div
                  key={index}
                  initial={{
                    opacity: 0,
                    x: -16,
                  }}
                  whileInView={{
                    opacity: 1,
                    x: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.3,
                  }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.04,
                    ease: "easeOut",
                  }}
                  whileHover={{
                    scale: 1.01,
                  }}
                  className="
                    flex
                    h-full
                    cursor-default
                    items-start
                    gap-3
                    rounded-xl
                    border
                    border-[var(--gold)]/20
                    bg-white/5
                    px-3.5 py-3
                    transition-colors
                    hover:border-[var(--gold)]/40
                    hover:bg-[var(--gold)]/10
                  "
                >
                  <span
                    className="
                      mt-0.5
                      flex
                      h-7 w-7
                      flex-shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-[var(--gold)]/15
                      text-[var(--gold)]
                    "
                  >
                    {policy.icon}
                  </span>

                  <span
                    className="
                      text-[0.78rem]
                      leading-snug
                      text-white/70
                    "
                  >
                    {policy.text}
                  </span>
                </motion.div>
              )
            )}
          </div>
        </motion.section>
      </main>
    </div>
  );
}