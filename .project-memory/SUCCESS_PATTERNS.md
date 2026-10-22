# SUCCESS PATTERNS — things that work here; repeat them

## Runtime / ops
- **Pinned port + single instance + bounded probes** → project up in <60s (see `../AGENTS.md`). The full failure mode it replaces cost 8 minutes.
- **Global cached Mongo connection** with 5s server-selection timeout (`lib/mongodb.js`) — fast boot, fast failure, no thundering herd on cold starts.
- **Fail-fast env**: `lib/mongodb.js` throws at import if `MONGODB_URI` is missing — misconfiguration surfaces immediately, not at first query.

## Auth
- **Split auth config** (edge-safe `auth.config.js` vs DB-backed `auth.js`) — middleware stays runnable on the edge while routes get providers/callbacks. This is the pattern for any new auth-adjacent logic.
- **Role checks in middleware AND handler** — defense in depth; middleware gives friendly redirects, handlers are the enforcement point.
- **Google auto-provision** in `signIn` callback (create user if email unseen) — zero-friction signup, plus `jwt` callback back-fills role from DB.

## Booking / money
- **Transactions around capacity + order creation** — atomic "check seats, create order, write PAYMENT_PENDING" prevents double-booking and orphan orders.
- **Pure-function policy module** (`lib/cancellationPolicy.js`) — refund tiers are tested by reading, shared by API + UI, and the policy text ships from the same source as the logic (no drift).
- **Denormalized commission snapshot** on each booking (`commissionPercent`/`commissionAmount` at creation) — historical payouts immune to future policy changes.
- **Lazy cleanup** (`cleanupExpiredPayments` piggybacked on create-order/availability reads) — no cron infra needed at this scale.
- **Auto-confirm at 6 players per turf** (`autoConfirmIfReady`) — a turf confirms once it holds 6 players in total, whatever the split (6v0, 4v2, 3v3) — makes "match found" emerge from booking writes rather than a separate matching job.
- **IST helpers centralized** (`getISTDayRange` etc.) — one correct implementation instead of N wrong ones; date bugs stop at the module boundary.

## Product
- **Public venue GETs** (availability/details/popularity allowlisted) — anonymous browsing works, which is what a marketplace landing funnel needs (commit `dd5e6a3`).
- **Server page → client island** (`page.jsx` renders `XClient.jsx`) — keeps layouts/data on the server while dashboards stay interactive.
- **Colocated tests next to components** — 3/3 suites green, discovered by convention (`components/**/*.test.jsx`).

## Process
- **Conventional commits** after the "1/2/3" era — history became skimmable (`feat:`/`fix:`/`security:`).
- **Secrets incident → gitignore + scrub** (`d3fd994`) — the recovery worked; the pattern for future incidents is: remove from tree, ignore the location, rotate the secret.
- **Writing the runbook from verified output** (AGENTS.md records measured timings, exact commands, and what was NOT verified) — beats prose instructions nobody can execute.
