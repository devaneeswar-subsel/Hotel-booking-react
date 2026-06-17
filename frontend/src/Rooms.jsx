import React, { useState, useEffect } from "react";
import "./App.css";
import { SearchIcon, UserIcon, ArrowRightIcon } from "./Icons";
import { motion } from "framer-motion";
const API = process.env.REACT_APP_API_URL;

const FALLBACK = {
  Standard:
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=700",
  Deluxe: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=700",
  Suite: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=700",
  Luxury: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=700",
  Presidential:
    "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=700",
};

export default function Rooms({
  user,
  onBookClick,
  onCardClick,
  onAuthPrompt,
}) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    minPrice: "",
    maxPrice: "",
  });

  useEffect(() => {
    fetchRooms();
  }, []); // eslint-disable-line

  async function fetchRooms(currentFilters = filters) {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      if (currentFilters.type) p.set("type", currentFilters.type);
      if (currentFilters.minPrice) p.set("min_price", currentFilters.minPrice);
      if (currentFilters.maxPrice) p.set("max_price", currentFilters.maxPrice);
      const queryString = p.toString() ? `?${p.toString()}` : "";
      const res = await fetch(`${API}/api/rooms${queryString}`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load rooms. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function handleBook(e, room) {
    e.stopPropagation();
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
  transition: { duration: 0.6, delay, ease: "easeOut" },
})
  return (
    <section id="rooms" className="mx-auto max-w-7xl px-6 md:px-8 lg:px-12 py-4 sm:py-8 md:py-12 lg:py-20 " >
      <motion.div {...fadeUp(0)} className="section-eyebrow">
  <span>Accommodations</span>
</motion.div>

<motion.h2 {...fadeUp(0.15)} className="section-title">
  Choose Your <em>Perfect Room</em>
</motion.h2>

      {/* Filters */}
      <div className="rooms-filter-bar">
        <select
          className="filter-select"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All Room Types</option>
          <option>Standard</option>
          <option>Deluxe</option>
          <option>Suite</option>
          <option>Luxury</option>
          <option>Presidential</option>
        </select>
        <input
          className="filter-input"
          type="number"
          placeholder="Min price ₹"
          value={filters.minPrice}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
        />
        <input
          className="filter-input"
          type="number"
          placeholder="Max price ₹"
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
        />
        <button className="btn btn-primary" onClick={() => fetchRooms(filters)}>
          <SearchIcon size={15} color="#fff" /> Search
        </button>
        {(filters.type || filters.minPrice || filters.maxPrice) && (
          <button
            className="btn btn-outline"
            onClick={() => {
              const cleared = { type: "", minPrice: "", maxPrice: "" };
              setFilters(cleared);
              fetchRooms(cleared);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="error-msg">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="rooms-grid">
        {loading ? (
          Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="room-skeleton">
                <div className="skeleton-img" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            ))
        ) : rooms.length === 0 ? (
          <div className="empty" style={{ gridColumn: "1/-1" }}>
            <div className="empty-icon">
              <SearchIcon size={22} color="var(--gray-400)" />
            </div>
            <p>No rooms found. Try adjusting your filters.</p>
          </div>
        ) : (
          rooms.map((room, index) => (
  <motion.div
    key={room.room_id}
    className="room-card"
    onClick={() => onCardClick?.(room)}
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{
      duration: 0.6,
      delay: index * 0.1,
      type: "spring",
      stiffness: 80,
    }}
  >
              <div className="room-card-img">
                <img
                  src={
                    room.image_url ||
                    FALLBACK[room.room_type] ||
                    FALLBACK.Deluxe
                  }
                  alt={room.room_type}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = FALLBACK.Deluxe;
                  }}
                />
                <div className="room-type-badge">{room.room_type}</div>
              </div>
              <div className="room-card-body">
                <div className="font-body font-bold">Room {room.room_number || `#${room.room_id}`}</div>
                <p>
                  {room.description ||
                    "A beautifully furnished room with modern amenities and premium comfort."}
                </p>
                <div className=" room-card-footer">
                  <div className="font-body ">
                    ₹{Number(room.price_per_night).toLocaleString()}
                    <span> /night</span>
                  </div>
                  <div className="font-body room-capacity">
                    <UserIcon size={13} color="var(--gray-400)" />
                    {room.capacity || 2} guests
                  </div>
                </div>
                <button
                  className="book-btn"
                  onClick={(e) => handleBook(e, room)}
                >
                  Book Now <ArrowRightIcon size={15} color="#fff" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </section>
  );
}
