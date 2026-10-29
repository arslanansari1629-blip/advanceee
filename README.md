# BotForge Admin — live operator console

An operator console for the [BotForge Cloud](https://botforge-cloud.vercel.app/) Telegram-bot
hosting product. It is **not** a mockup and it has **no fixture data**: every number, table row,
error string and flag on screen is read from the product's operator API at request time.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS**.

```bash
npm install
cp .env.example .env.local    # set BOTFORGE_API_URL
npm run dev                   # http://localhost:3000  → /login → /admin
npm run build
npm start
npm run typecheck
```

## How it reads data

```
browser ──cookie──▶ this console (Vercel) ──bf_operator──▶ BotForge Cloud /api/admin/data
```

1. `POST /api/auth/login` sends the credentials you type to the product's
   `POST /api/admin/login`. On success the returned `bf_operator` token is sealed inside this
   console's own HMAC-signed session cookie — the product password is never stored here.
2. Every server render calls `GET {product}/api/admin/data` with that token (`src/lib/product.ts`,
   `src/lib/session.ts`, deduped with React `cache()`), and renders the payload directly.
3. If the product rejects the typed credentials but they are valid for this console, the deployment
   mints its own operator token from `BOTFORGE_OPERATOR_USERNAME` / `_PASSWORD` — same read-only
   access, so live data keeps flowing.
4. `POST /api/admin/settings` proxies the four platform flags straight to the product and returns
   whatever the product confirms.
5. If the product is unreachable, rejects the session, or a page has no data, the console shows
   that state (`src/components/connection-state.tsx`) instead of inventing numbers.

| Variable | Purpose |
| --- | --- |
| `BOTFORGE_API_URL` | Base URL of the live product (defaults to `https://botforge-cloud.vercel.app`) |
| `BOTFORGE_OPERATOR_USERNAME` | Product operator username this deployment mints a token with (defaults to `ADMIN_USERNAME`) |
| `BOTFORGE_OPERATOR_PASSWORD` | Product operator password (defaults to `ADMIN_PASSWORD`) |
| `ADMIN_USERNAME` | Console login (fallback if the product itself is down) |
| `ADMIN_PASSWORD` | Optional fallback password |
| `ADMIN_DISPLAY_NAME` | Optional friendly name in the sidebar |
| `ADMIN_SESSION_SECRET` | Signs `bf_admin_session`; `openssl rand -hex 32` |

```bash
vercel env add BOTFORGE_API_URL production
vercel env add ADMIN_SESSION_SECRET production
```

## Screens

| Route | Source of every value |
| --- | --- |
| `/admin` | `stats`, `engine`, `storage`, `settings`, bot/account lists — all from `GET /api/admin/data` |
| `/admin/bots` | `bots[]`: status, framework, owner, updates, replies, restarts, createdAt |
| `/admin/bots/[id]` | One `bots[]` record plus its owner from `users[]` |
| `/admin/users` | `users[]`: plan, bots, live, updates, createdAt |
| `/admin/users/[id]` | One `users[]` record plus that owner's bots |
| `/admin/settings` | `settings` read from the product, written back with `POST /api/admin/settings` |
| `/admin/system` | `GET /api/health` on the product, session facts, endpoint reachability |

Anything the product does not expose — revenue, tickets, feature flags, audit log, log streams,
templates — **is not shown at all**. Those screens were removed rather than faked.

## Auth

- `POST /api/auth/login` → product first, local `ADMIN_*` credentials only as a fallback.
- Session = HMAC-SHA256 signed httpOnly cookie (`bf_admin_session`), 12 h, or 7 days with “keep me
  signed in”.
- `src/middleware.ts` gates `/admin/*` and `/api/admin/*`; `/login` and `/api/health` stay public.
- Brute force is throttled to 8 attempts / 5 minutes per IP.
- Missing credentials → `503 auth_not_configured`, never an open console.
