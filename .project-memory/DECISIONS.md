# DECISIONS — notable technical choices and why

## Architecture
1. **Next.js App Router monolith** (frontend + API + auth in one app) over separate backend — small team, shared types/cookies, one deploy. `output: 'standalone'` keeps container/self-host options open.
2. **JS, not TS** — project started plain JS; `jsconfig.json` alias `@/*`. Adopting TS now would be a repo-wide migration (open question, see ROADMAP).
3. **NextAuth v5 beta** — chosen for App Router support; JWT session strategy (no DB session collection). Split config: `auth.config.js` (edge-safe, no DB) for `middleware.js`, `auth.js` (providers + DB callbacks) for routes. This split is deliberate — importing mongoose into middleware breaks the edge runtime.
4. **Roles on the JWT**: `role` copied into token at sign-in (Google users hit DB in `jwt` callback). ⚠ Role changes require re-login to take effect on JWT-based checks.

## Booking domain
5. **Per-player pricing** (`pricePerHour × playersCount`) — turf is priced per hour but players split it; makes SOLO (2 pax) cheaper than TEAM.
6. **Two-team capacity model** (6+6) with `teamSide` 1/2 and auto-confirm at ≥6 combined — encodes "we'll match you with players" as a booking rule rather than a separate matching system. Chosen to make matchmaking emerge from booking itself.
7. **GROUP = whole-turf booking** (exactly 12, empty slot required) — avoids conflicts with individual side bookings.
8. **PAYMENT_PENDING + 15-min lazy cleanup** instead of webhooks/cron — `cleanupExpiredPayments` runs inside the next `create-order` transaction. Simpler, but stale holds persist until the next booking attempt on the platform.
9. **Razorpay order-first flow** with server-side HMAC verification (no webhook handler yet) — `create-order` (transaction: order + bookings) → client checkout → `verify`. ⚠ No webhook means an abandoned browser after successful payment relies on the user returning; signature check protects against forgery but not against missed confirmations.
10. **Mongo transactions/sessions** for booking creation and payment verification — atomic capacity checks + order linkage. Requires replica set (Atlas).
11. **12% commission** hardcoded as `COMMISSION_PERCENT` in `create-order` *and* as the `Booking.commissionPercent` default (denormalized per booking so later policy changes don't rewrite history).

## Time
12. **All IST math centralized in `lib/booking-utils.js`** (`getISTDayRange`: IST midnight = 18:30 UTC prev day) — servers run UTC; storing local-time `Date`s caused ambiguity, so slots are `date` (UTC midnight of IST date) + `"HH:mm"` IST strings. Consistency beat elegance; do not re-derive this elsewhere.

## Refunds
13. **Tiered cancellation policy as a pure module** (`lib/cancellationPolicy.js`) — pure functions + constant policy text so the same numbers drive API logic and the UI (`/cancellation-policy`). 24h/12h tiers chosen as standard Indian venue practice.

## Payments/commerce
14. **Vercel Blob for images** — zero infra, direct upload from route handler; works on Vercel, token-based.

## Process incidents (see FAILURES.md for detail)
15. **Secrets were committed then scrubbed** (`d3fd994`) → `scratch/` gitignored; never commit debug scripts with env values.
16. **eslint-config-next pinned to 14** (`db44115`) — 15.x conflicted with Next 14 on Vercel builds. Match lint tooling to the Next major.
