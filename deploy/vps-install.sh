#!/usr/bin/env bash
# BotForge runner — one-command install for any Linux box (VPS, Pi, home server).
#
#   curl -fsSL https://raw.githubusercontent.com/arslanansari1629-blip/advanceee/main/deploy/vps-install.sh \
#     | sudo RUNNER_SECRET=paste-your-secret bash
#
# Then open http://<this-server-public-ip>:8081/health in a browser.
# Paste that URL + the same secret into BotForge → Console → Setup.
set -euo pipefail

REPO="${BOTFORGE_REPO:-https://github.com/arslanansari1629-blip/advanceee}"
SRC_DIR="${BOTFORGE_SRC:-/opt/botforge}"
PORT="${PORT:-8081}"
IMAGE="botforge/runner:latest"
SECRET="${RUNNER_SECRET:-}"

say() { printf '\033[1;36m›\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run with sudo (root needed to install docker)"
[ -n "$SECRET" ] || die "set RUNNER_SECRET, e.g. sudo RUNNER_SECRET=abc123 bash vps-install.sh"

# ---------------------------------------------------------------- docker
if ! command -v docker >/dev/null 2>&1; then
  say "docker not found — installing"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y --no-install-recommends ca-certificates curl git
    curl -fsSL https://get.docker.com | sh
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y docker git
    systemctl enable --now docker
  else
    die "unsupported distro: install docker + git manually, then re-run"
  fi
else
  say "docker present: $(docker --version)"
fi

command -v git >/dev/null 2>&1 || die "git is required"

# ------------------------------------------------------------------ source
if [ -d "$SRC_DIR/.git" ]; then
  say "updating source in $SRC_DIR"
  git -C "$SRC_DIR" pull --ff-only || true
else
  say "cloning runner source"
  mkdir -p "$(dirname "$SRC_DIR")"
  git clone --depth 1 "$REPO" "$SRC_DIR"
fi

say "building image (first build takes ~2 min: it pre-warms common libraries)"
docker build -t "$IMAGE" "$SRC_DIR/runner"

# ---------------------------------------------------------------- (re)start
say "starting container on port $PORT"
docker rm -f botforge-runner >/dev/null 2>&1 || true
docker run -d \
  --name botforge-runner \
  --restart unless-stopped \
  -p "$PORT:8081" \
  -e RUNNER_SECRET="$SECRET" \
  -e BOTFORGE_DATA=/data \
  -v botforge-data:/data \
  "$IMAGE" >/dev/null

sleep 4
if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
  say "runner is up"
else
  die "container did not answer on :$PORT — check: docker logs botforge-runner"
fi

IP="$(curl -fsS --max-time 4 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
cat <<EOF

  ─────────────────────────────────────────────────────────────
   BotForge runner is running 24/7 (docker restart: unless-stopped)

   Runner URL : http://${IP}:${PORT}
   Secret     : ${SECRET}

   Next: open BotForge → Console → Setup → paste the URL and secret.
   If it is unreachable, allow the port:  ufw allow ${PORT}/tcp
  ─────────────────────────────────────────────────────────────

EOF
