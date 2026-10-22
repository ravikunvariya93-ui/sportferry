# TODO — prioritized backlog (derived from code inspection 2026-10-08, not a team-authored list)

## 🔴 P0 — fix now (correctness/privacy)
1. **Stop leaking customer names on public availability API** — `app/api/venues/[id]/availability/route.js` returns `b.user?.name || b.offlineCustomerName`. Return counts/status only. (`BUGS B1`)
2. **Run `npm run build`** — not verified this session; uncommitted 6.7k-line redesign is riding on an unverified build.
3. **Commit or stash the working-tree redesign** — 33 modified files + a deletion (`TonightsGames.jsx`) are uncommitted; one bad `git clean` loses days of work. (Needs owner decision — do not commit unprompted.)

## 🟡 P1 — harden (data integrity)
4. Atomic registration: catch E11000 → 409 instead of findOne-then-create. (`BUGS B2`)
5. Partial/sparse unique index on `users.email`; unique/partial index backing slot capacity. (`BUGS B3/B7`)
6. Re-read role from DB (or short-TTL cache) in session callback so demotions apply. (`BUGS B5`)
7. Google ↔ credentials account linking (same email currently creates two accounts). (`BUGS B6`)
8. Rate limiting on `/api/auth/register` + login.

## 🟢 P2 — product gaps (visible in UI, unimplemented)
9. `/players` — replace static sample data with a real API (backend exists: users + city). 
10. `/tournaments` — `SAMPLE_TOURNAMENTS` → real Tournament model + CRUD, or clearly label as "coming soon".
11. Razorpay **webhook** (`payment.captured`) so confirmations don't depend on the browser returning after checkout.
12. Cron/TTL for expired `PAYMENT_PENDING` (today: lazy cleanup only on next booking/availability read).
13. Admin audit log (role changes, withdrawal approvals, cancellations).

## 🧹 P3 — cleanup
14. Remove or wire `lib/mockData.js` (currently imported nowhere). (`BUGS B9`)
15. Drop unused `tailwind-merge` dependency (Tailwind isn't configured). (`BUGS B8`)
16. Deduplicate the remaining commission constant — `COMMISSION_PERCENT` already lives in `lib/constants.js` and the 6/12/team rules in `lib/capacity.js`; only the `Booking.commissionPercent` default of 12 still duplicates it. Single source in `lib/`.
17. Booking hot-path indexes: `{venue, date, startTime}`, `{user, date}`.
18. Seed scripts re-declare local schemas — import `models/` instead to avoid drift.
19. Fix commit hygiene (no more lockfile churn inside feature commits).

## Running list of ⚠ unverified
- `npm run build` (P0 #2)
- `npm run lint` (config exists, not run this session)
- End-to-end Razorpay payment (test keys present; no checkout exercised)
