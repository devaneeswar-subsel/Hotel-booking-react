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
  phone: "+91 93849 82510",
  phoneHref: "tel:+919384982510",
  email: "vvgrandpark@gmail.com",
  emailHref: "mailto:vvgrandpark@gmail.com",
  effectiveDate: "18 August 2026",
};

const guestChildPolicyBullets = [
  "Maximum occupancy: 2 adults + 1 child per room.",
  "Children below 5 years: Stay free of charge when sharing the existing bed with parents.",
  "Complimentary food: One child below 5 years is eligible for complimentary food during the stay.",
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
          "Check-in: 1:00 PM. Check-out: 11:00 AM.",
          "Early check-in and late check-out are subject to availability and may attract additional charges.",
          "Retention of the room beyond check-out time without prior approval may be charged as an additional day.",
        ],
      },
      {
        title: "Identity Verification",
        bullets: [
          "Every Guest must present a valid, original government-issued photo ID at check-in as required under applicable law.",
          "Foreign nationals must present a valid passport and visa; we are required to record and, where applicable, report these details to the authorities.",
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
          "Pets are not permitted anywhere on the Hotel premises.",
          "Smoking is prohibited inside guest rooms and designated non-smoking areas.",
          "Guests shall not engage in illegal activity, cause damage, create a nuisance, or disturb other guests.",
          "We reserve the right to refuse service to, or evict without refund, any Guest who breaches these Terms.",
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
        table: {
          headers: ["When you cancel", "Charge"],
          rows: [
            ["More than 48 hours before check-in", "Free - full refund"],
            [
              "Between 24 and 48 hours before check-in",
              "50% of the first night's room charge",
            ],
            [
              "Less than 24 hours before check-in",
              "100% of the first night's room charge",
            ],
          ],
        },
      },
      {
        title: "No-Show",
        body:
          "If you do not arrive and do not cancel, the booking is treated as a no-show and the first night's charge is non-refundable.",
      },
      {
        title: "Early Check-out",
        body:
          "If you check out earlier than your confirmed departure date, charges for the unused nights may not be refunded, at the Hotel's discretion.",
      },
      {
        title: "Non-Refundable / Special Bookings",
        body:
          "Certain promotional rates, group bookings, and bookings during peak season or festival dates may be fully non-refundable. This will be clearly indicated at the time of booking.",
      },
      {
        title: "How to Cancel",
        body:
          "To cancel or modify a booking, contact us with your Booking ID or use the View Booking link in your confirmation email.",
      },
      {
        title: "Refund Method & Timeline",
        bullets: [
          "Eligible refunds are made to the original payment method via Razorpay.",
          "Refunds are typically processed within 5-7 working days. The time for the amount to reflect in your account depends on your bank or card issuer.",
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

function PolicySection({ section }) {
  return (
    <section className="border-t border-[#D9D0BE] pt-8 first:border-t-0 first:pt-0">
      <h2 className="mb-4 font-[var(--font-display)] text-[1.45rem] font-semibold leading-tight text-[#0F1923]">
        {section.title}
      </h2>

      {section.body && (
        <p className="mb-4 text-[0.96rem] leading-8 text-[#495057]">
          {section.body}
        </p>
      )}

      {section.bullets && (
        <ul className="space-y-3 pl-5 text-[0.96rem] leading-8 text-[#495057]">
          {section.bullets.map((item) => (
            <li key={item} className="list-disc pl-1">
              {item}
            </li>
          ))}
        </ul>
      )}

      {section.table && (
        <div className="overflow-x-auto rounded-[6px] border border-[#D9D0BE] bg-white">
          <table className="w-full min-w-[560px] border-collapse text-left text-[0.95rem]">
            <thead className="bg-[#0F1923] text-[#E8D5A3]">
              <tr>
                {section.table.headers.map((header) => (
                  <th
                    key={header}
                    className="px-5 py-3 text-[0.74rem] font-bold uppercase tracking-[1.4px]"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row) => (
                <tr key={row.join("|")} className="border-t border-[#EEE5D4]">
                  {row.map((cell) => (
                    <td key={cell} className="px-5 py-4 text-[#495057]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function LegalPolicy({ policy }) {
  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#212529]">
      <header className="bg-[#0F1923] px-[5%] pb-14 pt-7">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-12 flex flex-wrap items-center justify-between gap-4">
            <a
              href="/"
              className="flex items-center gap-3 text-white no-underline"
              aria-label="VV Grand Park Residency home"
            >
              <img
                src="/logo.png"
                alt="VV Grand Park Residency"
                className="h-12 w-12 object-contain brightness-110 mix-blend-screen"
                style={{ filter: "brightness(1.1) sepia(0.3)" }}
              />
              <span className="flex flex-col leading-[1.1]">
                <span className="font-serif text-[1rem] font-bold tracking-[2px]">
                  VV GRAND PARK
                </span>
                <span className="font-serif text-[0.55rem] tracking-[3px] text-[#C9A84C]">
                  RESIDENCY
                </span>
              </span>
            </a>

            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-[6px] border border-white/15 px-4 py-2 text-[0.78rem] font-semibold text-white/70 no-underline transition-colors duration-200 hover:border-[#C9A84C] hover:text-[#E8D5A3]"
            >
              <ArrowLeftIcon size={15} color="currentColor" />
              Back to Home
            </a>
          </div>

          <div className="flex max-w-[760px] flex-col gap-4">
            <div className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[2.8px] text-[#C9A84C]">
              <ShieldIcon size={15} color="currentColor" />
              {policy.eyebrow}
            </div>
            <h1 className="m-0 font-[var(--font-display)] text-[2.4rem] font-semibold leading-tight text-white sm:text-[3.2rem]">
              {policy.title}
            </h1>
            <p className="max-w-[720px] text-[1rem] leading-8 text-white/58">
              {policy.intro}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1040px] gap-10 px-[5%] py-12 lg:grid-cols-[220px_1fr] lg:py-16">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[6px] border border-[#E6DDCB] bg-white p-5 shadow-[0_10px_30px_rgba(15,25,35,0.05)]">
            <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[2px] text-[#9A7A2E]">
              Effective Date
            </p>
            <p className="mb-5 text-sm font-semibold text-[#0F1923]">
              {hotel.effectiveDate}
            </p>

            <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[2px] text-[#9A7A2E]">
              Contact
            </p>
            <div className="flex flex-col gap-3 text-sm">
              <a
                href={hotel.phoneHref}
                className="flex items-center gap-2 text-[#495057] no-underline transition-colors hover:text-[#0F1923]"
              >
                <PhoneIcon size={14} color="currentColor" />
                {hotel.phone}
              </a>
              <a
                href={hotel.emailHref}
                className="flex items-center gap-2 break-all text-[#495057] no-underline transition-colors hover:text-[#0F1923]"
              >
                <MailIcon size={14} color="currentColor" />
                {hotel.email}
              </a>
            </div>
          </div>
        </aside>

        <article className="space-y-8">
          {policy.sections.map((section) => (
            <PolicySection key={section.title} section={section} />
          ))}

          <section className="border-t border-[#D9D0BE] pt-8">
            <h2 className="mb-4 font-[var(--font-display)] text-[1.45rem] font-semibold leading-tight text-[#0F1923]">
              Contact
            </h2>
            <p className="text-[0.96rem] leading-8 text-[#495057]">
              For questions about this policy, contact {hotel.name} at{" "}
              <a
                href={hotel.phoneHref}
                className="font-semibold text-[#0F1923] underline decoration-[#C9A84C] underline-offset-4"
              >
                {hotel.phone}
              </a>{" "}
              or{" "}
              <a
                href={hotel.emailHref}
                className="font-semibold text-[#0F1923] underline decoration-[#C9A84C] underline-offset-4"
              >
                {hotel.email}
              </a>
              .
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
