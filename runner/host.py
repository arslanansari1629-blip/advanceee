#!/usr/bin/env python3
"""
BotForge runner
===============

The half of BotForge that actually keeps Python processes alive.

It is intentionally small and boring:

  * receive a bot spec  (files, entry, requirements, env)
  * write the files into an isolated workspace  /data/bots/<bot_id>
  * `pip install -r requirements.txt` (streamed into the log buffer)
  * spawn `python -u <entry>` with a per-bot environment
  * stream stdout/stderr into a ring buffer served over HTTP
  * supervise: if the process dies, restart it with exponential backoff

Run it anywhere Docker runs (VPS, Raspberry Pi, Fly.io, Railway):

    docker run -d --restart unless-stopped -p 8081:8081 \
      -e RUNNER_SECRET=change-me -v botforge-data:/data botforge/runner

Then paste http://<host>:8081 + the same secret into BotForge → Settings.
"""

from __future__ import annotations

import json
import os
import shlex
import signal
import subprocess
import sys
import threading
import time
import traceback
from collections import deque
from pathlib import Path
from typing import Any, Dict, List, Optional

import psutil
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

VERSION = "1.0.0"
DATA_DIR = Path(os.environ.get("BOTFORGE_DATA", "/data")).resolve()
SECRET = os.environ.get("RUNNER_SECRET", "")
MAX_LINES = int(os.environ.get("LOG_BUFFER", "2000"))
CAPACITY = int(os.environ.get("CAPACITY", "0"))  # 0 = unlimited
PYTHON = sys.executable or "python3"

DATA_DIR.mkdir(parents=True, exist_ok=True)
(DATA_DIR / "bots").mkdir(parents=True, exist_ok=True)

