# BUGS — status of every known issue (updated 2026-10-22)

## ✅ Fixed in this pass

### B1 — PII leak on the public availability API
**Fixed.** `app/api/venues/[id]/availability/route.js` now checks the session: anonymous callers get counts only (label `"Booked"`, no `userId`), signed-in callers keep the name and the profile link. Walk-in customer names were already never exposed. A malformed venue id now returns 400 instead of a Mongoose CastError → 500.

### B2 — Race on registration uniqueness
**Fixed.** `app/api/auth/register/route.js` catches the `E11000` duplicate-key error and answers 409 ("Username/Email already exists") instead of a generic 500.

### B3 — Duplicate-slot double-booking window
**Fixed.** A transaction gives snapshot isolation, not predicate locks, so two bookings for the same slot could both pass the capacity check. Every booking transaction now writes a per-slot lock document (`models/SlotLock.js`), so concurrent transactions collide on the same document; the loser aborts and the whole transaction is retried (`lib/bookingTransactions.js` → `runBookingTransaction`, 6 attempts with a short backoff). Exhausting the retries answers a clean 409 ("that slot is being booked right now"), never a 500. Verified live: 20 concurrent bookings on a 12-seat turf produced 8 bookings and 12 clean 409s — no overbooking.

### B5 — JWT role staleness
**Fixed.** The role is still baked into the JWT, but every API handler now re-reads it from the database (`lib/auth.js` → `hasRole`), so a promotion or demotion takes effect immediately instead of at the next sign-in. The middleware still uses the token's role as a coarse first gate — the handlers are the source of truth.

### B6 — Google and credentials accounts
**Corrected, then partly reverted after it broke real logins.** The app never created a second account for an email that already existed — the old bug report was stale. The real gap was the reverse: a Google sign-in for an email that belonged to a *password* account silently signed into that account, and because registration does not verify emails, someone could register another person's address and claim their later Google sign-in (pre-hogging).

Refusing the sign-in closed that hole but locked out **every player who registered with a password** (7 of 11 accounts) from the "Continue with Google" button, with only a silent redirect to explain it. Linking is what the rest of the industry does — Google has verified that the person controls the address — so the app now **links the Google identity to the existing account** and never creates a duplicate. The login page now explains any OAuth failure instead of dead-ending.

The residual pre-hogging risk stays open until registration verifies emails (see "Still open" below).

### B7 — Email uniqueness with a nullable field
**Already fixed.** `User.email` is `required: true` in the schema, so the null-duplicate case cannot happen. The bug report was stale.

### B9 — `lib/mockData.js` dead code
**Already fixed.** The file no longer exists. The bug report was stale.

## 🆕 Fixed now (from the 2026-10-22 review)

### N1 — Refunds were never executed 🔴
Cancellation only wrote `refundAmount` to the database — there was no Razorpay refund call anywhere in the app, while the UI told the player "₹1,200 refunded". Now every cancel path (player, vendor, admin, and the auto-cancel of a slot that passed) calls Razorpay through `lib/refunds.js`, and the booking records `refundStatus` (`NONE`/`PENDING`/`COMPLETED`/`FAILED`) plus the Razorpay `refundId`. The UI only says "refunded" when the money actually moved.

### N2 — No payment-status check, no webhook 🔴
`/api/payments/verify` only checked the signature; it never asked Razorpay whether the payment was captured. It now fetches the payment and requires `status === 'captured'` and an amount that covers the booking. A new `/api/payments/webhook` endpoint (signature-verified with `RAZORPAY_WEBHOOK_SECRET`) confirms bookings when the player closes the browser after paying, and refunds payments whose 15-minute hold expired.

### N3 — Unauthenticated e-ticket page leaked PII 🔴
`/bookings/{id}` loaded any booking by id with no session and printed the customer's name and email. It now requires a session and only allows the booking's customer, the venue owner or an admin.

### N4 — `create-order` validated far less than the offline route 🔴
The online route accepted a slot in the past, a 17-hour slot ("06:00 AM – 11:00 PM") and slots outside the venue's 06:00–23:00 hours, all at the 1-hour price. Both routes now use `parseBookableSlot` (`lib/ist.js`) and compare the date against the IST calendar day instead of the server's local midnight.

### N5 — "Spots left" advertised unbookable seats 🟡
The homepage and `/play-now` counted every free seat, including the ones a team owns and the side reserved for the opposing team. They now use `openSeatsFor` (`lib/capacity.js`), so the number matches what the booking API will actually accept.

### N6 — A manual approval did not confirm the rest of the turf 🟡
`autoConfirmIfReady` had a single caller (the payment path), so a slot filled by a mix of online bookings and a vendor-approved walk-in left the online bookings `PENDING` until the slot passed. Vendor and admin approvals now re-check the whole turf.

### N7 — Deleting a venue deleted paid bookings 🟡
`DELETE /api/venues/{id}` used to `deleteMany` every booking. It now refuses with 409 while the venue has upcoming bookings and keeps the rest as history.

### N8 — Negative or non-numeric prices 🟢
`pricePerHour` must be a finite number > 0 on both create and update.

## ⚠️ Still open (not code bugs — they need a decision or infra)

1. **The rate limiter is per-process** (`lib/rateLimit.js`). It resets on deploy and does nothing across instances, so on serverless hosting the registration/upload limits are weak. Fixing it properly needs a shared store (Upstash Redis or a TTL-indexed Mongo collection).
2. **Email addresses are never verified.** Registration accepts any well-formed address, so an account can be registered with someone else's email. That is what made the Google-account takeover possible, and it also makes "forgot password" a way to probe accounts. Fixing it needs a mail provider.
3. **The webhook secret must be configured** — set `RAZORPAY_WEBHOOK_SECRET` and point the Razorpay dashboard at `/api/payments/webhook`, otherwise the endpoint answers 503 and confirmations still depend on the browser returning after checkout.
4. **`tailwind-merge` is installed but Tailwind is not configured** (harmless dead dependency; removing it churns the lockfile).
5. **`/players` and `/tournaments` render sample data** with no API behind them — prototypes, labelled as such in the docs.
