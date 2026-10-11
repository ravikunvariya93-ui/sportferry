# RULES — read before editing

## Language & stack
- **JavaScript/JSX only.** No TypeScript. No `.ts`/`.tsx` files.
- **No Tailwind** — even though `tailwind-merge` and `clsx` are installed, there is no `tailwind.config`, no `postcss.config`, and zero `@tailwind` directives. Styling = `app/globals.css` variables + colocated `*.module.css`. `clsx` is fine for conditional classnames; `tailwind-merge` is currently unused.
- Don't add a framework/package unless the task requires it. Deps already present: mongoose, next-auth v5 beta, razorpay, @vercel/blob, framer-motion, lucide-react, bcryptjs, clsx, tailwind-merge.

## Running
- `npx next dev -p 3000` — **always** `-p 3000` (env has `PORT=0` → random port otherwise).
- **Exactly one dev server.** Two instances deadlock on `.next` (see FAILURES.md).
- First `GET /` takes 15–35s to compile; probe with `curl -m 60`, then `-m 10`.
- Verify with `npm test` (Jest, 15 tests) — must stay green.

## Correctness rules
1. **Middleware stays edge-safe**: `middleware.js` may import `lib/auth.config.js`, never `lib/auth.js` or anything touching mongoose.
2. **New API routes default to private** (middleware 401s). Public? add to the allowlist in `middleware.js` (keep `/api/auth`, `/api/cities`, venue GETs working).
3. **Role checks in two places** — middleware AND the handler (handlers are the source of truth; middleware alone was historically bypassed for direct API calls).
4. **Never do date/time math inline** — use `getISTDayRange`, `parseSlot`, `formatToAMPM` from `lib/booking-utils.js`, and `calculateRefund` from `lib/cancellationPolicy.js`.
5. **Capacity rules exist in two files** (`app/api/bookings/route.js` and `app/api/payments/create-order/route.js`) — if you change 6/side, 12/slot, or the ≥6 auto-confirm, change both + `lib/booking-utils.js`'s `autoConfirmIfReady`.
6. **Multi-write operations go through a mongoose session/transaction** (precedent: booking creation, payment verify). Don't insert partial state outside a transaction when the flow has money or capacity involved.
7. **Model exports** keep the `(mongoose.models.X || mongoose.model(...))` hot-reload guard.
8. **Don't hardcode secrets** or read `.env.local` values into scripts (secrets incident `d3fd994`). `scratch/` is gitignored — put debug scripts there.

## Styling rules
- Component styles in `Component.module.css`; reuse `:root` variables; green primary `#16a34a`.
- Mobile-first: check mobile breakpoint, `overflow-x` on body is intentional.
- Icons from `lucide-react`; keep pill-button shapes consistent.

## Testing
- Tests colocate as `components/**/*.test.jsx` (jsdom + Testing Library, `jest.setup.js`).
- New user-visible behavior in Header/LocationModal/booking flows should come with a test — these are the only 3 suites today; protect them.
- Run: `npm test` (~40s). Do not skip, weaken, or `.skip` tests to get green.

## Git
- Conventional commits (`feat:`/`fix:`/`security:`/`chore:`) — match `git log`.
- ⚠ Working tree has large **uncommitted redesign changes** — do not commit them unless asked; do not `git add -A`.
- Never push/deploy without explicit instruction.
