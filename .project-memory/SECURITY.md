# SECURITY

## Controls in place
- **AuthN:** NextAuth v5, JWT sessions, secret from `AUTH_SECRET || NEXTAUTH_SECRET`, `trustHost: true`, custom `/login` page.
- **Credentials:** bcrypt (cost 10), `authorize()` returns `null` (generic failure) for unknown user / missing password / bad hash — no user-enumeration message on login.
- **AuthZ, layered:**
  1. `middleware.js` — role-gates `/admin`, `/vendor` (redirect), returns 401/403 for `/api/*`; public allowlist is explicit.
  2. Each handler re-checks the role — and it reads it from the **database**, not from the JWT (`hasRole` in `lib/auth.js`), so a demotion takes effect immediately. The handlers are the real enforcement point.
- **Registration:** `role` from body is **discarded**, always `PLAYER` (or `VENDOR` when explicitly chosen) — no self-elevation. Promotion only via authenticated admin API or `scripts/create-admin.cjs`.
- **Payments:**
  - Razorpay HMAC-SHA256 signature verification (`order|payment` vs signature) server-side before confirming.
  - The payment is then **fetched from Razorpay** and must be `captured` and cover the booking amount — a signature alone is not enough.
  - A signature-verified **webhook** (`/api/payments/webhook`, `RAZORPAY_WEBHOOK_SECRET`) confirms bookings when the player closes the browser, and refunds payments whose hold expired.
  - Booking state transitions only inside transactions.
- **Refunds:** every cancellation calls Razorpay (`lib/refunds.js`) and records `refundStatus` + `refundId` on the booking. The UI only claims a refund when the money actually moved.
- **Capacity:** a per-slot lock document (`models/SlotLock.js`) makes concurrent bookings for the same slot collide instead of both passing the capacity check; the loser retries (`lib/bookingTransactions.js`).
- **Secrets:** `.env*.local` gitignored; `scratch/` gitignored after incident `d3fd994`; `.env.example` contains no values.
- **Uploads:** VENDOR/ADMIN only, image MIME check, 5MB cap, file-count cap, stored on Vercel Blob (not the app host).
- **Input limits:** schema-level (maxlength, enums, min/max) + manual validation in handlers; refund amounts clamped 0–100; `pricePerHour` must be a positive number; bookable slots are restricted to one hour inside the 06:00–23:00 grid.
- **Privacy:** the public availability API returns counts only to anonymous visitors (no names, no user ids); the e-ticket page requires a session and only the customer, the venue owner or an admin may open it.

## Known gaps (⚠ open)
1. **Credentials login is not rate-limited** — registration, uploads, forgot-password and checkout use the shared Mongo limiter; login itself is unthrottled.
2. **No email verification (deliberately deferred)** — registration accepts any well-formed address. Google sign-in still links to an existing account with the same email; refusing it locked out real password users. `lib/email.js` (Resend) now only sends password-reset emails.
3. **No CSRF hardening beyond NextAuth defaults**; no extra origin checks on payment verify (signature check mitigates forgery).
4. **No audit logging** for admin actions (role changes, withdrawal approvals, cancellations).
5. **`trustHost: true`** — fine behind Vercel, must be revisited if host headers are user-controllable in the deploy target.
6. **Error detail exposure** is good (generic 500 bodies, details only to console) but no centralized logger/monitoring — production errors are only visible in Vercel logs.

## Incident history
- **Secrets in committed scratch scripts** (2026, fixed `d3fd994`): values scrubbed, directory gitignored. Rotation of any credential that lived in those files should be assumed done — verify if unsure.

## When changing auth/payments
- Any new route: decide public/private and update `middleware.js` allowlist + handler check (both). Use `hasRole` for role checks, never `session.user.role`.
- Any money change: keep writes inside a mongoose session; don't trust client amounts (price always recomputed from `venue.pricePerHour` server-side — preserve this); route every refund through `lib/refunds.js` and surface `refundStatus`.
- Never log tokens, secrets, or full request bodies containing credentials.
