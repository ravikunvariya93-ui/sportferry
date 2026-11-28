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

### N9 — Past `PENDING` bookings stayed pending in admin/vendor lists 🟡
A slot that passed without reaching 6 players could never confirm, yet only the player's `/bookings` page turned it into a cancellation. The admin bookings list, the admin dashboard's PENDING count, vendor lists and profile stats kept showing it as pending forever. The rule now lives in `lib/booking-utils.js` → `releaseExpiredPendingBookings(filter)`: it claims the booking, sets `CANCELLED` / `cancelledBy: ADMIN` / 100% refund metadata and executes the Razorpay refund. Every read path that lists or counts PENDING calls it (admin bookings API, admin dashboard, vendor data, player bookings/profile, public profile, e-ticket). Concurrent reads cannot double-refund because the claim is a conditional `findOneAndUpdate({ _id, status: 'PENDING' })`.

## 🆕 Owner portal (from the `instructions/` mockups)
### O1 — Ground Owner portal + onboarding shipped 🟢
Built the ground-owner side the mockups describe (light theme, 12% commission kept): Turf + BlockedSlot models, venue `pricing`/`documents`/`onboardingStatus`, per-day-type pricing in the booking money path, blocked-turf enforcement in `allocateBooking`, a vendor sidebar (Dashboard · Calendar & Slots · Grounds & Courts · Pricing & Rules · Payouts · Customers), and a public `/list-your-ground` → `/register?role=VENDOR` → `/vendor/onboarding` 5-step wizard with admin approve/reject. Not yet built (deferred): recurring bookings, special offers, analytics, staff & access, promotions, phone/email verification, automated payouts.

## 🆕 Admin portal (from the `instructions/` mockups)
### A1 — Admin Portal expanded to the mockups 🟢
Built the 9 data-backed admin sections (Dashboard, Vendors + Vendor Details, Users, Bookings, Games & Matching, Calendar (All Venues), Payouts & Settlements, Refunds) plus "coming soon" stubs for Promotions, Reports, Support, Settings and Staff & Roles. Light theme kept, commission stays **12%** (mockups show 20%). Payouts are **record-only** (`PayoutBatch`; bank transfer out of band); Refunds execute **real Razorpay**. Added `User.blocked` (enforced at sign-in) and `models/PayoutBatch.js`. Shared builders: `lib/calendarData.js` (used by vendor + admin calendars), `lib/payouts.js`, `lib/adminStats.js`, `lib/bookingRef.js`. Verified live end-to-end with a throwaway admin (approve a pending vendor, blockable user list, bulk payout → PayoutBatch, bulk refund → Razorpay FAILED for a fake payment, calendar grid, stub page), then deleted the throwaway data.

## 🆕 Admin portal audit fixes (all fixed)
- **A2 — Bulk payout over-recorded partial settlements (money) 🔴→fixed.** `PayoutBatch` now has `settledAmount`; POST stores the outstanding `payable` (not the whole period `net`) and subtraction uses `settledAmount ?? net`. Reproduced live: payable ₹760 with a ₹1,000 withdrawal, batch recorded ₹1,760 before the fix — now ₹760.
- **A3 — Admin "Games & Matching" cancel skipped refunds 🟡→fixed.** Games cancel now runs the shared `lib/cancelBooking.js` (`applyCancellation`) path, same as the admin Bookings screen: 100% refund computed and executed.
- **A4 — Blocked accounts kept session/API access 🟡→fixed.** `roleOf` selects `blocked` and returns null when set (revokes `hasRole` immediately); admin/vendor layouts gate via `hasRole`; login maps `?error=blocked`.
- **A5 — Offline booking skipped the sport check 🟡→fixed.** `POST /api/bookings` now rejects a sport not in `venue.sportTypes`, matching `create-order`.
- **A6 — Trends bucketed by UTC 🟢→fixed.** `lib/adminStats.dailyTrend` (and the vendor trend) bucket by IST day.
- **A7 — Vendor sidebar double highlight 🟢→fixed.** "Offline Booking" is `neverActive`; only "Calendar & Slots" highlights.
- **A8 — Admin calendar defaulted to UTC date 🟢→fixed.** Uses `istTodayISO()`.
- **A9 — Venue delete orphaned turfs/blocks 🟢→fixed.** Admin DELETE also removes the venue's `Turf` and `BlockedSlot` rows.
- **A10 — Bulk refund had no claim 🟢→fixed.** Refunds claim each booking atomically (`findOneAndUpdate` with `refundStatus !== COMPLETED`) before calling Razorpay.
- **A11 — Admin calendar hid non-active venues 🟢→fixed.** Lists all venues.
- **A12 — Games PATCH input validation 🟢→fixed.** Validates venue ObjectId + date/slot format (400 instead of 500).

