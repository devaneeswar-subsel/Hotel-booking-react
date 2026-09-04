import React, { useState, useEffect } from "react";
import "./App.css";
import { SearchIcon, UserIcon, ArrowRightIcon } from "./Icons";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getRoomSlug } from "./utils/roomSlug";
const API = process.env.REACT_APP_API_URL;

const FALLBACK = {
  Standard:
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=700",
  Deluxe:
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=700",
  Suite:
    "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=700",
  Luxury:
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=700",
  Presidential:
    "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=700",
};

const FALLBACK_ROOMS = [
  {
    room_id: "fallback-standard-ac",
    room_number: "110",
    room_type: "Deluxe Room",
    price_per_night: 2500,
    capacity: 2,
    description:
      "Comfortable Deluxe Room at VV Grand Park Residency with a cozy stay, modern amenities, and a relaxing atmosphere in Thiruvarur.",
    image_url: FALLBACK.Standard,
  },
  {
    room_id: "fallback-suite-room",
    room_number: "205",
    room_type: "Suite Room",
    price_per_night: 5000,
    capacity: 3,
    description:
      "Premium Suite Room designed for a refined stay with spacious interiors, tasteful décor, and an elevated guest experience.",
    image_url: FALLBACK.Suite,
  },
  {
    room_id: "fallback-suite-balcony",
    room_number: "310",
    room_type: "Suite with Balcony",
    price_per_night: 5600,
    capacity: 4,
    description:
      "Elegant Suite with Balcony offering extra space, scenic views, and luxurious amenities for a memorable stay in Thiruvarur.",
    image_url: FALLBACK.Luxury,
  },
];

