# Hosting the runner (so bots actually stay online)

The BotForge dashboard runs on Vercel. Vercel functions are short-lived and stateless,
so they **cannot** hold a Telegram bot's long-polling connection. The runner is the
small always-on service that executes your Python: it installs requirements, spawns the
process and supervises it.

You only need **one runner** for all your bots — unlimited bots per runner.

---

## Option 1 — any Linux box (recommended, cheapest)

A $3–5/mo VPS (Hetzner, DigitalOcean, Contabo), a spare PC, or a Raspberry Pi.

```bash
# 1. copy the secret from BotForge → Console → Setup
curl -fsSL https://raw.githubusercontent.com/arslanansari1629-blip/advanceee/main/deploy/vps-install.sh \
  | sudo RUNNER_SECRET=paste-your-secret bash
```

The script installs Docker, builds the image, starts it with `--restart unless-stopped`
and prints:

```
Runner URL : http://203.0.113.10:8081
Secret     : paste-your-secret
```

Open the port if you have a firewall: `sudo ufw allow 8081/tcp`.

Then in BotForge: **Console → Setup → paste URL + secret → Verify**.

## Option 2 — Docker anywhere

```bash
git clone https://github.com/arslanansari1629-blip/advanceee
cd advanceee
docker build -t botforge/runner ./runner
docker run -d --restart unless-stopped -p 8081:8081 \
  -e RUNNER_SECRET=paste-your-secret \
  -v botforge-data:/data \
  botforge/runner
```

## Option 3 — Fly.io

```bash
cd runner
fly launch --copy-config --name botforge-runner
fly volumes create botforge_data --size 1
fly secrets set RUNNER_SECRET=paste-your-secret
fly deploy
```

Public URL: `https://botforge-runner.fly.dev` — paste that into Setup.

## Option 4 — Render

Render → **New → Blueprint** → select this repo → it reads [`render.yaml`](../render.yaml).
Set `RUNNER_SECRET` when prompted.

⚠️ The **free** Render instance sleeps when idle, which kills your bots — pick the
starter plan for real 24/7.

## Option 5 — Railway / Koyeb / Northflank

Create a service from this repo with:
- Dockerfile path: `runner/Dockerfile`
- Port: `8081`
- Env: `RUNNER_SECRET=<secret>`, `BOTFORGE_DATA=/data`
- Attach a volume at `/data` so Telegram session files and SQLite DBs survive restarts.

---

## Put it behind HTTPS (nice to have)

Plain HTTP works, but the secret travels in a header. To encrypt it:

```bash
# Caddy gives you automatic TLS in one line
caddy reverse-proxy --from runner.example.com --to 127.0.0.1:8081
```

or with Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:8081
```

Then use `https://runner.example.com` as the Runner URL.

---

## Verify

```bash
curl http://<your-host>:8081/health
# {"ok":true,"version":"1.0.0","python":"3.11.x","running":0,...}
```

In the dashboard the sidebar badge flips from **preview mode** to **runner online**.

## Keep it alive

- Docker already restarts it (`--restart unless-stopped`) and your bots restart
  themselves through the built-in supervisor (exponential backoff, 1s → 60s).
- The workspace lives on the `/data` volume: session files, SQLite databases and any
  file your bot writes survive reboots.
- If your provider supports health checks, point them at `/health`.
