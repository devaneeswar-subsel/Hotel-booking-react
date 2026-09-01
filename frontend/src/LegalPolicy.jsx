import React from "react";

import Footer from "./Footer";

import {
  ArrowLeftIcon,
  MailIcon,
  PhoneIcon,
  ShieldIcon,
} from "./Icons";

const hotel = {
  name: "VV Grand Park Residency",
  address:
    "3/4/D, Thanjai Saalai, near Navajeevan Hospital, Thiruvarur, Tamil Nadu - 610004, India",
  phone:["+919384982510" ,"+91 9003251115"],
  phoneHref: ["tel:+919384982510" ,"+91 9003251115"],
  email: "vvgrandpark@gmail.com",
  emailHref: "mailto:vvgrandpark@gmail.com",
  effectiveDate: "18 August 2026",
};

const guestChildPolicyBullets = [
  "Child policy: Below 8 years - Complimentary, 9 to 12 Years - Child policy, 12 Years & above - Adult.",
  "Maximum occupancy: 2 adults + 1 child per room.",
  "Children below 8 years: Complimentary stay when sharing the existing bed with parents.",
  "Extra bed: An extra bed is not included unless specifically requested and approved by the hotel.",
  "Age verification: The hotel may request proof of the child's age at check-in.",
];

const policies = {
  terms: {
    title: "Terms & Conditions",
    eyebrow: "Legal",
    intro: `These Terms & Conditions govern your booking of and stay at ${hotel.name}, located at ${hotel.address}. By making a booking or staying at the Hotel, you agree to these Terms.`,
    sections: [
      {
        title: "Bookings & Reservations",
        bullets: [
          "A booking is confirmed only after we issue a written confirmation by email or SMS with a Booking ID and receive any required payment or deposit.",
          "All rates are quoted in Indian Rupees and are subject to applicable taxes, including GST, unless stated otherwise.",
          "We reserve the right to correct pricing errors and to decline or cancel a booking made on the basis of a manifest error.",
        ],
      },
      {
        title: "Rates, Taxes & Payment",
        bullets: [
          "Room rates, taxes, and any service charges are displayed at the time of booking.",
          "Payments are processed through our authorised payment gateway, Razorpay. We do not store your full card details.",
          "Any additional services availed during the stay must be settled in full before check-out.",
        ],
      },
      {
        title: "Check-in / Check-out",
        bullets: [
          "Check In & Check Out time is 24 hours.",
          "50% advance payment for confirmation, balance amount to be paid on or before arrival.",
          "Taxes as applicable.",
        ],
      },
      {
        title: "Identity Verification",
        bullets: [
          "Accordingly, to government regulations, a valid Photo ID has to be carried by every person above the age of 18.",
          "The identification proofs accepted are Driver’s License, Voters Card, Passport & Aadhar card.",
          "We reserve the right to refuse check-in where valid identification is not provided.",
        ],
      },
      {
        title: "Guest Eligibility & Occupancy",
        bullets: [
          "The primary Guest must be at least 18 years of age.",
          "Only Guests registered at check-in may occupy the room. The maximum occupancy per room type must not be exceeded.",
          "Visitors who are not registered Guests are not permitted in guest rooms and may be asked to leave.",
        ],
      },
      {
        title: "Guest & Child Policy",
        bullets: guestChildPolicyBullets,
      },
      {
        title: "House Rules",
        bullets: [
          "We do not allow unmarried / unrelated couples to check-in. This is at the full discretion of the hotel management. No refund would be applicable in case the hotel denies check-in under such circumstances.",
          "Kindly note that smoking & Alcoholic Beverages strictly prohibited inside our hotel premises.",
          "Usage of electrical items other than facilities provided by residency is strictly prohibited.",
          "In the Hotel Premises please refrain from gambling or any conduct corrupting public morals and safety or any speech which may cause an annoyance to other Guests.",
          "The amount paid for room does not include charges for optional services and facilities (such as lunch, dinner, snacks and etc.,). These will be charged at the time of check-out from the Hotel.",
        ],
      },
      {
        title: "Damage & Guest Liability",
        body:
          "You are responsible for any loss or damage caused to Hotel property by you or your guests, and agree to pay the reasonable cost of repair or replacement.",
      },
      {
        title: "Hotel Liability & Valuables",
        bullets: [
          "The Hotel shall not be liable for loss of or damage to cash, jewellery, or valuables not deposited in a Hotel safe or locker facility where available.",
          "To the maximum extent permitted by law, our liability arising out of your stay is limited to the total amount paid by you for the booking.",
        ],
      },
      {
        title: "Governing Law & Jurisdiction",
        body:
          "These Terms are governed by the laws of India. Any dispute shall be subject to the exclusive jurisdiction of the courts at Thiruvarur / Tiruvarur, Tamil Nadu.",
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    eyebrow: "Privacy",
    intro: `${hotel.name} respects your privacy and is committed to protecting your personal data in accordance with applicable Indian law.`,
    sections: [
      {
        title: "Personal Data We Collect",
        bullets: [
          "Identity and contact details, including name, phone number, email address, and postal address.",
          "Identification details recorded at check-in, as required by law.",
          "Booking and stay details, including dates, room type, number of guests, preferences, and special requests.",
          "Payment transaction details processed via Razorpay. We do not store full card numbers.",
          "Technical and usage data, including website usage data and cookies.",
        ],
      },
      {
        title: "Purpose & Lawful Basis",
        bullets: [
          "confirm and manage your booking and stay;",
          "process payments, refunds, and invoicing;",
          "comply with legal obligations, including guest registration and tax requirements;",
          "respond to enquiries and provide customer support;",
          "send offers and updates where you have given consent.",
        ],
      },
      {
        title: "How We Share Your Data",
        bullets: [
          "We share personal data with service providers such as our payment gateway and IT or hosting providers, under appropriate safeguards.",
          "We may share personal data with government or law-enforcement authorities where required by law.",
          "We do not sell your personal data.",
        ],
      },
      {
        title: "Data Retention",
        body:
          "We retain personal data only for as long as necessary to fulfil the purposes above and to comply with legal, tax, and accounting requirements.",
      },
      {
        title: "Security",
        body:
          "We implement reasonable technical and organisational safeguards to protect personal data against unauthorised access, loss, or misuse.",
      },
      {
        title: "Your Rights",
        bullets: [
          "access a summary of the personal data we process about you;",
          "request correction, completion, or updating of your data;",
          "request erasure of your data;",
          "withdraw consent at any time;",
          "seek grievance redressal.",
        ],
      },
      {
        title: "Grievance Redressal",
        bullets: [
          "Grievance Officer: VV Grand Park Residency",
          `Email: ${hotel.email}`,
          `Phone: ${hotel.phone}`,
        ],
      },
      {
        title: "Cookies",
        body:
          "Our website may use cookies to operate the site and improve your experience. You can control cookies through your browser settings.",
      },
      {
        title: "Children's Data",
        body:
          "We do not knowingly process the personal data of children under 18 without verifiable parental or guardian consent.",
      },
      {
        title: "Guest & Child Policy",
        bullets: guestChildPolicyBullets,
      },
    ],
  },

  cancellation: {
    title: "Cancellation & Refund Policy",
    eyebrow: "Bookings",
    intro: `This policy explains how cancellations, no-shows, and refunds are handled for bookings at ${hotel.name}.`,
    sections: [
      {
        title: "Cancellation Charges",
        body:
          "In case of cancellation / amendment a mail / written notice must be received by the hotel at least 03 days prior to the date of arrival or else retention charges will be applicable for all the booked room nights.",
      },
      {
        title: "No-Show",
        body:
          "Retention charge of total booked room nights will be applicable if the guest does not check in on the designated date of arrival.",
      },
      {
        title: "Policy Update",
        body:
          "The Hotel reserves the right to change/amend the above policy from time to time.",
      },
      {
        title: "Payment Options",
        body:
          "Payment options: Cash / credit / debit cards / Razor pay / Mobile banking.",
      },
      {
        title: "Guest Facilities",
        bullets: [
          "Two bottles of RO treated drinking water are provided on complimentary basis.",
          "Wi-Fi is provided on complimentary basis.",
          "Breakfast is provided on complimentary basis from 7.30am to 10.00am.",
        ],
      },
    ],
  },
};

const policyAliases = {
  "/terms": "terms",
  "/terms-and-conditions": "terms",
  "/terms-of-service": "terms",
  "/privacy": "privacy",
  "/privacy-policy": "privacy",
  "/cancellation": "cancellation",
  "/cancellation-policy": "cancellation",
  "/refund-policy": "cancellation",
};

export function getLegalPolicyByPath(pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const key = policyAliases[normalized];

  return key ? policies[key] : null;
}

function PolicySection({ section, index }) {
  return (
    <section
      className="
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        border-[#E8E0D1]
        bg-white
        p-6
        shadow-[0_8px_30px_rgba(15,25,35,0.04)]
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:shadow-[0_14px_40px_rgba(15,25,35,0.08)]
        sm:p-8
      "
    >
      {/* Decorative accent */}
      <div
        className="
          absolute
          left-0
          top-0
          h-full
          w-[3px]
          bg-[#C9A84C]
          opacity-0
          transition-opacity
          duration-300
          group-hover:opacity-100
        "
      />

      <div className="mb-5 flex items-start gap-4">
        <span
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-[#F7F1E3]
            text-[0.72rem]
            font-bold
            text-[#9A7A2E]
          "
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <h2
          className="
            m-0
            pt-1
            font-[var(--font-display)]
            text-[1.35rem]
            font-semibold
            leading-tight
            text-[#0F1923]
            sm:text-[1.5rem]
          "
        >
          {section.title}
        </h2>
      </div>

      {section.body && (
        <p className="mb-0 text-[0.96rem] leading-8 text-[#59616A]">
          {section.body}
        </p>
      )}

      {section.bullets && (
        <ul className="m-0 space-y-3 pl-0 text-[0.96rem] leading-7 text-[#59616A]">
          {section.bullets.map((item, itemIndex) => (
            <li
              key={`${item}-${itemIndex}`}
              className="flex items-start gap-3"
            >
              <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {section.table && (
        <div className="mt-2 overflow-hidden rounded-xl border border-[#E7DFD0]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="bg-[#0F1923]">
                  {section.table.headers.map((header) => (
                    <th
                      key={header}
                      className="
                        px-5
                        py-4
                        text-[0.7rem]
                        font-bold
                        uppercase
                        tracking-[1.5px]
                        text-[#E8D5A3]
                      "
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {section.table.rows.map((row, rowIndex) => (
                  <tr
                    key={row.join("|")}
                    className={
                      rowIndex % 2 === 0
                        ? "bg-white"
                        : "bg-[#FBFAF7]"
                    }
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${cell}-${cellIndex}`}
                        className="
                          border-t
                          border-[#EEE7DA]
                          px-5
                          py-4
                          text-[0.9rem]
                          leading-6
                          text-[#4F5860]
                        "
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default function LegalPolicy({ policy }) {
  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#212529]">

      {/* HERO */}
      <header className="relative overflow-hidden bg-[#0F1923]">
        {/* Background decoration */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full border border-[#C9A84C]/10" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border border-[#C9A84C]/10" />

        <div className="relative mx-auto max-w-[1180px] px-5 pb-16 pt-6 sm:px-8 lg:px-10 lg:pb-20">
          
          {/* NAV */}
          <div className="mb-16 flex items-center justify-between gap-4">
            <a
              href="/"
              className="group flex items-center gap-3 text-white no-underline"
              aria-label="VV Grand Park Residency home"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <img
                  src="/logo.png"
                  alt="VV Grand Park Residency"
                  className="h-9 w-9 object-contain"
                />
              </div>

              <span className="flex flex-col leading-[1.1]">
                <span className="font-serif text-[0.95rem] font-bold tracking-[2px]">
                  VV GRAND PARK
                </span>

                <span className="mt-1 font-serif text-[0.55rem] tracking-[3px] text-[#C9A84C]">
                  RESIDENCY
                </span>
              </span>
            </a>

            <a
              href="/"
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-white/15
                bg-white/5
                px-4
                py-2.5
                text-[0.78rem]
                font-semibold
                text-white/75
                no-underline
                backdrop-blur-sm
                transition-all
                duration-200
                hover:border-[#C9A84C]/60
                hover:bg-[#C9A84C]/10
                hover:text-white
              "
            >
              <ArrowLeftIcon size={15} color="currentColor" />
              Back to Home
            </a>
          </div>

          {/* HERO CONTENT */}
          <div className="max-w-[800px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-3.5 py-2">
              <ShieldIcon size={14} color="#C9A84C" />

              <span className="text-[0.68rem] font-bold uppercase tracking-[2px] text-[#D9BD6A]">
                {policy.eyebrow}
              </span>
            </div>

            <h1
              className="
                m-0
                font-[var(--font-display)]
                text-[2.5rem]
                font-semibold
                leading-[1.08]
                tracking-[-0.02em]
                text-white
                sm:text-[3.5rem]
                lg:text-[4rem]
              "
            >
              {policy.title}
            </h1>

            <div className="mt-6 h-px w-16 bg-[#C9A84C]" />

            <p className="mt-6 max-w-[760px] text-[0.98rem] leading-8 text-white/60 sm:text-[1.02rem]">
              {policy.intro}
            </p>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[250px_1fr] lg:items-start">

          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-8">
            <div
              className="
                overflow-hidden
                rounded-2xl
                border
                border-[#E8E0D1]
                bg-white
                shadow-[0_8px_30px_rgba(15,25,35,0.05)]
              "
            >

              {/* Contact */}
              <div className="p-5">
                <p className="mb-4 text-[0.65rem] font-bold uppercase tracking-[2px] text-[#9A7A2E]">
                  Contact
                </p>

                <div className="flex flex-col gap-4">
                  {hotel.phone.map((phone, index) => (
  <a
    key={index}
    href={`tel:${phone}`}
    className="
      flex
      items-center
      gap-2
      text-[0.82rem]
      font-medium
      text-[#4F5860]
      no-underline
      transition-colors
      hover:text-[#C9A84C]
    "
  >
    <PhoneIcon size={14} color="#C9A84C" />
    {phone}
  </a>
))}

                  <a
                    href={hotel.emailHref}
                    className="
                      group
                      flex
                      items-center
                      gap-3
                      text-[0.84rem]
                      text-[#59616A]
                      no-underline
                      transition-colors
                      hover:text-[#0F1923]
                    "
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F7F1E3]">
                      <MailIcon size={14} color="#9A7A2E" />
                    </span>

                    <span className="break-all">{hotel.email}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Small trust note */}
            <div className="mt-5 rounded-2xl border border-[#E8E0D1] bg-[#F3EFE6] p-5">
              <div className="mb-2 flex items-center gap-2">
                <ShieldIcon size={14} color="#9A7A2E" />

                <span className="text-[0.68rem] font-bold uppercase tracking-[1.5px] text-[#9A7A2E]">
                  Guest Information
                </span>
              </div>

              <p className="m-0 text-[0.78rem] leading-6 text-[#6B7175]">
                Please read these terms carefully before completing your
                reservation or staying with us.
              </p>
            </div>
          </aside>

          {/* CONTENT */}
          <article className="space-y-5">
            {policy.sections.map((section, index) => (
              <PolicySection
                key={section.title}
                section={section}
                index={index}
              />
            ))}

            {/* CONTACT CARD */}
            <section className="relative overflow-hidden rounded-2xl bg-[#0F1923] p-7 sm:p-9">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border border-[#C9A84C]/10" />

              <div className="relative">
                <div className="mb-3 flex items-center gap-2">
                  <MailIcon size={15} color="#C9A84C" />

                  <span className="text-[0.68rem] font-bold uppercase tracking-[2px] text-[#C9A84C]">
                    Need Help?
                  </span>
                </div>

                <h2 className="mb-3 font-[var(--font-display)] text-[1.5rem] font-semibold text-white">
                  Contact Us
                </h2>

                <p className="mb-5 max-w-[650px] text-[0.92rem] leading-7 text-white/60">
                  For questions about this policy, contact {hotel.name}.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
         {hotel.phone.map((phone, index) => (
  <a
    key={index}
    href={`tel:${phone}`}
    className="
      inline-flex
      items-center
      gap-2
      rounded-full
      border
      border-white/10
      bg-white/5
      px-5
      py-3
      text-[0.82rem]
      font-semibold
      text-white
      no-underline
      transition-all
      hover:border-[#C9A84C]/50
      hover:bg-[#C9A84C]/10
    "
  >
    <PhoneIcon size={14} color="#C9A84C" />
    {phone}
  </a>
))}

                  <a
                    href={hotel.emailHref}
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-full
                      border
                      border-white/10
                      bg-white/5
                      px-5
                      py-3
                      text-[0.82rem]
                      font-semibold
                      text-white
                      no-underline
                      transition-all
                      hover:border-[#C9A84C]/50
                      hover:bg-[#C9A84C]/10
                    "
                  >
                    <MailIcon size={14} color="#C9A84C" />
                    {hotel.email}
                  </a>
                </div>
              </div>
            </section>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}