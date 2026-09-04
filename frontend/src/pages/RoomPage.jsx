import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import RoomDetail from "../Roomdetail";
import { SLUG_TO_ROOM_TYPE } from "../utils/roomSlug";

const API = process.env.REACT_APP_API_URL;

const HOTEL_NAME = "VV Grand Park Residency";
const HOTEL_URL = "https://www.vvgrandpark.com";
const ROOMS_URL = `${HOTEL_URL}/rooms`;

const ROOM_SEO = {
  standard: {
    name: "Standard Room",
    title:
      "Standard Room in Thiruvarur | VV Grand Park Residency",
    description:
      "Book a comfortable Standard Room at VV Grand Park Residency in Thiruvarur. Enjoy complimentary breakfast, free WiFi, air conditioning, room service and modern hotel amenities.",
  },

  deluxe: {
    name: "Deluxe Room",
    title:
      "Deluxe Room in Thiruvarur | VV Grand Park Residency",
    description:
      "Book a comfortable Deluxe Room at VV Grand Park Residency in Thiruvarur. Enjoy modern amenities, comfortable accommodation and premium comfort.",
  },

  suite: {
    name: "Suite Room",
    title:
      "Suite Room in Thiruvarur | VV Grand Park Residency",
    description:
      "Book a spacious Suite Room at VV Grand Park Residency in Thiruvarur with modern amenities, premium comfort and a relaxing stay.",
  },

  "suite-with-balcony": {
    name: "Suite with Balcony",
    title:
      "Suite with Balcony in Thiruvarur | VV Grand Park Residency",
    description:
      "Book a Suite with Balcony at VV Grand Park Residency in Thiruvarur. Enjoy spacious accommodation, modern amenities and a relaxing balcony experience.",
  },
};

function getRoomMatches(slug) {
  return SLUG_TO_ROOM_TYPE[slug] || [];
}

function findRoomBySlug(rooms, slug) {
  const matches = getRoomMatches(slug);

  if (!matches.length) {
    return null;
  }

  return (
    rooms.find((room) =>
      matches.some(
        (type) =>
          String(room.room_type || "")
            .trim()
            .toLowerCase() ===
          String(type)
            .trim()
            .toLowerCase()
      )
    ) || null
  );
}

function formatPrice(value) {
  const price = Number(value);

  if (!Number.isFinite(price)) {
    return null;
  }

  return price.toLocaleString("en-IN");
}

