import React, { useState, useEffect } from "react";
import "./App.css";

const API = "http://localhost:5000";

// Fallback images by room type
const FALLBACK_IMGS = {
  Standard:
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600",
  Deluxe: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600",
  Suite: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600",
  Luxury: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600",
  Presidential:
    "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=600",
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
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.minPrice) params.set("min_price", filters.minPrice);
      if (filters.maxPrice) params.set("max_price", filters.maxPrice);

      const res = await fetch(`${API}/api/rooms?${params}`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Could not load rooms. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function handleBook(room) {
    if (!user) {
      onAuthPrompt();
      return;
    }
    onBookClick(room);
  }

  return (
    <div className="section" id="rooms">
      <div className="section-header">
        <div>
          <div className="section-label">Our Rooms</div>
          <h2>
            Choose the <span>Perfect Room</span>
          </h2>
        </div>
      </div>

      {/* FILTERS */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "28px",
          flexWrap: "wrap",
        }}
      >
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          style={{
            padding: "9px 14px",
            borderRadius: "10px",
            border: "1.5px solid var(--c-border)",
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            color: "var(--c-dark)",
            cursor: "pointer",
          }}
        >
          <option value="">All Types</option>
          <option>Standard</option>
          <option>Deluxe</option>
          <option>Suite</option>
          <option>Luxury</option>
          <option>Presidential</option>
        </select>

        <input
          type="number"
          placeholder="Min price ₹"
          value={filters.minPrice}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
          style={{
            padding: "9px 14px",
            borderRadius: "10px",
            border: "1.5px solid var(--c-border)",
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            width: "140px",
          }}
        />
        <input
          type="number"
          placeholder="Max price ₹"
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          style={{
            padding: "9px 14px",
            borderRadius: "10px",
            border: "1.5px solid var(--c-border)",
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            width: "140px",
          }}
        />

        <button
          className="btn btn-primary"
          onClick={fetchRooms}
          style={{ padding: "9px 22px" }}
        >
          Search
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div
          style={{
            background: "#FEE2E2",
            color: "#991B1B",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "0.875rem",
          }}
        >
          ⚠️ {error}
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
            <div className="empty-icon">🔍</div>
            <p>No rooms found. Try adjusting your filters.</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div
              className="room-card"
              key={room.room_id}
              onClick={() => onCardClick && onCardClick(room)}
              style={{ cursor: "pointer" }}
            >
              <div className="room-card-img">
                <img
                  src={
                    room.image_url ||
                    FALLBACK_IMGS[room.room_type] ||
                    FALLBACK_IMGS.Deluxe
                  }
                  alt={room.room_type}
                  onError={(e) => {
                    e.target.src = FALLBACK_IMGS.Deluxe;
                  }}
                />
                <div className="room-type-badge">{room.room_type}</div>
              </div>
              <div className="room-card-body">
                <h3>Room {room.room_number || `#${room.room_id}`}</h3>
                <p>
                  {room.description ||
                    "A beautifully furnished room with modern amenities."}
                </p>
                <div className="room-card-footer">
                  <div className="room-price">
                    ₹{Number(room.price_per_night).toLocaleString()}{" "}
                    <span>/night</span>
                  </div>
                  <div className="room-capacity">
                    👤 {room.capacity || 2} guests
                  </div>
                </div>
                <button
                  className="book-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBook(room);
                  }}
                >
                  Book Now
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