export default function Rooms({
  user,
  onBookClick,
  onAuthPrompt,
}) {
  const [showAll, setShowAll] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    minPrice: "",
    maxPrice: "",
  });

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetchRooms();
  }, []); // eslint-disable-line

  async function fetchRooms(currentFilters = filters) {
    setLoading(true);
    setError("");
    setShowAll(false);

    try {
      const p = new URLSearchParams();

      if (currentFilters.type) {
        p.set("type", currentFilters.type);
      }

      if (currentFilters.minPrice) {
        p.set("min_price", currentFilters.minPrice);
      }

      if (currentFilters.maxPrice) {
        p.set("max_price", currentFilters.maxPrice);
      }

      const queryString = p.toString() ? `?${p.toString()}` : "";

      const res = await fetch(`${API}/api/rooms${queryString}`);

      if (!res.ok) {
        throw new Error("Server error");
      }

      const data = await res.json();

      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setRooms(FALLBACK_ROOMS);
      setError("");
    } finally {
      setLoading(false);
    }
  }

  function handleBook(e, room) {
    e.stopPropagation();

    if (isAdmin) return;

    if (!user) {
      onAuthPrompt();
      return;
    }

    onBookClick(room);
  }

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: {
      duration: 0.6,
      delay,
      ease: "easeOut",
    },
  });

  const INITIAL_COUNT = 9;

  const visibleRooms = showAll
    ? rooms
    : rooms.slice(0, INITIAL_COUNT);

  return (
    <section
      id="rooms"
      aria-labelledby="rooms-heading"
      className="mx-auto max-w-7xl px-6 md:px-8 lg:px-12 py-4 sm:py-8 md:py-12 lg:py-20"
    >
      {/* SEO Intro */}
      <motion.div {...fadeUp(0)} className="section-eyebrow centered">
        <span className="block text-center">Accommodation in Thiruvarur</span>
      </motion.div>

      <motion.h2
        {...fadeUp(0.15)}
        id="rooms-heading"
        className="section-title text-center"
      >
        Hotel Rooms in <em>Thiruvarur</em>
      </motion.h2>

      <motion.p
        {...fadeUp(0.2)}
        className="max-w-3xl mx-auto text-center mt-4 mb-8 font-body"
      >
        Discover comfortable and well-appointed rooms at VV Grand Park
        Residency in Thiruvarur, Tamil Nadu. Choose from our available room
        types and enjoy modern amenities, comfortable accommodation, and
        convenient access to nearby temples and local attractions.
      </motion.p>

      {/* Filters */}
      <div
        className="rooms-filter-bar"
        aria-label="Filter hotel rooms"
      >
        <label className="sr-only" htmlFor="room-type-filter">
          Select room type
        </label>

        <select
          id="room-type-filter"
          className="filter-select"
          value={filters.type}
          onChange={(e) =>
            setFilters({
              ...filters,
              type: e.target.value,
            })
          }
        >
          <option value="">All Room Types</option>
          <option>Deluxe Room</option>
          <option>Suite Room</option>
          <option>Suite with Balcony</option>
        </select>

        <label className="sr-only" htmlFor="minimum-room-price">
          Minimum room price
        </label>

        <input
          id="minimum-room-price"
          className="filter-input"
          type="number"
          min="0"
          placeholder="Min price ₹"
          aria-label="Minimum room price"
          value={filters.minPrice}
          onChange={(e) =>
            setFilters({
              ...filters,
              minPrice: e.target.value,
            })
          }
        />

        <label className="sr-only" htmlFor="maximum-room-price">
          Maximum room price
        </label>

        <input
          id="maximum-room-price"
          className="filter-input"
          type="number"
          min="0"
          placeholder="Max price ₹"
          aria-label="Maximum room price"
          value={filters.maxPrice}
          onChange={(e) =>
            setFilters({
              ...filters,
              maxPrice: e.target.value,
            })
          }
        />

        <button
          className="btn btn-primary"
          onClick={() => fetchRooms(filters)}
          aria-label="Search available hotel rooms"
        >
          <SearchIcon size={15} color="#fff" />
          Search
        </button>

        {(filters.type ||
          filters.minPrice ||
          filters.maxPrice) && (
          <button
            className="btn btn-outline"
            onClick={() => {
              const cleared = {
                type: "",
                minPrice: "",
                maxPrice: "",
              };

              setFilters(cleared);
              fetchRooms(cleared);
            }}
            aria-label="Clear room filters"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="error-msg"
          role="alert"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />

            <line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            />

            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            />
          </svg>

          {error}
        </div>
      )}

      {/* Room Grid */}
      <div
        className="rooms-grid"
        aria-live="polite"
      >
        {loading ? (
          Array(3)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="room-skeleton"
                aria-hidden="true"
              >
                <div className="skeleton-img" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            ))
        ) : rooms.length === 0 ? (
          <div
            className="empty"
            style={{
              gridColumn: "1/-1",
            }}
          >
            <div className="empty-icon">
              <SearchIcon
                size={22}
                color="var(--gray-400)"
              />
            </div>

            <p>
              No rooms found. Try adjusting your filters.
            </p>
          </div>
        ) : (
        visibleRooms.map((room, index) => {
  const roomName =
    room.room_type ||
    "Hotel Room";

  const roomSlug = getRoomSlug(roomName);

            const roomDescription =
              room.description ||
              `Comfortable ${roomName} accommodation at VV Grand Park Residency in Thiruvarur with modern amenities and premium comfort.`;

            const roomPrice =
              Number(room.price_per_night);

            const roomCapacity =
              room.capacity || 2;

            const roomImage =
              room.image_url ||
              FALLBACK[room.room_type] ||
              FALLBACK.Deluxe;

            return (
            <motion.article
  key={room.room_id}
  className="room-card"
  initial={{
    opacity: 0,
    y: 40,
  }}
  whileInView={{
    opacity: 1,
    y: 0,
  }}
  viewport={{
    once: true,
  }}
  transition={{
    duration: 0.6,
    delay: index * 0.1,
    type: "spring",
    stiffness: 80,
  }}
  itemScope
  itemType="https://schema.org/HotelRoom"
>
  <Link
    to={`/rooms/${roomSlug}`}
    className="block"
    aria-label={`View ${roomName} details`}
  >
    <div className="room-card-img">
      <img
        src={roomImage}
        alt={`${roomName} at VV Grand Park Residency, Thiruvarur`}
        loading={
          index < 3
            ? "eager"
            : "lazy"
        }
        decoding="async"
        width="700"
        height="467"
        itemProp="image"
        onError={(e) => {
          e.currentTarget.src =
            FALLBACK.Deluxe;
        }}
      />

      <div
        className="room-type-badge"
        itemProp="name"
      >
        {roomName}
      </div>
    </div>

    <div className="room-card-body">
      <div
        className="font-body font-bold"
        itemProp="identifier"
      >
        Room{" "}
        {room.room_number ||
          `#${room.room_id}`}
      </div>

      <p
        className="truncate"
        title={roomDescription}
        itemProp="description"
      >
        {roomDescription}
      </p>

      <div className="room-card-footer">
        <div
          className="font-body"
          itemScope
          itemType="https://schema.org/Offer"
        >
          <meta
            itemProp="priceCurrency"
            content="INR"
          />

          <span itemProp="price">
            ₹
            {roomPrice.toLocaleString()}
          </span>

          <span>
            {" "}
            /night
          </span>
        </div>

        <div className="font-body room-capacity">
          <UserIcon
            size={13}
            color="var(--gray-400)"
            aria-hidden="true"
          />

          <span>
            {roomCapacity} Adults +
            1 Child (Below 5 Years)
          </span>
        </div>
      </div>
    </div>
  </Link>

  {/* Booking button must stay outside Link */}
  <div className="px-4 pb-4">
    <button
      className="book-btn"
      onClick={(e) =>
        handleBook(e, room)
      }
      disabled={isAdmin}
      title={
        isAdmin
          ? "Admin cannot book from user room cards"
          : ""
      }
      aria-label={
        isAdmin
          ? `Booking disabled for ${roomName}`
          : `Book ${roomName} at VV Grand Park Residency`
      }
    >
      {isAdmin
        ? "Admin Booking Disabled"
        : "Book Now"}

      {!isAdmin && (
        <ArrowRightIcon
          size={15}
          color="#fff"
        />
      )}
    </button>
  </div>
</motion.article>
            );
          })
        )}
      </div>

      {/* Show More / Show Less */}
      {!loading &&
        rooms.length > INITIAL_COUNT && (
          <div className="flex justify-center mt-8">
            <button
              className="btn btn-outline"
              onClick={() =>
                setShowAll((prev) => !prev)
              }
              aria-expanded={showAll}
              aria-controls="rooms"
            >
              {showAll
                ? "Show Less"
                : `Show More (${
                    rooms.length -
                    INITIAL_COUNT
                  } more)`}
            </button>
          </div>
        )}
    </section>
  );
}