# CURRENT STATE — 2026-10-08 (runtime notes below refreshed 2026-11-27)

## 2026-11-27 refactor verification
- Refactor: all inline 403 responses replaced by `forbidden()`; vendor routes use `requireVendorSession()`; stale `auth`/`hasRole` imports removed; admin bookings/users/venues pagination uses `parseListParams`; money/date display consolidated into `lib/format.js` + `lib/ist.js`.
- `npm test -- --runInBand` → 31 suites / 213 tests pass; `npm run lint` → no errors (pre-existing `<img>` warnings only); `npm run build` → compiled and 89 static pages generated (known `DYNAMIC_SERVER_USAGE` probe logs only).
- Dev server `npx next dev -p 3000` (background task `s0hdsil4`, PID 17568) probed: `/` 200 with expected title, `/login` 200, `/play-now` 307 (auth redirect expected), `/api/admin/users` 401, `/api/venues/popularity?date=2026-11-27` 200. Server stopped after the check.

## 2026-11-27 refactor verification (round 2 — error-path consolidation)
- API: 177 inline `NextResponse.json({ message }, { status })` error responses now use `lib/apiResponse.js` helpers (`badRequest`/`unauthorized`/`forbidden`/`notFound`/`conflict`) across 44 routes.
- Client: all 76 `fetch()` call sites in 37 components now use `lib/clientApi.js` — `apiFetch` parses the body once and tolerates a non-JSON body (a bare `res.json()` used to throw a SyntaxError that masked the server message); `apiErrorMessage` centralizes the fallback text.
- Fixed along the way: `?page=abc` used to become `NaN` in `.skip()` (500); `parseListParams` now falls back to page 1 / limit 100.
- Tests `npm test` → 32 suites / 217 tests pass; `npm run lint` → no errors (pre-existing `<img>` warnings); `npm run build` → compiled, 89 static pages.
- Live check with a throwaway ADMIN account (created, used, deleted in the same script — 0 leftover records): login 302 → session role ADMIN; `/api/admin/users`, `/api/admin/bookings`, `/api/admin/venues`, `/api/admin/staff` 200 with the expected payloads; `/api/admin/vendors/not-an-id` → 400 `{"message":"Invalid id."}`; `/admin/users` page 200.

## Runtime
- Dev server: `npx next dev -p 3000`, verified running, HTTP 200, warm responses <0.5s.
- Tests: `npm test` → 32 suites / 217 tests, all pass; `npm run lint` has no errors (only pre-existing `<img>` warnings).
- Build: `npm run build` verified 2026-11-27 — compiled successfully, 89 static pages generated.

## Git
- Branch `main` (tracking `origin/main`). Latest commit: `b721fe1` "refactor: centralize shared domain, API and UI logic".
- **108 changed entries** in working tree after the two 2026-11-27 refactor rounds: 104 modified files plus untracked `lib/format.js`, `lib/format.test.js`, `lib/clientApi.js`, `lib/clientApi.test.js`.
- ⚠ Changes are left uncommitted for owner review. Working tree mixes line endings (LF→CRLF warnings).

## Product/data status
- `app/tournaments/` and `app/players/` render **sample/in-memory data** (`SAMPLE_TOURNAMENTS` etc.) — not backed by API yet.
- `lib/mockData.js` no longer exists (older notes called it dead code).
- `.env.local` fully populated (Mongo, Google OAuth, Razorpay, Vercel Blob) — server needs no setup.

## Active risks
- Multiple `next dev` instances deadlock on `.next` (see FAILURES.md).
- Uncommitted redesign is large and untested against `npm run lint`/`npm test` beyond the current green run.

## Session artifacts
- `AGENTS.md` (runbook, verified) — untracked.
- Scratch/debug scripts in `scratch/` are gitignored by design (secrets incident, d3fd994).
