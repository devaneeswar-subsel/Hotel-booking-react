import React from "react";
import "./App.css";

const rooms = [
  {
    name: "Deluxe Room",
    img: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b"
  },
  {
    name: "Superior Room",
    img: "https://images.unsplash.com/photo-1590490360182-c33d57733427"
  },
  {
    name: "Executive Room",
    img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2"
  }
];

export default function Rooms() {
  return (
    <div className="section">
      <h2>Choose the Best Room</h2>

      <div className="rooms">
        {rooms.map((room, index) => (
          <div className="room-card" key={index}>
            <img src={room.img} alt="" />
            <div className="room-name">{room.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}