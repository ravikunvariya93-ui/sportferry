# UI / UX

## /register — premium redesign (2026-11-27)

**Layout: stacked, image section first, form section below — at every width** (changed from the original side-by-side on the owner's screenshot reference). The page is a single column: a 220px hero band (brand mark top-left, eyebrow + headline + sub-line bottom-left, venue photo behind) followed by the form panel (640px max, centred).

Rebuilt as a navy photo band + white form card (`app/register/page.jsx`, `app/register/register.module.css`).

- **Theme is scoped**: the navy/lime palette lives as CSS custom properties on the page's `.page` class. The rest of the app keeps the light theme and global tokens — nothing global changed.
- **Photography**: `next/image` with a football-on-turf Unsplash shot (hosts already allow-listed in `next.config.mjs` `images.remotePatterns`).
- **Palette**: `--navy-950 #060b15`, `--navy-900 #0a1322`, `--lime #c8f31d`, `--lime-strong #b7e000`; white surfaces; existing `Outfit` font.
- **Role cards**: real `<input type="radio">` inside a `<label>` (native keyboard + screen-reader semantics), check badge, icon tile that inverts on selection, 3 bullets per role.
- **Form**: inline validation mirroring `lib/validation.js` (username regex, password ≥ 8, email), shown on blur or after submit; `aria-invalid` + `aria-describedby`; password show/hide; 4-bar strength meter with `aria-live` label; spinner + disabled state preventing double submit; success state before redirect.
- **Google**: same `sportferry_oauth_role` cookie + `signIn('google')`; CTA text follows the selected role.
- **Breakpoints**: ≤1024px stacks the photo above the form (photo trimmed to a 250px band, perks/eyebrow hidden); ≤560px single-column role cards, 16px inputs (no iOS zoom), tighter padding; `prefers-reduced-motion` honoured.
- **Verified**: desktop 1440 / tablet 834 / mobile 390 screenshots; no horizontal overflow (scrollWidth 390 = clientWidth 390); Player flow → `/`, Ground Owner flow → `/vendor/onboarding`; Google redirect URI correct for both roles; validation + reveal states exercised; throwaway accounts deleted.

### Fixes from the post-implementation review
- **WCAG AA failures fixed** (measured with a luminance script in the browser): the lime eyebrow was **1.54:1** on white and the trust note **2.65:1**. Now `#4d5f04` (7.1:1) and `#5d6b81` (5.4:1). All remaining body text measures 5.4:1 or better.
- **Removed an unlabeled `<fieldset>`** that wrapped the form — a fieldset without a `<legend>` hurts screen-reader output. Inputs are disabled during submit by state, not by the fieldset.
- **`aria-describedby` no longer dangles**: the password field pointed at `#reg-password-strength` before the meter existed; the reference is now conditional on `password`.
- **Image `alt` corrected** — the photo is daylight, not "at night".
- **Keyboard-only focus ring** on role cards (`:has(.roleInput:focus-visible)`) — `:focus-within` also fired after a mouse click.
- **Hover lift gated** behind `@media (hover: hover) and (pointer: fine)` so touch taps don't leave a card stuck in its hover state.

### Tooling trap worth remembering
`npm run build` and `next dev` share `.next`. Running a production build **while the dev server is up** leaves the dev server serving chunk URLs that 404 (the page renders unstyled — default grey buttons, 13px text). If the dev page suddenly looks unstyled, check `/_next/static/css/...` for a 404 and restart `next dev`; do not chase a CSS bug.

### Mobile optimisation (2026-11-27)
Measured at 390×844 before/after:

| Metric | Before | After |
|---|---|---|
| Page height | 1861px (2.2 screens) | 1602px (1.9 screens) |
| Hero band | 190px | 124px |
| Role cards | stacked, 259px | 2-up, 111px |
| Fields visible before scrolling | 1 | 3 |
| Submit button | static, 1184px down | sticky above the nav |

- Role cards go **2-up** on phones (descriptions kept; bullets hidden), so both options are visible without scrolling.
- Hero collapses to a 124px banner; the sub-headline is dropped on mobile as it duplicates the form copy. `≤360px` drops card descriptions too.
- Submit becomes `position: sticky` at `bottom: calc(70px + safe-area + 10px)` — the fixed `MobileNav` is exactly 70px, so the button sits clear of it while scrolling. The form panel gets 64px bottom padding so terms/sign-in don't hide under the sticky button.
- On a short viewport (`max-height: 560px`, i.e. the on-screen keyboard is open) the sticky is disabled — otherwise it would cover the field being typed into. Verified: `position` flips to `static` and the focused password field stays in view.
- `scroll-padding-top/bottom` on the page keeps focused inputs clear of the fixed header and nav.
- **The city-picker no longer auto-opens on `/register`, `/login`, `/forgot-password`, `/reset-password`** (`SUPPRESS_ON` in `components/LocationModal/LocationModal.jsx`). It used to fire 600ms after load and covered the entire mobile form; a city is not needed to create an account.
- Verified: no horizontal overflow at 360/390/834; mobile Player and Ground Owner registration both reach their destinations; 32 suites / 217 tests pass; lint clean.

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
