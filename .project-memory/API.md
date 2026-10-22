# API — `app/api/**/route.js`

All handlers: JS, `NextResponse.json`. Auth via `auth()` from `lib/auth.js` (JWT) unless allowlisted public in `middleware.js`. Errors logged with `[METHOD /api/...]` prefix.

## Public (middleware allowlist)
| Route | Methods | Notes |
|---|---|---|
| `/api/auth/*` | GET POST | NextAuth handlers + `/api/auth/register` POST (name/username/password required; role always forced to PLAYER; 409 on dup; bcrypt cost 10) |
| `/api/cities` | GET | `Venue.distinct('city')`, sorted; `[]` on error |
| `/api/venues/popularity` | GET | popularity-ranked venues; runs lazy payment cleanup |
| `/api/venues/{objectId}` | GET PATCH DELETE | detail. PATCH/DELETE are on the public *middleware* regex but the handler self-guards: `auth()` + owner-or-ADMIN check (verified 2026-10-08). GET is intentionally public |
| `/api/venues/{objectId}/availability` | GET | slots for a day; per-turf `team1Size`/`team2Size` = the team that owns that side (null if none). Names and user ids are only returned to signed-in callers |

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

## ADMIN only (`/api/admin/*` — 403 in middleware + per-handler checks)
| Route | Methods | Notes |
|---|---|---|
| `/api/admin/stats` | GET | counts (users by role, vendors, venues, bookings) |
| `/api/admin/users` | GET, PATCH, DELETE | list / change role / remove |
| `/api/admin/venues` | GET, DELETE | |
| `/api/admin/bookings` | GET, PATCH | list (IST day filters); PATCH = cancel/refund (100% when VENDOR/ADMIN-initiated) |
| `/api/admin/withdrawals` | GET, PATCH | process PENDING→… |

## Public (no session)
| Route | Methods | Notes |
|---|---|---|
| `/api/payments/webhook` | POST | Razorpay `payment.captured` — signature-verified with `RAZORPAY_WEBHOOK_SECRET` (503 until configured). Confirms the order's bookings, or **refunds** the payment when the 15-minute hold was already cleaned up. No other event is acted on |

## Conventions
- Status codes: 400 validation · 401 unauthenticated · 403 wrong role · 404 missing · 409 conflict (capacity/dup) · 500 with generic message (details only to console).
- Money: Razorpay amounts in paisa (`×100`), currency INR.
- Dates in bodies: `YYYY-MM-DD` strings; converted via `getISTDayRange`; `date` stored UTC midnight.
- No rate limiting, no request schema validation library (manual checks), no OpenAPI spec.
