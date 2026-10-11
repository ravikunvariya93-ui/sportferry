# PRODUCT — Sportferry

## Users & roles

| Role | Gets | Entry |
|---|---|---|
| PLAYER | Browse, book, pay, cancel, find players, profile | `/` (default landing) |
| VENDOR | Venue registration, bookings view, offline bookings, withdrawals, image uploads | redirected to `/vendor` at `/` |
| ADMIN | Stats, users, venues, bookings, withdrawal approvals | redirected to `/admin` at `/` |

## Player flows

### Booking (online)
1. Explore venue → `venue/[id]` → pick date + 1-hour slot(s), classification (SOLO/TEAM/GROUP), players count.
2. `POST /api/payments/create-order` → creates Razorpay order + `PAYMENT_PENDING` bookings (one per slot; `groupId` if multi-slot).
3. Razorpay checkout → `POST /api/payments/verify` (HMAC signature) → bookings become `PENDING`.
4. When the slot reaches ≥6 combined players, all bookings auto-flip to `CONFIRMED` (the "match found" moment).
5. Unpaid bookings auto-expire after 15 min (lazy cleanup on next order creation).

**Booking rules enforced server-side:**
- SOLO: 1–2 players · TEAM: 3–6 players · GROUP: exactly 12 players and requires an empty slot
- 1-hour slots only · no past dates · side assignment team1→team2, 409 if full
- GROUP bookings are effectively "book the whole turf" (12 = both sides 6+6).

**Total price** = `pricePerHour × playersCount` per slot (per-player pricing on a per-hour turf rate).

### Cancellation & refunds (`lib/cancellationPolicy.js`)
| Timing (player-initiated) | Refund |
|---|---|
| ≥24h before slot | 100% |
| 12–24h | 50% |
| <12h | 0% |
| After start | Not allowed |
| Vendor/ADMIN cancels | always 100% |
| OFFLINE booking | no monetary refund |

Refund = `Math.round(totalAmount × pct / 100)`; stored on the booking (`refundPercent`, `refundAmount`, `cancelledBy`, `cancellationReason` ≤500 chars).

### Finding players
`/players` — city filter + search over a static sample list (⚠ not yet API-backed). `/play-now` — games within 2 hours.

## Vendor flows
- Register venue (VENDOR-only `POST /api/venues`): name ≤60, city/area/address, `pricePerHour`, `numberOfTurfs` ≥1, images (Vercel Blob upload, ≤5MB, ≤N files, VENDOR/ADMIN only), amenities.
- Record **OFFLINE** (walk-in) bookings — no `user`, no payment fields.
- Request monthly withdrawal: unique one-per-vendor-per-month (`Withdrawal` compound unique index). Statuses PENDING → PROCESSING → COMPLETED/REJECTED. Net = amount − commission deducted.

## Admin flows
`/api/admin/*` (ADMIN-only, enforced in middleware **and** in each handler):
- `stats` — user counts by role, plus venue/booking aggregates
- `users`, `venues`, `bookings`, `withdrawals` — list/manage; admin can cancel bookings (100% refund path) and process withdrawals.

## Money math
- Platform commission **12%** of `(pricePerHour × playersCount)`, captured per booking at creation.
- Razorpay amounts in paisa (`amount * 100`), currency INR.
- Settlement: player pays full → vendor earns → monthly withdrawal minus commission.

## Non-implemented (sample/static today)
Tournaments, player directory, "tonight's games" (component deleted in working tree), Explore extras. Treat as UI prototypes.