app = FastAPI(title="BotForge Runner", version=VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_print_lock = threading.Lock()


def log(msg: str) -> None:
    with _print_lock:
        print(f"[runner] {msg}", flush=True)


# --------------------------------------------------------------------------- models
class BotFile(BaseModel):
    path: str
    content: str


class BotSpec(BaseModel):
    id: str
    name: str = "bot"
    files: List[BotFile] = Field(default_factory=list)
    entry: str = "main.py"
    requirements: str = ""
    env: Dict[str, str] = Field(default_factory=dict)
    autoRestart: bool = True
    restart: bool = False


# ------------------------------------------------------------------------ runtime
class BotRuntime:
    """One supervised Python process + its log ring buffer."""

    def __init__(self, spec: BotSpec) -> None:
        self.spec = spec
        self.id = spec.id
        self.workdir = DATA_DIR / "bots" / spec.id
        self.lines: deque = deque(maxlen=MAX_LINES)
        self.seq = 1
        self.proc: Optional[subprocess.Popen] = None
        self.status = "queued"
        self.exit_code: Optional[int] = None
        self.error: Optional[str] = None
        self.restarts = 0
        self.started_at = 0.0
        self.last_exit = 0.0
        self.installed: List[str] = []
        self.lock = threading.RLock()
        self._stop_flag = False
        self._installing = False
        self.created = time.time()

    # -- logging -----------------------------------------------------------
    def push(self, message: str, stream: str = "stdout") -> None:
        with self.lock:
            self.lines.append(
                {
                    "seq": self.seq,
                    "stream": stream,
                    "message": message.rstrip("\n"),
                    "ts": int(time.time() * 1000),
                }
            )
            self.seq += 1

    def push_many(self, text: str, stream: str = "system") -> None:
        for line in text.splitlines():
            if line.strip():
                self.push(line, stream)

    # -- workspace ---------------------------------------------------------
    def write_files(self) -> None:
        self.workdir.mkdir(parents=True, exist_ok=True)
        for f in self.spec.files:
            safe = f.path.replace("\\", "/").lstrip("/")
            if ".." in Path(safe).parts:
                raise ValueError(f"unsafe path: {f.path}")
            target = (self.workdir / safe).resolve()
            if not str(target).startswith(str(self.workdir.resolve())):
                raise ValueError(f"unsafe path: {f.path}")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(f.content)
        req = self.spec.requirements.strip()
        (self.workdir / "requirements.txt").write_text(req + ("\n" if req else ""))

    # -- pip ---------------------------------------------------------------
    def install(self) -> None:
        req = self.spec.requirements.strip()
        if not req:
            self.push("no requirements — stdlib only", "system")
            return
        self._installing = True
        self.status = "installing"
        packages = [l.strip() for l in req.splitlines() if l.strip() and not l.strip().startswith("#")]
        self.push(f"pip · resolving {len(packages)} requirement(s)", "system")
        cmd = [PYTHON, "-m", "pip", "install", "--no-cache-dir", "--disable-pip-version-check", "-r", "requirements.txt"]
        try:
            proc = subprocess.Popen(
                cmd,
                cwd=self.workdir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                env={**os.environ, "PIP_NO_INPUT": "1"},
            )
            assert proc.stdout is not None
            for line in proc.stdout:
                line = line.rstrip()
                if line:
                    self.push(line, "system")
            code = proc.wait()
            if code != 0:
                self.push(f"pip failed with exit code {code}", "stderr")
                self.status = "crashed"
                self.error = "dependency installation failed"
            else:
                self.installed = packages
                self.push(f"pip · {len(packages)} package(s) ready", "system")
        except Exception as exc:  # pragma: no cover
            self.push(f"pip crashed: {exc}", "stderr")
            self.status = "crashed"
            self.error = str(exc)
        finally:
            self._installing = False

    # -- process -----------------------------------------------------------
    def spawn(self, first: bool = False) -> None:
        entry = self.spec.entry or "main.py"
        env = {
            **os.environ,
            **{str(k): str(v) for k, v in self.spec.env.items()},
            "PYTHONUNBUFFERED": "1",
            "PYTHONIOENCODING": "utf-8",
            "BOTFORGE_BOT_ID": self.id,
            "HOME": str(self.workdir),
            "TMPDIR": str(self.workdir / ".tmp"),
        }
        (self.workdir / ".tmp").mkdir(exist_ok=True)
        try:
            self.proc = subprocess.Popen(
                [PYTHON, "-u", entry],
                cwd=self.workdir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                env=env,
                preexec_fn=os.setsid if os.name == "posix" else None,
            )
        except Exception as exc:
            self.push(f"spawn failed: {exc}", "stderr")
            self.status = "crashed"
            self.error = str(exc)
            return

        self.status = "running"
        self.exit_code = None
        self.error = None
        self.started_at = time.time()
        self._stop_flag = False
        self.push(
            f"process spawned · pid {self.proc.pid} · {shlex.join([PYTHON, entry])}",
            "system",
        )
        threading.Thread(target=self._pump, args=(self.proc,), daemon=True).start()

    def _pump(self, proc: subprocess.Popen) -> None:
        assert proc.stdout is not None
        try:
            for line in proc.stdout:
                self.push(line, "stdout")
        except Exception:
            pass
        code = proc.wait()
        self.exit_code = code
        self.last_exit = time.time()
        with self.lock:
            if self._stop_flag:
                self.status = "stopped"
                self.push("process stopped by supervisor", "system")
            elif code == 0:
                self.status = "stopped"
                self.push("process exited cleanly (code 0)", "system")
            else:
                self.status = "crashed"
                self.error = f"exited with code {code}"
                self.push(f"process exited with code {code}", "stderr")

    def stop(self) -> None:
        self._stop_flag = True
        proc = self.proc
        if not proc or proc.poll() is not None:
            self.status = "stopped"
            return
        try:
            if os.name == "posix":
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            else:
                proc.terminate()
            proc.wait(timeout=8)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
        self.status = "stopped"

    def delete(self) -> None:
        self.stop()

    # -- metrics -----------------------------------------------------------
    def metrics(self) -> Dict[str, float]:
        cpu = mem = 0.0
        if self.proc and self.proc.poll() is None:
            try:
                p = psutil.Process(self.proc.pid)
                cpu = p.cpu_percent(interval=0.0)
                mem = p.memory_info().rss / (1024 * 1024)
            except Exception:
                pass
        return {"cpu": round(cpu, 2), "memMB": round(mem, 1)}

    def snapshot(self) -> Dict[str, Any]:
        m = self.metrics()
        return {
            "id": self.id,
            "name": self.spec.name,
            "status": self.status,
            "pid": self.proc.pid if self.proc else None,
            "exitCode": self.exit_code,
            "error": self.error,
            "restarts": self.restarts,
            "startedAt": int(self.started_at * 1000) if self.started_at else None,
            "uptime": int((time.time() - self.started_at) * 1000) if self.started_at else 0,
            "installed": self.installed,
            **m,
        }


BOTS: Dict[str, BotRuntime] = {}
BOTS_LOCK = threading.Lock()


def auth(secret: Optional[str]) -> None:
    if SECRET and secret != SECRET:
        raise HTTPException(status_code=401, detail="bad runner secret")


# ------------------------------------------------------------------ supervision
def supervisor() -> None:
    """Revive dead bots with exponential backoff (1s, 2s, 4s ... max 60s)."""
    while True:
        time.sleep(1.0)
        with BOTS_LOCK:
            runtimes = list(BOTS.values())
        for rt in runtimes:
            try:
                proc = rt.proc
                if rt._installing or rt._stop_flag:
                    continue
                if proc is None or proc.poll() is None:
                    continue
                if rt.status != "crashed":
                    continue
                if not rt.spec.autoRestart:
                    rt.push("auto-restart disabled — process left stopped", "system")
                    rt.status = "stopped"
                    continue
                delay = min(60, 2 ** min(rt.restarts, 6))
                if time.time() - rt.last_exit < delay:
                    continue
                rt.restarts += 1
                rt.push(
                    f"supervisor · restarting after {delay}s backoff (attempt #{rt.restarts})",
                    "system",
                )
                rt.spawn()
            except Exception as exc:  # pragma: no cover
                log(f"supervisor error for {rt.id}: {exc}")


threading.Thread(target=supervisor, daemon=True).start()


# ------------------------------------------------------------------------ routes
@app.get("/health")
def health(x_runner_secret: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    with BOTS_LOCK:
        running = sum(1 for b in BOTS.values() if b.status == "running")
    cpu = psutil.cpu_percent(interval=0.0)
    mem = psutil.virtual_memory()
    return {
        "ok": True,
        "version": VERSION,
        "python": sys.version.split()[0],
        "running": running,
        "capacity": CAPACITY or None,
        "cpu": cpu,
        "memMB": round(mem.used / (1024 * 1024), 1),
        "bots": len(BOTS),
        "uptime": int(time.time() - STARTED),
        "authRequired": bool(SECRET),
    }


@app.get("/bots")
def list_bots(x_runner_secret: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    auth(x_runner_secret)
    with BOTS_LOCK:
        return {"bots": [b.snapshot() for b in BOTS.values()]}


@app.post("/bots")
async def upsert_bot(request: Request, x_runner_secret: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    auth(x_runner_secret)
    payload = await request.json()
    spec = BotSpec(**payload)

    with BOTS_LOCK:
        existing = BOTS.get(spec.id)
        if existing:
            existing.stop()
            BOTS.pop(spec.id, None)
        if CAPACITY and len(BOTS) >= CAPACITY:
            raise HTTPException(status_code=429, detail="runner at capacity")

        rt = BotRuntime(spec)
        BOTS[spec.id] = rt

    if spec.restart:
        rt.restarts += 1

    def boot() -> None:
        try:
            rt.push(f"botforge runner v{VERSION} · python {sys.version.split()[0]}", "system")
            rt.push(f"workspace {rt.workdir}", "system")
            rt.write_files()
            rt.push(f"{len(spec.files)} file(s) written · entry {spec.entry}", "system")
            rt.install()
            if rt.status == "crashed":
                return
            rt.spawn(first=True)
        except Exception as exc:
            rt.status = "crashed"
            rt.error = str(exc)
            rt.push("boot failed:", "stderr")
            rt.push_many(traceback.format_exc(), "stderr")

    threading.Thread(target=boot, daemon=True).start()
    return {"ok": True, "accepted": True, "status": "installing", "bot": spec.id}


@app.post("/bots/{bot_id}/start")
def start_bot(bot_id: str, x_runner_secret: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    auth(x_runner_secret)
    rt = BOTS.get(bot_id)
    if not rt:
        raise HTTPException(404, "unknown bot")
    if rt.status != "running":
        rt.spawn()
    return {"ok": True, "status": rt.status}


@app.post("/bots/{bot_id}/stop")
def stop_bot(bot_id: str, x_runner_secret: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    auth(x_runner_secret)
    rt = BOTS.get(bot_id)
    if not rt:
        raise HTTPException(404, "unknown bot")
    rt.stop()
    return {"ok": True, "status": rt.status}


@app.post("/bots/{bot_id}/restart")
def restart_bot(bot_id: str, x_runner_secret: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    auth(x_runner_secret)
    rt = BOTS.get(bot_id)
    if not rt:
        raise HTTPException(404, "unknown bot")
    rt.stop()
    rt.restarts += 1
    rt.spawn()
    return {"ok": True, "status": rt.status}


@app.delete("/bots/{bot_id}")
def delete_bot(bot_id: str, x_runner_secret: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    auth(x_runner_secret)
    with BOTS_LOCK:
        rt = BOTS.pop(bot_id, None)
    if rt:
        rt.delete()
    return {"ok": True}


@app.get("/bots/{bot_id}/status")
def bot_status(bot_id: str, x_runner_secret: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    auth(x_runner_secret)
    rt = BOTS.get(bot_id)
    if not rt:
        raise HTTPException(404, "unknown bot")
    return rt.snapshot()


@app.get("/bots/{bot_id}/logs")
def bot_logs(
    bot_id: str,
    after: int = 0,
    limit: int = 500,
    x_runner_secret: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    auth(x_runner_secret)
    rt = BOTS.get(bot_id)
    if not rt:
        raise HTTPException(404, "unknown bot")
    with rt.lock:
        lines = [l for l in rt.lines if l["seq"] > after][-limit:]
        next_seq = rt.seq - 1
    return {
        "lines": lines,
        "nextSeq": next_seq,
        "status": rt.status,
        "exitCode": rt.exit_code,
        "error": rt.error,
        "restarts": rt.restarts,
        **rt.metrics(),
    }


@app.delete("/bots/{bot_id}/logs")
def clear_logs(bot_id: str, x_runner_secret: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    auth(x_runner_secret)
    rt = BOTS.get(bot_id)
    if not rt:
        raise HTTPException(404, "unknown bot")
    with rt.lock:
        rt.lines.clear()
    return {"ok": True}


STARTED = time.time()

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8081"))
    log(f"data dir {DATA_DIR} · secret {'set' if SECRET else 'DISABLED'} · port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