## 🆕 Remaining mockups built (R1)
Owner: booking details + check-in (`/vendor/bookings/[id]`), Game Status with player avatars/spots/TEAM ONLY (`/vendor/games`), payout statement (`/vendor/payouts`), analytics (`/vendor/analytics`), repeat-customer directory, staff & access, settings/notifications/support tickets, recurring + special offers, Week/Month calendar views.
Admin: Promotions & Offers, Reports & Analytics (+ bookings/revenue/venues CSV, Settlement/Refund reports), Support & Tickets, Settings, Staff & Roles — all real screens replacing the stubs; Add Vendor / Add User dialogs.
Player: light-theme hero "Don't have a team? Play with real players near you!", Solo/Team/Group cards, Booking Rules strip; Upcoming Games + Top Venues kept.
Verified: 27 suites / 193 tests, lint clean, build compiled, all new pages/APIs 200 in a headless walkthrough, CSV endpoints return `text/csv`, CRUD round-trips succeeded. All throwaway records deleted (users 0, venues 0).

## 🆕 Booking audit fixes (C1–C7; reported in chat as B1–B7)
- **C1 (money) — Offline walk-ins did not auto-confirm the turf.** `POST /api/bookings` now calls `autoConfirmIfReady` for each created slot inside the transaction, like every other fill path. Verified live: 5 paid holds + 1 walk-in on one turf → all 6 `CONFIRMED`.
- **C2 (money) — A captured payment could be kept for a cancelled hold.** The webhook now refunds when an order has no live `PAYMENT_PENDING` booking (both the no-bookings and all-cancelled cases), and cancelling a `PAYMENT_PENDING` booking is rejected in the player and admin cancel routes. Verified live: locally signed webhook payloads with no hold / with a cancelled hold both took the refund branch; cancel of a payment-pending booking → 400.
- **C3 (money) — Webhook could resurrect a cancelled booking.** It now re-reads `PAYMENT_PENDING` docs inside the transaction and claims each with a conditional `findOneAndUpdate` before flipping to `PENDING`.
- **C4 — Verify signature comparison** (`verify/route.js:38`) now uses `crypto.timingSafeEqual`; signed-in bad signature → 400 (verified).
- **C5 — Client price preview drift.** `VenueDetailClient` now uses the same `hourlyRateFor(venue, date, startTime)` as `create-order` for per-slot previews/totals; header shows "From ₹…".
- **C6 — Razorpay order creation moved after capacity/block validation** inside the booking transaction, so a 409 no longer leaves an unused order.
- **C7 — Availability no longer advertises past `PAYMENT_PENDING` holds** (all non-confirmed past bookings are filtered). Verified live: stale 22:00 hold absent from the day's slot stats.
Tests 27/193, lint clean, build compiled; all fixture records deleted (ZZ users 0, ZZ venues 0).

