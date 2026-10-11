# DEPLOYMENT

## Target
- **Primary: Vercel** (evidence: `.vercel` gitignored, `NEXTAUTH_URL=https://sportferry.vercel.app` in `.env.example`, Vercel Blob storage, commit `db44115` fixing a *Vercel build* conflict).
- `next.config.mjs` sets `output: 'standalone'` → also deployable as a self-hosted Node server/Docker (`.env.example` mentions a raw-IP server example).
- ⚠ Prod build (`npm run build`) and `next start` were **not verified** in this session — verify before shipping.

## Commands
| Purpose | Command |
|---|---|
| Dev | `npx next dev -p 3000` (see `../AGENTS.md`) |
| Test | `npm test` (Jest, 15 tests, ~40s) |
| Lint | `npm run lint` (eslint-config-next **pinned to 14** — do not bump to 15, breaks Vercel build with Next 14: `db44115`) |
| Build / Start | `npm run build` → `npm start` |
| Seed DB | `node scripts/seed_gujarat_venues.mjs` (and siblings; they `dotenv.config({path:'.env.local'})` themselves) |
| Promote admin | `node scripts/make-admin.js` |

## Environment variables (from `.env.example` + `.env.local`)
| Var | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string; **required** (throws at import if missing) |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | JWT secret; code reads `AUTH_SECRET \|\| NEXTAUTH_SECRET` |
| `NEXTAUTH_URL` / `AUTH_URL` | Public URL (trustHost: true also set) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth login |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payments (falls back to `rzp_test_placeholder` if unset) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob venue image uploads |
| `PORT` | ⚠ This machine exports `PORT=0` → random port; always pass `-p 3000` in dev |

`.env.local` is fully populated locally and gitignored (`.env*.local`). Never commit it; `.env.example` is the committed template.

## Release checklist
1. `npm test` green.
2. `npm run lint` green.
3. `npm run build` completes (⚠ unverified recently).
4. Confirm env vars set on the target (Vercel project settings).
5. Razorpay mode (test vs live keys) matches the environment.
6. Images: `images.remotePatterns` allows only Unsplash hosts — new image hosts must be added to `next.config.mjs`.

## Rollback / incidents
- Secrets incident playbook: scrub tree, gitignore location, rotate secret (`FAILURES.md` §2).
- DB fix-ups live in `scratch/` (gitignored): `perform_refund.js`, `manually_confirm_booking.js`, `process_refunds.js` — read before running; they hit the real DB.
