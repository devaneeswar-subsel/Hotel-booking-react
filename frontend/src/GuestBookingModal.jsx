import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const API = process.env.REACT_APP_API_URL;
const GST_RATE = 0.18;

/* ─────────────────────────────────────────────────────────────────────────────
   GuestBookingModal.jsx

   Booking without an account. The visitor enters name, email and phone, then
   pays through Razorpay. A guest account is created behind the scenes by the
   backend, so they still get a confirmation email and a booking history if
   they sign in later with the same address.
   ──────────────────────────────────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
const PHONE_RE = /^[6-9]\d{9}$/;

const fmtLocal = (d) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`
    : "";

const money = (v) => `Rs.${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;

export default function GuestBookingModal({
  room,
  prefill,
  onClose,
  onSuccess,
  onSignInInstead,
  showToast,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [step, setStep] = useState(1); // 1 = details, 2 = review
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    check_in: prefill?.check_in ? new Date(prefill.check_in) : today,
    check_out: prefill?.check_out
      ? new Date(prefill.check_out)
      : new Date(today.getTime() + 86400000),
    guest_count: Math.max(
      1,
      Number(prefill?.adults || 0) + Number(prefill?.children || 0) ||
        Number(prefill?.guests) ||
        1,
    ),
  });

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const nights =
    form.check_in && form.check_out
      ? Math.max(
          0,
          Math.ceil((form.check_out - form.check_in) / 86400000),
        )
      : 0;

  // rooms with a double-occupancy rate switch to it from 2 guests upward
  const nightlyRate =
    Number(form.guest_count) >= 2 && Number(room.price_double || 0) > 0
      ? Number(room.price_double)
      : Number(room.price_per_night || 0);

  const roomSubtotal = nightlyRate * nights;
  const gst = Math.round(roomSubtotal * GST_RATE * 100) / 100;
  const total = Math.round((roomSubtotal + gst) * 100) / 100;

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required";
    else if (!NAME_RE.test(form.name.trim()))
      next.name = "Name should contain letters only";

    if (!form.email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(form.email.trim()))
      next.email = "Enter a valid email address";

    const phone = form.phone.replace(/[^\d]/g, "").slice(-10);
    if (!form.phone.trim()) next.phone = "Phone number is required";
    else if (!PHONE_RE.test(phone))
      next.phone = "Enter a valid 10-digit mobile number";

    if (nights <= 0) next.dates = "Check-out must be after check-in";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function startPayment() {
    if (!validate()) return;
    setLoading(true);

    try {
      const orderRes = await fetch(
        `${API}/api/payment/guest/create-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: room.room_id,
            check_in_date: fmtLocal(form.check_in),
            check_out_date: fmtLocal(form.check_out),
            guest_count: Number(form.guest_count) || 1,
            customer: {
              name: form.name.trim(),
              email: form.email.trim().toLowerCase(),
              phone: form.phone.replace(/[^\d]/g, "").slice(-10),
            },
          }),
        },
      );

      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || "Could not start booking");

      if (!window.Razorpay) {
        throw new Error(
          "Payment library did not load. Please refresh and try again.",
        );
      }

      const rzp = new window.Razorpay({
        key: order.razorpay_key,
        amount: Math.round(order.total_price * 100),
        currency: "INR",
        name: "VV Grand Park Residency",
        description: order.room_name,
        order_id: order.razorpay_order_id,
        prefill: {
          name: form.name.trim(),
          email: form.email.trim(),
          contact: form.phone.replace(/[^\d]/g, "").slice(-10),
        },
        theme: { color: "#0F1923" },
        modal: {
          ondismiss: () => {
            setLoading(false);
            showToast?.("Payment cancelled.", "error");
          },
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(
              `${API}/api/payment/guest/verify`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  booking_id: order.booking_id,
                }),
              },
            );
            const data = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(data.error);

            showToast?.("Booking confirmed! Check your email.", "success");
            onSuccess?.(data.booking || { booking_id: order.booking_id });
          } catch (err) {
            showToast?.(err.message, "error");
          } finally {
            setLoading(false);
          }
        },
      });

      rzp.on("payment.failed", (resp) => {
        showToast?.(
          `Payment failed: ${resp.error?.description || "please try again"}`,
          "error",
        );
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      showToast?.(err.message, "error");
      setLoading(false);
    }
  }

  // same classes the signed-in BookingModal uses, so both look identical
  const inputCls =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500";
  const labelCls = "text-xs font-medium text-gray-500";

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-[92vw] max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="font-display text-base font-semibold text-navy">
            Book {room.room_type} — Room {room.room_number || room.room_id}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="space-y-4">
          {step === 1 && (
            <>
              <p className="mb-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                No account needed. Enter your details and pay securely — your
                confirmation and invoice are emailed to you.
              </p>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Your full name"
                    className={inputCls}
                  />
                  {errors.name && (
                    <p className="mt-1 text-[0.72rem] text-red-600">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className={labelCls}>
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@email.com"
                    className={inputCls}
                  />
                  {errors.email && (
                    <p className="mt-1 text-[0.72rem] text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className={labelCls}>
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="98765 43210"
                    className={inputCls}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-[0.72rem] text-red-600">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Check-in Date</label>
                    <DatePicker
                      selected={form.check_in}
                      onChange={(d) => {
                        update("check_in", d);
                        if (d && form.check_out && d >= form.check_out)
                          update("check_out", new Date(d.getTime() + 86400000));
                      }}
                      minDate={today}
                      dateFormat="dd/MM/yyyy"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Check-out Date</label>
                    <DatePicker
                      selected={form.check_out}
                      onChange={(d) => update("check_out", d)}
                      minDate={new Date(form.check_in.getTime() + 86400000)}
                      dateFormat="dd/MM/yyyy"
                      className={inputCls}
                    />
                  </div>
                </div>
                {errors.dates && (
                  <p className="text-[0.72rem] text-red-600">{errors.dates}</p>
                )}

                <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <span className="font-semibold text-navy">Check-in</span>
                    <span className="text-gray-500">24 hours</span>
                  </div>
                  <div className="h-4 w-px bg-gray-200" />
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <span className="font-semibold text-navy">Check-out</span>
                    <span className="text-gray-500">24 hours</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Number of Guests</label>
                  <input
                    type="number"
                    min={1}
                    max={room.capacity || 4}
                    value={form.guest_count}
                    onChange={(e) => update("guest_count", e.target.value)}
                    className={inputCls}
                  />
                  {Number(room.price_double || 0) > 0 && (
                    <p className="mt-1 text-[0.7rem] text-gray-400">
                      1 guest {money(room.price_per_night)} · 2+ guests{" "}
                      {money(room.price_double)} per night, plus GST
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => validate() && setStep(2)}
                className="mt-1 w-full flex items-center justify-center gap-2 bg-navy text-white font-semibold text-sm py-3 rounded-xl hover:bg-navy/90 active:scale-[0.98] transition-all"
              >
                Continue
              </button>

              {onSignInInstead && (
                <p className="mt-3 text-center text-[0.76rem] text-gray-500">
                  Already have an account?{" "}
                  <button
                    onClick={onSignInInstead}
                    className="cursor-pointer border-none bg-transparent p-0 font-semibold text-gold underline"
                  >
                    Sign in instead
                  </button>
                </p>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                {[
                  ["Guest", form.name],
                  ["Email", form.email],
                  ["Phone", form.phone],
                  ["Check-in", fmtLocal(form.check_in)],
                  ["Check-out", fmtLocal(form.check_out)],
                  ["Guests", form.guest_count],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between border-t border-gray-200 py-1.5 text-[0.8rem] first:border-t-0"
                  >
                    <span className="text-gray-400">{label}</span>
                    <span className="font-semibold text-navy">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">
                    {money(nightlyRate)} × {nights} night
                    {nights === 1 ? "" : "s"}
                  </span>
                  <span className="font-semibold text-gray-700">
                    {money(roomSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">GST (18%)</span>
                  <span className="font-semibold text-gray-700">
                    {money(gst)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
                  <span className="font-semibold text-navy">Total Payable</span>
                  <strong className="text-navy">{money(total)}</strong>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  onClick={startPayment}
                  disabled={loading || nights <= 0}
                  className="flex-[2] flex items-center justify-center gap-2 bg-navy text-white font-semibold text-sm py-3 rounded-xl hover:bg-navy/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : `Pay ${money(total)}`}
                </button>
              </div>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.7rem] text-gray-400">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Secured by Razorpay · UPI, Cards, Net Banking
              </p>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}