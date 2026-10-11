# AI Onboarding — Start Here

> Read this file first. Generated 2026-10-08 from the actual codebase.
> Run instructions live in `../AGENTS.md` (verified end-to-end).

## What this is

**Sportferry** — a marketplace for booking box-cricket turfs in Indian cities (Gujarat-first).
Next.js 14 App Router monolith: frontend + API + auth in one app, MongoDB (mongoose) behind it, Razorpay for payments.

## Fastest path to being useful

1. Run it: `npx next dev -p 3000` (see `../AGENTS.md` — do NOT start two servers; do NOT skip `-p 3000`).
2. Read `ARCHITECTURE.md` (how requests flow) and `CODEBASE.md` (where things live).
3. Read `CURRENT_STATE.md` (uncommitted work in progress) and `BUGS.md` before changing anything.
4. Read `RULES.md` before your first edit.

## Non-negotiables (details in RULES.md)

- **JS, not TS.** No `tsconfig`, no `.ts` files.
- **No Tailwind** despite `tailwind-merge`/`clsx` in deps — styling is plain CSS + CSS Modules (`*.module.css`) with CSS variables in `app/globals.css`.
- **Auth is NextAuth v5 beta with JWT sessions**; role-based access (`PLAYER`/`VENDOR`/`ADMIN`) enforced in `middleware.js`.
- **All times are IST** — date math must go through `lib/booking-utils.js` helpers (`getISTDayRange`), never local-time `new Date()`.
- **Mongo transactions require a replica set** — booking/payment routes use `startSession()`; don't hand-roll writes outside them.

## Common tasks → where to look

| Task | Files |
|---|---|
| Booking rules / capacity | `app/api/bookings/route.js`, `lib/booking-utils.js` |
| Payment flow (Razorpay) | `app/api/payments/create-order/route.js`, `app/api/payments/verify/route.js` |
| Cancellation refunds | `lib/cancellationPolicy.js`, `app/api/bookings/[id]/route.js` |
| Route protection | `middleware.js` |
| Add an API route | `app/api/**/route.js` — check `middleware.js` public-list first |
| UI changes | `components/**`, styles in matching `*.module.css` |
| Seed / admin scripts | `scripts/` (see `DEPLOYMENT.md`) |

## Trust level of these docs

Verified against code on 2026-10-08. Anything marked ⚠️ or "unverified" was not re-tested; re-check before relying on it.
