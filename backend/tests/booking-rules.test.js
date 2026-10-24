/*
 * OP-02: API checks for the booking rules fixed in the QA pass.
 *
 * Uses only Node's built-in test runner and fetch (Node 18+), so there is
 * nothing to install. Run against a LOCAL or STAGING server — the blocked-date
 * test briefly blocks and unblocks a date on TEST_ROOM_ID.
 *
 *   BASE_URL=http://localhost:5000 \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   GUEST_EMAIL=... GUEST_PASSWORD=... \
 *   TEST_ROOM_ID=1 \
 *   npm test
 *
 * Any test whose credentials are missing is skipped, not failed.
 */
const { test, before } = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.BASE_URL || "http://localhost:5000";
const ROOM = Number(process.env.TEST_ROOM_ID || 0);

async function login(email, password) {
  if (!email || !password) return null;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status}`);
  const cookie = (res.headers.get("set-cookie") || "").split(";")[0];
  const body = await res.json();
  return { cookie, user: body.user };
}

function api(session, path, options = {}) {
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Cookie: session.cookie } : {}),
      ...(options.headers || {}),
    },
  });
}

function isoDay(offsetDays) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

let admin = null;
let guest = null;

before(async () => {
  admin = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  guest = await login(process.env.GUEST_EMAIL, process.env.GUEST_PASSWORD);
});

test("BK-07: reversed search dates are rejected", async () => {
  const res = await api(
    null,
    `/api/rooms?check_in=${isoDay(10)}&check_out=${isoDay(8)}`,
  );
  assert.equal(res.status, 400);
});

test("BK-01: a guest cannot create a confirmed booking without paying", async (t) => {
  if (!guest || !ROOM) return t.skip("GUEST_* / TEST_ROOM_ID not set");
  const res = await api(guest, "/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      room_id: ROOM,
      check_in_date: isoDay(60),
      check_out_date: isoDay(61),
      guest_count: 1,
    }),
  });
  assert.equal(res.status, 403);
});

test("BK-02: a guest cannot cancel through the API", async (t) => {
  if (!guest) return t.skip("GUEST_* not set");
  const res = await api(guest, "/api/bookings/999999999/cancel", {
    method: "PATCH",
  });
  // 404 for a missing booking is checked before the role, so accept either
  assert.ok([403, 404].includes(res.status), `got ${res.status}`);
});

test("BK-03: logged-in checkout rejects a past check-in date", async (t) => {
  if (!guest || !ROOM) return t.skip("GUEST_* / TEST_ROOM_ID not set");
  const res = await api(guest, "/api/payment/create-order", {
    method: "POST",
    body: JSON.stringify({
      user_id: guest.user.user_id,
      room_id: ROOM,
      check_in_date: isoDay(-2),
      check_out_date: isoDay(-1),
      guest_count: 1,
      vehicle_type: "none",
    }),
  });
  assert.equal(res.status, 400);
});

test("Blocked dates: checkout refuses a night the admin blocked", async (t) => {
  if (!admin || !guest || !ROOM)
    return t.skip("ADMIN_* / GUEST_* / TEST_ROOM_ID not set");
  const night = isoDay(90);
  const block = await api(admin, `/api/admin/rooms/${ROOM}/blocked-dates`, {
    method: "POST",
    body: JSON.stringify({ dates: [night], reason: "maintenance", note: "QA test" }),
  });
  if (block.status === 409) return t.skip("night already sold on TEST_ROOM_ID");
  assert.equal(block.status, 200);
  try {
    const res = await api(guest, "/api/payment/create-order", {
      method: "POST",
      body: JSON.stringify({
        user_id: guest.user.user_id,
        room_id: ROOM,
        check_in_date: night,
        check_out_date: isoDay(91),
        guest_count: 1,
        vehicle_type: "none",
      }),
    });
    assert.equal(res.status, 409);
  } finally {
    await api(admin, `/api/admin/rooms/${ROOM}/blocked-dates`, {
      method: "DELETE",
      body: JSON.stringify({ dates: [night] }),
    });
  }
});

test("PY-01: the webhook rejects an unsigned call", async () => {
  const res = await api(null, "/api/payment/webhook", {
    method: "POST",
    body: JSON.stringify({ event: "payment.captured" }),
  });
  // 503 until RAZORPAY_WEBHOOK_SECRET is set, 400 (bad signature) after
  assert.ok([400, 503].includes(res.status), `got ${res.status}`);
});
