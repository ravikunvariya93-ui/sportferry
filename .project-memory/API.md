# API — `app/api/**/route.js`

All handlers: JS, `NextResponse.json`. Auth via `auth()` from `lib/auth.js` (JWT) unless allowlisted public in `middleware.js`. Errors logged with `[METHOD /api/...]` prefix.

## Public (middleware allowlist)
| Route | Methods | Notes |
|---|---|---|
| `/api/auth/*` | GET POST | NextAuth handlers + `/api/auth/register` POST (name/username/password required; role always forced to PLAYER; 409 on dup; bcrypt cost 10) |
| `/api/cities` | GET | `Venue.distinct('city')`, sorted; `[]` on error |
| `/api/venues/popularity` | GET | popularity-ranked venues; runs lazy payment cleanup |
| `/api/venues/{objectId}` | GET PATCH DELETE | detail. PATCH/DELETE are on the public *middleware* regex but the handler self-guards: `auth()` + owner-or-ADMIN check (verified 2026-10-08). GET is intentionally public |
| `/api/venues/{objectId}/availability` | GET | slots for a day; per-turf `team1Size`/`team2Size` = the team that owns that side (null if none). Names and user ids are only returned to signed-in callers. Owner-blocked turfs are flagged `blocked: true` on the turf entry |

## Authenticated (any logged-in user)
| Route | Methods | Body/notes |
|---|---|---|
| `/api/bookings` | POST | `{venueId, date, slots[], sport, classification, playersCount, preferredSide?}` (or `selections[]` for multi-slot). Validates: 1-hour slots inside 06:00–23:00, no past dates (IST), SOLO 1–2 / TEAM 3–6 / GROUP exactly 12 & empty slot. Transaction + per-slot lock; capacity 6/side → 409 when full. `preferredSide` (1/2) is a soft tiebreak between legal sides. OFFLINE (vendor walk-in) only — online bookings go through `create-order` |
| `/api/bookings/{id}` | GET, PATCH | GET own booking; PATCH = cancel: computes tier via `lib/cancellationPolicy`, sets `cancelledBy/At/Reason`, `refundPercent/Amount`, status CANCELLED, **executes the Razorpay refund** and records `refundStatus` (NONE/PENDING/COMPLETED/FAILED) + `refundId`. PATCH with `status: 'CONFIRMED'` (vendor/admin) also re-checks the turf and confirms the other bookings on it |
| `/api/payments/create-order` | POST | `{venueId, date, slots[] | selections[], sport, ...}` → creates Razorpay order + PAYMENT_PENDING bookings in a transaction (12% commission, side assignment, groupId for multi-slot). `selections[]` cells accept `preferredSide`. Validates the slot (1 hour, inside venue hours) and rejects past dates. Returns `{orderId, amount, currency, key_id, ...}`. 409 when the slot is full or being booked right now |
| `/api/payments/verify` | POST | `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` → HMAC-SHA256(`order|payment`, KEY_SECRET) comparison → fetches the payment from Razorpay and requires `captured` + an amount that covers the booking → PAYMENT_PENDING→PENDING, then `autoConfirmIfReady` (6 players on the turf in total → CONFIRMED). Returns `bookingIds[]` + `confirmed` (true only if the turf actually confirmed) |
| `/api/profile` | PATCH | update own profile (name/phone/city etc.) |
| `/api/upload` | POST | multipart; VENDOR/ADMIN only; ≤5MB/file, image-only, max N files; → Vercel Blob `venues/{userId}/{ts}-{name}`; returns `{urls}` |

## VENDOR only
| Route | Methods | Notes |
|---|---|---|
| `/api/venues` | POST | register venue (owner = session.user.id); requires role VENDOR |
| `/api/vendor/withdrawals` | GET, POST | list own; request monthly (unique per vendor/month) |
| `/api/vendor/turfs` | GET, POST | list / add a turf-court for an owned venue (`?venueId=`); POST bumps `Venue.numberOfTurfs` |
| `/api/vendor/turfs/{id}` | PATCH, DELETE | edit fields; DELETE refused (409) once the venue has any booking, otherwise renumbers remaining turfs 1..N |
| `/api/vendor/venue/{id}` | PATCH | edit owned venue: name/city/area/address, `sportTypes`, `amenities`, `images`, `discountPercent`, `pricing`, `documents`. `pricePerHour` is kept = `pricing.weekday` |
| `/api/vendor/blocks` | GET, POST, DELETE | owner slot blocks: GET `?venueId&date`; POST `{venueId, turf, date, slot, reason, note}` (idempotent per turf+slot); DELETE `?id=` |
| `/api/vendor/calendar` | GET | `?venueId&date` → per-turf, per-slot day grid with statuses AVAILABLE/SOLO/TEAM/GROUP/OFFLINE/BLOCKED/TOURNAMENT (bookings + blocks + capacity) |
| `/api/vendor/onboarding` | POST | owner onboarding submit `{venueId?, venue, turfs[], bank}` → creates/updates venue (onboardingStatus PENDING), replaces turfs, saves bank details. Validation in `lib/onboarding.js` |

