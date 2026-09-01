import React, { useState, useEffect } from "react";
import { printInvoicePdf } from "./invoicePdf";

const API = process.env.REACT_APP_API_URL;
const GST_RATE = 0.18;

const apiFetch = (url, options = {}) =>
  fetch(`${API}${url}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

const ID_PROOF_TYPES = [
  "Aadhaar Card",
  "PAN Card",
  "Driving License",
  "Passport",
  "Voter ID",
];

const PAYMENT_METHODS = [
  "Online Payment",
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
];

const MAX_ADULTS = 4;
const MAX_CHILDREN = 2;

const PRESET_ADDONS = ["Food & Beverages", "Laundry", "Extra Bed", "Room Service"];

const money = (v) => `₹ ${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

/* ── tiny inline icons ─────────────────────────────────────────────────────── */
const I = {
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
  ),
  id: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2.2" /><path d="M14 10h5M14 14h3" />
    </svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  ),
  card: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
    </svg>
  ),
  user: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  receipt: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M8 12.5l2.8 2.8L16 10" />
    </svg>
  ),
  print: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  exit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><path d="M21 12H9" />
    </svg>
  ),
  lock: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
};

/* ── small building blocks ─────────────────────────────────────────────────── */
function Card({ icon, title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,25,35,0.04)] ${className}`}>
      {title && (
        <div className="flex items-start gap-2 border-b border-gray-100 px-4 py-2.5">
          <span className="mt-0.5 text-navy/60">{icon}</span>
          <div>
            <div className="font-body text-[0.85rem] font-bold text-navy">{title}</div>
            {subtitle && <div className="text-[0.68rem] text-gray-400">{subtitle}</div>}
          </div>
        </div>
      )}
      <div className="px-4 py-3.5">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-2.5">
      <label className="mb-1 block text-[0.68rem] font-semibold text-gray-500">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[0.8rem] text-navy outline-none transition focus:border-navy/50 focus:ring-2 focus:ring-navy/10 disabled:bg-gray-50 disabled:text-gray-500";

function Counter({ value, onChange, min = 0, max = 20, disabled }) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-[1rem] font-bold text-navy transition hover:bg-gray-50 disabled:opacity-40"
      >
        −
      </button>
      <span className="w-8 text-center text-[0.9rem] font-bold text-navy">{value}</span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-[1rem] font-bold text-navy transition hover:bg-gray-50 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

function Row({ label, value, strong, muted }) {
  return (
    <div className="flex items-center justify-between py-[5px] text-[0.8rem]">
      <span className={muted ? "text-gray-400" : "text-gray-500"}>{label}</span>
      <span className={`${strong ? "font-bold text-navy" : "font-semibold text-navy/80"}`}>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   GUEST CHECK-IN PAGE
   ══════════════════════════════════════════════════════════════════════════════ */
export default function GuestCheckIn({ bookingId, onClose, showToast, onRefresh }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* form state */
  const [idType, setIdType] = useState("Aadhaar Card");
  const [idNumber, setIdNumber] = useState("");
  const [adults, setAdults] = useState(1);
  const [adultRows, setAdultRows] = useState([{ name: "", age: "", gender: "" }]);
  const [children, setChildren] = useState(0);
  const [childRows, setChildRows] = useState([]);
  const [payMethod, setPayMethod] = useState("Online Payment");
  const [now, setNow] = useState(Date.now());

  // refresh the elapsed-time readout while the guest is still in the room
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  /* add-on state (used after check-in) */
  const [addonLabel, setAddonLabel] = useState("");
  const [addonAmount, setAddonAmount] = useState("");

  const toast = showToast || (() => {});

  /* ── fetch booking (auto-populates every field) ─────────────────────────── */
  // hydrate=false keeps whatever the user has typed; used after actions that
  // only need fresh server totals (mark-as-paid, add-ons)
  const fetchBooking = (hydrate = true) => {
    apiFetch(`/api/admin/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((data) => {
        setBooking(data);
        if (!hydrate) return;
        // hydrate the form from whatever the backend already knows
        if (data.id_proof_type) setIdType(data.id_proof_type);
        if (data.id_proof_number) setIdNumber(data.id_proof_number);
        if (data.checkin_payment_mode) {
          setPayMethod(data.checkin_payment_mode);
        } else if (data.payment_method) {
          const m = String(data.payment_method).toLowerCase();
          if (m.includes("cash")) setPayMethod("Cash");
          else if (m.includes("upi")) setPayMethod("UPI");
          else if (m.includes("card")) setPayMethod("Card");
          else if (m.includes("bank")) setPayMethod("Bank Transfer");
          else setPayMethod("Online Payment");
        }

        const saved = data.guests || [];
        const savedAdults = saved.filter((g) => g.guest_type === "adult");
        const savedKids = saved.filter((g) => g.guest_type === "child");

        const adultCount = Math.min(
          MAX_ADULTS,
          Math.max(
            1,
            savedAdults.length || Number(data.adults_count) || Number(data.guest_count) || 1,
          ),
        );
        setAdults(adultCount);
        setAdultRows(
          Array.from({ length: adultCount }, (_, i) => ({
            name: savedAdults[i]?.name || (i === 0 ? data.guest_name || "" : ""),
            age: savedAdults[i]?.age ?? "",
            gender: savedAdults[i]?.gender || "",
          })),
        );

        const kidCount = Math.min(
          MAX_CHILDREN,
          Math.max(0, savedKids.length || Number(data.children_count) || 0),
        );
        setChildren(kidCount);
        setChildRows(
          Array.from({ length: kidCount }, (_, i) => ({
            name: savedKids[i]?.name || "",
            age: savedKids[i]?.age ?? "",
            gender: savedKids[i]?.gender || "",
          })),
        );
      })
      .catch(() => toast("Could not load booking", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchBooking();
    // eslint-disable-next-line
  }, [bookingId]);

  /* keep name rows in sync with the counters */
  const changeAdults = (n) => {
    const c = Math.min(MAX_ADULTS, Math.max(1, n));
    setAdults(c);
    setAdultRows((prev) =>
      Array.from({ length: c }, (_, i) => prev[i] ?? { name: "", age: "", gender: "" }),
    );
  };
  const changeChildren = (n) => {
    const c = Math.min(MAX_CHILDREN, Math.max(0, n));
    setChildren(c);
    setChildRows((prev) =>
      Array.from({ length: c }, (_, i) => prev[i] ?? { name: "", age: "", gender: "" }),
    );
  };

  /* ── actions ───────────────────────────────────────────────────────────── */
  function buildPayload() {
    return {
      id_proof_type: idType,
      id_proof_number: idNumber.trim(),
      adults_count: adults,
      children_count: children,
      payment_mode: payMethod,
      guests: [
        ...adultRows
          .filter((a) => a.name.trim())
          .map((a) => ({
            guest_type: "adult",
            name: a.name.trim(),
            age: a.age === "" ? null : Number(a.age),
            gender: a.gender || null,
          })),
        ...childRows
          .filter((c) => c.name.trim())
          .map((c) => ({
            guest_type: "child",
            name: c.name.trim(),
            age: c.age === "" ? null : Number(c.age),
            gender: c.gender || null,
          })),
      ],
    };
  }

  function validate() {
    if (!idNumber.trim()) {
      toast("Enter the ID proof number", "error");
      return false;
    }
    if (!adultRows[0]?.name.trim()) {
      toast("Enter the primary guest name", "error");
      return false;
    }
    return true;
  }

  async function saveAndCheckIn() {
    if (remaining > 0)
      return toast("Collect the remaining payment before check-in", "error");
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = buildPayload();
      const res = await apiFetch(`/api/bookings/${bookingId}/checkin`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");
      // guard against an out-of-date backend silently dropping the guest list
      if (payload.guests.length && !(data.guests || []).length)
        throw new Error(
          "Checked in, but the guest details did not save. Restart the backend so the latest routes and columns are loaded, then use Edit Details.",
        );
      toast("Guest checked in successfully", "success");
      fetchBooking();
      onRefresh && onRefresh();
    } catch (e) {
      toast(e.message, "error");
      fetchBooking();
      onRefresh && onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function markPaid() {
    setSaving(true);
    try {
      // persist whatever has been typed so far — otherwise the refetch below
      // would discard the guest names the user just entered
      if (!isCheckedIn) {
        await apiFetch(`/api/bookings/${bookingId}/checkin-details`, {
          method: "PUT",
          body: JSON.stringify(buildPayload()),
        }).catch(() => {});
      }

      const res = await apiFetch(`/api/bookings/${bookingId}/balance-paid`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to mark as paid");

      // settle any unpaid add-ons in the same action
      const addonRes = await apiFetch(`/api/bookings/${bookingId}/addons/mark-paid`, {
        method: "PATCH",
      });
      if (!addonRes.ok) {
        const a = await addonRes.json();
        throw new Error(a.error || "Unable to settle add-ons");
      }

      toast("Payment recorded", "success");
      fetchBooking(false);
      onRefresh && onRefresh();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckout() {
    if (unpaidAddons.length > 0 || remaining > 0)
      return toast("Settle all add-on charges before check-out", "error");
    if (!window.confirm("Confirm check-out? This will close the bill.")) return;
    const res = await apiFetch(`/api/bookings/${bookingId}/checkout`, { method: "PATCH" });
    const data = await res.json();
    if (!res.ok) return toast(data.error, "error");
    toast(`Checked out — Total ${money(data.final_total)}`, "success");
    fetchBooking();
    onRefresh && onRefresh();
  }

  async function addAddon() {
    if (!addonLabel || !addonAmount) return toast("Enter label and amount", "error");
    const res = await apiFetch(`/api/bookings/${bookingId}/addons`, {
      method: "POST",
      body: JSON.stringify({ label: addonLabel, amount: +addonAmount }),
    });
    const data = await res.json();
    if (!res.ok) return toast(data.error, "error");
    setAddonLabel("");
    setAddonAmount("");
    toast("Add-on added", "success");
    fetchBooking(false);
    onRefresh && onRefresh();
  }

  async function removeAddon(id) {
    await apiFetch(`/api/bookings/${bookingId}/addons/${id}`, { method: "DELETE" });
    fetchBooking(false);
    onRefresh && onRefresh();
  }

  /* ── loading ───────────────────────────────────────────────────────────── */
  if (loading)
    return (
      <div className="fixed bottom-0 left-0 right-0 top-16 z-[90] flex items-center justify-center bg-[#F5F6F8] md:left-[220px]">
        <div className="rounded-2xl border border-gray-200 bg-white px-10 py-8 text-sm text-gray-400">
          Loading booking details...
        </div>
      </div>
    );
  if (!booking) return null;

  /* ── money math (mirrors the invoice) ──────────────────────────────────── */
  const b = booking;
  const nights =
    b.check_in_date && b.check_out_date
      ? Math.max(
          1,
          Math.ceil((new Date(b.check_out_date) - new Date(b.check_in_date)) / 86400000),
        )
      : 1;

  const roomCharges = Number(b.total_price || 0);
  const vehiclePrice = Number(b.vehicle_price || 0);
  const addonTotal = Number(b.addon_charges || 0);
  const extraServices = addonTotal + vehiclePrice;
  const taxes = Math.round((roomCharges + addonTotal) * GST_RATE * 100) / 100;
  const totalAmount = Math.round((roomCharges + extraServices + taxes) * 100) / 100;

  const advancePaid = Number(b.advance_paid || 0);
  const balancePaid = Number(b.balance_paid || 0);
  const paymentStatus = String(b.payment_status || "").toUpperCase();
  const roomTotalWithGst = Math.round((roomCharges + roomCharges * GST_RATE) * 100) / 100;
  const paymentTotal = Number(b.total_amount || b.final_total || roomTotalWithGst);

  const alreadyPaid =
    paymentStatus === "PAID" && advancePaid + balancePaid === 0
      ? paymentTotal
      : advancePaid + balancePaid;

  const addonsList = b.addons || [];
  const unpaidAddons = addonsList.filter((a) => a.paid !== 1);
  const unpaidAddonTotal = unpaidAddons.reduce((s, a) => s + Number(a.amount || 0), 0);
  const unpaidAddonGst = Math.round(unpaidAddonTotal * GST_RATE * 100) / 100;
  const roomRemaining =
    paymentStatus === "PAID"
      ? 0
      : Math.max(0, Math.round((paymentTotal - advancePaid - balancePaid) * 100) / 100);
  const remaining = Math.round((roomRemaining + unpaidAddonTotal + unpaidAddonGst) * 100) / 100;

  const isCheckedIn = !!b.actual_checkin;
  const isCheckedOut = !!b.actual_checkout;

  // elapsed stay: check-in → check-out, or check-in → now while in-house
  let stayDuration = null;
  if (isCheckedIn) {
    const start = new Date(b.actual_checkin).getTime();
    const end = isCheckedOut ? new Date(b.actual_checkout).getTime() : now;
    const mins = Math.max(0, Math.floor((end - start) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    stayDuration = h > 0 ? `${h} hr ${m} min` : `${m} min`;
  }
  const isCancelled = b.status === "cancelled";
  // guest details are final once the guest is checked in — only add-ons stay editable
  const locked = isCheckedIn || isCancelled || isCheckedOut;

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const guestSummary = [
    `${adults} Adult${adults === 1 ? "" : "s"}`,
    children > 0 ? `${children} Child${children === 1 ? "" : "ren"}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const customerRows = [
    ["Name", b.guest_name],
    ["Email", b.email],
    ["Phone", b.phone],
    ["Booking ID", `BKID${String(b.booking_id).padStart(6, "0")}`],
    ["Check-in Date", fmtDate(b.check_in_date)],
    ["Check-out Date", fmtDate(b.check_out_date)],
    ["Room Type", `${b.room_type}${b.room_number ? ` · ${b.room_number}` : ""}`],
    ["Guests", guestSummary],
  ];

  return (
    // sits inside the admin frame: below the 64px topbar, right of the 220px
    // sidebar, so the shell stays visible and navigation feels continuous
    <div className="fixed bottom-0 left-0 right-0 top-16 z-[90] overflow-y-auto bg-[#F5F6F8] md:left-[220px]">
      <div className="mx-auto max-w-[1500px] px-4 py-4 md:px-6">
        {/* ── page heading ────────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-navy transition hover:bg-gray-50"
            title="Back to bookings"
          >
            {I.back}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[1.15rem] font-bold leading-tight text-navy">
              {isCheckedOut ? "Stay Summary" : isCheckedIn ? "Checked-In Guest" : "Guest Check-In"}
              <span className="ml-2 font-body text-[0.78rem] font-normal text-gray-400">
                #{b.booking_id} · {b.guest_name}
              </span>
            </h1>
            <p className="text-[0.72rem] text-gray-500">
              {isCheckedIn
                ? `Checked in ${new Date(b.actual_checkin).toLocaleString("en-IN")}`
                : "Complete the remaining details to check in"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stayDuration && (
              <span
                className="flex items-center gap-1.5 rounded-full border border-navy/15 bg-navy/[0.04] px-3.5 py-1.5 text-[0.85rem] font-bold text-navy"
                title={isCheckedOut ? "Total stay duration" : "Time since check-in"}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <span className="font-normal text-gray-500">
                  {isCheckedOut ? "Stayed" : "In room"}
                </span>
                {stayDuration}
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wide ${
                isCancelled
                  ? "bg-red-50 text-red-600"
                  : isCheckedOut
                    ? "bg-blue-50 text-blue-600"
                    : isCheckedIn
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {isCancelled
                ? "Cancelled"
                : isCheckedOut
                  ? "Checked Out"
                  : isCheckedIn
                    ? "Checked In"
                    : "Confirmed"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ══ LEFT COLUMN ══════════════════════════════════════════════ */}
          <div className="space-y-4">
            {/* ID Proof */}
            <Card icon={I.id} title="ID Proof">
              <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
                <Field label="Select ID Proof Type">
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    disabled={locked}
                    className={inputCls}
                  >
                    {ID_PROOF_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="ID Proof Number">
                  <input
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    disabled={locked}
                    placeholder="1234 5678 9012"
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[0.68rem] text-amber-800">
                <span className="mt-[1px] text-amber-500">{I.info}</span>
                Enter the ID proof number manually.
              </div>
            </Card>

            {/* Add Guests */}
            <Card icon={I.users} title="Add Guests" subtitle="Add members staying with you">
              {isCheckedIn && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[0.72rem] text-gray-500">
                  <span className="text-gray-400">{I.info}</span>
                  Guest details are locked after check-in.
                </div>
              )}

              <label className="mb-1 block text-[0.7rem] font-semibold text-gray-500">
                Number of Adults
              </label>
              <Counter value={adults} onChange={changeAdults} min={1} max={MAX_ADULTS} disabled={locked} />

              <div className="mt-4">
                <label className="mb-1.5 block text-[0.7rem] font-semibold text-gray-500">
                  Adult Details
                </label>
                <div className="mb-1 hidden grid-cols-[14px_1fr_64px_100px_20px] gap-2 text-[0.62rem] font-semibold text-gray-400 sm:grid">
                  <span />
                  <span>Name</span>
                  <span>Age</span>
                  <span>Gender</span>
                  <span />
                </div>
                <div className="space-y-1.5">
                  {adultRows.map((a, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-[14px_1fr_64px_100px_20px] sm:items-center"
                    >
                      <span className="text-[0.74rem] text-gray-400">{i + 1}.</span>
                      <input
                        value={a.name}
                        disabled={locked}
                        onChange={(e) =>
                          setAdultRows((p) =>
                            p.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)),
                          )
                        }
                        placeholder="Full name"
                        className={inputCls}
                      />
                      <input
                        type="number"
                        min="18"
                        max="120"
                        value={a.age}
                        disabled={locked}
                        onChange={(e) =>
                          setAdultRows((p) =>
                            p.map((r, j) => (j === i ? { ...r, age: e.target.value } : r)),
                          )
                        }
                        placeholder="Age"
                        className={inputCls}
                      />
                      <select
                        value={a.gender}
                        disabled={locked}
                        onChange={(e) =>
                          setAdultRows((p) =>
                            p.map((r, j) => (j === i ? { ...r, gender: e.target.value } : r)),
                          )
                        }
                        className={inputCls}
                      >
                        <option value="">Gender</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                      {i > 0 && !locked ? (
                        <button
                          onClick={() => {
                            setAdultRows((p) => p.filter((_, j) => j !== i));
                            setAdults((n) => Math.max(1, n - 1));
                          }}
                          className="justify-self-start text-gray-400 transition hover:text-red-500"
                        >
                          {I.trash}
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  ))}
                </div>
                {!locked &&
                  (adults < MAX_ADULTS ? (
                    <button
                      onClick={() => changeAdults(adults + 1)}
                      className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-[0.74rem] font-semibold text-navy transition hover:bg-gray-50"
                    >
                      + Add Another Adult
                    </button>
                  ) : (
                    <div className="mt-2 text-[0.7rem] text-gray-400">
                      Maximum {MAX_ADULTS} adults per booking.
                    </div>
                  ))}
              </div>

              <div className="mt-5">
                <label className="mb-1 block text-[0.7rem] font-semibold text-gray-500">
                  Number of Children
                </label>
                <Counter value={children} onChange={changeChildren} min={0} max={MAX_CHILDREN} disabled={locked} />
              </div>

              {children > 0 && (
                <div className="mt-4">
                  <label className="mb-1.5 block text-[0.7rem] font-semibold text-gray-500">
                    Child Details
                  </label>
                  <div className="mb-1 hidden grid-cols-[1fr_64px_100px_20px] gap-2 text-[0.62rem] font-semibold text-gray-400 sm:grid">
                    <span>Name</span>
                    <span>Age</span>
                    <span>Gender</span>
                    <span />
                  </div>
                  <div className="space-y-1.5">
                    {childRows.map((c, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_64px_100px_20px] sm:items-center"
                      >
                        <input
                          value={c.name}
                          disabled={locked}
                          onChange={(e) =>
                            setChildRows((p) =>
                              p.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)),
                            )
                          }
                          placeholder="Child name"
                          className={inputCls}
                        />
                        <input
                          type="number"
                          min="0"
                          max="17"
                          value={c.age}
                          disabled={locked}
                          onChange={(e) =>
                            setChildRows((p) =>
                              p.map((r, j) => (j === i ? { ...r, age: e.target.value } : r)),
                            )
                          }
                          placeholder="Age"
                          className={inputCls}
                        />
                        <select
                          value={c.gender}
                          disabled={locked}
                          onChange={(e) =>
                            setChildRows((p) =>
                              p.map((r, j) => (j === i ? { ...r, gender: e.target.value } : r)),
                            )
                          }
                          className={inputCls}
                        >
                          <option value="">Gender</option>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                        {!locked && (
                          <button
                            onClick={() => {
                              setChildRows((p) => p.filter((_, j) => j !== i));
                              setChildren((n) => Math.max(0, n - 1));
                            }}
                            className="justify-self-start text-gray-400 transition hover:text-red-500"
                          >
                            {I.trash}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {!locked &&
                    (children < MAX_CHILDREN ? (
                      <button
                        onClick={() => changeChildren(children + 1)}
                        className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-[0.74rem] font-semibold text-navy transition hover:bg-gray-50"
                      >
                        + Add Another Child
                      </button>
                    ) : (
                      <div className="mt-2 text-[0.7rem] text-gray-400">
                        Maximum {MAX_CHILDREN} children per booking.
                      </div>
                    ))}
                </div>
              )}
            </Card>

            {/* Add-on charges — only relevant once the guest is in the room */}
            {isCheckedIn && !isCheckedOut && (
              <Card icon={I.receipt} title="Add-on Charges" subtitle="Services used during the stay">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {PRESET_ADDONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setAddonLabel(p)}
                      className={`rounded-full border px-3 py-1 text-[0.72rem] font-semibold transition ${
                        addonLabel === p
                          ? "border-navy bg-navy text-gold"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <input
                    value={addonLabel}
                    onChange={(e) => setAddonLabel(e.target.value)}
                    placeholder="Label (e.g. Airport Transfer)"
                    className={`${inputCls} flex-[2_1_150px]`}
                  />
                  <input
                    type="number"
                    value={addonAmount}
                    onChange={(e) => setAddonAmount(e.target.value)}
                    placeholder="Amount ₹"
                    className={`${inputCls} flex-[1_1_90px]`}
                  />
                  <button
                    onClick={addAddon}
                    className="rounded-lg bg-gold px-4 py-2 text-[0.8rem] font-bold text-white transition hover:bg-gold/90"
                  >
                    + Add
                  </button>
                </div>
                {addonsList.length ? (
                  <div className="space-y-1.5">
                    {addonsList.map((a) => (
                      <div
                        key={a.addon_id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                      >
                        <span className="text-[0.8rem] text-navy">{a.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.82rem] font-bold text-navy">
                            {money(a.amount)}
                          </span>
                          {a.paid === 1 ? (
                            <span className="text-[0.62rem] font-bold uppercase text-emerald-600">
                              Paid
                            </span>
                          ) : (
                            <button
                              onClick={() => removeAddon(a.addon_id)}
                              className="text-[0.72rem] font-bold text-red-500"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-2 text-center text-[0.76rem] text-gray-400">No add-ons yet</div>
                )}
              </Card>
            )}

            {/* Payment */}
            <Card icon={I.card} title="Payment">
              <Field label="Payment Method">
                {locked ? (
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                    <span className="text-[0.8rem] font-semibold text-navy">{payMethod}</span>
                    <span className="text-[0.66rem] text-gray-400">Locked</span>
                  </div>
                ) : (
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className={inputCls}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                )}
              </Field>

              <div className="mt-3 rounded-lg bg-gray-50 px-3.5 py-2.5">
                <div className="mb-1 text-[0.68rem] font-bold uppercase tracking-wider text-gray-400">
                  Amount Summary
                </div>
                <Row label={`Room Charges (${nights} Night${nights > 1 ? "s" : ""})`} value={money(roomCharges)} />
                <Row label="Extra Services" value={money(extraServices)} />
                <Row label="Taxes & Fees" value={money(taxes)} />
                <div className="mt-1 border-t border-gray-200 pt-1">
                  <Row label="Total Amount" value={money(totalAmount)} strong />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                <span className="text-[0.8rem] font-semibold text-emerald-700">Already Paid</span>
                <span className="text-[0.9rem] font-bold text-emerald-700">{money(alreadyPaid)}</span>
              </div>

              <div
                className={`mt-2 flex items-center justify-between rounded-lg border px-3.5 py-2.5 ${
                  remaining > 0
                    ? "border-red-200 bg-red-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <span
                  className={`text-[0.8rem] font-semibold ${
                    remaining > 0 ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {remaining > 0 ? "Amount to Pay (Remaining)" : "Fully Settled"}
                </span>
                <span
                  className={`text-[0.9rem] font-bold ${
                    remaining > 0 ? "text-red-700" : "text-emerald-700"
                  }`}
                >
                  {money(remaining)}
                </span>
              </div>

              {remaining > 0 ? (
                <>
                  <button
                    onClick={markPaid}
                    disabled={saving || isCancelled}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#B07B2B] py-2.5 text-[0.86rem] font-bold text-white transition hover:bg-[#9a6a23] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {I.check}
                    {saving ? "Recording..." : `Mark as Paid — ${money(remaining)}`}
                  </button>
                  <div className="mt-1.5 flex items-center justify-center gap-1 text-[0.66rem] text-gray-400">
                    {I.lock} Secure Payment
                  </div>
                </>
              ) : (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 py-2.5 text-[0.84rem] font-bold text-emerald-700">
                  {I.check} Payment Complete
                </div>
              )}
            </Card>
          </div>

          {/* ══ RIGHT COLUMN ═════════════════════════════════════════════ */}
          <div className="space-y-4 lg:sticky lg:top-4">
            <Card icon={I.user} title="Customer Details">
              <div className="divide-y divide-gray-100">
                {customerRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-3 py-1.5"
                  >
                    <span className="shrink-0 text-[0.68rem] text-gray-400">{label}</span>
                    <span className="text-right text-[0.78rem] font-semibold text-navy">
                      {value || "—"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[0.68rem] text-amber-800">
                <span className="mt-[1px] text-amber-500">{I.info}</span>
                Ensure the ID proof matches the booking details.
              </div>
            </Card>

            <Card icon={I.receipt} title="Payment Summary" subtitle="Already paid">
              <div className="rounded-lg bg-gray-50 px-3.5 py-2.5">
                <Row label="Total Paid Amount" value={money(alreadyPaid)} strong />
                <Row label="Payment Method" value={b.payment_method || payMethod} />
                <Row
                  label="Paid Date"
                  value={
                    b.created_at
                      ? new Date(b.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"
                  }
                />
                <Row label="Transaction ID" value={b.payment_id || b.advance_payment_id || "—"} />
              </div>

              <div className="mt-3">
                <div className="mb-1 text-[0.68rem] font-bold uppercase tracking-wider text-gray-400">
                  Payment Breakdown
                </div>
                <Row label="Advance Payment" value={money(advancePaid)} />
                {balancePaid > 0 && <Row label="Balance Paid" value={money(balancePaid)} />}
                <Row label="Balance (Remaining)" value={money(remaining)} strong />
              </div>
            </Card>

            {isCheckedIn && !isCheckedOut && (
              <div>
                <button
                  onClick={handleCheckout}
                  disabled={remaining > 0 || unpaidAddons.length > 0}
                  className="w-full rounded-lg bg-navy py-3 text-[0.86rem] font-bold text-gold transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                >
                  ⏹ Record Check-out
                </button>
                {(remaining > 0 || unpaidAddons.length > 0) && (
                  <div className="mt-1.5 text-center text-[0.68rem] text-amber-700">
                    Mark the add-on charges as paid to enable check-out.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── sticky footer actions ───────────────────────────────────────── */}
        <div className="sticky bottom-0 mt-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white/95 p-3 backdrop-blur sm:grid-cols-2">
          <div>
            <button
              onClick={saveAndCheckIn}
              disabled={saving || locked || remaining > 0}
              title={remaining > 0 ? "Collect the remaining payment first" : ""}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F5132] py-3 text-[0.88rem] font-bold text-white transition hover:bg-[#0c3f27] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              {I.check}
              {isCheckedIn ? "Checked In" : saving ? "Saving..." : "Confirmed & Check-In"}
            </button>
            {!isCheckedIn && remaining > 0 && (
              <div className="mt-1.5 text-center text-[0.68rem] text-amber-700">
                Mark the remaining {money(remaining)} as paid to enable check-in.
              </div>
            )}
          </div>
          <button
            onClick={() => printInvoicePdf(booking, { paymentMode: payMethod, showToast: toast })}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 text-[0.88rem] font-bold text-navy transition hover:bg-gray-50"
          >
            {I.print}
            Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
}