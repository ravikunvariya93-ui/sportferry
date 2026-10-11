# BUGS — confirmed or strongly suspected (verified 2026-10-08 by reading code)

## 🔴 B1 — PII leak: customer names exposed on the public availability API
`app/api/venues/[id]/availability/route.js:30,65` selects `user` + `offlineCustomerName` and returns `name: b.user?.name || b.offlineCustomerName || 'Manual Block'` per slot. This route is on the **middleware public allowlist** (no auth), so any anonymous visitor sees who booked each slot — including offline walk-ins' names.
**Fix direction:** return only counts/side/status to anonymous callers; or drop the name field entirely and show "Booked".

## 🟡 B2 — Race on registration uniqueness
`app/api/auth/register/route.js` does a non-atomic `findOne` + `create`. Two simultaneous registrations with the same username/email can both pass the check; `unique: true` on the schema then causes the second `create` to throw E11000 → generic 500 instead of a clean 409. Same pattern is *correctly* avoided elsewhere via transactions.

## 🟡 B3 — Duplicate-slot double-booking window in `POST /api/bookings`
Capacity check + insert run inside a Mongo transaction, but the capacity query filters on `date/startTime/endTime` **without a unique constraint** backing it. Transactions on a replica set give snapshot isolation, not predicate locks — two concurrent creates for the same slot can both pass the check (write conflict only if they touch the same doc). Payment path (`create-order`) has the same shape.
**Fix direction:** a unique index on `{venue, date, startTime, endTime, status-not-cancelled}` isn't directly possible (partial filter on enum), so either a per-slot lock doc or a partial unique index with `partialFilterExpression`.

## 🟡 B4 — `role` accepted from client in register, silently ignored
`register/route.js` destructures `role` from the body but hardcodes `role: 'PLAYER'`. Not a vulnerability (good!), but the deceptively-accepted field invites a future dev to "use" it — privilege escalation if wired naively. Also `scripts/create-admin.cjs` exists as the intended promotion path.

## 🟡 B5 — JWT role staleness
`role` is baked into the JWT at sign-in. Promoting a user via `scripts/create-admin.cjs` or `/api/admin/users` PATCH doesn't change `session.user.role` until they log in again. Admin/Vendor may appear "still a user" (and vice-versa for demotions — an ex-admin keeps access until token expiry).

## 🟡 B6 — Google users can't password-login; credentials users have no Google link
Google sign-in creates `username = email`, `password = ''` (`lib/auth.js` signIn callback). Credentials `authorize()` bails when `user.password` is falsy — so the same person registering with email+password and then clicking Google gets **two separate accounts** (different `_id`s), and a Google user can never password-login. No account-linking logic exists.

## 🟡 B7 — Email uniqueness with nullable field
`User.email` is `unique: true` but `required: false`. In MongoDB, unique indexes treat missing/null as a value: **two users without an email** → second insert throws E11000 on `email: null`. Registration path sets `email: undefined` when omitted. Works only as long as at most one email-less user exists. (`sparse`/`partialFilterExpression` index missing.)

## 🟢 B8 — Styling: `tailwind-merge` installed but Tailwind isn't
`tailwind-merge` (and `clsx`, which *is* used) sit in deps; no `tailwind.config`, no `@tailwind` directives anywhere. Dead dependency — harmless but misleading (it made an earlier agent mislabel the stack as "Tailwind").

## 🟢 B9 — `lib/mockData.js` is dead code
Grep: zero imports of `mockData` anywhere. Either delete or wire up.

## 🟢 B10 — Sample-data pages presented as real
`/players` (`PlayersClient` over a `players` prop) and `/tournaments` (`SAMPLE_TOURNAMENTS`) render static data with no API. Fine as prototypes; misleading if shipped as product.

## ⚠️ Not verified
`npm run build` was not run in this session; no runtime repro was attempted for B2/B3/B7 (they're race/null-edge conditions read from code).
