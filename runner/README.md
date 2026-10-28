# BotForge runner

The always-on half of BotForge. A ~400-line FastAPI service that:

1. receives a bot spec (files, entry, requirements, env),
2. writes it into `/data/bots/<bot_id>`,
3. runs `pip install -r requirements.txt` (output streamed into the log buffer),
4. spawns `python -u <entry>` in its own process group,
5. streams stdout/stderr into a ring buffer served over HTTP,
6. supervises: restarts crashed processes with exponential backoff (1s → 60s).

## Run it

```bash
docker build -t botforge/runner .
docker run -d --restart unless-stopped -p 8081:8081 \
  -e RUNNER_SECRET=change-me -v botforge-data:/data botforge/runner
```

Without Docker:

```bash
pip install -r requirements.txt
RUNNER_SECRET=change-me BOTFORGE_DATA=./data PORT=8081 python host.py
```

Then attach it in the dashboard: **Console → Runner & settings → Runner URL + secret**.

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | version, python, running count, cpu/mem |
| POST | `/bots` | create/replace a bot (installs + starts in background) |
| POST | `/bots/:id/start` | start a stopped bot |
| POST | `/bots/:id/stop` | SIGTERM the process group |
| POST | `/bots/:id/restart` | stop + spawn |
| DELETE | `/bots/:id` | stop and remove |
| GET | `/bots/:id/status` | pid, exit code, restarts, cpu/mem |
| GET | `/bots/:id/logs?after=seq` | incremental log tail |
| DELETE | `/bots/:id/logs` | clear the ring buffer |

Every request is authenticated with the `x-runner-secret` header when `RUNNER_SECRET` is set.

## Notes

- `python -u` + `PYTHONUNBUFFERED=1` so logs appear immediately.
- `preexec_fn=os.setsid` puts each bot in its own process group, so a child worker is killed too.
- Files are path-traversal checked before writing.
- Workspace persists on the Docker volume, so Telegram session files and SQLite DBs survive restarts.
