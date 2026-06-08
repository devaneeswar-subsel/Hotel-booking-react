import React from "react";
import {
  WifiIcon,
  SwimmingIcon,
  DumbbellIcon,
  CoffeeIcon,
  CarIcon,
  SparklesIcon,
  PhoneIcon,
  AwardIcon,
} from "./Icons";

const facilities = [
  { icon: SwimmingIcon, name: "Infinity Pool", desc: "Heated year-round" },
  { icon: SparklesIcon, name: "Spa & Wellness", desc: "Full-body therapy" },
  { icon: DumbbellIcon, name: "Fitness Center", desc: "Open 24 hours" },
  { icon: CoffeeIcon, name: "Fine Dining", desc: "Multi-cuisine" },
  { icon: CarIcon, name: "Valet Parking", desc: "Secure & free" },
  { icon: WifiIcon, name: "High-Speed WiFi", desc: "Fibre broadband" },
  { icon: PhoneIcon, name: "24/7 Concierge", desc: "Always available" },
  { icon: AwardIcon, name: "Airport Transfer", desc: "Private luxury car" },
];

export default function Facilities() {
  return (
    <section
      id="gallery"
      className="mx-auto max-w-7xl px-6 md:px-8 lg:px-12 pt-20"
    >
      <div className="section-eyebrow">
        <span>Amenities</span>
      </div>

      <h2 className="section-title">
        World-Class <em>Facilities</em>
      </h2>

      <div
  className="
    grid
    grid-cols-1
    sm:grid-cols-2
    lg:grid-cols-4
    gap-4
  "
>
        {facilities.map(({ icon: FacilityIcon, name, desc }, i) => (
          <div
            key={i}
            className="
              group
              bg-[var(--white)]
              border
              border-[var(--gray-200)]
              rounded-[var(--radius-md)]
              px-4
              pt-7
              pb-6
              flex
              flex-col
              items-center
              text-center
              gap-3
              shadow-[var(--shadow-sm)]
              transition-all
              duration-300
              hover:bg-[var(--navy)]
              hover:border-[var(--navy)]
              hover:-translate-y-1
              hover:shadow-[var(--shadow-md)]
            "
          >
            <div
              className="
                w-11
                h-11
                rounded-full
                flex
                items-center
                justify-center
                bg-[var(--gray-100)]
                text-[var(--navy)]
                transition-all
                duration-300
                group-hover:bg-[rgba(201,168,76,0.15)]
                group-hover:text-[var(--gold)]
              "
            >
              <FacilityIcon size={20} />
            </div>

            <h3
              className="
                text-[0.8rem]
                font-semibold
                text-[var(--navy)]
                transition-colors
                duration-300
                group-hover:text-white/75
              "
            >
              {name}
            </h3>

            <p
              className="
                text-[0.72rem]
                text-[var(--gray-400)]
                -mt-1
                transition-colors
                duration-300
                group-hover:text-white/75
              "
            >
              {desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}