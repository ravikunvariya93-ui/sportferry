# SECURITY

## Controls in place
- **AuthN:** NextAuth v5, JWT sessions, secret from `AUTH_SECRET || NEXTAUTH_SECRET`, `trustHost: true`, custom `/login` page.
- **Credentials:** bcrypt (cost 10), `authorize()` returns `null` (generic failure) for unknown user / missing password / bad hash — no user-enumeration message on login.
- **AuthZ, layered:**
  1. `middleware.js` — role-gates `/admin`, `/vendor` (redirect), returns 401/403 for `/api/*`; public allowlist is explicit.
  2. Each handler re-checks `session.user.role` (admin/vendor/upload routes) — the real enforcement point.
- **Registration:** `role` from body is **discarded**, always `PLAYER` — no self-elevation. Promotion only via authenticated admin API or `scripts/create-admin.cjs`.
- **Payments:** Razorpay HMAC-SHA256 signature verification (`order|payment` vs signature) server-side before confirming; booking state transitions only inside transactions after verification.
- **Secrets:** `.env*.local` gitignored; `scratch/` gitignored after incident `d3fd994`; `.env.example` contains no values.
- **Uploads:** VENDOR/ADMIN only, image MIME check, 5MB cap, file-count cap, stored on Vercel Blob (not the app host).
- **Input limits:** schema-level (maxlength, enums, min/max) + manual validation in handlers; refund amounts clamped 0–100.

## Known gaps (⚠ open)
1. **PIE leak on public availability API** — customer/offline names returned to anonymous users (`BUGS B1`, highest priority).
2. **No rate limiting / brute-force protection** on `/api/auth/register` or credentials login.
3. **No CSRF hardening beyond NextAuth defaults**; no extra origin checks on payment verify (signature check mitigates forgery).
4. **JWT role staleness** — demoted admin retains access until token expires (`BUGS B5`).
5. **Race conditions:** register uniqueness and slot capacity are check-then-act (Mongo transactions help but no unique/partial index backs capacity) (`BUGS B2/B3`).
6. **Nullable-unique email index** (`BUGS B7`) — data-integrity edge case.
7. **No audit logging** for admin actions (role changes, withdrawal approvals, cancellations).
8. **`trustHost: true`** — fine behind Vercel, must be revisited if host headers are user-controllable in the deploy target.
9. **Error detail exposure** is good (generic 500 bodies, details only to console) but no centralized logger/monitoring — production errors are only visible in Vercel logs.

## Incident history
- **Secrets in committed scratch scripts** (2026, fixed `d3fd994`): values scrubbed, directory gitignored. Rotation of any credential that lived in those files should be assumed done — verify if unsure.

## When changing auth/payments
- Any new route: decide public/private and update `middleware.js` allowlist + handler check (both).
- Any money change: keep writes inside a mongoose session; don't trust client amounts (price always recomputed from `venue.pricePerHour` server-side — preserve this).
- Never log tokens, secrets, or full request bodies containing credentials.
