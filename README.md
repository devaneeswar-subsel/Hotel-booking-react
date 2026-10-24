# VV Grand Park Residency — Hotel Booking

React frontend (`frontend/`, deployed on Vercel) and Node/Express + MySQL
backend (`backend/`, deployed on Railway).

## Run locally

```bash
# backend
cd backend
npm install
# create backend/.env with the variables listed below
npm start              # http://localhost:5000

# frontend
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000" > .env.local
npm start              # http://localhost:3000
```

Node 18 or newer is required (the backend tests use Node's built-in test
runner and `fetch`).

## Backend environment variables

| Variable | Purpose |
| --- | --- |
| `MYSQL_URL` or `MYSQLHOST` / `MYSQLUSER` / `MYSQLPASSWORD` / `MYSQLDATABASE` / `MYSQLPORT` | Database connection |
| `JWT_SECRET` | Signs login sessions. Must be set in production, or every restart logs everyone out |
| `NODE_ENV=production` | Secure cookies, and hides SQL details in 5xx errors |
| `FRONTEND_URL` | Allowed CORS origin(s) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Online payments |
| `RAZORPAY_WEBHOOK_SECRET` | Payment webhook (see below) |
| `RESEND_API_KEY` | Booking and OTP emails |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Room photo uploads |

## Razorpay webhook (required for reliable confirmations)

If a guest pays and their tab closes before the browser reports back, only
the webhook can confirm the booking.

1. Razorpay Dashboard → Settings → Webhooks → Add new webhook
2. URL: `https://<your-railway-backend>/api/payment/webhook`
3. Secret: any long random string — put the same value in Railway as
   `RAZORPAY_WEBHOOK_SECRET`
4. Events: `payment.captured` and `order.paid`

Until the secret is set the endpoint answers 503 and changes nothing.

## Database schema

The core tables (`users`, `rooms`, `bookings`) are not created by the code,
so `backend/schema.sql` is the only way to rebuild the database. Refresh it
from production whenever a table or column is added, and commit it:

```powershell
cd backend
$env:MYSQL_URL = "<MYSQL_PUBLIC_URL from the Railway MySQL service → Variables>"
npm run dump-schema
```

It reads table definitions only — no guest data. Also make sure backups are
switched on for the MySQL service in Railway.

## Invoice numbers

Bookings confirmed after the invoice-series release get a consecutive number
per Indian financial year, `INV-2026-27-0001`, assigned only once a booking
is confirmed (abandoned checkouts never use a number). Bookings that existed
before keep the `INV-<year>-<booking id>` number already on their invoices.
The first booking id in the new series is stored in `app_settings`
(`invoice_series_from_booking_id`).

## Tests

```bash
# backend: run against a LOCAL or STAGING server, never production
cd backend
BASE_URL=http://localhost:5000 \
ADMIN_EMAIL=... ADMIN_PASSWORD=... \
GUEST_EMAIL=... GUEST_PASSWORD=... \
TEST_ROOM_ID=1 \
npm test

# frontend
cd frontend
npm test
```

## Maintenance checks

Accounts still holding a plain-text password from before hashing was added
(they are upgraded automatically on their next login):

```sql
SELECT user_id, email, role FROM users WHERE password NOT LIKE '$2%';
```

Ask those users to log in once, or reset their password from the admin
dashboard (staff) / Forgot password (guests).
