# AI MODELS — current status

## Short answer
**No AI/ML is used anywhere in Sportferry today.** No model APIs, no LLM SDKs, no vector stores, no recommendation/embedding code, no AI in `package.json` dependencies. Verified by dependency list + repo-wide grep (2026-10-08).

## What exists that is *not* AI (don't confuse them)
- `components/` icons/UX copy like "Find Players — We'll match you with players" is **marketing UI**, not a matching model. Actual "matching" is the deterministic capacity rule in `lib/booking-utils.js` (≥6 players → confirm).
- Popularity sort (`/api/venues/popularity`) is a plain DB aggregation, not ML ranking.
- `lib/mockData.js` is static sample data (also dead code).

## If/when AI is added — natural fit points (speculative, not committed work)
| Use case | Data already available | Notes |
|---|---|---|
| Player matchmaking ("Find Players") | bookings (city, sport, classification, teamSide, playersCount), users (city) | currently a static list page (`/players`) — first real feature candidate |
| Dynamic pricing / demand hints | bookings × venue pricePerHour, time-of-day slots | IST-normalized slots make good time features |
| Review/amenity summaries | venue `amenemies[]`, rating | no reviews exist yet |
| Support/FAQ assistant | `/cancellation-policy`, `/instructions` pages | cheap, static-RAG friendly |
| Fraud signals on payments | razorpay ids, PAYMENT_PENDING expiry patterns | currently no analytics layer |

## Ground rules if integrating (per repo rules)
- No new dependency without need; keys go in `.env.local` + `.env.example` (never committed, never in `scratch/`).
- Keep user PII out of prompts (see `BUGS B1` — availability already leaks names; don't compound it).
- No client-side secrets: model calls must live in route handlers (`app/api/**`).
- There is **no** `AI_MODELS` config, provider abstraction, or cost tracking to extend — anything would be greenfield.
