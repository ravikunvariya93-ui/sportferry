# EXPERIENCE — hard-won knowledge (what actually happens here)

## Startup & tooling
- Cold `next dev` → `✓ Ready` in ~4–7s, but the **first page compile is 15–35s** (858 modules for `/`). A curl that "hangs" for 30s is compiling, not broken.
- Warm requests: **<0.5s** (measured 0.23–0.49s).
- `PORT=0` is exported in this environment → `npm run dev` binds a random high port. `-p 3000` overrides it and is deterministic. Port 3000 is NOT in Windows excluded ranges here.
- Environment is Windows + Git Bash: use `taskkill //F //T //PID`, `wmic process where...`, `netstat -ano`; `ps aux` does NOT show node.exe (misleading — it made me think a server died when it hadn't).
- `npm test`: 3 suites / 15 tests / ~40s / all green as of 2026-10-08.

## Runtime behavior
- `.env.local` is complete — the app boots with no setup. Missing `MONGODB_URI` throws at import time in `lib/mongodb.js` (fail-fast by design).
- Google sign-in **auto-creates** users with `username = email` and empty password; credentials login requires `password` field to exist (OAuth users can't password-login).
- Admin/Vendor users hitting `/` get redirected by middleware — so a "broken homepage" report from an admin is often just the role redirect.
- Offline bookings (`bookingType: OFFLINE`) skip user/payment fields — any query assuming `user` or `totalAmount > 0` will misbehave.
- Availability/popularity endpoints run `cleanupExpiredPayments` as a side effect — reads mutate data (expired holds vanish mid-read). Expected, not a bug.
- `Venue.sportTypes` enum = `['Box Cricket']` only — seeding venues with any other sport fails validation.

## Git history lessons
- Early commits `1`, `2`, `3` — no message discipline; later adopted conventional commits.
- `db44115`: eslint-config-next 15 vs Next 14 broke Vercel builds → keep lint config on major 14.
- `d3fd994`: secrets had leaked into committed scratch scripts → `scratch/` gitignored, scripts scrubbed. Audit before committing any debug script.
- `dd5e6a3`: venue availability API had to be opened to logged-out users — remember the middleware allowlist when something is "401 for anonymous users".

## Performance & scale
- Mongo connection cached globally with 5s server-selection timeout (fast failure over 30s hangs).
- Availability queries scan bookings per venue/date/time-range with an IST window — fine at current scale; no aggregation pipeline/index strategy beyond schema defaults (see DATABASE.md for index gaps).
