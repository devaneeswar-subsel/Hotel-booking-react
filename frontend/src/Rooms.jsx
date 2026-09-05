import React, { useState, useEffect } from "react";
import RoomSearchBar from "./RoomSearchBar";
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
  const [searchError, setSearchError] = useState("");
  // retained so the initial unfiltered fetch keeps working
  const [filters] = useState({
    type: "",
    minPrice: "",
    maxPrice: "",
  });

  // criteria from the search bar; null until the guest searches
  const [search, setSearch] = useState(null);
  const [searching, setSearching] = useState(false);

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

  // Look up rooms free for the chosen dates. The backend already excludes
  // rooms that are booked or blocked in that range, so we only add the
  // guest-capacity maths on top.
  async function handleSearch(criteria) {
    setSearching(true);
    setSearchError("");
    setShowAll(false);

    try {
      const p = new URLSearchParams();
      p.set("check_in", criteria.check_in);
      p.set("check_out", criteria.check_out);
      if (criteria.type) p.set("type", criteria.type);

      const res = await fetch(`${API}/api/rooms?${p.toString()}`);
      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
      setSearch(criteria);
    } catch {
      setRooms([]);
      setSearchError("Could not check availability. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  function handleBook(e, room) {
    e.stopPropagation();

    if (isAdmin) return;

    // signed-out visitors go straight to guest checkout instead of a
    // login wall — the room is passed so the modal knows what to book
    if (!user) {
      onAuthPrompt(room, search);
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

  /*
   * Capacity maths. A Deluxe room sleeps 2, a Suite sleeps 4 (whatever the
   * room's own `capacity` column says). A party larger than one room's
   * capacity needs several rooms of that type, so we work out how many are
   * required and only offer a type when that many are actually free.
   */
  const totalGuests = search
    ? Math.max(1, Number(search.adults || 0) + Number(search.children || 0))
    : 0;

  // Treat a missing/zero capacity as 2 rather than 1. With 1, a party of 4
  // would "need" 4 rooms and every search would come back empty.
  const capacityOf = (room) => {
    const cap = Number(room.capacity);
    return Number.isFinite(cap) && cap > 0 ? cap : 2;
  };

  const roomsNeededFor = (room) =>
    Math.ceil(totalGuests / capacityOf(room));

  // group the free rooms by type so we can compare stock against demand
  const availabilityByType = {};
  if (search) {
    rooms.forEach((room) => {
      const key = room.room_type || "Room";
      if (!availabilityByType[key]) {
        availabilityByType[key] = {
          type: key,
          capacity: capacityOf(room),
          needed: roomsNeededFor(room),
          rooms: [],
        };
      }
      availabilityByType[key].rooms.push(room);
    });
  }

  const availabilityGroups = Object.values(availabilityByType);

  // a type only works if enough of its rooms are free for the whole party
  const usableGroups = availabilityGroups.filter(
    (g) => g.rooms.length >= g.needed,
  );

  /*
   * Offer exactly the number of rooms the party needs, not every free room
   * of that type. 4 guests in a Suite that sleeps 4 is one room; 6 guests
   * needs two. Anything beyond `needed` is still free, just not required.
   */
  const searchResultRooms = search
    ? usableGroups.flatMap((g) => g.rooms.slice(0, g.needed))
    : rooms;

  /*
   * Before the guest searches we show a showcase: one representative card per
   * room type, so they can see what is offered and at what price. Those cards
   * carry no room number and no Book button — a specific room can only be
   * booked once we know the dates are actually free.
   */
  const showcaseRooms = [];
  if (!search) {
    const seen = new Set();
    rooms.forEach((room) => {
      const key = room.room_type || "Room";
      if (!seen.has(key)) {
        seen.add(key);
        showcaseRooms.push(room);
      }
    });
  }

  const isShowcase = !search;

  const listedRooms = isShowcase ? showcaseRooms : searchResultRooms;

  const visibleRooms = showAll
    ? listedRooms
    : listedRooms.slice(0, INITIAL_COUNT);

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

      {/* Availability search */}
      <RoomSearchBar onSearch={handleSearch} searching={searching} />

      {/* What the search found */}
      {search && !searching && (
        <div className="mx-auto mb-8 max-w-6xl">
          {usableGroups.length > 0 ? (
            <div className="rounded-xl border border-[#E9ECEF] bg-white px-5 py-4">
              <p className="m-0 text-[0.86rem] font-semibold text-[#0F1923]">
                {searchResultRooms.length} room
                {searchResultRooms.length === 1 ? "" : "s"} available for{" "}
                {totalGuests} guest{totalGuests === 1 ? "" : "s"} from{" "}
                {search.check_in} to {search.check_out}
              </p>

              {/* tell the guest when one room will not hold the whole party */}
              {usableGroups.some((g) => g.needed > 1) && (
                <ul className="mt-2 list-none space-y-1 p-0">
                  {usableGroups
                    .filter((g) => g.needed > 1)
                    .map((g) => (
                      <li
                        key={g.type}
                        className="text-[0.8rem] text-[#8A6A22]"
                      >
                        <strong>{g.type}</strong> sleeps {g.capacity} guest
                        {g.capacity === 1 ? "" : "s"} — you will need{" "}
                        <strong>{g.needed} rooms</strong> for {totalGuests}{" "}
                        guests. {g.rooms.length} available on these dates.
                      </li>
                    ))}
                </ul>
              )}

              {/* types that exist but cannot host this party */}
              {availabilityGroups
                .filter((g) => g.rooms.length < g.needed)
                .map((g) => (
                  <p
                    key={g.type}
                    className="mt-1.5 text-[0.8rem] text-[#8A95A3]"
                  >
                    {g.type}: needs {g.needed} rooms for {totalGuests} guests,
                    only {g.rooms.length} free on these dates.
                  </p>
                ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#E9ECEF] bg-white px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3F7]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A95A3" strokeWidth="1.8">
                  <path d="M2 17v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5M2 17h20M2 17v3M22 17v3M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
                </svg>
              </div>
              <h3 className="m-0 text-[1.05rem] font-bold text-[#0F1923]">
                No Rooms Available
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-[0.85rem] text-[#8A95A3]">
                {availabilityGroups.length === 0
                  ? `No rooms are free from ${search.check_in} to ${search.check_out}${
                      search.type ? ` in ${search.type}` : ""
                    }. Please try different dates.`
                  : `We have rooms free on these dates, but not enough of one type to host ${totalGuests} guests together.`}
              </p>

              {/* per-type breakdown so the guest can see what would work */}
              {availabilityGroups.length > 0 && (
                <ul className="mx-auto mt-4 max-w-sm list-none space-y-1.5 p-0 text-left">
                  {availabilityGroups.map((g) => (
                    <li
                      key={g.type}
                      className="flex items-center justify-between rounded-lg bg-[#F7F8FA] px-3 py-2 text-[0.78rem]"
                    >
                      <span className="font-semibold text-[#0F1923]">
                        {g.type}
                      </span>
                      <span className="text-[#8A95A3]">
                        sleeps {g.capacity} · need {g.needed} · {g.rooms.length}{" "}
                        free
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => {
                  setSearch(null);
                  setRooms([]);
                  fetchRooms();
                }}
                className="mt-5 rounded-lg border border-[#D9DEE5] bg-white px-5 py-2.5 text-[0.82rem] font-bold text-[#0F1923]"
              >
                Show all rooms
              </button>
            </div>
          )}
        </div>
      )}

      {searchError && (
        <p className="mx-auto mb-6 max-w-6xl text-center text-[0.85rem] text-[#C0392B]">
          {searchError}
        </p>
      )}

      {/* showcase heading — these cards are for enquiry, not booking */}
      {isShowcase && !loading && listedRooms.length > 0 && (
        <div className="mx-auto mb-6 max-w-6xl text-center">
          <h3 className="m-0 font-display text-lg font-bold text-[#0F1923]">
            Our Room Types
          </h3>
          <p className="mx-auto mt-1 max-w-xl text-[0.84rem] text-[#8A95A3]">
            Enter your dates and number of guests above to see which rooms
            are available and book online.
          </p>
        </div>
      )}

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
        {isShowcase
          ? roomName
          : `Room ${room.room_number || `#${room.room_id}`}`}
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
    {isShowcase ? (
      <p className="m-0 text-center text-[0.78rem] text-[#8A95A3]">
        Search your dates above to check availability
      </p>
    ) : (
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
    )}
  </div>
</motion.article>
            );
          })
        )}
      </div>

      {/* Show More / Show Less */}
      {!loading &&
        listedRooms.length > INITIAL_COUNT && (
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