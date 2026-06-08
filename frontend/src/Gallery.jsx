import React from "react";

const images = [
  {
    src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900",
    label: "Infinity Pool",
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
    label: "Deluxe Suite",
  },
  {
    src: "https://images.unsplash.com/photo-1517840901100-8179e982acb7?w=600",
    label: "Rooftop Bar",
  },
];

export default function Gallery() {
  return (
    <section
      id="gallery"
      className="mx-auto max-w-7xl px-6 md:px-8 lg:px-12 py-20"
    >
      <div className="section-eyebrow mb-3">
        <span className="text-sm font-medium uppercase tracking-[3px] text-amber-500">
          Photo Tour
        </span>
      </div>

      <h2 className=" section-title mb-12 font-serif text-4xl font-bold text-slate-900">
        Experience the <em className="text-amber-500">Glamour</em>
      </h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2">
        {images.map((img, i) => (
          <div
            key={i}
           className={`group relative overflow-hidden rounded-2xl ${
  i === 0 ? "md:row-span-2" : ""
}`}
          >
            <img
              src={img.src}
              alt={img.label}
              loading="lazy"
              className="block h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
            />

            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[rgba(15,25,35,0.6)] to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="text-sm font-semibold text-white">
                {img.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}