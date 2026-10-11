# CODEBASE MAP

```
app/                    # App Router
  layout.js             # Root layout (server): auth, db, Sidebar/MobileNav/Footer, PWA meta
  page.js               # Homepage (server) → Home* components
  globals.css           # CSS variables, resets, fonts (Outfit)
  api/                  # Route handlers (all JS)
    auth/[...nextauth]/  auth/register
    bookings/            bookings/[id] (cancel/refund logic)
    payments/            create-order, verify (Razorpay)
    venues/              venues/[id], venues/[id]/availability, venues/popularity
    admin/               bookings, stats, users, venues, withdrawals
    vendor/withdrawals/
    profile/  upload/  cities/
  admin/    # ADMIN dashboard (layout + overview, bookings, users, venues, withdrawals)
  vendor/   # VENDOR dashboard (VendorDashboardClient, OfflineBookingModal)
  explore/  play-now/  players/  tournaments/  bookings/  profile/  profile/[id]/
  venue/[id]/            # Venue detail + booking UI
  login/  register/
  cancellation-policy/  instructions/  debug/
components/              # Colocated *.jsx + *.module.css
  Header/ (MobileHeader, LocationPill, CitySync)  LocationModal/
  Sidebar/  MobileNav/  Footer/
  Home/ (HomeHero, QuickActions, FeaturedVenues, HomeRecommended, HomeCitySelector)
  Explore/  VenueCard/  VenueModal  CitySelector/  AuthProvider.jsx
lib/
  auth.js                # NextAuth full config (providers, DB callbacks)
  auth.config.js         # Edge-safe auth config used by middleware
  mongodb.js             # Cached mongoose connection (global.mongoose)
  booking-utils.js       # parseSlot, autoConfirmIfReady, cleanupExpiredPayments,
                         # getISTDayRange, formatToAMPM  ← time truth lives here
  cancellationPolicy.js  # Refund tiers (24h/12h/now), calculateRefund, policy text
  indiaCities.js  mockData.js
models/                  # Mongoose schemas: User, Venue, Booking, Withdrawal
middleware.js            # Role-based route/API protection (edge)
scripts/                 # seed*.mjs/.js/.cjs, make-admin.js, clear_bookings, add_10_venues
scratch/                 # ⚠ gitignored DB debug scripts (may hold secrets — never commit)
test files: components/**/*.test.jsx (3 suites, 15 tests)
```

## Conventions

- Path alias `@/` → project root (jsconfig.json).
- Pages that need auth/data on the server are async server components; interactive dashboards are `'use client'` + fetch own API.
- API handlers: `auth()` check → `dbConnect()` → mongoose session/transaction → `NextResponse.json`, errors logged with `[POST /api/...]` prefix.
- Styling: one `.module.css` per component; classes kebab-case; `clsx` for conditionals.
- Models export `(mongoose.models.X || mongoose.model(...))` to survive hot reload.
- Tests colocated: `components/<Name>/<Name>.test.jsx`.

## Key invariants (easy to break)

1. `middleware.js` must stay DB-free (edge runtime) — import `auth.config`, never `auth.js`.
2. New API routes are **private by default** (middleware 401s) — add to the public allowlist in `middleware.js` if anonymous access is needed (precedent: commit `dd5e6a3` for venue availability).
3. Don't call `new Date(dateStr)` for day boundaries — use `getISTDayRange`.
4. `Venue.sportTypes` enum only allows `'Box Cricket'`.
5. Capacity math (6/side, 12/slot, ≥6 auto-confirm) appears in **two** places: `app/api/bookings/route.js` and `app/api/payments/create-order/route.js` — change both.
