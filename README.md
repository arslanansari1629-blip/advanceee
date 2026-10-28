# BotForge Cloud

**Live app:** https://botforge-cloud.vercel.app
**Demo login:** `demo@botforge.dev` / `botforge123` (pre-loaded with 6 bots)

**Paste Python → requirements detected → your Telegram bot runs 24/7.**

BotForge is a hosting console for Python chat bots. You paste the whole file, it reads every
`import`, maps module names to the real PyPI distributions, installs them and supervises the
process — with live logs, restart, stop, redeploy and crash-loop handling.

- ✅ **Unlimited bots, free forever** — no per-bot pricing, no queue
- 🧠 **Requirements auto-detected** from imports (250+ module→PyPI mappings, sensible fallback)
- 📌 **Correct version pins** — `python-telegram-bot` v13 vs v21 detected from your API usage
- 📡 **Live logs** — stdout, stderr, pip output and gateway events stream into the console
- ♻️ **Supervision** — auto-restart with exponential backoff, exit codes, crash-loop detection
- 🔐 **Secrets** — bot tokens detected on paste, masked everywhere, injected as env vars
- 🧩 **Multi-file projects** — `main.py` + helpers, editable in the browser

Supports every library on PyPI: python-telegram-bot, pyTelegramBotAPI, aiogram, Pyrogram,
Telethon, discord.py, OpenAI, pandas, OpenCV, yt-dlp, Playwright — anything `pip` can install.

---

## Quick start (local)

```bash
npm install
npm run dev          # http://localhost:3000
```

Open the app → **Enter demo workspace** (`demo@botforge.dev` / `botforge123`) or create an account.
No database required: state is stored in `.data/db.json`.

To use Postgres/Neon/Supabase instead:

```bash
DATABASE_URL="postgres://..." npm run dev      # table is created automatically
```

---

## Hosting a bot for real 24/7

Telegram bots need a **long-lived process**. Vercel functions are short-lived and stateless,
so a bot cannot stay online inside a serverless function. BotForge therefore has two layers:

| Layer | Runs on | Responsibility |
| --- | --- | --- |
| **Dashboard** (this repo) | Vercel | accounts, code editor, import analysis, bot lifecycle, log streaming UI |
| **Runner** (`runner/host.py`) | any always-on box — VPS, Docker, Fly.io, Railway, Raspberry Pi | `pip install`, process spawn, supervisor, log ring buffer |

Attach a runner once and every deploy executes real Python:

```bash
cd runner
docker build -t botforge/runner .
docker run -d --restart unless-stopped \
  -p 8081:8081 \
  -e RUNNER_SECRET=change-me \
  -v botforge-data:/data \
  botforge/runner
```

Then in **Console → Runner & settings** paste `http://<your-host>:8081` and the same secret.
The badge in the sidebar flips from `preview mode` to `runner online`.

Without a runner, bots run in **preview mode**: the entire lifecycle (install → start → log
stream → stop → restart → crash) is real and fully interactive, but the Telegram gateway is a
deterministic simulation, labelled `PREVIEW` in the UI so nothing is misleading.

### Runner environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `RUNNER_SECRET` | *(empty = no auth)* | shared secret the dashboard must send |
| `PORT` | `8081` | HTTP port |
| `BOTFORGE_DATA` | `/data` | workspace root (`/data/bots/<bot_id>`) |
| `LOG_BUFFER` | `2000` | log lines kept per bot |
| `CAPACITY` | `0` (unlimited) | max concurrent bots |

---

## Dashboard environment

| Variable | Required | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | no | Postgres connection string. Omit → JSON file store |
| `DATABASE_SSL` | no | set to `false` for a local Postgres |
| `RUNNER_URL` | no | platform-wide default runner (per-user value overrides it) |
| `RUNNER_SECRET` | no | default runner secret |
| `DATA_DIR` | no | file-store location (defaults to `.data/`, `/tmp/botforge` on Vercel) |

---

## How the analyser works

`lib/pyreqs.ts`

1. Parses `import x` / `from x.y import z`, including inside functions and extra files.
2. Splits Python standard library (skipped) from third-party imports.
3. Maps module → distribution using a 250+ entry table, then falls back to the module name:

   | your import | requirement written |
   | --- | --- |
   | `import telebot` | `pyTelegramBotAPI` |
   | `from telegram.ext import Application` | `python-telegram-bot>=21.6` |
   | `from telegram.ext import Updater` | `python-telegram-bot==13.15` |
   | `from PIL import Image` | `Pillow` |
   | `import cv2` | `opencv-python` |
   | `from pyrogram import Client` | `pyrogram` + `TgCrypto` |

4. Detects bot tokens (`123456789:AA…`), masks them, and flags risky constructs
   (`input()`, `cv2.imshow`, blocking `while True`, conflicting frameworks).
5. Emits a `requirements.txt` you can edit before deploying.

## API surface

| Route | Purpose |
| --- | --- |
| `POST /api/auth/register` · `login` · `logout` | scrypt-hashed accounts, httpOnly sessions |
| `POST /api/analyze` | import → PyPI resolution, framework + token detection |
| `GET/POST /api/bots` | list / create (and optionally deploy) |
| `GET/PATCH/DELETE /api/bots/:id` | detail, edit files/requirements/env, delete |
| `POST /api/bots/:id/action` | `start` · `stop` · `restart` · `redeploy` · `toggle-auto-restart` |
| `GET/DELETE /api/bots/:id/logs` | incremental log tail (`?after=seq`) |
| `GET/POST /api/runner` | runner health / attach runner |
| `GET /api/overview` | fleet stats, telemetry, activity feed |

## Runner API

`GET /health`, `POST /bots`, `POST /bots/:id/{start,stop,restart}`, `DELETE /bots/:id`,
`GET /bots/:id/status`, `GET /bots/:id/logs?after=`, `DELETE /bots/:id/logs`
— all authenticated with `x-runner-secret`.

## Project layout

```
app/
  page.tsx                 landing
  login/                   auth
  console/                 dashboard, deploy studio, bot detail, settings
  api/                     auth, analyze, bots, logs, runner, overview
components/                shell, code editor, log viewer, icons, UI primitives
lib/
  pyreqs.ts                import analyser (the interesting part)
  bots.ts                  lifecycle service (deploy/stop/restart/logs)
  preview.ts               deterministic gateway simulator for preview mode
  runner.ts                runner HTTP client
  db.ts                    Postgres + JSON store
  seed.ts                  demo workspace
runner/host.py             FastAPI runner + process supervisor
```

## Security notes

- Passwords: scrypt with a 16-byte per-user salt, constant-time compare.
- Sessions: httpOnly, SameSite=Lax cookies, 30-day expiry, server-side session records.
- Bot tokens: never logged; the UI only shows `7712345678:AAHx••••••9fQ`.
- Runner: per-request secret header, path-traversal guard on every written file.
- Deploying arbitrary code is inherently risky — run the runner on a machine you control and
  treat it as a sandbox boundary.

## License

MIT
