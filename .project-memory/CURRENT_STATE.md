# CURRENT STATE — 2026-10-08

## Runtime
- Dev server: `npx next dev -p 3000`, verified running, HTTP 200, warm responses <0.5s.
- Tests: `npm test` → 3 suites / 15 tests, **all pass**, ~40s, exit 0.
- Build: ⚠ `npm run build` **not re-verified** in this session (last known good enough for prior deploys — unverified, don't assume).

## Git
- Branch `main` (tracking `origin/main`). Last commit: `eaaecb5` (2026-10-05) "feat: responsive homepage redesign, image fixes, and Gujarat venue seed".
- **33 uncommitted files** in working tree (~6.7k insertions). Categories:
  - Homepage redesign: `app/page.js`, `components/Home/*` (HomeHero, QuickActions — `TonightsGames.jsx` was deleted in the working tree but **restored 2026-10-08** with a dynamic daypart heading, placed above FeaturedVenues)
  - Header/nav restyle: `MobileHeader`, `Sidebar`, `Footer`, `LocationModal`, `VenueCard` (.jsx + .module.css pairs)
  - `app/admin/bookings/BookingsClient.jsx`, `app/login/page.jsx`, `app/layout.js`
  - `package.json` + lockfile (large lockfile churn)
  - Untracked: `.eslintrc.json`, `.freebuff/`, `AGENTS.md`, `.project-memory/` (this directory)
- ⚠ These changes are **not mine to commit** unless asked. Working tree also mixes line endings (LF→CRLF warnings).

## Product/data status
- `app/tournaments/` and `app/players/` render **sample/in-memory data** (`SAMPLE_TOURNAMENTS` etc.) — not backed by API yet.
- `lib/mockData.js` exists but is currently imported **nowhere** (grep: 0 hits) — dead code candidate.
- `.env.local` fully populated (Mongo, Google OAuth, Razorpay, Vercel Blob) — server needs no setup.

## Active risks
- Multiple `next dev` instances deadlock on `.next` (see FAILURES.md).
- Uncommitted redesign is large and untested against `npm run lint`/`npm test` beyond the current green run.

## Session artifacts
- `AGENTS.md` (runbook, verified) — untracked.
- Scratch/debug scripts in `scratch/` are gitignored by design (secrets incident, d3fd994).
