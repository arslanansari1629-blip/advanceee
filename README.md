# BotForge Admin — advanced operations console

A full admin panel for the [BotForge Cloud](https://botforge-cloud.vercel.app/) Telegram-bot
hosting product: fleet management, live logs, users & billing, support inbox, feature flags,
audit trail, system health and workspace settings.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · hand-rolled SVG charts**.
No UI kit, no chart library, no external services — every screen runs on a deterministic demo
dataset, and every control is interactive.

```bash
npm install
cp .env.example .env.local    # set ADMIN_USERNAME / ADMIN_PASSWORD
npm run dev     # http://localhost:3000  → /login → /admin
npm run build   # production build
npm start       # production server
npm run typecheck
```

## Authentication

The console is gated by a username + password login. **Credentials are never stored
in the repository** — they are read from the environment at runtime:

| Variable | Purpose |
| --- | --- |
| `ADMIN_USERNAME` | Login username (e.g. `Arslan`) |
| `ADMIN_PASSWORD` | Login password |
| `ADMIN_DISPLAY_NAME` | Optional friendly name shown in the sidebar (defaults to the username) |
| `ADMIN_SESSION_SECRET` | Optional extra signing key; `openssl rand -hex 32` |

How it works:

- `POST /api/auth/login` verifies the credentials with a constant-time compare, then
  issues an **HMAC-SHA256 signed, httpOnly** session cookie (`bf_admin_session`).
- Sessions last 12 hours, or 7 days with “keep me signed in”.
- `src/middleware.ts` protects `/admin/*` and `/api/admin/*`: browsers are redirected to
  `/login?next=…`, API calls get `401`. The Telegram webhook (`/api/tg/*`) stays public.
- Brute force is throttled to 8 attempts / 5 minutes per IP; the login form and the API
  share the same counter.
- `POST /api/auth/logout` clears the cookie; `GET /api/auth/me` reports the session.
- If the credentials are missing the console answers `503 auth_not_configured` instead of
  silently opening up.

On Vercel, add the variables under **Project → Settings → Environment Variables**
(Production **and** Preview), then redeploy:

```bash
vercel env add ADMIN_USERNAME production
vercel env add ADMIN_PASSWORD production
vercel env add ADMIN_SESSION_SECRET production
```

## Screens

| Route | What it does |
| --- | --- |
| `/admin` | Fleet overview: KPIs, 24h/7d/30d/90d traffic chart, engine health gauges, busiest bots, plan mix, live log tail, incidents |
| `/admin/activity` | Filterable event stream (updates, replies, compiles, errors, auth) with operator presence and deploy queue |
| `/admin/bots` | Sortable/filterable fleet table + card view, bulk pause/resume/recompile/delete, CSV export, 3-step deploy wizard |
| `/admin/bots/[id]` | Bot console: traffic chart, compiled behaviour, Python source viewer, env vault with reveal, webhook inspector, logs, danger zone |
| `/admin/logs` | Live SSE-style log console: filter by level/bot, search, pause, follow, expand JSON payloads, download the buffer |
| `/admin/templates` | Starter library with code preview, copy and one-click deploy simulation |
| `/admin/users` | Accounts table, filters, growth chart, operator drawer with quota/bots/moderation, invite modal |
| `/admin/users/[id]` | Full profile: bots, invoices, usage quotas, account facts, admin notes |
| `/admin/revenue` | MRR/ARR/NRR KPIs, growth chart, plan mix, pricing tiers, invoice ledger with refunds |
| `/admin/tickets` | Split-view support inbox with SLAs, macros, priority changes, replies and resolution |
| `/admin/flags` | Feature flags with rollout sliders, environment targeting, SDK snippet and kill switches |
| `/admin/audit` | Hash-chained audit log with severity filters, JSON inspection and CSV export |
| `/admin/health` | Service uptime + 90-day heatmaps, SLO burn, incidents, edge regions, runbooks |
| `/admin/settings` | Workspace, security posture, quotas, alerting, API keys and a danger zone |

Plus a `⌘K` command palette, `⌘`-free `/` shortcut, collapsible sidebar (persisted), light/dark
themes (persisted), toasts, drawers, modals and skeleton-free empty states.

## Demo API

All endpoints are read-only simulations unless noted; nothing calls Telegram or a database.

```bash
curl /api/admin/stats?range=7d                  # KPIs + fleet/revenue/user rollups
curl /api/admin/bots?status=live&q=echo         # filtered fleet
curl -X POST /api/admin/bots -d '{"name":"x","token":"771234567:AA…","code":"from telegram.ext …"}'
curl /api/admin/bots/b_7f31                     # one bot (secrets masked)
curl -X PATCH /api/admin/bots/b_7f31 -d '{"status":"paused"}'
curl -N /api/admin/logs/stream                  # Server-Sent Events log stream
curl -X POST /api/tg/b_7f31 -d '{"message":{"text":"/start",…}}'   # simulated webhook reply

# auth
curl -c jar -X POST /api/auth/login -H 'content-type: application/json' \
  -d '{"username":"…","password":"…","remember":true}'
curl -b jar /api/auth/me            # { authenticated: true, user, expires_at }
curl -b jar -X POST /api/auth/logout
```

The `POST /api/tg/[botId]` route behaves like the real BotForge gateway: it validates the bot,
returns 503 when paused and compiles a reply for the posted Telegram update.

## Structure

```
src/
  app/
    admin/            # console routes (layout = shell, error boundary, not-found)
    api/              # demo REST + SSE + Telegram webhook simulation
    globals.css       # design tokens, shell layout, theme tuning
  components/
    app-shell.tsx     # sidebar, topbar, palette, notifications, theme
    charts.tsx        # area/bars/donut/heatmap/gauge, hover tooltips
    ui.tsx            # badges, cards, metrics, sparklines, progress
    *-table.tsx, *-queue.tsx, *-grid.tsx, forms and modals
  lib/
    data.ts           # deterministic seeded dataset (34 bots, 26 users, logs, invoices…)
    types.ts, format.ts
```

## Notes

- The dataset is generated with a fixed seed (`20261029`) so charts and tables look identical on
  every reload and between server and client.
- Bot tokens, API keys and webhook secrets are masked everywhere, including exports.
- The admin console is password protected; see **Authentication** above for the env vars.
- Interactions (pause, recompile, refunds, flags, replies, invites) update local UI state and raise
  a toast; mutations are intentionally not persisted — this is a demo console for an existing
  product, not a backend.
