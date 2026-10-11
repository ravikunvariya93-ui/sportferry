# ARCHITECTURE

## Shape

Single Next.js 14 App Router application. Server Components render pages, Client Components handle interactivity, Route Handlers (`app/api/**/route.js`) serve the API, `middleware.js` gates routes. One deployable (`output: 'standalone'`).

```
Request
  → middleware.js (NextAuth JWT verify + role checks)
  → app/**/page.jsx (server component, often dbConnect() directly)
     or app/api/**/route.js (route handlers)
  → lib/ (auth, mongodb, booking-utils, cancellationPolicy)
  → models/ (mongoose schemas) → MongoDB
```

## Request flow details

### Auth
- `lib/auth.config.js` — config usable in middleware (no DB): secret, `/login` page, JWT callbacks that copy `id`/`role` onto `session.user`.
- `lib/auth.js` — full NextAuth with providers (Google, Credentials/bcrypt) and DB-touching callbacks. Route handlers import `auth` from here.
- `middleware.js` wraps `authConfig` (no DB import — edge-safe) and enforces:
  - `/` → role redirect (ADMIN→`/admin`, VENDOR→`/vendor`)
  - `/admin` → ADMIN only, `/vendor` → VENDOR only, else redirect `/login?callbackUrl=`
  - `/api/*` → 401 unless session; 403 for `/api/admin/*` unless ADMIN
  - **Public API allowlist:** `/api/auth/*`, `/api/cities`, `/api/venues/popularity`, `/api/venues/{objectId}` (+`/availability`)
  - matcher excludes `api/auth`, `_next/static`, `_next/image`, `favicon.ico`

### Database
- `lib/mongodb.js` caches the mongoose connection on `global.mongoose`; `serverSelectionTimeoutMS: 5000`.
- Every route/page calls `dbConnect()` at top. Model files guard recompilation with `mongoose.models.X ||`.

### Booking/payment state machine
```
(none) → [POST /api/payments/create-order: transaction, order created,
          bookings saved PAYMENT_PENDING, razorpayOrderId set]
PAYMENT_PENDING → PENDING   [POST /api/payments/verify: HMAC signature check,
                             then autoConfirmIfReady]
PAYMENT_PENDING → (deleted) [15-min expiry, cleanupExpiredPayments on next create-order]
PENDING → CONFIRMED         [autoConfirmIfReady when slot reaches ≥6 players]
CONFIRMED/PENDING → CANCELLED [PATCH /api/bookings/:id, refund via cancellationPolicy]
```
- Multi-slot purchases share a `groupId` (UUID).
- Side assignment at creation: team1 ≤6, else team2 ≤6, else 409. GROUP bookings require a fully empty slot.
- Transactions: `mongoose.connection.startSession()` + `startTransaction()` — **requires MongoDB replica set** (Atlas is).

### Time
All slot/date logic is IST-normalized:
- `getISTDayRange(dateStr)` → UTC range covering IST midnight-to-midnight.
- `booking.date` stored as UTC midnight of the IST date; `startTime`/`endTime` are IST `"HH:mm"` strings.
- Cancellation tiers convert IST slot start → UTC via manual −5:30 offset (`lib/cancellationPolicy.js`).

## Rendering strategy
- Server components fetch data directly (no REST call for own data); client components receive props.
- Heavy pages (`/bookings`, `/play-now`, `/players`, `/tournaments`, `/profile`, admin clients) are `'use client'` and fetch `/api/*`.
- `app/layout.js` is async server: `auth()` + `dbConnect()` for user's saved city, then renders Sidebar (desktop) + MobileHeader + MobileNav + Footer.

## Styling
Plain CSS + CSS Modules. Design tokens as CSS variables in `app/globals.css` (`--primary: #16a34a` green, `--sidebar-width: 260px`, Outfit font). `clsx` for conditional classes. No Tailwind runtime despite `tailwind-merge` being installed.

## Build/deploy
- `next.config.mjs`: standalone output; `images.remotePatterns` allows `images.unsplash.com`, `plus.unsplash.com`.
- PWA-ish: `manifest: '/manifest.json'`, theme color `#16a34a`.
