# DATABASE — MongoDB via mongoose 8

## Connection
`lib/mongodb.js` — cached on `global.mongoose` (`{conn, promise}`), `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000`, `bufferCommands: false`. Every route/page calls `dbConnect()` first. **Throws at import if `MONGODB_URI` unset.**

## Collections (schemas in `models/`)

### users (`models/User.js`)
| field | type | notes |
|---|---|---|
| name | String, required | |
| username | String, required, **unique** | Google users store their email here |
| email | String, **optional, unique** | ⚠ nullable-unique trap (BUGS B7) |
| password | String, optional | bcrypt hash (cost 10); `''` for Google users |
| role | enum PLAYER/VENDOR/ADMIN | default PLAYER |
| phone, city | String | city synced to top-bar location |
| timestamps | ✓ | createdAt/updatedAt |

### venues (`models/Venue.js`)
name (≤60, required) · owner → User (required) · **sportTypes: enum `['Box Cricket']`** · city, area, address (required) · pricePerHour (required, number) · numberOfTurfs (≥1, default 1) · images[] (Vercel Blob URLs) · amenities[] · rating (default 0) · timestamps.
⚠ No index on `city`/`area` — `/api/cities` uses `distinct('city')` (collection scan).

### bookings (`models/Booking.js`) — the central collection
venue → Venue (required) · user → User (optional — OFFLINE bookings) · bookingType ONLINE/OFFLINE · offlineCustomerName/Phone · date (Date, UTC midnight of IST day) · startTime/endTime (`"HH:MM"` IST strings) · totalAmount (0 for offline) · **status: PENDING | CONFIRMED | CANCELLED | PAYMENT_PENDING** · sport (required) · classification SOLO/TEAM/GROUP · playersCount (≥1) · teamSide 1|2 · paymentId / razorpayOrderId / razorpaySignature · commissionPercent (**default 12**) / commissionAmount · groupId (UUID links multi-slot purchase) · cancellation: cancelledBy PLAYER/VENDOR/ADMIN, cancelledAt, cancellationReason (≤500), refundPercent 0–100, refundAmount · timestamps.
⚠ **No compound indexes** — hot query is `{venue, date range, startTime, endTime}` on every availability/booking call. Add `{venue: 1, date: 1, startTime: 1}` if data grows.

### withdrawals (`models/Withdrawal.js`)
vendor → User (required) · amount, commissionDeducted, netAmount (≥0) · status PENDING/PROCESSING/COMPLETED/REJECTED · month (1–12) + year (required) · requestedAt/processedAt · adminNotes/vendorNotes (≤500) · timestamps.
**Index:** `{vendor, month, year}` unique — enforces one withdrawal per vendor per month.

## Transaction usage (requires **replica set**)
`startSession()` + `startTransaction()` in:
- `POST /api/bookings` (capacity check + create)
- `POST /api/payments/create-order` (order + N bookings, cleanup)
- `POST /api/payments/verify` (status flips + auto-confirm)

Standalone `mongod` will fail these. Atlas (replica set) is fine.

## Seed / admin scripts (`scripts/`, run with `node`/`node --experimental-...`; they load `.env.local` via `dotenv`)
`seed_gujarat_venues.mjs`, `seed_venues.mjs`, `seed_users.mjs`, `seed.js`/`seed.cjs` (full seed), `make-admin.js` (promote user role), `clear_bookings.mjs`, `add_10_venues.mjs`, `_promote.js`.
⚠ They define **local copies** of schemas in some cases — a schema drift risk; prefer importing `models/`.

## ⚠ Debug scripts
`scratch/` (~20 files: `check_db.js`, `perform_refund.js`, `process_refunds.js`, ...) is **gitignored** (secrets incident `d3fd994`). They hit the live DB — treat as dangerous; never commit; never copy env values out of them.

## Missing / candidates
- Index on bookings `{venue, date, startTime}` (hot path).
- Index on `{user, date}` for "my bookings".
- Partial/sparse unique index on users.email.
- No TTL on PAYMENT_PENDING docs (cleanup is lazy, see ARCHITECTURE).
