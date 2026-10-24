import React, { useEffect, useState } from "react";
import { SLUG_TO_ROOM_TYPE } from "../utils/roomSlug";

/*
 * Floating "Chat on WhatsApp" button shown on every guest-facing page.
 *
 * Opens wa.me with a pre-filled enquiry. On a /rooms/:slug page the message
 * names that room type so the front desk knows what the guest was looking at.
 * Hidden while an admin or manager dashboard is open (see StaffViewMarker).
 */

// Front-desk WhatsApp number — country code + number, digits only
const WHATSAPP_NUMBER = "919384982510";

function buildMessage() {
  let roomType = "";
  const match = window.location.pathname.match(/^\/rooms\/([^/]+)/);
  if (match) {
    const types = SLUG_TO_ROOM_TYPE[match[1]];
    roomType = types ? types[0] : "";
  }
  return roomType
    ? `Hi VV Grand Park Residency, I would like to enquire about the ${roomType}. Could you please share availability and tariff?`
    : "Hi VV Grand Park Residency, I would like to enquire about room availability. Could you please share the details?";
}

export default function WhatsAppButton() {
  const [staffView, setStaffView] = useState(
    () => document.body.classList.contains("vv-staff-view"),
  );

  // follow the body class that the admin/manager dashboards toggle
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setStaffView(document.body.classList.contains("vv-staff-view")),
    );
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  if (staffView) return null;

  function openChat(e) {
    e.preventDefault();
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      buildMessage(),
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      onClick={openChat}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      className="group fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.45)] transition-transform duration-200 hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40 sm:bottom-6 sm:right-6"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366] opacity-30" />
      <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" aria-hidden="true">
        <path d="M16.004 3C8.82 3 3 8.82 3 16c0 2.29.6 4.53 1.74 6.5L3 29l6.67-1.7A12.95 12.95 0 0 0 16.004 29C23.18 29 29 23.18 29 16S23.18 3 16.004 3Zm0 23.64c-1.98 0-3.92-.53-5.62-1.54l-.4-.24-3.96 1.01 1.06-3.86-.26-.41A10.6 10.6 0 0 1 5.36 16c0-5.87 4.77-10.64 10.64-10.64S26.64 10.13 26.64 16 21.87 26.64 16.004 26.64Zm5.84-7.97c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.82 1.04-1.01 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66s1.15 3.09 1.31 3.3c.16.21 2.26 3.45 5.47 4.84.76.33 1.36.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.89-.77 2.16-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z" />
      </svg>
      <span className="pointer-events-none absolute right-[calc(100%+12px)] hidden whitespace-nowrap rounded-lg bg-[#0F1923] px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 md:block">
        Enquire on WhatsApp
      </span>
    </a>
  );
}

/*
 * Render inside the admin / manager dashboard branches. While mounted it marks
 * the page as a staff view, which hides the guest WhatsApp button.
 */
export function StaffViewMarker() {
  useEffect(() => {
    document.body.classList.add("vv-staff-view");
    return () => document.body.classList.remove("vv-staff-view");
  }, []);
  return null;
}