## ADMIN only (`/api/admin/*` — 403 in middleware + per-handler checks)
| Route | Methods | Notes |
|---|---|---|
| `/api/admin/stats` | GET | counts (users by role, vendors, venues, bookings) |
| `/api/admin/users` | GET, PATCH, DELETE | GET `?status=active|blocked&role&search` + per-user `gamesPlayed`/`totalSpend`; PATCH `{role}` or `{blocked}`; DELETE |
| `/api/admin/venues` | GET, PATCH, DELETE | Vendors list: `?status&counts=1` returns per-status `counts` + `turfs[]`/`ownerPhone`/`joinedOn`; PATCH `{venueId, onboardingStatus}` = approve/reject/suspend; DELETE |
| `/api/admin/vendors/{id}` | GET | Vendor (venue) detail: owner, turfs, performance (30d), withdrawals, recent activity, documents |
| `/api/admin/bookings` | GET, PATCH | GET tabs (`?tab=UPCOMING|ACTIVE|COMPLETED|CANCELLED` + counts) and `bookingRef`/`turf`/`sport`; PATCH = cancel/refund (100% when VENDOR/ADMIN-initiated) |
| `/api/admin/games` | GET, PATCH | Slot groups with fill + tabs Active/Filling/Confirmed; PATCH `{venueId,date,startTime,endTime,turf,action:CONFIRM\|CANCEL}` |
| `/api/admin/calendar` | GET | `?venueId&date` → day grid (`buildDayGrid`) for any venue |
| `/api/admin/payouts` | GET, POST, PATCH | GET KPIs + per-vendor payables (12% commission, minus settled batches/withdrawals) + batches; POST `{vendorIds, method, reference?}` creates PayoutBatches (MANUAL→COMPLETED with ref, AUTOMATED→PROCESSING); PATCH `{batchId, status}` |
| `/api/admin/refunds` | GET, POST | GET cancelled bookings by refund status + KPIs; POST `{bookingIds}` executes real Razorpay refunds via `executeRefund` (skips offline/zero/already-done) |
| `/api/admin/withdrawals` | GET, PATCH | vendor-requested monthly withdrawals: process PENDING→… |

## Public (no session)
| Route | Methods | Notes |
|---|---|---|
| `/api/payments/webhook` | POST | Razorpay `payment.captured` — signature-verified with `RAZORPAY_WEBHOOK_SECRET` (503 until configured). Confirms the order's bookings, or **refunds** the payment when the 15-minute hold was already cleaned up. No other event is acted on |

## Pricing & blocked slots (added with the owner portal)
- Both booking routes price each slot with `lib/pricing.js` → `hourlyRateFor(venue, date, startTime)` (peak > weekend > weekday, venue discount, then the best matching active `VendorOffer`) — never a flat `pricePerHour`. Checkout and venue detail load active/vendor offers onto `venue.offers` before pricing.
- Both routes load the slot's blocked turfs (`lib/blockedSlots.js`) and pass them to `allocateBooking({ blockedTurfs })`, so a blocked turf is never assigned (409 when every turf is blocked).

## Additional routes (remaining mockups)
**Vendor-only:** `GET /api/vendor/bookings/{id}` (owner-guarded detail + roster + timeline) · `GET /api/vendor/games` (player-fill) · `GET /api/vendor/payouts` (statement) · `GET/POST /api/vendor/{staff,offers,tickets}` · `PATCH/DELETE /api/vendor/{staff,offers}/{id}` · `GET/PATCH /api/vendor/settings`.
**Admin-only:** `GET/POST /api/admin/offers` + `PATCH/DELETE /api/admin/offers/{id}` · `GET/PATCH /api/admin/tickets` · `GET/PATCH /api/admin/settings` · `GET/POST /api/admin/staff` + `PATCH/DELETE /api/admin/staff/{id}` · `POST /api/admin/vendors` (creates VENDOR + first venue) · `POST /api/admin/users` · `GET /api/admin/reports?type=bookings|revenue|venues` → CSV · `GET /api/admin/payouts?format=csv` and `/api/admin/refunds?format=csv` → CSV.
Shared pure helpers: `lib/gameStatus.js` (groupGames for vendor + admin), `lib/offers.js` (normalizeOffer + rateWithOffers), `lib/cancelBooking.js` (applyCancellation used by admin bookings + games).

## Conventions
- Status codes: 400 validation · 401 unauthenticated · 403 wrong role · 404 missing · 409 conflict (capacity/dup) · 500 with generic message (details only to console).
- Money: Razorpay amounts in paisa (`×100`), currency INR.
- Dates in bodies: `YYYY-MM-DD` strings; converted via `getISTDayRange`; `date` stored UTC midnight.
- No rate limiting, no request schema validation library (manual checks), no OpenAPI spec.
