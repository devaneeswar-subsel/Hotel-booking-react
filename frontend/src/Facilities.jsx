import React from "react";
import {
  WifiIcon,
  SnowflakeIcon,
  TvIcon,
  DropletIcon,
  CoffeeIcon,
  CarIcon,
  // SparklesIcon,
  PhoneIcon,
  AwardIcon,
} from "./Icons";
import FacilityCard from "./Components/FacilityCard";
import { motion } from "framer-motion";
const facilities = [
  { icon: CoffeeIcon, name: "Complimentary Breakfast", desc: "7:30 AM to 10:00 AM" },
  { icon: PhoneIcon, name: "24 Hours Room Service", desc: "Always available" },
  { icon: TvIcon, name: "LED TV", desc: "In-room entertainment" },
  { icon: DropletIcon, name: "Kettle", desc: "Hot beverage facility" },
  { icon: CoffeeIcon, name: "Pure Veg Restaurant", desc: "VASAN’S CAFÉ" },
  { icon: CarIcon, name: "Ample Parking", desc: "Spacious guest parking" },
  { icon: AwardIcon, name: "Uninterrupted Power Supply", desc: "DG automatic backup" },
  { icon: DropletIcon, name: "24-Hour Hot Water", desc: "Bathroom comfort" },
  { icon: CarIcon, name: "Cab Service", desc: "Tariff based on km basis" },
  { icon: WifiIcon, name: "24 Hours CCTV Surveillance", desc: "Guest safety" },
];
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.6, delay, ease: "easeOut" },
});
export default function Facilities() {
  return (
    <section
      id="facilities"
      className="mx-auto max-w-7xl px-6 md:px-8 lg:px-12 pt-20"
    >
      <motion.div {...fadeUp(0)} className="section-eyebrow">
  <span>Amenities</span>
</motion.div>

<motion.h2 {...fadeUp(0.15)} className="section-title">
  World-Class <em>Facilities</em>
</motion.h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {facilities.map((facility, i) => (
        <FacilityCard key={i} {...facility} index={i} />
      ))}
    </div>
    </section>
  );
}