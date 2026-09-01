import React from "react";
import { MapPinIcon, PhoneIcon, MailIcon } from "./Icons";

export default function Footer() {
  return (
    <footer
      id="contact"
      className="border-t border-[#C9A84C]/15 bg-[#0F1923] px-[5%]  pt-[72px] pb-[36px]"
    >
      <div className="mx-auto mb-12 grid max-w-[1200px] grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr]">
        {/* Logo Section */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <img
              src="/logo.png"
              alt="VV Grand Park Residency"
              className="h-12 w-12 object-contain brightness-110 mix-blend-screen"
              style={{ filter: "brightness(1.1) sepia(0.3)" }}
            />

            <div className="flex flex-col leading-[1.1]">
              <span
                className="font-serif text-[1rem] font-bold tracking-[2px] text-white"
              >
                VV GRAND PARK
              </span>

              <span
                className="font-serif text-[0.55rem] font-normal tracking-[3px] text-[#C9A84C]"
              >
                RESIDENCY
              </span>
            </div>
          </div>

          <p className="mb-[22px] max-w-[240px] text-[0.82rem] leading-[1.75] text-white/40">
            VV Grand Park Residency — where every stay becomes a story.
            Experience true luxury, curated for the discerning traveller.
          </p>

            {/* <div className="flex gap-3">
              {["FB", "IG", "TW"].map((s) => (
                <div
                  key={s}
                  className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border border-white/15 text-[0.65rem] font-bold tracking-[0.5px] text-white/40 transition-all duration-200 hover:border-[#C9A84C] hover:text-[#C9A84C]"
                >
                  {s}
                </div>
              ))}
            </div> */}
        </div>

        {/* Navigate */}
        <div>
          <h4 className="mb-[18px] text-[0.65rem] font-bold uppercase tracking-[2.5px] text-[#C9A84C]">
            Navigate
          </h4>

          <ul>
            {[
              { label: "Home", link: "/#home" },
              { label: "Rooms & Suites", link: "/#rooms" },
              { label: "Facilities", link: "/#facilities" },
              { label: "Gallery", link: "/#gallery" },
              { label: "Nearby Attractions", link: "/#nearby-attractions" },
              { label: "Contact", link: "/#contact" },
              { label: "Book Now", link: "/#calendar" },
            ].map((item) => (
              <li key={item.label} className="mb-[11px]">
                <a href={item.link} className="flex cursor-pointer items-center gap-2 text-[0.82rem] text-white/45 transition-colors duration-200 hover:text-[#E8D5A3]">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Policies */}
        <div>
          <h4 className="mb-[18px] text-[0.65rem] font-bold uppercase tracking-[2.5px] text-[#C9A84C]">
            Policies
          </h4>

          <ul>
            {[
              { label: "Privacy Policy", link: "/privacy" },
              { label: "Terms & Conditions", link: "/terms" },
              { label: "Cancellation Policy", link: "/cancellation" },
            ].map((item) => (
              <li key={item.label} className="mb-[11px]">
                <a href={item.link} className="flex cursor-pointer items-center gap-2 text-[0.82rem] text-white/45 transition-colors duration-200 hover:text-[#E8D5A3]">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="mb-[18px] text-[0.65rem] font-bold uppercase tracking-[2.5px] text-[#C9A84C]">
            Contact
          </h4>

          <ul>
            <li className="mb-[11px]">
              <span className="flex items-center gap-2 text-[0.82rem] text-white/45">
                <MapPinIcon size={13} color="rgba(255,255,255,0.4)" />
                <span>3/4/D, Thanjai Saalai<br />near Navajeevan Hospital<br />Thiruvarur - 610004</span>
              </span>
            </li>

            <li className="mb-[11px]">
              <a
                href="tel:+919384982510"
                className="flex items-center gap-2 text-[0.82rem] text-white/45 transition-colors duration-200 hover:text-[#E8D5A3]"
              >
                <PhoneIcon size={13} color="rgba(255,255,255,0.4)" />
                +91 93849 82510
              </a>
            </li>

            <li className="mb-[11px]">
              <a
                href="mailto:vvgrandpark@gmail.com"
                className="flex items-center gap-2 text-[0.82rem] text-white/45 transition-colors duration-200 hover:text-[#E8D5A3]"
              >
                <MailIcon size={13} color="rgba(255,255,255,0.4)" />
                vvgrandpark@gmail.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Divider */}
      <hr className="mx-auto mb-[22px] max-w-[1200px] border-0 border-t border-white/7" />

      {/* Bottom */}
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-[10px] text-[0.75rem] text-white/30">
        <span>© 2026 VV Grand Park Residency. All rights reserved.</span>
        <span>Crafted with care for exceptional guests.</span>
      </div>
    </footer>
  );
}
