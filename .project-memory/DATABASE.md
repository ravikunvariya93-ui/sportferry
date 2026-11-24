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
| blocked | Boolean | set by admin; a blocked account cannot sign in (credentials or Google) |
| phone, city | String | city synced to top-bar location |
| bankDetails | { accountHolderName, bankName, accountNumber, ifsc } | payout destination; captured in owner onboarding |
| timestamps | ✓ | createdAt/updatedAt |

### venues (`models/Venue.js`)
name (≤60, required) · owner → User (required) · **sportTypes: enum `['Box Cricket','Football','Tennis','Badminton','Basketball']`** · city, area, address (required) · pricePerHour (required, base/weekday rate) · **pricing { weekday, weekend, peak }** (per-day-type ₹/hr; peak wins during `PEAK_HOURS` 17:00–23:00 IST; `weekday` mirrors `pricePerHour`) · numberOfTurfs (≥1, **cached count of the venue's Turf docs**) · images[] (Vercel Blob URLs) · amenities[] · rating (default 0) · **documents { businessIdProof, businessProof, venueProof }** (Blob URLs) · **onboardingStatus: DRAFT/PENDING/DOCUMENTS/REVIEW/ACTIVE/SUSPENDED/REJECTED** (default ACTIVE) · timestamps.
⚠ No index on `city`/`area` — `/api/cities` uses `distinct('city')` (collection scan).

### turfs (`models/Turf.js`) — one row per turf/court under a venue
venue → Venue (required, indexed) · name (≤60) · sport · size { length, width, unit } · surface · playingFormat · lighting (bool) · isActive (bool) · **order (1..N)** · timestamps. **Index:** `{venue, order}` unique.
A booking's `turf` field is the turf's **`order` index** — so `lib/capacity.js` keeps iterating 1..numberOfTurfs unchanged. Deleting a turf is refused once the venue has any booking (renumbering would re-point history).

### blockedslots (`models/BlockedSlot.js`) — owner blocks (maintenance / private / event)
venue → Venue (required) · turf (index) · date (UTC midnight of IST day) · startTime/endTime (`"HH:MM"`) · reason MAINTENANCE/PRIVATE/TOURNAMENT · note (≤200) · createdBy → User · timestamps. **Indexes:** `{venue, date}` and unique `{venue, turf, date, startTime, endTime}`. Blocked turfs are skipped by `allocateBooking` and marked in the availability API.

### bookings (`models/Booking.js`) — the central collection
venue → Venue (required) · user → User (optional — OFFLINE bookings) · bookingType ONLINE/OFFLINE · offlineCustomerName/Phone · date (Date, UTC midnight of IST day) · startTime/endTime (`"HH:MM"` IST strings) · totalAmount (0 for offline) · **status: PENDING | CONFIRMED | CANCELLED | PAYMENT_PENDING** · sport (required) · classification SOLO/TEAM/GROUP · playersCount (≥1) · teamSide 1|2 · paymentId / razorpayOrderId / razorpaySignature · commissionPercent (**default 12**) / commissionAmount · groupId (UUID links multi-slot purchase) · cancellation: cancelledBy PLAYER/VENDOR/ADMIN, cancelledAt, cancellationReason (≤500), refundPercent 0–100, refundAmount · timestamps.
⚠ **No compound indexes** — hot query is `{venue, date range, startTime, endTime}` on every availability/booking call. Add `{venue: 1, date: 1, startTime: 1}` if data grows.

### withdrawals (`models/Withdrawal.js`)
vendor → User (required) · amount, commissionDeducted, netAmount (≥0) · status PENDING/PROCESSING/COMPLETED/REJECTED · month (1–12) + year (required) · requestedAt/processedAt · adminNotes/vendorNotes (≤500) · timestamps.
**Index:** `{vendor, month, year}` unique — enforces one withdrawal per vendor per month.

### payoutbatches (`models/PayoutBatch.js`) — admin bulk settlements (collection pinned `payoutbatches`)
vendor → User · periodStart/periodEnd · bookingsCount, gross, commission, net · bankAccountSnapshot {accountHolderName,bankName,accountNumber,ifsc} · status PENDING/PROCESSING/COMPLETED/FAILED (default PROCESSING) · method AUTOMATED/MANUAL · reference, note, createdBy, processedAt · timestamps. **Index:** `{vendor, periodEnd}`.
Records that a vendor was paid — **no bank transfer happens in-app**. `net` for COMPLETED/PROCESSING batches (plus COMPLETED withdrawals) is subtracted from the vendor's confirmed-booking earnings to get their payable (`app/api/admin/payouts`, `lib/payouts.js`).

### New collections from the remaining mockups
- `staffmembers` (`models/StaffMember.js`): vendor → User, name, email, phone, role Manager/Operator/Viewer, access, active. Records only — no separate logins.
- `vendorsettings` (`models/VendorSettings.js`): one doc per vendor; notification toggles (sms/email/slotFill/reminders) + general (venueName, timezone, currency).
- `vendoroffers` (`models/VendorOffer.js`): vendor (null = platform offer), type RECURRING/SPECIAL, title, days[], start/end time, discountPercent or fixedPrice, validFrom/To, active.
- `supporttickets` (`models/SupportTicket.js`): createdBy → User, venue?, subject, body, priority, status OPEN/PENDING/RESOLVED/CLOSED, replies[].
- `platformsettings` (`models/PlatformSettings.js`): single doc — booking-rule toggles, general contact info, automation toggles. Commission stays 12% in `lib/constants.js`.
- `staff` (`models/Staff.js`): platform staff directory; name, email, phone, role, active. No auth accounts.

## Transaction usage (requires **replica set**)
`startSession()` + `startTransaction()` in:
- `POST /api/bookings` (capacity check + create)
- `POST /api/payments/create-order` (order + N bookings, cleanup)
- `POST /api/payments/verify` (status flips + auto-confirm)

Standalone `mongod` will fail these. Atlas (replica set) is fine.

## Seed / admin scripts (`scripts/`, run with `node`; they load `.env.local` via `dotenv`)
`seed-venues.cjs` (10 demo venues + their turfs + pricing), `migrate-owner-model.cjs` (**one-off, idempotent** — sets `onboardingStatus`/`pricing` on existing venues and creates Turf rows from `numberOfTurfs`), `verify-bookings.cjs`, `db-status.cjs`, `reset-data.cjs`, `seed-bookings.{cjs,mjs}`, `seed-games.cjs`, `clear_bookings.mjs`, `create-admin.cjs`.
⚠ Prefer importing `models/` over local schema copies (drift risk).

## ⚠ Debug scripts
`scratch/` (~20 files: `check_db.js`, `perform_refund.js`, `process_refunds.js`, ...) is **gitignored** (secrets incident `d3fd994`). They hit the live DB — treat as dangerous; never commit; never copy env values out of them.

## Missing / candidates
- Index on bookings `{venue, date, startTime}` (hot path).
- Index on `{user, date}` for "my bookings".
- Partial/sparse unique index on users.email.
- No TTL on PAYMENT_PENDING docs (cleanup is lazy, see ARCHITECTURE).
