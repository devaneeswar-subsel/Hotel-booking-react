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
  { icon: SnowflakeIcon, name: "Air Conditioning", desc: "Comfortable rooms" },
  { icon: TvIcon, name: "TV & Entertainment", desc: "Smart TV in rooms" },
  { icon: DropletIcon, name: "24/7 Hot Water", desc: "Hot & cold water" },
  { icon: CoffeeIcon, name: "Fine Dining", desc: "Multi-cuisine" },
  { icon: CarIcon, name: "Safety Parking", desc: "Secure & free" },
  { icon: WifiIcon, name: "High-Speed WiFi", desc: "Fibre broadband" },
  { icon: PhoneIcon, name: "24/7 Concierge", desc: "Always available" },
  { icon: AwardIcon, name: "Airport Transfer", desc: "Private luxury car" },
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