# AGENTS.md — How to run this project (read this first)

Verified working on 2026-10-08. Follow these exact steps; they were tested end-to-end.

> **Also read `.project-memory/`** — 20 docs covering architecture, rules, known bugs, API, and roadmap. Start with `.project-memory/AI_ONBOARDING.md`.

## Instant start

```bash
npx next dev -p 3000
```

Run it as a **background process** (it stays up, log goes to the tool's stdout file). Then verify:

```bash
# Wait for "✓ Ready" in the log (~7s), then probe with a 60s timeout:
curl -s -m 60 --noproxy '*' -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/
```

Expected timeline (measured):

| Phase | Time |
|---|---|
| `✓ Ready` | ~7s |
| First `GET /` (cold compile of `/` + `/middleware`, ~858 modules) | 15–35s, returns **200** |
| Every request after that | <1s |

The first probe **will** appear to hang for up to ~35s — that's the compile, not a hang. Always pass `-m 60` on the first probe and a short `-m 10` on later ones.

## Hard rules (each of these cost minutes when violated)

1. **Always pass `-p 3000`.** This environment exports `PORT=0`, which makes `npm run dev` bind a **random high port** (e.g. 56100) printed only in its log. `npm run dev` alone works, but you then have to scrape the log for the port. `-p 3000` overrides it and makes the URL deterministic. Port 3000 is NOT in a Windows excluded range here.
2. **Exactly ONE dev server at a time.** Multiple `next dev` instances share the same `.next` directory and deadlock — they sit at `✓ Starting...` forever, accept TCP connections, and never respond (curl hangs until timeout). If a probe times out, suspect an orphan server first.
3. **Never shell-background with `&` in a synchronous command** (`npm run dev &`). The process gets orphaned or cleaned up unpredictably. Use the terminal tool's BACKGROUND mode instead.
4. **Kill orphans before restarting.** On Windows/Git Bash:

   ```bash
   # find node processes for this project
   wmic process where "name='node.exe'" get ProcessId,ParentProcessId,CommandLine /format:list
   # kill a whole tree
   taskkill //F //T //PID <npm-pid>
   # confirm the port is gone
   netstat -ano | grep LISTENING | grep :3000
   ```

5. **Always `--noproxy '*'` on curl.** No proxy env vars are set, but plain curl to localhost can stall; the flag removes all doubt.

## Kill / restart

```bash
taskkill //F //T //PID <pid-of-npm-run-dev>   # kills npm -> next -> next-server children
# or kill by port owner:
for pid in $(netstat -ano | grep LISTENING | grep :3000 | awk '{print $NF}' | sort -u); do taskkill //F //T //PID $pid; done
```

## Commands

| Task | Command | Notes |
|---|---|---|
| Dev server | `npx next dev -p 3000` | Ready ~7s; first page compile 15–35s |
| Tests | `npm test` | Jest; 3 suites / 15 tests; ~40s; **all pass**, exit 0 |
| Lint | `npm run lint` | `next lint` |
| Prod build | `npm run build` | not re-verified in this session |
| Prod start | `npm start` | requires a prior build |

## Project facts

- **Sportferry** (`package.json` name) — Next.js **14.2.35** App Router, React 18, JS (not TS), Tailwind + CSS modules, `jsconfig.json` path aliases.
- App directory: `app/` — home page at `/`, plus `/play-now`, `/players`, `/tournaments`, `/admin/bookings`, `/login`.
- Env file **`.env.local` already exists** and is auto-loaded (MongoDB URI, NextAuth/Google, Razorpay, Vercel Blob). `.env.example` documents them. No env setup needed to start.
- Stack: mongoose, next-auth v5 beta, razorpay, @vercel/blob, framer-motion, lucide-react.
- Tests live next to components: `components/**/*.test.jsx` (jsdom + Testing Library; setup in `jest.setup.js`, config in `jest.config.js`).
- Health check: `GET /` should return **200** with `<title>Sportferry | Find &amp; Book Sports Near You</title>`.
