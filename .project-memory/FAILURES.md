# FAILURES — what went wrong (and the fix)

## 1. Dev-server deadlock: three instances, ~8 minutes wasted (2026-10-08)
**What happened:** While bringing the project up, `npm run dev` was launched three times (a shell-backgrounded `&` attempt + two retries). All three shared `.next/`; each printed `✓ Starting...` and then hung **forever** — TCP listening but never responding. Every curl probe burned its full 60s timeout. Root causes stacked: `PORT=0` made each instance pick a random port (log-scraping needed), `ps aux` on Git Bash showed no node processes (wrong tool — Windows), and probes without `-m` blocked indefinitely.
**Fix:** one server, pinned port: `npx next dev -p 3000`, background via the terminal tool's BACKGROUND mode (never `cmd &` in a sync command). Verify with `curl -m 60` first hit, `-m 10` after. Kill orphans with `taskkill //F //T` and `netstat -ano | grep LISTENING`. Documented in `../AGENTS.md`.

## 2. Secrets committed to git (fixed, `d3fd994`)
**What happened:** Debug scripts under `scratch/` contained live environment secrets and were committed.
**Fix:** repo history scrubbed of the values, `/scratch/` added to `.gitignore`, `.commandcode/` ignored too.
**Lesson:** never write env values into scripts; if a debug script needs credentials it reads `process.env`. Assume anything committed is public-forever — rotate credentials that ever lived in `scratch/`.

## 3. Vercel build failure from eslint-config-next 15 (fixed, `db44115`)
**What happened:** `eslint-config-next@15` conflicted with Next 14 during Vercel builds.
**Fix:** downgrade/pin to `eslint-config-next@14.2.15` (matches Next 14.2.x major).
**Lesson:** keep lint tooling on the same major as the framework; a lockfile refresh can silently bump it.

## 4. Anonymous users got 401 on venue availability (fixed, `dd5e6a3`)
**What happened:** venue `availability` API sat behind the auth middleware, so logged-out visitors couldn't see a venue's booked slots.
**Fix:** added to the public allowlist in `middleware.js`.
**Lesson:** new public-looking endpoints must be explicitly allowlisted; middleware 401s everything else by default. Any future "works logged in, 401 logged out" bug = check that list first.

## 5. Poor early commit hygiene (`7ae30a5`, `2827130`, `f8ac82f` — messages "1", "2", "3")
**Lesson:** conventional commits from here on; message says *why*, not just *what*.

## Anti-patterns observed in this repo's history
- Committing debug/scratch scripts (recurrence risk: `scratch/` still exists with ~20 DB scripts — they're ignored, keep them that way).
- Lockfile churn in feature commits (6700+ line diffs) — dependency changes ride along with unrelated features, making bisection hard.
- Deleting a component (`TonightsGames.jsx`) in the working tree without a commit — uncommitted deletions are the easiest change to lose.
