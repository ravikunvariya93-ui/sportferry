# DECISIONS — notable technical choices and why

## Architecture
1. **Next.js App Router monolith** (frontend + API + auth in one app) over separate backend — small team, shared types/cookies, one deploy. `output: 'standalone'` keeps container/self-host options open.
2. **JS, not TS** — project started plain JS; `jsconfig.json` alias `@/*`. Adopting TS now would be a repo-wide migration (open question, see ROADMAP).
3. **NextAuth v5 beta** — chosen for App Router support; JWT session strategy (no DB session collection). Split config: `auth.config.js` (edge-safe, no DB) for `middleware.js`, `auth.js` (providers + DB callbacks) for routes. This split is deliberate — importing mongoose into middleware breaks the edge runtime.
4. **Roles on the JWT**: `role` copied into token at sign-in (Google users hit DB in `jwt` callback). ⚠ Role changes require re-login to take effect on JWT-based checks.

## Booking domain
5. **Per-player pricing** (`pricePerHour × playersCount`) — turf is priced per hour but players split it; makes SOLO (2 pax) cheaper than TEAM.
6. **Two-team capacity model** (6+6) with `teamSide` 1/2 and auto-confirm at 6 players on the turf (any split — 6v0, 4v2, 3v3) — encodes "we'll match you with players" as a booking rule rather than a separate matching system. Chosen to make matchmaking emerge from booking itself.
7. **GROUP = whole-turf booking** (exactly 12, empty slot required) — avoids conflicts with individual side bookings.
8. **A TEAM booking is a team match, not a seat fill** — a team owns its side, the opponent on the opposite side must have the same size (3v3, 4v4 …), and a team only ever takes a clean side. Seat math alone stacked two 3-player teams on one side (6v0, never auto-confirmed); the team-match rule makes the second team land opposite the first. Strict by choice: a 4-player team cannot face a 3-player team and opens another turf instead, and a side opposite a team is reserved for the opposing team.
9. **PAYMENT_PENDING + 15-min lazy cleanup** instead of webhooks/cron — `cleanupExpiredPayments` runs inside the next `create-order` transaction. Simpler, but stale holds persist until the next booking attempt on the platform.
10. **Razorpay order-first flow** with server-side HMAC verification — `create-order` (transaction: order + bookings) → client checkout → `verify`. ⚠ The browser flow alone leaves a gap (the player never returns), which the `payment.captured` webhook now closes.
11. **Mongo transactions/sessions** for booking creation and payment verification — atomic capacity checks + order linkage. Requires replica set (Atlas).
12. **12% commission** hardcoded as `COMMISSION_PERCENT` in `create-order` *and* as the `Booking.commissionPercent` default (denormalized per booking so later policy changes don't rewrite history).
13. **Refunds go through Razorpay, not the database** (`lib/refunds.js`) — the app records `refundStatus`/`refundId` next to the booking, because "we wrote a number in the DB" is not a refund. The UI only claims the money came back when `refundStatus === 'COMPLETED'`; a failed refund stays visible instead of silently vanishing.
14. **Payment confirmed against Razorpay, not the signature** — the signature proves the response came from Razorpay's checkout, not that money moved. `verify` fetches the payment and requires `captured`; a `payment.captured` webhook covers the player who closes the browser, and refunds a payment whose hold expired.
15. **Capacity is guarded by a per-slot lock document** (`models/SlotLock.js`) — a transaction gives snapshot isolation, not predicate locks, so two bookings for the last spot could both pass the check. Every booking transaction writes the same lock document, the loser aborts and retries (`lib/bookingTransactions.js`).
16. **The role is read from the database, not the JWT** — the token carries the role for the edge middleware, but every handler re-reads it (`hasRole`), so a demotion takes effect immediately instead of at the next sign-in.

## Time
17. **All IST math centralized in `lib/booking-utils.js`** (`getISTDayRange`: IST midnight = 18:30 UTC prev day) — servers run UTC; storing local-time `Date`s caused ambiguity, so slots are `date` (UTC midnight of IST date) + `"HH:mm"` IST strings. Consistency beat elegance; do not re-derive this elsewhere.

## Refunds
18. **Tiered cancellation policy as a pure module** (`lib/cancellationPolicy.js`) — pure functions + constant policy text so the same numbers drive API logic and the UI (`/cancellation-policy`). 24h/12h tiers chosen as standard Indian venue practice.

## Payments/commerce
19. **Vercel Blob for images** — zero infra, direct upload from route handler; works on Vercel, token-based.

## Process incidents (see FAILURES.md for detail)
20. **Secrets were committed then scrubbed** (`d3fd994`) → `scratch/` gitignored; never commit debug scripts with env values.
21. **eslint-config-next pinned to 14** (`db44115`) — 15.x conflicted with Next 14 on Vercel builds. Match lint tooling to the Next major.
