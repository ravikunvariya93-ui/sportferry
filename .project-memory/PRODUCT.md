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
3. Razorpay checkout → `POST /api/payments/verify` (HMAC signature **and** a captured payment) → bookings become `PENDING`. A Razorpay webhook does the same when the player closes the browser after paying.
4. When a turf reaches 6 players in total (any split — 6v0, 4v2, 3v3 …), all bookings on that turf+slot auto-flip to `CONFIRMED` (the "match found" moment). A manual vendor/admin approval re-checks the turf too.
5. Unpaid bookings auto-expire after 15 min (lazy cleanup on next order creation). The webhook refunds a payment whose hold expired.

**Booking rules enforced server-side:**
- SOLO: 1–2 players · TEAM: 3–6 players · GROUP: exactly 12 players and requires an empty slot
- 1-hour slots only · no past dates · side assignment team1→team2, 409 if full
- GROUP bookings are effectively "book the whole turf" (12 = both sides 6+6).

**Team bookings are team matches** (`lib/capacity.js`):
- A TEAM owns its side — once a team sits on a side, nothing else joins it.
- The opponent on the opposite side must be the same size (3v3, 4v4, 5v5, 6v6). A 3-player team reserves the opposite side for a 3-player team; a 4-player team has to open another turf.
- A team always takes a clean side — it never shares a side with individuals.
- Individuals join the side that already holds individuals; a side opposite a team stays reserved for the opposing team.
- Booking UI mirrors the server allocator (`allocateBooking`), so the slot grid, the "TEAM ONLY"/"TEAM SIZE" notes and the seat preview always match what the server will do.

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
The refund is **executed against Razorpay** (`lib/refunds.js`), and the booking records `refundStatus` (`NONE`/`PENDING`/`COMPLETED`/`FAILED`) plus the Razorpay `refundId` — the player is only told the money came back when it did.

### Finding players
`/players` — city filter + search over a static sample list (⚠ not yet API-backed). `/play-now` — games within 2 hours.

## Vendor flows (Ground Owner Portal)
The mockups in `instructions/` drive an expanded owner portal (light theme, 12% commission). Sidebar: Dashboard · Calendar & Slots · Bookings · Offline Booking · Grounds & Courts · Pricing & Rules · Payouts · Customers (Analytics/Staff/Promotions/Settings shown as "coming soon").

- **Onboarding** (public `/list-your-ground` → `/register?role=VENDOR` → `/vendor/onboarding`): a 5-step wizard (Account + venue/turfs + amenities + documents/payout + review) submitted via `POST /api/vendor/onboarding` (`lib/onboarding.js` validates). New venues are created with `onboardingStatus: PENDING`; an admin approves them from `/admin/venues` (PATCH `onboardingStatus`). A vendor with no venue is redirected to the wizard.
- **Grounds & Courts** (`/vendor/grounds`): add/edit/delete a venue (existing `VenueModal`) and its **Turf** records (`/api/vendor/turfs`). Deleting a turf is blocked once the venue has bookings.
- **Pricing & Rules** (`/vendor/pricing`): per-venue `pricing { weekday, weekend, peak }` + discount (`PATCH /api/vendor/venue/{id}`). Recurring / Special Offers tabs are placeholders.
- **Calendar & Slots** (`/vendor/calendar`): a day grid of per-turf slots colour-coded AVAILABLE / SOLO / TEAM / GROUP / OFFLINE / BLOCKED / TOURNAMENT, from bookings + owner blocks (`/api/vendor/calendar`). Actions: add an OFFLINE booking (₹0 commission) or block a slot (`/api/vendor/blocks`).
- **Offline bookings**: walk-in, no `user`, no payment — blocked out of online capacity, including blocked turfs.
- **Payouts**: request monthly withdrawal (unique one-per-vendor-per-month). PENDING → PROCESSING → COMPLETED/REJECTED. Net = amount − 12% commission.
- **Turfs vs capacity**: `Venue.numberOfTurfs` is the cached count of Turf rows, so `lib/capacity.js` still allocates by the integer `turf` index (1..N); no capacity math changed.

## Admin flows (Admin Portal)
`/api/admin/*` (ADMIN-only, enforced in middleware **and** in each handler). The portal (light theme, 12% commission) has a 13-item sidebar:
Dashboard · Vendors (Ground Owners) · Users (Players) · Bookings · Games & Matching · Calendar (All Venues) · Payouts & Settlements · Refunds · Promotions & Offers · Reports & Analytics · Support & Tickets · Settings · Staff & Roles.

| Section | What it does |
|---|---|
| Dashboard | KPIs (Total Bookings, Total Players, Gross Booking Value, Commission 12%), 30-day online/offline trend, bookings-by-type donut, platform overview + quick actions |
| Vendors | Venue list with All/Pending/Active/Suspended/Rejected tabs; approve/reject/suspend; Export; **Vendor Details** page (info, turfs, pricing, documents, payouts, activity) |
| Users | Player accounts with Active/Blocked tabs, games played + total spend, role change, **block/unblock** (a blocked account cannot sign in), delete |
| Bookings | All/Upcoming/Active/Completed/Cancelled tabs with counts; per-booking ref (`SF…`), turf, sport, team; filters + Export |
| Games & Matching | Slot fill across venues; tabs Active/Filling/Confirmed; force-confirm or cancel a game |
| Calendar (All Venues) | Read-only day grid for any venue (reuses the vendor calendar builder + status legend) |
| Payouts & Settlements | Per-vendor payables (confirmed bookings − 12% commission − already-settled) + bulk settlement that records a `PayoutBatch` (Manual = mark paid with ref; Automated = PROCESSING). Bank transfer is out of band |
| Refunds | Cancelled bookings by refund status; bulk refund executes **real** Razorpay refunds (`lib/refunds.js`) |
| Promotions / Reports / Support / Settings / Staff | Placeholder "coming soon" pages |

Admin can still cancel bookings (100% refund path) and process the vendor-requested monthly withdrawals (`/admin/withdrawals`), which stay separate from bulk settlements.

## Money math
- Platform commission **12%** of `(pricePerHour × playersCount)`, captured per booking at creation.
- Razorpay amounts in paisa (`amount * 100`), currency INR.
- Settlement: player pays full → vendor earns → monthly withdrawal or admin bulk payout, minus commission.

## Remaining mockup screens (all built)
- **Owner:** Booking Details & Check-in (timeline + player roster + check-in), Game Status (avatars, spots left, TEAM ONLY, slot-held note), Payouts Statement, Revenue/Occupancy Analytics, repeat-customer directory, Staff & Access, Settings (General/Notifications/Platform Rules/Support), Recurring & Special Offers, Week/Month calendar, OTP phone verification (dev code / Resend email — no SMS).
- **Admin:** Promotions & Offers, Reports & Analytics + CSV downloads, Support & Tickets (status/reply), Settings (booking-rule + automation toggles; 12% commission read-only), Staff & Roles, Add Vendor/User, Settlement & Refund CSV reports.
- **Player:** light-theme hero + Solo/Team/Group cards + Booking Rules strip (team needs equal opposing side, solo confirms at 6, group takes the whole turf); Upcoming Games and Top Venues retained.
- Staff records (vendor and platform) are directories only — they do not create separate logins. OTP delivery in production needs `RESEND_API_KEY`.

## Non-implemented (sample/static today)
Tournaments, player directory, "tonight's games" (component deleted in working tree), Explore extras. Treat as UI prototypes.