export default function RoomPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizedSlug = String(slug || "")
    .trim()
    .toLowerCase();

  const seo = ROOM_SEO[normalizedSlug];

  useEffect(() => {
    let cancelled = false;

    async function loadRoom() {
      setLoading(true);
      setError("");
      setRoom(null);

      if (!seo) {
        setLoading(false);
        setError("Room not found.");
        return;
      }

      try {
        const response = await fetch(
          `${API}/api/rooms`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch rooms: ${response.status}`
          );
        }

        const data = await response.json();

        const rooms = Array.isArray(data)
          ? data
          : Array.isArray(data?.rooms)
          ? data.rooms
          : [];

        const matchedRoom = findRoomBySlug(
          rooms,
          normalizedSlug
        );

        if (cancelled) {
          return;
        }

        if (!matchedRoom) {
          setError(
            "This room is currently unavailable."
          );
          setRoom(null);
          return;
        }

        setRoom(matchedRoom);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Room page loading error:",
          err
        );

        setError(
          "Unable to load room details. Please try again."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRoom();

    return () => {
      cancelled = true;
    };
  }, [normalizedSlug, seo]);

  const roomName =
    room?.room_type || seo?.name;

  const roomDescription =
    room?.description ||
    seo?.description ||
    `Stay at ${HOTEL_NAME} in Thiruvarur.`;

  const roomPrice = formatPrice(
    room?.price_per_night
  );

  const roomImage =
    room?.image_url ||
    `${HOTEL_URL}/logo.png`;

  const canonicalUrl = `${ROOMS_URL}/${normalizedSlug}`;

  const hotelAddress = useMemo(
    () => ({
      "@type": "PostalAddress",
      streetAddress: "3/4/D, Thanjai Saalai",
      addressLocality: "Thiruvarur",
      postalCode: "610004",
      addressCountry: "IN",
    }),
    []
  );

  const hotelJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "HotelRoom",
      name: roomName,
      description: roomDescription,
      url: canonicalUrl,
      image: roomImage,

      containedInPlace: {
        "@type": "Hotel",
        name: HOTEL_NAME,
        url: HOTEL_URL,
        address: hotelAddress,
      },

      ...(roomPrice
        ? {
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: Number(
                room?.price_per_night
              ),
              url: canonicalUrl,
              seller: {
                "@type": "Hotel",
                name: HOTEL_NAME,
              },
            },
          }
        : {}),

      ...(room?.capacity
        ? {
            occupancy: {
              "@type":
                "QuantitativeValue",
              maxValue: Number(
                room.capacity
              ),
            },
          }
        : {}),
    }),
    [
      room,
      roomName,
      roomDescription,
      roomImage,
      roomPrice,
      canonicalUrl,
      hotelAddress,
    ]
  );

  const breadcrumbJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: HOTEL_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Rooms",
          item: ROOMS_URL,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: roomName,
          item: canonicalUrl,
        },
      ],
    }),
    [roomName, canonicalUrl]
  );

  // ------------------------------------------------------------
  // INVALID ROOM SLUG
  // ------------------------------------------------------------
  if (!seo) {
    return (
      <>
        <Helmet>
          <title>
            Room Not Found | {HOTEL_NAME}
          </title>

          <meta
            name="robots"
            content="noindex, follow"
          />
        </Helmet>

        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-6">
          <div className="max-w-xl text-center">
            <h1 className="font-['Playfair_Display'] text-3xl font-semibold text-[#0F1923]">
              Room Not Found
            </h1>

            <p className="mt-4 text-[#666666]">
              The room you are looking for
              could not be found.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/#rooms")
              }
              className="mt-7 rounded-full bg-[#0F1923] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C9A84C]"
            >
              View All Rooms
            </button>
          </div>
        </div>
      </>
    );
  }

  // ------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------
  if (loading) {
    return (
      <>
        <Helmet>
          <title>{seo.title}</title>

          <meta
            name="description"
            content={seo.description}
          />

          <meta
            name="robots"
            content="index, follow"
          />

          <link
            rel="canonical"
            href={canonicalUrl}
          />
        </Helmet>

        <div className="min-h-screen flex items-center justify-center bg-[#0F1923]">
          <div className="text-center">
            <div className="font-['Playfair_Display'] text-[1.2rem] tracking-[2px] text-[#C9A84C]">
              VV GRAND PARK
            </div>

            <div className="mt-3 text-[0.8rem] text-white/50">
              Loading room details...
            </div>
          </div>
        </div>
      </>
    );
  }

  // ------------------------------------------------------------
  // ROOM NOT AVAILABLE / API ERROR
  // ------------------------------------------------------------
  if (!room) {
    return (
      <>
        <Helmet>
          <title>
            {seo.title}
          </title>

          <meta
            name="description"
            content={seo.description}
          />

          <meta
            name="robots"
            content="noindex, follow"
          />

          <link
            rel="canonical"
            href={canonicalUrl}
          />
        </Helmet>

        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-6">
          <div className="max-w-xl text-center">
            <h1 className="font-['Playfair_Display'] text-3xl font-semibold text-[#0F1923]">
              {seo.name}
            </h1>

            <p className="mt-4 text-[#666666]">
              {error ||
                "Room details are currently unavailable."}
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/#rooms")
              }
              className="mt-7 rounded-full bg-[#0F1923] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C9A84C]"
            >
              Back to Rooms
            </button>
          </div>
        </div>
      </>
    );
  }

  // ------------------------------------------------------------
  // ROOM PAGE
  // ------------------------------------------------------------
  return (
    <>
      <Helmet>
        <title>{seo.title}</title>

        <meta
          name="description"
          content={seo.description}
        />

        <meta
          name="robots"
          content="index, follow"
        />

        <link
          rel="canonical"
          href={canonicalUrl}
        />

        {/* Open Graph */}
        <meta
          property="og:type"
          content="website"
        />

        <meta
          property="og:title"
          content={seo.title}
        />

        <meta
          property="og:description"
          content={seo.description}
        />

        <meta
          property="og:url"
          content={canonicalUrl}
        />

        <meta
          property="og:site_name"
          content={HOTEL_NAME}
        />

        {roomImage && (
          <meta
            property="og:image"
            content={roomImage}
          />
        )}

        {/* Twitter */}
        <meta
          name="twitter:card"
          content="summary_large_image"
        />

        <meta
          name="twitter:title"
          content={seo.title}
        />

        <meta
          name="twitter:description"
          content={seo.description}
        />

        {roomImage && (
          <meta
            name="twitter:image"
            content={roomImage}
          />
        )}

        {/* HotelRoom Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(hotelJsonLd)}
        </script>

        {/* Breadcrumb Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(
            breadcrumbJsonLd
          )}
        </script>
      </Helmet>

      <div className="min-h-screen bg-white">

        {/* ------------------------------------------------------
            EXISTING ROOM DETAIL COMPONENT
        ------------------------------------------------------ */}
        <RoomDetail
          room={room}
          user={null}
          onBack={() =>
            navigate("/#rooms")
          }
          onBook={(selectedRoom) => {
            console.log(
              "Book room:",
              selectedRoom
            );
          }}
          onAuthPrompt={() => {
            navigate("/#rooms");
          }}
        />

      </div>
    </>
  );
}