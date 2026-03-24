import React from "react";
import "./App.css";

const images = [
  {
    src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900",
    label: "Luxury Pool Suite",
  },
  {
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
    label: "Private Beach",
  },
  {
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600",
    label: "Mountain View",
  },
  {
    src: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
    label: "Deluxe Room",
  },
  {
    src: "https://images.unsplash.com/photo-1517840901100-8179e982acb7?w=600",
    label: "Rooftop Bar",
  },
];

export default function Gallery() {
  return (
    <div className="section" id="gallery">
      <div className="section-header">
        <div>
          <div className="section-label">Photo Tour</div>
          <h2>
            Experience the <span>Local Culture & Sights</span>
          </h2>
        </div>
      </div>

      <div className="gallery-grid">
        {images.map((img, i) => (
          <div className="gallery-item" key={i}>
            <img src={img.src} alt={img.label} />
            <div className="gallery-overlay">
              <span>{img.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