## 🆕 Vendor end-to-end audit (V1–V12; all fixed)
- **V1 (money) — Withdrawal ignored settled payout batches.** `app/api/vendor/withdrawals/route.js` subtracted only withdrawals, so an admin settlement still left the full balance withdrawable. `lib/payouts.js` now has one `settledAmountForVendor` helper (completed/processing batches + pending/processing/completed withdrawals) used by vendor payouts, withdrawals, earnings and admin payables. Verified live: ₹10,000 online booking, ₹8,800 settled batch → `payable 0`, withdrawal returned 400.
- **V2 (money) — IST month for withdrawals** now comes from `istTodayISO()` instead of server-local `getMonth()`.
- **V3 (money) — Unpaid `PAYMENT_PENDING` holds could be approved** as CONFIRMED by vendor/admin. Both PATCH routes now reject it; verified live 400.
- **V4 (money) — Cancellations had no atomic claim.** Vendor/player, admin bookings and admin games now claim the booking with a conditional `findOneAndUpdate` before executing a refund, so concurrent requests cannot double-refund.
- **V5 — Ticket check-in** now uses a conditional claim (`CONFIRMED` + no `checkedInAt`) and an anchored ID regex; verified live: first check-in CHECKED_IN, second ALREADY_USED, embedded 24-hex code INVALID.
- **V7 — Re-onboarding a live venue** was rejected in the API and replaced with a "Your ground is live" screen in the UI; it no longer wipes turfs or delists the venue.
- **V8 — Offers now change the price.** `rateWithOffers` (`lib/offers.js`) applies the best matching active recurring/special offer inside `hourlyRateFor`; checkout and the venue page load `venue.offers`. Verified live: 20% offer changed ₹1200 → ₹960 on the venue page.
- **V9 — Blocks can no longer be backdated or overwrite booked slots** (400/409).
- **V10 — Malformed dates/ids returned 500** on availability, popularity, games, blocks, venue detail, offline booking and checkout; they now return 400 via `isValidDateISO`/`isValidObjectId`. Verified live for seven inputs.
- **V11 — Validation drift:** staff PATCH role enum and offline booking classification now 400; past-start slots are rejected by both booking paths.
- **V12 — UI consistency:** offline-booking success copy says "Walk-in Booked!" (was "Slot Blocked!"), Game Status opens the tab that has games, and vendor booking detail scopes expired-hold cleanup to owned venues.
- Tests 27/199, lint clean; all throwaway users/venues/turfs/bookings/batches/offers deleted.

## 🆕 Final polish (V13–V16; all fixed)
- **V13 — Rate limiter is now shared.** `lib/rateLimit.js` → `sharedRateLimit` uses one atomic MongoDB `ratelimits` update, and all six API callers await it. Verified live: six forgot-password attempts returned 200, the next two returned 429 with a persisted counter. The in-memory `rateLimit` remains only for unit tests.
- **V14 — Listing prices were base rates.** Home and Explore now load active vendor/platform offers (`lib/venueOffers.js`) and show the cheapest effective rate from `hourlyRateFor`, with strike-through and %-off derived from the base rate. Verified live with a 20% offer: Tonight's Games, Featured Venues and Explore cards all showed ₹960 against ₹1200.
- **V15 — Lint/tooling:** the `VenueDetailClient` exhaustive-deps warning is gone; `RAZORPAY_WEBHOOK_SECRET` is present locally (webhook returns 400, not 503). The Razorpay dashboard still needs the URL and secret (below).
- **V16 — Phone OTP removed at request.** Deleted `/api/vendor/otp/{send,verify}`, `lib/otp.js` + test, the wizard's Send OTP/Verify controls and the `phoneOtp*` / `phoneVerified` User fields; `lib/email.js` now only sends password-reset mail. Phone number is still saved as a plain contact field. Email verification never existed as a flow.
- Tests 27/199, lint clean (only pre-existing `<img>` warnings).

