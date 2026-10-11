# PROJECT — Sportferry

## Identity

- **Name:** Sportferry (`package.json` name; `<title>` = `Sportferry | Find & Book Sports Near You`)
- **One-liner:** Book box-cricket turfs near you, find players, join games.
- **Repo:** local checkout on `main`, remote `origin/main`. ~29 commits; first 2026-04-08, last 2026-10-05.
- **Not TypeScript.** JS + JSX throughout; `jsconfig.json` provides the `@/*` path alias.

## What it does

Three-sided marketplace:

1. **Players** — search venues by city, book 1-hour slots (SOLO/TEAM/GROUP), pay with Razorpay, cancel per a tiered refund policy, find other players.
2. **Venues (Vendors)** — register venues, manage bookings, record offline (walk-in) bookings, request monthly withdrawals minus a 12% platform commission.
3. **Admin** — overview stats, manage users/venues/bookings/withdrawals.

## Domain constraints that shape everything

- **Box cricket only** — `Venue.sportTypes` enum is literally `['Box Cricket']`.
- **1-hour slots** only; capacity is **6 players per side, 12 per slot** (two team sides).
- **Matchmaking rule:** a slot auto-confirms when combined players ≥ 6 (`autoConfirmIfReady`).
- **Commission:** 12% hardcoded in `app/api/payments/create-order/route.js` (`COMMISSION_PERCENT`) and as the `Booking.commissionPercent` default.
- **India-only:** IST timezone everywhere, Indian cities (`lib/indiaCities.js`), INR, Razorpay.

## Tech at a glance

Next.js 14.2.35 (App Router, `output: 'standalone'`) · React 18 · mongoose 8 · NextAuth v5 beta (JWT) · Razorpay · Vercel Blob · framer-motion · lucide-react · Jest + Testing Library.

## Status

Working end-to-end (auth → booking → payment → admin), 15/15 tests green, dev server healthy. Uncommitted redesign work in the working tree (see `CURRENT_STATE.md`).
