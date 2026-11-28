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
  ui/             # shared StatusPill, StateBlock, StatCard, TabBar, Field, ModalShell, DataTable, PageHeader
lib/
  auth.js                # NextAuth full config (providers, DB callbacks) + hasRole (DB-backed role check)
  auth.config.js         # Edge-safe auth config used by middleware
  mongodb.js             # Cached mongoose connection (global.mongoose)
  booking-utils.js       # autoConfirmIfReady, cleanupExpiredPayments
  bookingTransactions.js # runBookingTransaction (retry on slot races), lockSlot, BookingError
  capacity.js            # allocateBooking (side/team rules), openSeatsFor, blockReason
  razorpay.js            # The only module that talks to Razorpay: orders, payments, refunds
  refunds.js             # executeRefund — runs the refund and reports its real status
  ist.js                 # parseSlot, parseBookableSlot, IST dates, slot labels, calendar ranges, formatBookingDate/formatToAMPM
  format.js              # formatINR, formatNumber, formatDayMonth, formatMonthYear — shared display formatting
  pricing.js             # baseHourlyRateFor, hourlyRateFor, displayPriceFor
  offers.js              # normalizeOffer, rateWithOffers (active offer applied to price)
  venueOffers.js         # attachActiveOffers, loadPricedVenue (server-only)
  serialize.js           # serializeDoc, serializeList (API DTO shapes)
  bookingInput.js        # classification limits, cell normalization, bookingDateFor
  bookingClaims.js       # atomic claimBooking / claimCancelled updates
  apiResponse.js         # badRequest/unauthorized/forbidden/notFound/conflict/apiError/tooManyRequests — every API error response uses these
  clientApi.js           # apiFetch (one cached JSON parse, tolerates a non-JSON body) + apiErrorMessage — every client request uses these
  apiGuards.js           # requireAdmin, requireVendorSession, requireOwnedDoc
  apiParams.js           # parseListParams, parseDateFilter, parseCsvFormat — shared list pagination/caps
  navConfig.js           # isActivePath shared by all four nav components
  location.js            # CITY_KEY, cityMatches, useSelectedCity hook
  statusStyles.js        # shared status pill colours
  cancellationPolicy.js  # Refund tiers (24h/12h/now), calculateRefund, policy text
  indiaCities.js
models/                  # Mongoose schemas: User, Venue, Booking, Withdrawal, SlotLock
middleware.js            # Role-based route/API protection (edge)
scripts/                 # seed*.mjs/.js/.cjs, make-admin.js, clear_bookings, add_10_venues
scratch/                 # ⚠ gitignored DB debug scripts (may hold secrets — never commit)
test files: components/**/*.test.jsx and lib/*.test.js (30 suites, 210 tests)
```

## Conventions

- Path alias `@/` → project root (jsconfig.json).
- Pages that need auth/data on the server are async server components; interactive dashboards are `'use client'` + fetch own API.
- API handlers: `auth()` check → `dbConnect()` → mongoose session/transaction → `NextResponse.json`, errors logged with `[POST /api/...]` prefix.
- API error responses go through `lib/apiResponse.js` (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`); client requests go through `lib/clientApi.js` (`apiFetch`, `apiErrorMessage`). Don't hand-roll either shape.
- Styling: one `.module.css` per component; classes kebab-case; `clsx` for conditionals.
- Models export `(mongoose.models.X || mongoose.model(...))` to survive hot reload.
- Tests colocated: `components/<Name>/<Name>.test.jsx`.

## Key invariants (easy to break)

1. `middleware.js` must stay DB-free (edge runtime) — import `auth.config`, never `auth.js`.
2. New API routes are **private by default** (middleware 401s) — add to the public allowlist in `middleware.js` if anonymous access is needed (precedent: commit `dd5e6a3` for venue availability).
3. Don't call `new Date(dateStr)` for day boundaries — use `getISTDayRange`.
4. `Venue.sportTypes` enum only allows `'Box Cricket'`.
5. Capacity math (6/side, 12/slot, team-match rule) lives in **one** place: `lib/capacity.js` (`allocateBooking`) — used by both booking routes and the booking UIs. The auto-confirm rule lives in `lib/booking-utils.js` (`autoConfirmIfReady`). Change those, never a route's copy.
6. List endpoints read `page`/`limit` through `lib/apiParams.js` (`parseListParams`) — a malformed `page` must fall back to 1, never reach Mongo as `NaN`.
