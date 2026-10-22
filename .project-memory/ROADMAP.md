# ROADMAP — directional (inferred from code + history; confirm with product owner)

## Where it's come from
- Apr 2026: scaffold + auth + venue/detail pages
- May 2026: booking system, Razorpay, admin dashboard, withdrawals
- Oct 2026: responsive homepage redesign, explore filters/popularity sort, multi-slot bookings, blob uploads
- Trajectory: **core transaction loop is done** (browse → book → pay → confirm → cancel/refund → vendor payout → admin oversight). What's missing is growth, trust, and the "Find Players" promise.

## Phase 1 — Trust & stability (now)
- Fix P0s in `TODO.md` (PII leak, build verification, commit the redesign).
- Money-path completeness: Razorpay webhook, withdrawal receipts, visible refund timelines.
- Real reviews/ratings for venues (`rating` field exists, is never written).
- Production observability: error monitoring + structured logs (today: console only).

## Phase 2 — Make "Find Players" real (the differentiator)
- The homepage sells "Don't have a team? No problem." but `/players` is static. Build the loop:
  1. Player availability (city, sport, skill, times) — users table already has `city`.
  2. Surface players near a booking/slot — bookings already know date/time/sport/`teamSide`.
  3. Fill-the-slot nudges: when a slot is 1 side short, notify the other side's users.
- Leverages existing rules (auto-confirm at 6 players per turf) — no new booking semantics needed.

## Phase 3 — Supply growth (vendors)
- Vendor onboarding funnel: claim venue → verification → first booking.
- Availability calendar management for vendors (block maintenance slots — offline-booking machinery already exists).
- Payout automation: current flow = monthly request + admin approval; move to scheduled settlement with TDS/compliance fields as needed.
- Multi-sport expansion: `Venue.sportTypes` enum is `['Box Cricket']` — widening it touches seed data, booking `sport` validation, availability UI.

## Phase 4 — Demand growth
- Search/filters beyond city (price, amenities, turf count, rating).
- Tournaments (page exists with samples): model → registration → fixtures.
- Notifications (WhatsApp/SMS) for auto-confirm and slot fills — huge for Indian market UX; no messaging infra exists today.
- PWA polish: manifest + icons exist; add offline shell + install prompts.

## Deliberately out of scope (for now)
- **TypeScript migration** — valuable but a whole-repo effort; only revisit with a freeze window.
- **AI/ML** — no data pipelines yet; see `AI_MODELS.md` for candidate fit points after Phase 2 collects real behavior data.
- **Mobile apps** — PWA path is cheaper while core loops stabilize.

## Metrics to watch (none instrumented today)
booking conversion (venue view → paid), slot fill rate, auto-confirm rate (match quality), cancellation rate by tier, vendor supply per city, repeat-booking rate. Analytics infra is a Phase 1 add.
