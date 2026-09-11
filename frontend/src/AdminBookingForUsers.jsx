import React, { useEffect, useMemo, useState } from "react";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  ArrowLeftIcon,
  CalendarIcon,
  CarIcon,
  CheckIcon,
  MapPinIcon,
  UserIcon,
} from "./Icons";

import {
  computeRoomBill,
  nightlyRate as resolveNightlyRate,
  money2,
  GSTIN_PATTERN,
} from "./utils/billing";

const ADVANCE_RATE = 0.3;
const MANUAL_PAYMENT_MODES = ["Cash", "Online", "Other"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CUSTOMER_NAME_PATTERN = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

function normalizePhone(value) {
  let phone = String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");

  if (phone.startsWith("+")) {
    phone = phone.slice(1);
  }

  if (phone.startsWith("91") && phone.length === 12) {
    phone = phone.slice(2);
  }

  if (phone.startsWith("0") && phone.length === 11) {
    phone = phone.slice(1);
  }

  return phone;
}

function isValidPhone(value) {
  return INDIAN_MOBILE_PATTERN.test(normalizePhone(value));
}

const vehicles = [
  {
    id: "none",
    title: "No vehicle",
    subtitle: "Continue without pickup/drop",
  },
  {
    id: "4-seater",
    title: "4-seater Sedan",
    subtitle: "Comfortable for small groups",
  },
  {
    id: "7-seater",
    title: "7-seater SUV",
    subtitle: "Extra space for families",
  },
  {
    id: "12-seater",
    title: "12-seater Van",
    subtitle: "Ideal for larger groups",
  },
];

function formatLocalDate(date) {
  if (!date) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;

  const [year, month, day] = String(dateStr)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function isPastDate(date) {
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date < today;
}

function buildOccupiedNights(bookings = []) {
  const nights = new Set();

  bookings.forEach((booking) => {
    const start = parseLocalDate(booking.check_in_date);
    const end = parseLocalDate(booking.check_out_date);

    if (!start || !end) return;

    const current = new Date(start);

    while (current < end) {
      nights.add(current.toDateString());
      current.setDate(current.getDate() + 1);
    }
  });

  return nights;
}

function isStayAvailable(checkIn, checkOut, occupiedNights) {
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return false;
  }

  const night = new Date(checkIn);

  while (night < checkOut) {
    if (occupiedNights.has(night.toDateString())) {
      return false;
    }

    night.setDate(night.getDate() + 1);
  }

  return true;
}

function money(value) {
  return `Rs.${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
}

export default function AdminBookingForUsers({
  room,
  apiFetch,
  showToast,
  onBack,
  onSuccess,
}) {
  const [form, setForm] = useState({
    check_in_date: "",
    check_out_date: "",
    guest_count: 1,

    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_gst: "",
    customer_address: "",

    vehicle_type: "none",
    pickup_location: "",
    dropoff_location: "",

    advance_amount: "",
    payment_mode: "Cash",

    discount_applied: false,
    discount_amount: "",
  });

  const [occupiedNights, setOccupiedNights] = useState(new Set());
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [allowPastDates, setAllowPastDates] = useState(false);

  const [customerLookup, setCustomerLookup] = useState({
    status: "idle",
    message: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [paying, setPaying] = useState(false);

  /* -----------------------------------------------------------
   * LOAD BOOKED DATES
   * --------------------------------------------------------- */

  useEffect(() => {
    let active = true;

    async function loadBookedDates() {
      setCalendarLoading(true);

      try {
        const res = await apiFetch(
          `/api/rooms/${room.room_id}/booked-dates`,
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Unable to load calendar");
        }

        if (active) {
          setOccupiedNights(buildOccupiedNights(data));
        }
      } catch (err) {
        if (active) {
          setOccupiedNights(new Set());
          showToast(err.message, "error");
        }
      } finally {
        if (active) {
          setCalendarLoading(false);
        }
      }
    }

    loadBookedDates();

    return () => {
      active = false;
    };
  }, [apiFetch, room.room_id, showToast]);

  /* -----------------------------------------------------------
   * CUSTOMER LOOKUP
   * --------------------------------------------------------- */

  useEffect(() => {
    const phone = normalizePhone(form.customer_phone);

    if (!INDIAN_MOBILE_PATTERN.test(phone)) {
      setCustomerLookup({
        status: "idle",
        message: "",
      });

      return undefined;
    }

    let active = true;

    const timer = setTimeout(async () => {
      setCustomerLookup({
        status: "loading",
        message: "Checking existing customer...",
      });

      try {
        const res = await apiFetch(
          `/api/customers/lookup?phone=${encodeURIComponent(phone)}`,
        );

        const data = await res.json();

        if (!active) return;

        if (!res.ok) {
          throw new Error(
            data.error || "Unable to lookup customer",
          );
        }

        if (data.exists && data.user) {
          setForm((prev) => {
            if (normalizePhone(prev.customer_phone) !== phone) {
              return prev;
            }

            return {
              ...prev,
              customer_name:
                data.user.name || prev.customer_name,
              customer_email:
                data.user.email || "",
              customer_phone:
                data.user.phone || prev.customer_phone,
            };
          });

          setCustomerLookup({
            status: "found",
            message: "Existing customer details loaded",
          });
        } else {
          setCustomerLookup({
            status: "new",
            message: "New customer phone number",
          });
        }
      } catch (err) {
        if (active) {
          setCustomerLookup({
            status: "error",
            message: err.message,
          });
        }
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [apiFetch, form.customer_phone]);

  /* -----------------------------------------------------------
   * CUSTOMER VALIDATION
   * --------------------------------------------------------- */

  function getCustomerFieldError(name, value) {
    const text = String(value || "").trim();

    if (name === "customer_name") {
      if (!text) {
        return "Customer name is required";
      }

      if (!CUSTOMER_NAME_PATTERN.test(text)) {
        return "Customer name must contain letters only";
      }
    }

    if (name === "customer_email") {
      if (!text) {
        return "";
      }

      if (!EMAIL_PATTERN.test(text.toLowerCase())) {
        return "Enter a valid email address";
      }
    }

    if (name === "customer_phone") {
      if (!text) {
        return "Phone number is required";
      }

      if (!isValidPhone(text)) {
        return "Enter a valid 10-digit mobile number";
      }
    }

    if (name === "customer_gst") {
      if (!text) {
        return "";
      }

      if (!GSTIN_PATTERN.test(text.toUpperCase())) {
        return "Enter a valid 15-character GSTIN";
      }
    }

    return "";
  }

  function getCustomerFieldErrors() {
    const errors = {};

    [
      "customer_name",
      "customer_email",
      "customer_phone",
      "customer_gst",
    ].forEach((name) => {
      const error = getCustomerFieldError(name, form[name]);

      if (error) {
        errors[name] = error;
      }
    });

    return errors;
  }

  function handleCustomerBlur(name) {
    const error = getCustomerFieldError(name, form[name]);

    setFieldErrors((prev) => {
      const next = { ...prev };

      if (error) {
        next[name] = error;
      } else {
        delete next[name];
      }

      return next;
    });

    if (error) return;

    const value =
      name === "customer_email"
        ? form[name].trim().toLowerCase()
        : name === "customer_phone"
          ? normalizePhone(form[name])
          : name === "customer_gst"
            ? form[name].trim().toUpperCase()
            : form[name].trim();

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  /* -----------------------------------------------------------
   * DATE / BILL CALCULATION
   * --------------------------------------------------------- */

  const checkInDate = parseLocalDate(form.check_in_date);
  const checkOutDate = parseLocalDate(form.check_out_date);

  const nights =
    checkInDate && checkOutDate
      ? Math.max(
          0,
          Math.ceil(
            (checkOutDate - checkInDate) / 86400000,
          ),
        )
      : 0;

  const nightlyRate = useMemo(
    () =>
      resolveNightlyRate(
        room,
        form.guest_count,
      ),
    [room, form.guest_count],
  );

  const totals = useMemo(() => {
    const bill = computeRoomBill({
      tariff: nightlyRate * nights,
      discount: form.discount_applied
        ? form.discount_amount
        : 0,
      gstEnabled: true,
    });

    const fullAmount = bill.total;

    const suggestedAdvanceAmount = Math.floor(
      fullAmount * ADVANCE_RATE,
    );

    /*
     * IMPORTANT:
     *
     * Empty advance amount = 0.
     *
     * This allows Cash booking without entering
     * an advance amount.
     */
 const rawAdvanceAmount = form.advance_amount;

const advanceAmount =
  rawAdvanceAmount === "" ||
  rawAdvanceAmount === null ||
  rawAdvanceAmount === undefined
    ? 0
    : Number(rawAdvanceAmount);

const safeAdvanceAmount = Number.isFinite(advanceAmount)
  ? Math.max(0, advanceAmount)
  : 0;

const remainingAmount = Math.max(
  0,
  Number(fullAmount) - safeAdvanceAmount,
);

   return {
  roomSubtotal: bill.roomTariff,
  discountAmount: bill.bookingDiscount,
  discountedRoomAmount: bill.roomTaxable,
  taxableAmount: bill.roomTaxable,
  grossTotal: bill.total,
  gst: bill.gst,
  fullAmount,
  suggestedAdvanceAmount,
  advanceAmount: safeAdvanceAmount,
  remainingAmount,
};
  }, [
    form.advance_amount,
    form.discount_amount,
    form.discount_applied,
    nights,
    nightlyRate,
  ]);

  /* -----------------------------------------------------------
   * FORM UPDATE
   * --------------------------------------------------------- */

  function update(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors((prev) => {
      if (!prev[name]) {
        return prev;
      }

      const next = { ...prev };
      delete next[name];

      return next;
    });
  }

  /* -----------------------------------------------------------
   * DATE HANDLERS
   * --------------------------------------------------------- */

  function handleCheckInChange(date) {
    const nextCheckIn = date
      ? formatLocalDate(date)
      : "";

    setForm((prev) => {
      const currentCheckOut = parseLocalDate(
        prev.check_out_date,
      );

      const keepCheckOut =
        date &&
        currentCheckOut &&
        isStayAvailable(
          date,
          currentCheckOut,
          occupiedNights,
        );

      return {
        ...prev,
        check_in_date: nextCheckIn,
        check_out_date: keepCheckOut
          ? prev.check_out_date
          : "",
      };
    });
  }

  function handleCheckOutChange(date) {
    update(
      "check_out_date",
      date ? formatLocalDate(date) : "",
    );
  }

  function handleAllowPastDatesChange(event) {
    const enabled = event.target.checked;

    setAllowPastDates(enabled);

    if (!enabled) {
      setForm((prev) => ({
        ...prev,

        check_in_date: isPastDate(
          parseLocalDate(prev.check_in_date),
        )
          ? ""
          : prev.check_in_date,

        check_out_date: isPastDate(
          parseLocalDate(prev.check_out_date),
        )
          ? ""
          : prev.check_out_date,
      }));
    }
  }

  const customerLookupClass =
    customerLookup.status === "found"
      ? "text-[#2D9A6E]"
      : customerLookup.status === "error"
        ? "text-[#C0392B]"
        : "text-[#868E96]";

  /* -----------------------------------------------------------
   * VALIDATION
   * --------------------------------------------------------- */

  function validate() {
    if (
      !nights ||
      !isStayAvailable(
        checkInDate,
        checkOutDate,
        occupiedNights,
      )
    ) {
      showToast(
        "Select valid available check-in and check-out dates",
        "error",
      );

      return false;
    }

    const customerErrors =
      getCustomerFieldErrors();

    setFieldErrors(customerErrors);

    if (Object.keys(customerErrors).length) {
      showToast(
        Object.values(customerErrors)[0],
        "error",
      );

      return false;
    }

    if (
      !MANUAL_PAYMENT_MODES.includes(
        form.payment_mode,
      )
    ) {
      showToast(
        "Select Cash, Online or Other payment mode",
        "error",
      );

      return false;
    }

    /* ---------------------------------------------------------
     * DISCOUNT VALIDATION
     * ------------------------------------------------------- */

    if (form.discount_applied) {
      if (
        !Number.isFinite(
          totals.discountAmount,
        ) ||
        totals.discountAmount < 0
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          discount_amount:
            "Enter a valid non-negative discount",
        }));

        showToast(
          "Enter a valid non-negative discount",
          "error",
        );

        return false;
      }

      if (
        totals.discountAmount >
        totals.roomSubtotal
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          discount_amount: `Discount cannot exceed the room tariff of ${money(
            totals.roomSubtotal,
          )}`,
        }));

        showToast(
          "Discount cannot exceed the room tariff",
          "error",
        );

        return false;
      }
    }

    /* ---------------------------------------------------------
     * ADVANCE VALIDATION
     *
     * CASH:
     * Empty advance = allowed = 0
     *
     * ONLINE:
     * Empty advance = NOT allowed
     * Advance must be greater than 0
     * ------------------------------------------------------- */

    if (form.payment_mode === "Online") {
      if (
        String(form.advance_amount).trim() === "" ||
        !Number.isFinite(
          totals.advanceAmount,
        ) ||
        totals.advanceAmount <= 0
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          advance_amount:
            "Enter a valid advance amount for online payment",
        }));

        showToast(
          "Enter a valid advance amount for online payment",
          "error",
        );

        return false;
      }
    } else {
      /*
       * CASH
       *
       * Empty amount is valid.
       * It is automatically treated as Rs.0.
       */
     
  const rawAdvance = form.advance_amount;

  const isEmptyAdvance =
    rawAdvance === "" ||
    rawAdvance === null ||
    rawAdvance === undefined;

  if (!isEmptyAdvance) {
    const numericAdvance = Number(rawAdvance);

    if (
      !Number.isFinite(numericAdvance) ||
      numericAdvance < 0
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        advance_amount: "Enter a valid advance amount",
      }));

      showToast(
        "Enter a valid advance amount",
        "error",
      );

      return false;
    }
  }
    }

    /* ---------------------------------------------------------
     * ADVANCE CANNOT EXCEED FULL AMOUNT
     * ------------------------------------------------------- */

    if (
      totals.advanceAmount >
      totals.fullAmount
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        advance_amount:
          "Advance amount cannot exceed full amount",
      }));

      showToast(
        "Advance amount cannot exceed full amount",
        "error",
      );

      return false;
    }

    return true;
  }

  /* -----------------------------------------------------------
   * RAZORPAY SCRIPT
   * --------------------------------------------------------- */

  function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        return resolve();
      }

      const existing =
        document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
        );

      if (existing) {
        existing.addEventListener(
          "load",
          () => resolve(),
        );

        existing.addEventListener(
          "error",
          () =>
            reject(
              new Error(
                "Could not load the payment window",
              ),
            ),
        );

        return;
      }

      const script =
        document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve();

      script.onerror = () =>
        reject(
          new Error(
            "Could not load the payment window",
          ),
        );

      document.body.appendChild(script);
    });
  }

  /* -----------------------------------------------------------
   * ONLINE ADVANCE
   * --------------------------------------------------------- */

  async function payAdvanceOnline() {
    if (!validate()) return;

    setPaying(true);

    try {
      await loadRazorpayScript();

      const customerEmail =
        String(
          form.customer_email ?? "",
        )
          .trim()
          .toLowerCase();

      const customerPhone =
        normalizePhone(
          form.customer_phone,
        );

      const orderRes = await apiFetch(
        "/api/admin/bookings/advance-order",
        {
          method: "POST",

          body: JSON.stringify({
            room_id: room.room_id,

            check_in_date:
              form.check_in_date,

            check_out_date:
              form.check_out_date,

            guest_count:
              Number(form.guest_count) || 1,

            advance_amount:
              totals.advanceAmount,

            discount_applied:
              form.discount_applied,

            discount_amount:
              totals.discountAmount,

            gst_enabled: true,
          }),
        },
      );

      const orderData =
        await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(
          orderData.error ||
            "Unable to start the payment",
        );
      }

      const rzp =
        new window.Razorpay({
          key: orderData.razorpay_key,

          amount:
            Math.round(
              Number(
                orderData.advanceAmount,
              ) * 100,
            ),

          currency:
            orderData.currency || "INR",

          name:
            "VV Grand Park Residency",

          description: `Advance — ${room.room_type} (Room ${room.room_number})`,

          order_id:
            orderData.order_id,

          prefill: {
            name:
              form.customer_name.trim(),

            email:
              customerEmail,

            contact:
              customerPhone,
          },

          theme: {
            color: "#0F1923",
          },

          modal: {
            ondismiss: () => {
              setPaying(false);

              showToast(
                "Payment cancelled. No booking was created.",
                "error",
              );
            },
          },

          handler: async (
            response,
          ) => {
            try {
              const confirmRes =
                await apiFetch(
                  "/api/admin/bookings/advance-confirm",
                  {
                    method: "POST",

                    body: JSON.stringify({
                      room_id:
                        room.room_id,

                      check_in_date:
                        form.check_in_date,

                      check_out_date:
                        form.check_out_date,

                      guest_count:
                        Number(
                          form.guest_count,
                        ) || 1,

                      customer: {
                        name:
                          form.customer_name.trim(),

                        email:
                          customerEmail,

                        phone:
                          customerPhone,

                        gst_number:
                          form.customer_gst.trim() ||
                          null,

                        customer_address:
                          form.customer_address.trim() ||
                          null,
                      },

                      vehicle_type:
                        form.vehicle_type,

                      advance_amount:
                        totals.advanceAmount,

                      discount_applied:
                        form.discount_applied,

                      discount_amount:
                        totals.discountAmount,

                      gst_enabled: true,

                      pickup_location:
                        form.vehicle_type ===
                        "none"
                          ? ""
                          : form.pickup_location,

                      dropoff_location:
                        form.vehicle_type ===
                        "none"
                          ? ""
                          : form.dropoff_location,

                      razorpay_order_id:
                        response.razorpay_order_id,

                      razorpay_payment_id:
                        response.razorpay_payment_id,

                      razorpay_signature:
                        response.razorpay_signature,
                    }),
                  },
                );

              const data =
                await confirmRes.json();

              if (!confirmRes.ok) {
                throw new Error(
                  data.error ||
                    "Payment could not be verified",
                );
              }

              showToast(
                `Payment received. Invoice email queued to ${
                  data.invoiceEmail ||
                  customerEmail
                }`,
                "success",
              );

              onSuccess?.(
                data.booking_id,
              );
            } catch (err) {
              showToast(
                err.message,
                "error",
              );
            } finally {
              setPaying(false);
            }
          },
        });

      rzp.on(
        "payment.failed",
        (response) => {
          showToast(
            `Payment failed: ${
              response.error
                ?.description ||
              "Please try again."
            }`,
            "error",
          );

          setPaying(false);
        },
      );

      rzp.open();
    } catch (err) {
      showToast(
        err.message,
        "error",
      );

      setPaying(false);
    }
  }

  /* -----------------------------------------------------------
   * CASH / ONLINE PAYMENT
   * --------------------------------------------------------- */

  async function payAdvance() {
    /*
     * ONLINE
     *
     * Goes through Razorpay.
     */
    if (
      form.payment_mode === "Online"
    ) {
      return payAdvanceOnline();
    }

    /*
     * CASH
     *
     * Empty advance amount is allowed.
     * totals.advanceAmount will be 0.
     */
    if (!validate()) return;

    setPaying(true);

    try {
      const customerEmail =
        String(
          form.customer_email ?? "",
        )
          .trim()
          .toLowerCase();

      const customerPhone =
        normalizePhone(
          form.customer_phone,
        );

      const payload = {
        room_id: room.room_id,

        check_in_date:
          form.check_in_date,

        check_out_date:
          form.check_out_date,

        guest_count:
          Number(form.guest_count) || 1,

        customer: {
          name:
            form.customer_name.trim(),

          email:
            customerEmail,

          phone:
            customerPhone,

          gst_number:
            form.customer_gst.trim() ||
            null,

          customer_address:
            form.customer_address.trim() ||
            null,
        },

        vehicle_type:
          form.vehicle_type,

        /*
         * IMPORTANT:
         *
         * Empty Cash advance becomes 0.
         */
        advance_amount:
          totals.advanceAmount,

        payment_mode:
          form.payment_mode,

        gst_enabled: true,

        discount_applied:
          form.discount_applied,

        discount_amount:
          totals.discountAmount,

        pickup_location:
          form.vehicle_type === "none"
            ? ""
            : form.pickup_location,

        dropoff_location:
          form.vehicle_type === "none"
            ? ""
            : form.dropoff_location,
      };

      const confirmRes =
        await apiFetch(
          "/api/admin/bookings/manual-advance-confirm",
          {
            method: "POST",

            body: JSON.stringify(
              payload,
            ),
          },
        );

      const data =
        await confirmRes.json();

      if (!confirmRes.ok) {
        throw new Error(
          data.error ||
            "Unable to confirm booking",
        );
      }

      showToast(
        `Booking confirmed. Invoice email queued to ${
          data.invoiceEmail ||
          customerEmail
        }`,
        "success",
      );

      onSuccess?.(
        data.booking_id,
      );
    } catch (err) {
      showToast(
        err.message,
        "error",
      );
    } finally {
      setPaying(false);
    }
  }
console.log("DEBUG advance:", JSON.stringify(form.advance_amount), typeof form.advance_amount);
  /* -----------------------------------------------------------
   * UI
   * --------------------------------------------------------- */

  return (
    <div className="space-y-5">

      {/* HEADER */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={onBack}
            className="mb-2 flex items-center gap-1 border-0 bg-transparent p-0 text-[0.82rem] font-semibold text-[#868E96] hover:text-[#0F1923]"
          >
            <ArrowLeftIcon size={14} />
            Back to rooms
          </button>

          <h2 className="font-serif text-[1.35rem] font-bold text-[#0F1923]">
            Admin Booking for User
          </h2>

          <p className="text-[0.85rem] text-[#868E96]">
            Record manual advance payment and confirm the customer's stay.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-[#E9ECEF] bg-white px-4 py-2 text-right">
            <div className="text-[0.62rem] font-bold uppercase tracking-[1px] text-[#868E96]">
              Advance Due Now
            </div>

            <div className="font-serif text-[1.25rem] font-bold text-[#0F1923]">
              {money(totals.advanceAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* ROOM + STAY */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">

        {/* ROOM */}

        <div className="overflow-hidden rounded-xl border border-[#E9ECEF] bg-white shadow-[0_1px_4px_rgba(15,25,35,0.05)]">

          <div className="h-[240px] overflow-hidden bg-[#F8F9FA]">
            <img
              src={
                room.image_url ||
                "/hotel-hero.webp"
              }
              alt={room.room_type}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            {[
              ["Room Type", room.room_type],
              [
                "Room Number",
                room.room_number ||
                  room.room_id,
              ],
              [
                "Guests",
                form.guest_count,
              ],
              [
                "Nights",
                nights || "-",
              ],
              [
                "Check-in",
                form.check_in_date ||
                  "-",
              ],
              [
                "Check-out",
                form.check_out_date ||
                  "-",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg bg-[#F8F9FA] px-4 py-3"
              >
                <div className="text-[0.62rem] font-bold uppercase tracking-[1px] text-[#868E96]">
                  {label}
                </div>

                <div className="mt-1 text-[0.92rem] font-semibold text-[#0F1923]">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* STAY + CUSTOMER */}

        <div className="space-y-5">

          {/* STAY DETAILS */}

          <div className="rounded-xl border border-[#E9ECEF] bg-white p-5 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">

            <div className="mb-4 flex items-center gap-2 font-serif text-[1rem] font-bold text-[#0F1923]">
              <CalendarIcon
                size={18}
                color="#C9A84C"
              />
              Stay Details
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <div>
                <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[1px] text-[#868E96]">
                  Check-in
                </label>

                <DatePicker
                  selected={
                    checkInDate
                  }
                  onChange={
                    handleCheckInChange
                  }
                  minDate={
                    allowPastDates
                      ? null
                      : new Date()
                  }
                  filterDate={(date) =>
                    (allowPastDates ||
                      !isPastDate(date)) &&
                    !occupiedNights.has(
                      date.toDateString(),
                    )
                  }
                  dayClassName={(date) =>
                    allowPastDates &&
                    isPastDate(date)
                      ? "vv-past-date-selectable"
                      : undefined
                  }
                  dateFormat="dd/MM/yyyy"
                  placeholderText="DD/MM/YYYY"
                  popperClassName="vv-calendar-popper"
                  calendarClassName="vv-calendar"
                  disabled={
                    calendarLoading ||
                    paying
                  }
                  className="w-full rounded-md border border-[#E9ECEF] px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[1px] text-[#868E96]">
                  Check-out
                </label>

                <DatePicker
                  selected={
                    checkOutDate
                  }
                  onChange={
                    handleCheckOutChange
                  }
                  minDate={
                    checkInDate ||
                    (allowPastDates
                      ? null
                      : new Date())
                  }
                  filterDate={(date) =>
                    (allowPastDates ||
                      !isPastDate(date)) &&
                    isStayAvailable(
                      checkInDate,
                      date,
                      occupiedNights,
                    )
                  }
                  dayClassName={(date) =>
                    allowPastDates &&
                    isPastDate(date)
                      ? "vv-past-date-selectable"
                      : undefined
                  }
                  dateFormat="dd/MM/yyyy"
                  placeholderText={
                    checkInDate
                      ? "DD/MM/YYYY"
                      : "Select check-in first"
                  }
                  popperClassName="vv-calendar-popper"
                  calendarClassName="vv-calendar"
                  disabled={
                    !checkInDate ||
                    calendarLoading ||
                    paying
                  }
                  className="w-full rounded-md border border-[#E9ECEF] px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[1px] text-[#868E96]">
                Guests
              </label>

              <input
                type="number"
                min={1}
                max={room.capacity || 4}
                value={
                  form.guest_count
                }
                onChange={(e) =>
                  update(
                    "guest_count",
                    e.target.value,
                  )
                }
                className="w-full rounded-md border border-[#E9ECEF] px-3 py-2.5 text-sm outline-none focus:border-[#C9A84C]"
              />

              {Number(
                room.price_double || 0,
              ) > 0 && (
                <div className="mt-1 text-[0.7rem] text-[#868E96]">
                  1 guest{" "}
                  {money(
                    Number(
                      room.price_per_night ||
                        0,
                    ),
                  )}{" "}
                  · 2+ guests{" "}
                  {money(
                    Number(
                      room.price_double,
                    ),
                  )}{" "}
                  per night, plus GST
                </div>
              )}
            </div>

            <label className="mt-3 flex items-center gap-2 text-[0.75rem] font-semibold text-[#495057]">
              <input
                type="checkbox"
                checked={
                  allowPastDates
                }
                onChange={
                  handleAllowPastDatesChange
                }
                disabled={
                  calendarLoading ||
                  paying
                }
                className="h-4 w-4 accent-[#C9A84C]"
              />

              Allow past dates for this booking
            </label>

            <div className="mt-1 text-[0.7rem] text-[#868E96]">
              Past dates stay blocked unless enabled. Occupied nights remain unavailable.
            </div>
          </div>

          {/* CUSTOMER DETAILS */}

          <div className="rounded-xl border border-[#E9ECEF] bg-white p-5 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">

            <div className="mb-4 flex items-center gap-2 font-serif text-[1rem] font-bold text-[#0F1923]">
              <UserIcon
                size={18}
                color="#C9A84C"
              />
              Customer Details
            </div>

            <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">

              {[
                [
                  "customer_name",
                  "Customer name",
                  "text",
                ],
                [
                  "customer_phone",
                  "Phone number",
                  "tel",
                ],
                [
                  "customer_email",
                  "Email address",
                  "email",
                ],
                [
                  "customer_gst",
                  "GST number",
                  "text",
                ],
              ].map(
                ([name, label, type]) => (
                  <div key={name}>

                    <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[1px] text-[#868E96]">
                      {label}

                      {name ===
                        "customer_email" ||
                      name ===
                        "customer_gst"
                        ? " (optional)"
                        : " *"}
                    </label>

                    <input
                      required={
                        name ===
                          "customer_name" ||
                        name ===
                          "customer_phone"
                      }
                      value={form[name]}
                      type={type}
                      inputMode={
                        name ===
                        "customer_phone"
                          ? "numeric"
                          : undefined
                      }
                      maxLength={
                        name ===
                        "customer_phone"
                          ? 17
                          : name ===
                              "customer_gst"
                            ? 15
                            : undefined
                      }
                      autoComplete={
                        name ===
                        "customer_name"
                          ? "name"
                          : name ===
                              "customer_email"
                            ? "email"
                            : name ===
                                "customer_gst"
                              ? "off"
                              : "tel"
                      }
                      onChange={(e) =>
                        update(
                          name,
                          name ===
                            "customer_gst"
                            ? e.target.value.toUpperCase()
                            : e.target.value,
                        )
                      }
                      onBlur={() =>
                        handleCustomerBlur(
                          name,
                        )
                      }
                      placeholder={
                        name ===
                        "customer_phone"
                          ? "+91 98765 43210"
                          : name ===
                              "customer_email"
                            ? "Email address (optional)"
                            : name ===
                                "customer_gst"
                              ? "GST number (optional)"
                              : `${label} required`
                      }
                      aria-invalid={
                        fieldErrors[name]
                          ? "true"
                          : "false"
                      }
                      className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none ${
                        fieldErrors[name]
                          ? "border-[#C0392B] focus:border-[#C0392B]"
                          : "border-[#E9ECEF] focus:border-[#C9A84C]"
                      }`}
                    />

                    {fieldErrors[
                      name
                    ] && (
                      <div className="mt-1 text-[0.72rem] font-semibold text-[#C0392B]">
                        {
                          fieldErrors[
                            name
                          ]
                        }
                      </div>
                    )}

                    {name ===
                      "customer_phone" &&
                      !fieldErrors[
                        name
                      ] &&
                      customerLookup.message && (
                        <div
                          className={`mt-1 text-[0.72rem] font-semibold ${customerLookupClass}`}
                        >
                          {
                            customerLookup.message
                          }
                        </div>
                      )}
                  </div>
                ),
              )}

              {/* ADDRESS */}

              <div className="sm:col-span-2">

                <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[1px] text-[#868E96]">
                  Billing address (optional)
                </label>

                <textarea
                  rows={2}
                  maxLength={255}
                  value={
                    form.customer_address
                  }
                  autoComplete="street-address"
                  onChange={(e) =>
                    update(
                      "customer_address",
                      e.target.value,
                    )
                  }
                  onBlur={() =>
                    update(
                      "customer_address",
                      form.customer_address.trim(),
                    )
                  }
                  placeholder="Company or guest billing address (optional)"
                  className="w-full resize-none rounded-md border border-[#E9ECEF] px-3 py-2.5 text-sm leading-snug outline-none focus:border-[#C9A84C]"
                />

                <div className="mt-1 flex items-center justify-between text-[0.7rem] text-[#868E96]">
                  <span>
                    Printed under BILL TO on the invoice.
                  </span>

                  <span>
                    {
                      form.customer_address
                        .length
                    }
                    /255
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT SECTION */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">

        {/* VEHICLE */}

        <div className="rounded-xl border border-[#E9ECEF] bg-white p-5 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">

          <div className="mb-4 flex items-center gap-2 font-serif text-[1rem] font-bold text-[#0F1923]">
            <CarIcon
              size={18}
              color="#C9A84C"
            />
            Pickup / Drop Vehicle
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            {vehicles.map(
              (vehicle) => {
                const active =
                  form.vehicle_type ===
                  vehicle.id;

                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() =>
                      update(
                        "vehicle_type",
                        vehicle.id,
                      )
                    }
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-[#C9A84C] bg-[#FFF8E5]"
                        : "border-[#E9ECEF] bg-white hover:border-[#C9A84C]"
                    }`}
                  >
                    <span
                      className={`mt-1 h-4 w-4 rounded-full border ${
                        active
                          ? "border-[#C9A84C] bg-[#C9A84C]"
                          : "border-[#ADB5BD]"
                      }`}
                    />

                    <span>
                      <span className="block text-[0.85rem] font-bold text-[#0F1923]">
                        {
                          vehicle.title
                        }
                      </span>

                      <span className="block text-[0.75rem] text-[#868E96]">
                        {
                          vehicle.subtitle
                        }
                      </span>
                    </span>
                  </button>
                );
              },
            )}
          </div>

          {form.vehicle_type !==
            "none" && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

              <div className="relative">
                <MapPinIcon
                  size={14}
                  color="#868E96"
                  className="absolute left-3 top-3"
                />

                <input
                  value={
                    form.pickup_location
                  }
                  onChange={(e) =>
                    update(
                      "pickup_location",
                      e.target.value,
                    )
                  }
                  placeholder="Pickup location"
                  className="w-full rounded-md border border-[#E9ECEF] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#C9A84C]"
                />
              </div>

              <div className="relative">
                <MapPinIcon
                  size={14}
                  color="#868E96"
                  className="absolute left-3 top-3"
                />

                <input
                  value={
                    form.dropoff_location
                  }
                  onChange={(e) =>
                    update(
                      "dropoff_location",
                      e.target.value,
                    )
                  }
                  placeholder="Drop location"
                  className="w-full rounded-md border border-[#E9ECEF] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#C9A84C]"
                />
              </div>
            </div>
          )}

          <p className="mt-3 text-[0.75rem] text-[#868E96]">
            Vehicle selection is a reminder for hotel staff. Pricing can be confirmed separately by the hotel.
          </p>
        </div>

        {/* PAYMENT CALCULATION */}

        <div className="rounded-xl border border-[#E9ECEF] bg-white p-5 shadow-[0_1px_4px_rgba(15,25,35,0.05)]">

          <div className="mb-4 font-serif text-[1rem] font-bold text-[#0F1923]">
            Payment Calculation
          </div>

          <div className="flex items-center justify-between py-3 text-[0.9rem]">
            <span className="text-[#868E96]">
              Room subtotal (
              {money(nightlyRate)} x{" "}
              {nights} night
              {nights === 1
                ? ""
                : "s"}
              )
            </span>

            <span className="font-bold text-[#0F1923]">
              {money(
                totals.roomSubtotal,
              )}
            </span>
          </div>

          {/* DISCOUNT */}

          <label className="flex items-center gap-2 border-t border-[#E9ECEF] py-3 text-[0.82rem] font-semibold text-[#495057]">
            <input
              type="checkbox"
              checked={
                form.discount_applied
              }
              onChange={(e) =>
                update(
                  "discount_applied",
                  e.target.checked,
                )
              }
              disabled={
                paying || !nights
              }
              className="h-4 w-4 accent-[#C9A84C]"
            />

            Apply Discount
          </label>

          {form.discount_applied && (
            <div className="border-t border-[#E9ECEF] py-3">

              <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[1px] text-[#868E96]">
                Discount Amount
              </label>

              <input
                type="number"
                min={0}
                max={Math.max(
                  0,
                  totals.roomSubtotal,
                )}
                step="0.01"
                value={
                  form.discount_amount
                }
                onChange={(e) =>
                  update(
                    "discount_amount",
                    e.target.value,
                  )
                }
                placeholder="Enter fixed discount"
                aria-invalid={
                  fieldErrors.discount_amount
                    ? "true"
                    : "false"
                }
                disabled={
                  paying || !nights
                }
                className={`w-full rounded-md border px-3 py-2.5 text-sm font-semibold text-[#C0392B] outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                  fieldErrors.discount_amount
                    ? "border-[#C0392B] focus:border-[#C0392B]"
                    : "border-[#E9ECEF] focus:border-[#C9A84C]"
                }`}
              />

              {fieldErrors.discount_amount && (
                <div className="mt-1 text-[0.72rem] font-semibold text-[#C0392B]">
                  {
                    fieldErrors.discount_amount
                  }
                </div>
              )}
            </div>
          )}

          {form.discount_applied &&
            totals.discountAmount > 0 && (
              <>
                <div className="flex items-center justify-between border-t border-[#E9ECEF] py-3 text-[0.9rem]">
                  <span className="text-[#868E96]">
                    Discount
                  </span>

                  <span className="font-bold text-[#C0392B]">
                    -{" "}
                    {money(
                      totals.discountAmount,
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-[#E9ECEF] py-3 text-[0.9rem]">
                  <span className="text-[#868E96]">
                    Taxable value
                  </span>

                  <span className="font-bold text-[#0F1923]">
                    {money(
                      totals.taxableAmount,
                    )}
                  </span>
                </div>
              </>
            )}

          {/* GST */}

          <div className="flex items-center justify-between border-t border-[#E9ECEF] py-3 text-[0.9rem]">
            <span className="text-[#868E96]">
              GST (12%)
            </span>

            <span className="font-bold text-[#0F1923]">
              {money(totals.gst)}
            </span>
          </div>

          {/* FULL AMOUNT */}

          <div className="flex items-center justify-between border-t border-[#E9ECEF] py-3 text-[0.9rem]">
            <span className="text-[#868E96]">
              Full amount
            </span>

            <span className="font-bold text-[#0F1923]">
              {money(
                totals.fullAmount,
              )}
            </span>
          </div>

          {/* PAYMENT MODE */}

          <div className="border-t border-[#E9ECEF] py-3">

            <div className="mb-2 text-[0.65rem] font-bold uppercase tracking-[1px] text-[#868E96]">
              Payment mode
            </div>

            <select
              value={form.payment_mode}
              onChange={(e) =>
                update(
                  "payment_mode",
                  e.target.value,
                )
              }
              disabled={paying}
              className="w-full rounded-md border border-[#E9ECEF] bg-white px-3 py-2.5 text-[0.85rem] font-bold text-[#0F1923] outline-none transition focus:border-[#C9A84C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {MANUAL_PAYMENT_MODES.map(
                (mode) => (
                  <option
                    key={mode}
                    value={mode}
                  >
                    {mode}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* ADVANCE AMOUNT */}

          <div className="border-t border-[#E9ECEF] py-3">

            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[1px] text-[#868E96]">
              Advance amount
              {form.payment_mode ===
                "Online" && " *"}
            </label>

            <input
              type="number"

              /*
               * CASH:
               * empty is allowed.
               *
               * ONLINE:
               * amount is required.
               */
              required={
                form.payment_mode ===
                "Online"
              }

              /*
               * CASH can be 0.
               * ONLINE must be >= 1.
               */
              min={
                form.payment_mode ===
                "Online"
                  ? 1
                  : 0
              }

              max={Math.ceil(
                totals.fullAmount || 0,
              )}

              step={1}
              value={
                form.advance_amount
              }
              onChange={(e) =>
                update(
                  "advance_amount",
                  e.target.value,
                )
              }
              placeholder={
                form.payment_mode !==
                "Online"
                  ? "Enter amount or leave empty"
                  : "Enter advance amount"
              }
              aria-invalid={
                fieldErrors.advance_amount
                  ? "true"
                  : "false"
              }
              disabled={
                paying || !nights
              }
              className={`w-full rounded-md border px-3 py-2.5 text-sm font-semibold text-[#2D9A6E] outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                fieldErrors.advance_amount
                  ? "border-[#C0392B] focus:border-[#C0392B]"
                  : "border-[#E9ECEF] focus:border-[#C9A84C]"
              }`}
            />

            {fieldErrors.advance_amount ? (
              <div className="mt-1 text-[0.72rem] font-semibold text-[#C0392B]">
                {
                  fieldErrors.advance_amount
                }
              </div>
            ) : (
              <div className="mt-1 text-[0.72rem] text-[#868E96]">
                {form.payment_mode !==
                "Online"
                  ? `Leave empty for Rs.0 advance. Suggested: ${money(
                      totals.suggestedAdvanceAmount,
                    )}`
                  : `Suggested: ${money(
                      totals.suggestedAdvanceAmount,
                    )}`}
              </div>
            )}

            {/* OTHER: ADVANCE PAID SUMMARY */}

            {form.payment_mode ===
              "Other" &&
              String(
                form.advance_amount,
              ).trim() && (
                <div className="mt-1 text-[0.72rem] font-semibold text-[#2D9A6E]">
                  Advance paid{" "}
                  {money(
                    totals.advanceAmount,
                  )}{" "}
                  (Other)
                </div>
              )}
          </div>

          {/* REMAINING BALANCE */}

          <div className="flex items-center justify-between border-t border-[#E9ECEF] py-3 text-[0.9rem]">
            <span className="text-[#868E96]">
              Remaining balance
            </span>

            <span className="font-bold text-[#B8872F]">
              {money(
                totals.remainingAmount,
              )}
            </span>
          </div>

          {/* CONFIRM BUTTON */}

          <button
            onClick={payAdvance}
            disabled={
              paying ||
              calendarLoading ||
              !nights
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#0F1923] px-4 py-3 text-[0.9rem] font-bold text-white transition hover:bg-[#C9A84C] hover:text-[#0F1923] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckIcon size={16} />

            {paying ? (
              form.payment_mode ===
              "Online"
                ? "Opening payment..."
                : "Confirming..."
            ) : form.payment_mode ===
              "Online" ? (
              String(
                form.advance_amount,
              ).trim() ? (
                `Collect ${money(
                  totals.advanceAmount,
                )} Online`
              ) : (
                "Collect Advance Online"
              )
            ) : String(
                form.advance_amount,
              ).trim() ? (
              `Confirm ${form.payment_mode} Advance ${money(
                totals.advanceAmount,
              )}`
            ) : (
              `Confirm ${form.payment_mode} Booking`
            )}
          </button>

          {/* ONLINE MESSAGE */}

          {form.payment_mode ===
            "Online" && (
            <p className="mt-2 text-center text-[0.7rem] leading-4 text-[#868E96]">
              A Razorpay window will open
              with{" "}
              {money(
                totals.advanceAmount,
              )}{" "}
              pre-filled. The booking is
              created only after the payment
              succeeds.
            </p>
          )}

          {/* CASH MESSAGE */}

          {form.payment_mode ===
            "Cash" &&
            !String(
              form.advance_amount,
            ).trim() && (
              <p className="mt-2 text-center text-[0.7rem] leading-4 text-[#868E96]">
                No advance entered. The
                booking will be confirmed
                with Rs.0 advance and the
                full amount remaining.
              </p>
            )}

          {/* OTHER MESSAGE */}

          {form.payment_mode ===
            "Other" &&
            (String(
              form.advance_amount,
            ).trim() ? (
              <p className="mt-2 text-center text-[0.7rem] leading-4 text-[#868E96]">
                Advance paid{" "}
                {money(
                  totals.advanceAmount,
                )}{" "}
                via Other payment mode.
                Remaining{" "}
                {money(
                  totals.remainingAmount,
                )}{" "}
                due.
              </p>
            ) : (
              <p className="mt-2 text-center text-[0.7rem] leading-4 text-[#868E96]">
                No advance entered. The
                booking will be confirmed
                with Rs.0 advance and the
                full amount remaining.
              </p>
            ))}
        </div>
      </div>
    </div>
  );
}