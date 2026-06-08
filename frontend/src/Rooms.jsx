import React, { useState, useEffect } from "react";
import { SearchIcon, UserIcon, ArrowRightIcon } from "./Icons";


const API =
  process.env.REACT_APP_API_URL;

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

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-md">
      <div className="h-56 animate-pulse bg-gray-200" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
      </div>
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
/* Fixed Fetch Function */
async function fetchRooms(currentFilters = filters) {
  setLoading(true);
  setError("");

  try {
    const p = new URLSearchParams();

    // Safely reads the explicit values passed into the argument 
    if (currentFilters.type) p.set("type", currentFilters.type);
    if (currentFilters.minPrice) p.set("min_price", currentFilters.minPrice);
    if (currentFilters.maxPrice) p.set("max_price", currentFilters.maxPrice);

    // FIXED: Appended the stringified search parameters to your fetch target URL 
    const queryString = p.toString() ? `?${p.toString()}` : "";
    const res = await fetch(`http://localhost:5000/api/rooms${queryString}`);

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
    <section id="rooms" className="px-6 md:px-8 lg:px-12 py-20">
      {/* Header */}
       <div className="section-eyebrow">
        <span>Accommodations</span>
      </div>

      <h2 className=" section-title mb-12 text-start font-serif text-4xl font-bold text-slate-900 md:text-5xl">
        Choose Your <em className="text-amber-500">Perfect Room</em>
      </h2>


    {/* Filters UI */}
<div className="mb-10 flex flex-wrap items-center gap-3">
  <select
    className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
    className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
    type="number"
    placeholder="Min price ₹"
    value={filters.minPrice}
    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
  />

  <input
    className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
    type="number"
    placeholder="Max price ₹"
    value={filters.maxPrice}
    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
  />

  <button
    onClick={() => fetchRooms(filters)} // Pass current active filters
    className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
  >
    <SearchIcon size={15} />
    Search
  </button>

  {(filters.type || filters.minPrice || filters.maxPrice) && (
    <button
      onClick={() => {
        const clearedFilters = { type: "", minPrice: "", maxPrice: "" };
        setFilters(clearedFilters); // Update the input UI boxes
        fetchRooms(clearedFilters); // Immediately pass empty parameters to api query
      }}
      className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-gray-50"
    >
      Clear
    </button>
  )}
</div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
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
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array(3)
            .fill(0)
            .map((_, i) => <SkeletonCard key={i} />)
        ) : rooms.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4">
              <SearchIcon size={22} />
            </div>

            <p className="text-gray-500">
              No rooms found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.room_id}
              onClick={() => onCardClick?.(room)}
              className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative">
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
                  className="h-64 w-full object-cover"
                />

                <div className="absolute left-4 top-4 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  {room.room_type}
                </div>
              </div>

              <div className="p-5">
                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  Room {room.room_number || `#${room.room_id}`}
                </h3>

                <p className="mb-4 text-sm leading-6 text-gray-600">
                  {room.description ||
                    "A beautifully furnished room with modern amenities and premium comfort."}
                </p>

                <div className="mb-4 flex items-center justify-between">
                  <div className="text-xl font-bold text-slate-900">
                    ₹
                    {Number(
                      room.price_per_night
                    ).toLocaleString()}
                    <span className="text-sm font-normal text-gray-500">
                      {" "}
                      /night
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <UserIcon size={13} />
                    {room.capacity || 2} guests
                  </div>
                </div>

                <button
                  onClick={(e) => handleBook(e, room)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition"
                  style={{
                    backgroundColor: "#0f1923",
                    color: "white",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#c9a84c";
                    e.target.style.color = "black";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#0f1923";
                    e.target.style.color = "white";
                  }}
                >
                  Book Now
                  <ArrowRightIcon size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}