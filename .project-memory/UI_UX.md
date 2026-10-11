# UI / UX

## Design system
- **Font:** Outfit (Google Fonts, `@import` in `globals.css`, weights 300–700).
- **Tokens** (CSS variables in `app/globals.css` `:root`):

| Token | Value | Use |
|---|---|---|
| `--primary` / `--accent` | `#16a34a` / `#22c55e` | green CTA, brand |
| `--primary-hover` | `#15803d` | hover |
| `--background` | `#f8fafc` | page bg |
| `--foreground` | `#0f172a` | text |
| `--muted` | `#475569` | secondary text |
| `--card-bg` / `--glass-bg` | `#fff` / `rgba(255,255,255,.9)` | cards, glass bars |
| `--sidebar-width` | `260px` | desktop rail |

Theme color `#16a34a` is also the PWA `themeColor`.

## Layout model
- **Mobile-first** (primary target is phones): `MobileHeader` top bar (logo, location pill with city selector, avatar) + `MobileNav` bottom tab bar (Home / Explore / Bookings / Profile).
- **Desktop (≥ ~900px):** fixed `Sidebar` (260px, role-based items: admin/vendor links appear by role) + content area. `Footer` at bottom.
- `html, body { overflow-x: hidden }` — layout relies on it; watch for horizontal-overflow regressions.
- Homepage hero: dark stadium image with overlay headline "DON'T HAVE A TEAM? NO PROBLEM." (green accent), primary CTA "Find a Ground", secondary "Create a Game"; below it 4 quick-action cards (Play Now / Book Ground / Find Players / Tournaments).

## Component conventions
- One folder per component: `Name.jsx` + `Name.module.css`; import as `import styles from './X.module.css'`.
- Class names kebab-case; conditional classes via `clsx` (used in `Sidebar`, `MobileNav`).
- Icons: `lucide-react` everywhere (consistent stroke icons).
- Motion: `framer-motion` available; used sparingly (entrance animations).
- Buttons: pill-shaped (large radius), primary = green fill, secondary = white fill with border.

## City / location UX (cross-cutting)
- Two sources of truth: **localStorage** (top-bar pill & modal, anonymous users) and **Mongo user.city** (signed-in users). `app/layout.js` fetches the DB city and passes it down; `CitySync` keeps localStorage in sync. Changing location UX must respect both (see `components/Header/CitySync.jsx` + its test).

## Pages & client components
Server page → client island pattern: `app/bookings/page.jsx` (server) renders `BookingsClient.jsx` ('use client'). Same for play-now, players, tournaments, profile, admin overview.

## Accessibility / i18n notes
- No i18n; English only, INR/IST formatting.
- ⚠ No systematic a11y pass (no aria audit); modals/tests exist for LocationModal only.