## 🆕 Consistency refactor (R2; all verified)
- **Shared domain helpers:** `lib/ist.js` owns ISO date shifts/visible ranges/slot labels/booking-date formatting; `lib/pricing.js` → `displayPriceFor` is the only card-price calculation; `lib/venueOffers.js` → `loadPricedVenue` replaces inline offer loading in checkout and venue detail; `lib/bookingInput.js` centralises classification limits; `lib/serialize.js` centralises DTO shapes; `lib/bookingClaims.js` centralises atomic claims.
- **Shared API helpers:** 78 generic 500 handlers across 47 routes now call `apiError`; 15 admin guards and the vendor withdrawal guard use `apiGuards`; 429 responses use `tooManyRequests` (with `Retry-After` on checkout); list params and booking claims have single implementations. Special protocols (ticket verdicts, webhook 502, duplicate-block 200, forgot-password generic message) were left intact.
- **Shared UI:** `components/ui/` provides `StatusPill`, `StateBlock`, `StatCard`, `TabBar`, `Field`, `ModalShell`, `DataTable`, `PageHeader`; `lib/statusStyles.js` replaces local status maps; `lib/navConfig.js` is the single active-link implementation; `useSelectedCity` replaces three copied listeners. Applied to vendor earnings/games/staff/customers and admin withdrawals.
- Verified live with a throwaway vendor: public pages HTTP 200, malformed dates still 400, offer price ₹960 vs ₹1200, offline booking created 201 and grouped by `groupGames`, vendor pages render, no browser errors. Fixture deleted (users/venues/turfs/offers/bookings all 0). Tests 30 suites / 210 tests, lint clean.
- Deliberately left alone: visual redesigns, inline one-off styles, intentional edge/DB auth split, middleware+handler role checks, prototype screens.

## 🆕 Production-readiness audit — 2026-11-27 (reproduced live)

Scope: money → authz → validation → time → rate limits → data hygiene, against a production build (`next start`) and the real database. Every finding below was reproduced unless marked "by reading".

### 🔴 Open — fix before launch

**P4 — No error monitoring and no admin audit log** (`SECURITY.md` gaps 4, 6). Money-affecting admin actions (refunds, settlements, role changes, cancellations) leave no independent record. *(Still open — needs an observability decision/provider.)*

### ✅ Fixed 2026-11-27 (each re-verified against a production build)

- **P1 — Double payout on concurrent admin settlement → FIXED.** `POST /api/admin/payouts` now reads the payable and inserts the batch inside one transaction (`runBookingTransaction`), after touching a per-vendor `PayoutLock`. **Re-verified: 3 concurrent payouts for a vendor owed ₹4,400 → one `201`, two `400 "Nothing payable"`, one batch, `settledAmount` ₹4,400.** Note: the lock uses the vendor id as `_id`, not a secondary `key` — an earlier version upserted on a `key` field whose unique index did not exist in the database, so every request created its own lock and the race persisted. `_id` is always unique, so the collision holds without relying on index creation.
- **P2 — Password reset silently failing in production → FIXED.** `app/api/auth/forgot-password/route.js` now answers **503** with "Password reset email could not be sent. Please contact support…" when a token was minted but no mail provider could deliver it, instead of claiming a link was sent. `RESEND_API_KEY` and `EMAIL_FROM` are documented in `.env.example`. **Verified: 503 with the real message.** Remaining action: set the key in Vercel for reset to actually work.
- **P3 — Credentials login unthrottled → FIXED.** `lib/auth.js` `authorize()` now rate-limits by identifier (8 / 15 min) and client IP (25 / 15 min) via the shared Mongo limiter, and throws a `RateLimitedSignin` (`code: 'rate_limited'`) so `app/login/page.jsx` shows "Too many sign-in attempts…". **Verified: 9 bad credentials, then `rate_limited` from the 10th attempt on.**
- **P5 — Public venue detail exposed verification documents → FIXED.** `GET /api/venues/[id]` selects player-facing fields explicitly. **Verified: response no longer contains `documents` / the stored Blob URL.**
- **P6 — No secondary indexes on hot collections → FIXED (schema).** Added `bookings`: `{venue,date,startTime,endTime,turf}`, `{user,date}`, `{status,date}`, `{razorpayOrderId}`, `{groupId}`; `venues`: `{city,onboardingStatus}`, `{owner}`, `{createdAt}`. **Verified created in the DB: bookings 6 indexes, venues 4.**
- **P8 — Remaining inline error shapes → FIXED** in the touched routes; added `serviceUnavailable()` so 503s (payments/webhook/upload/forgot-password) share one helper.
- **P9 — Stale `booking.save()` in admin cancel → FIXED.** The cancel path now writes only the fields the refund changed via `findByIdAndUpdate`, instead of saving the pre-claim document. **Verified: status CANCELLED, cancelledBy ADMIN, refund fields persisted.**

### 🟡 Still open — hardening

