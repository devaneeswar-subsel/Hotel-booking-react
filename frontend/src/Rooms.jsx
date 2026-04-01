import React, { useState, useEffect } from "react";
import "./App.css";
import { SearchIcon, UserIcon, ArrowRightIcon } from "./Icons";

const API = "http://localhost:5000";

const FALLBACK = {
  Standard:
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=700",
  Deluxe: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=700",
  Suite: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=700",
  Luxury: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=700",
  Presidential:
    "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=700",
};

function SkeletonCard() {
  return (
    <div className="room-skeleton">
      <div className="skeleton-img" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  );
}

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
  }, []);

  async function fetchRooms() {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      if (filters.type) p.set("type", filters.type);
      if (filters.minPrice) p.set("min_price", filters.minPrice);
      if (filters.maxPrice) p.set("max_price", filters.maxPrice);
      const res = await fetch(`${API}/api/rooms?${p}`);
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

  return (
    <div className="section" id="rooms">
      <div className="section-eyebrow">
        <span>Accommodations</span>
      </div>
      <h2 className="section-title">
        Choose Your <em>Perfect Room</em>
      </h2>

      {/* FILTERS */}
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
        <button
          className="btn btn-primary"
          onClick={fetchRooms}
          style={{ padding: "10px 22px", fontSize: "0.85rem" }}
        >
          <SearchIcon size={15} />
          Search
        </button>
        {(filters.type || filters.minPrice || filters.maxPrice) && (
          <button
            className="btn btn-outline"
            onClick={() => {
              setFilters({ type: "", minPrice: "", maxPrice: "" });
              setTimeout(fetchRooms, 0);
            }}
            style={{ padding: "10px 16px", fontSize: "0.85rem" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ERROR */}
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

      {/* GRID */}
      <div className="rooms-grid">
        {loading ? (
          Array(3)
            .fill(0)
            .map((_, i) => <SkeletonCard key={i} />)
        ) : rooms.length === 0 ? (
          <div className="empty" style={{ gridColumn: "1/-1" }}>
            <div className="empty-icon">
              <SearchIcon size={22} />
            </div>
            <p>No rooms found. Try adjusting your filters.</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div
              className="room-card"
              key={room.room_id}
              onClick={() => onCardClick?.(room)}
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
                <h3>Room {room.room_number || `#${room.room_id}`}</h3>
                <p>
                  {room.description ||
                    "A beautifully furnished room with modern amenities and premium comfort."}
                </p>
                <div className="room-card-footer">
                  <div className="room-price">
                    ₹{Number(room.price_per_night).toLocaleString()}
                    <span> /night</span>
                  </div>
                  <div className="room-capacity">
                    <UserIcon size={13} color="var(--gray-400)" />
                    {room.capacity || 2} guests
                  </div>
                </div>
                <button
                  className="book-btn"
                  onClick={(e) => handleBook(e, room)}
                >
                  Book Now
                  <ArrowRightIcon size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
