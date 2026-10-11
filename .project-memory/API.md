# API — `app/api/**/route.js`

All handlers: JS, `NextResponse.json`. Auth via `auth()` from `lib/auth.js` (JWT) unless allowlisted public in `middleware.js`. Errors logged with `[METHOD /api/...]` prefix.

## Public (middleware allowlist)
| Route | Methods | Notes |
|---|---|---|
| `/api/auth/*` | GET POST | NextAuth handlers + `/api/auth/register` POST (name/username/password required; role always forced to PLAYER; 409 on dup; bcrypt cost 10) |
| `/api/cities` | GET | `Venue.distinct('city')`, sorted; `[]` on error |
| `/api/venues/popularity` | GET | popularity-ranked venues; runs lazy payment cleanup |
| `/api/venues/{objectId}` | GET PATCH DELETE | detail. PATCH/DELETE are on the public *middleware* regex but the handler self-guards: `auth()` + owner-or-ADMIN check (verified 2026-10-08). GET is intentionally public |
| `/api/venues/{objectId}/availability` | GET | slots for a day; ⚠ returns customer names (BUGS B1) |

## Authenticated (any logged-in user)
| Route | Methods | Body/notes |
|---|---|---|
| `/api/bookings` | POST | `{venueId, date, slots[], sport, classification, playersCount}` (or `selections[]` for multi-slot). Validates: 1-hour slots, no past dates, SOLO 1–2 / TEAM 3–6 / GROUP exactly 12 & empty slot. Transaction; capacity 6/side → 409 when full |
| `/api/bookings/{id}` | GET, PATCH | GET own booking; PATCH = cancel: computes tier via `lib/cancellationPolicy`, sets `cancelledBy/At/Reason`, `refundPercent/Amount`, status CANCELLED |
| `/api/payments/create-order` | POST | `{venueId, date, slots[] | selections[], sport, ...}` → creates Razorpay order + PAYMENT_PENDING bookings in a transaction (12% commission, side assignment, groupId for multi-slot). Returns `{orderId, amount, currency, key_id, ...}`. 409 when slot full |
| `/api/payments/verify` | POST | `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` → HMAC-SHA256(`order|payment`, KEY_SECRET) comparison → PAYMENT_PENDING→PENDING, then `autoConfirmIfReady` (≥6 → CONFIRMED). Returns `bookingIds[]` |
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

## Conventions
- Status codes: 400 validation · 401 unauthenticated · 403 wrong role · 404 missing · 409 conflict (capacity/dup) · 500 with generic message (details only to console).
- Money: Razorpay amounts in paisa (`×100`), currency INR.
- Dates in bodies: `YYYY-MM-DD` strings; converted via `getISTDayRange`; `date` stored UTC midnight.
- No rate limiting, no request schema validation library (manual checks), no OpenAPI spec.