- **P7 — 4 refunds stuck `FAILED`** — **resolved by deletion 2026-11-27.** All 4 were ₹1 cancelled test bookings. The owner asked to clear old booking data; a backup was written to `scratch/bookings-backup-2026-11-27T06-00-44-964Z.json` (gitignored) before `bookings` and `slotlocks` were emptied (4 → 0 and 7 → 0). Vendors/venues/users/payouts untouched; payables were unaffected because there were 0 confirmed online bookings and 0 payout batches.
- **P10 — `lib/email.js` is the only mail path**; see P2 for the required env.
- **P11 — Local env uses LIVE Razorpay keys against the production Atlas cluster** (`.env.local`: `rzp_live_*`). Split test keys + a dev database before heavier testing.
- **P12 — `autoIndex` is effectively off in production.** Indexes are declared in the schemas but production does not build them; anything relying on a *secondary* unique index (not `_id`) must not assume it exists. Apply `scripts/ensure-indexes.mjs` on deploy if you add more.

### (superseded detail for P1–P3, P5–P9 kept above for the record)

### ✅ Checked and found sound

- **Authorization:** every `/api/admin/*` and `/api/vendor/*` route has a guard (verified: the three flagged by grep use `auth()`+`hasRole` directly). Middleware enforces a coarse role gate on pages and 401s unknown APIs; handlers re-read the role from the DB, so demotion/blocking is immediate (`lib/auth.js` `roleOf` returns null when `blocked`).
- **Money in:** signature verification uses `timingSafeEqual`; `verify` then fetches the payment and requires `captured` + amount coverage; webhook is signature-verified, idempotent via claims, and refunds a capture with no live hold.
- **Money out:** every cancellation path executes the refund (`lib/refunds.js`), records `refundStatus`/`refundId`, and claims atomically first. Admin bulk refund claims each booking (`refundStatus !== COMPLETED`).
- **Withdrawal race:** **reproduced clean** — two concurrent withdrawals → one `201`, one `409`, exactly one document, no over-withdrawal (unique index `{vendor, month, year}`).
- **Overbooking:** slot lock + transaction + retry; malformed `page`/`date`/`id` now 400 instead of 500.
- **Public PII:** availability API returns counts only to anonymous callers; no walk-in names anywhere.
- **Build/runtime:** `npm run build` → 89 static pages; `next start` serves `/` `/login` `/explore` 200, `/api/admin/*` 401 anonymous; deployed `sportferry.com` 200 on home/explore/login. Tests 32 suites / 217 pass; lint clean apart from pre-existing `<img>` warnings.
- **Webhook registration:** live Razorpay account has exactly one active webhook at `https://sportferry.com/api/payments/webhook` subscribed to `payment.captured`.
- **Stale-data hygiene:** 0 expired `PAYMENT_PENDING` holds, 0 `PENDING` bookings past their slot, 0 cancelled bookings with an unexecuted refund besides P7.

## ⚠️ Still open (not code bugs — they need a decision or infra)

1. **Email verification is deliberately deferred (no code to remove).** Registration accepts any well-formed address; Google sign-in links to an existing account with the same email. The only verification flow that existed — vendor phone OTP — was removed along with its API routes, helper and model fields. `lib/email.js` now only sends password-reset emails.
2. ~~The Razorpay dashboard must point at `https://sportferry.com/api/payments/webhook`~~ — **verified done 2026-11-27.** The live Razorpay account has exactly one webhook, `https://sportferry.com/api/payments/webhook`, active, subscribed to `payment.captured` (plus the refund/order events). Signature verification verified locally against a production build: valid signature → 200 `{ok:true,ignored:…}`, malformed / wrong-secret / missing header → 400 `{"message":"Invalid signature."}`. The dashboard secret cannot be read back through the API, so confirm it matches `RAZORPAY_WEBHOOK_SECRET` in the Vercel env by hand.
3. **`tailwind-merge` is installed but Tailwind is not configured** (harmless dead dependency; removing it churns the lockfile).
4. **`/players` and `/tournaments` render sample data** with no API behind them — prototypes, labelled as such in the docs.
