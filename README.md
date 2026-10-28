# BotForge Cloud

Host **unlimited Telegram bots, 24/7, free forever** — by pasting Python into a browser.

No runner. No VPS. No Docker. No container to attach. The bots genuinely answer Telegram
messages from the deployment itself.

- **Live site:** https://botforge-cloud.vercel.app
- **Console:** `/console` · **hidden operator panel:** `/admin`

---

## How a bot stays online without a server

```
 Telegram user
      │  message
      ▼
 api.telegram.org ──webhook POST──▶  /api/tg/<botId>  (this Next.js deployment)
      ▲                                     │
      └──────── sendMessage reply ──────────┘
```

1. On deploy the bot calls `getMe` (verifies the token) and `setWebhook` so Telegram pushes
   every update to `/api/tg/<botId>`.
2. Telegram POSTs each update to that endpoint. The endpoint verifies
   `x-telegram-bot-api-secret-token`, renders the reply compiled from your code, and answers
   through the Bot API.
3. Because Telegram is the one holding the connection, there is nothing to keep alive. If an
   instance is cold, Telegram retries — updates are never lost.

That is why the product needs no runner: a webhook is the "always on" runtime.

## What the compiler does

Paste a normal bot file and BotForge compiles your handlers into an executable behaviour spec:

| You write | Engine executes |
| --- | --- |
| `@bot.message_handler(commands=["start"])` + `bot.reply_to(...)` (pyTelegramBotAPI) | `/start` → that reply |
| `CommandHandler("help", help_cmd)` + `reply_text(...)` (python-telegram-bot) | `/help` → that reply |
| `@dp.message(Command("ping"))` + `message.answer(...)` (aiogram 3) | `/ping` → that reply |
| `InlineKeyboardButton("Pricing", callback_data="pricing")` + callback handler | inline keyboard + callback reply |
| catch-all handler (`func=lambda m: True`, `@dp.message()`) | echo / fallback reply |

Placeholders like `{first_name}`, `{username}`, `{chat_id}`, `{text}`, `{time}` are resolved per
update. Every bot also gets engine commands `/start`, `/help`, `/id`, `/ping`, `/uptime`, `/time`,
and unmatched code still gets sensible defaults — never a dead bot.

Imports are auto-detected and pinned (`telebot` → `pyTelegramBotAPI`, `PIL` → `Pillow`,
`telegram.ext.Application` → `python-telegram-bot>=21.6`, old `Updater` → `13.15`, …). Requirements
are information: the webhook engine answers with plain Bot API calls, so nothing is pip-installed at
request time.

## Features

- Paste **multiple Python files**, auto-detected requirements, token auto-detected from source.
- Live logs of every inbound update, compiled reply and Bot API error.
- Controls per bot: **go live, pause, re-register webhook, recompile, sync, delete**.
- Behaviour tab to override any reply without touching the code.
- Dashboard: fleet counts, updates/replies, event feed.
- Hidden operator panel at `/admin` for platform-wide control.
- Tokens encrypted with AES-256-GCM (`tokenEnc`), never returned by any API, masked in the UI.

## API surface

| Route | Purpose |
| --- | --- |
| `POST /api/bots` | create (+ optionally go live) |
| `GET /api/bots`, `GET/PATCH/DELETE /api/bots/[id]` | list / read / edit / delete |
| `POST /api/bots/[id]/action` | `start`, `stop`, `restart`, `redeploy`, `sync` |
| `GET /api/bots/[id]/logs?after=<seq>` | incremental log stream |
| `POST /api/tg/[botId]` | **Telegram webhook** (the runtime) |
| `POST /api/analyze` | static analysis + `compileBehaviour` dry run |
| `GET /api/overview`, `GET /api/health` | dashboard + health |
| `/api/admin/*` | operator API (session-gated) |

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | yes | session signing + AES key for bot tokens |
| `DATABASE_URL` | recommended | Postgres (Neon/Supabase). Without it state lives in a JSON file inside the serverless instance and can reset on cold start — bots still answer Telegram, because webhooks are stateless |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | yes | hidden `/admin` operator login |
| `NEXT_PUBLIC_SITE_URL` | recommended | absolute URL used for `setWebhook` (defaults to the request host / `VERCEL_URL`) |

```bash
npm install
AUTH_SECRET=dev-secret ADMIN_USERNAME=editz ADMIN_PASSWORD=editz900s npm run dev
```

Demo workspace: `demo@botforge.dev` / `botforge123`.

## Deploy

```bash
npx vercel --prod
```

Then open the site, sign in, paste your bot and its token from @BotFather, press **Deploy & go live**,
and message the bot. `setWebhook` is called automatically — nothing else to configure.

## Notes on honesty

- Bots without a token sit in **draft**; bots with an invalid token show the real Telegram error.
- "Uptime" reflects answered updates and Bot API failures, not a made-up process metric.
- The engine currently executes the compiled behaviour (commands, echo, buttons, templates), not
  arbitrary Python at request time — that keeps hosting free and runner-free. Replies you write are
  reproduced exactly, placeholders included.
