"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconBolt,
  IconCheck,
  IconCloud,
  IconCopy,
  IconPlay,
  IconRefresh,
  IconRobot,
  IconShield,
  IconTerminal,
  IconWarn,
} from "@/components/icons";
import { CopyBtn, cx } from "@/components/ui";

interface Status {
  storage: string;
  databaseConfigured: boolean;
  runnerUrl: string | null;
  hasSecret: boolean;
  runner: {
    connected: boolean;
    mode: string;
    latencyMs?: number;
    python?: string;
    error?: string;
    running?: number;
  };
  bots: { total: number; running: number; newest: { id: string; name: string } | null };
  ready: boolean;
}

type Provider = "vps" | "docker" | "fly" | "render" | "railway";

const PROVIDERS: { id: Provider; label: string; hint: string }[] = [
  { id: "vps", label: "VPS one-liner", hint: "Hetzner / DO / Contabo · $3–5/mo" },
  { id: "docker", label: "Docker", hint: "any machine you already have" },
  { id: "fly", label: "Fly.io", hint: "managed, ~$2/mo" },
  { id: "render", label: "Render", hint: "blueprint, starter plan" },
  { id: "railway", label: "Railway / Koyeb", hint: "Dockerfile from repo" },
];

function commands(provider: Provider, secret: string): string {
  const s = secret || "PASTE_YOUR_SECRET";
  switch (provider) {
    case "vps":
      return `curl -fsSL https://raw.githubusercontent.com/arslanansari1629-blip/advanceee/main/deploy/vps-install.sh \\
  | sudo RUNNER_SECRET=${s} bash`;
    case "docker":
      return `git clone https://github.com/arslanansari1629-blip/advanceee
cd advanceee
docker build -t botforge/runner ./runner
docker run -d --restart unless-stopped -p 8081:8081 \\
  -e RUNNER_SECRET=${s} \\
  -v botforge-data:/data \\
  botforge/runner`;
    case "fly":
      return `cd runner
fly launch --copy-config --name botforge-runner
fly volumes create botforge_data --size 1
fly secrets set RUNNER_SECRET=${s}
fly deploy`;
    case "render":
      return `# Render → New → Blueprint → select the repo
#   (it reads render.yaml automatically)
# then set the env var when prompted:
RUNNER_SECRET=${s}`;
    case "railway":
      return `# New service from the repo with:
Dockerfile path : runner/Dockerfile
Port            : 8081
Volume          : /data
RUNNER_SECRET=${s}`;
  }
}

export default function SetupWizard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("vps");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [s, k] = await Promise.all([
      fetch("/api/setup/status", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/setup/secret", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setStatus(s);
    setSecret(k.secret ?? null);
    if (s.runnerUrl) setUrl(s.runnerUrl);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  const rotate = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/setup/secret", { method: "POST" });
      const json = await res.json();
      setSecret(json.secret);
      setMsg({ ok: true, text: "New secret generated — update the runner env and restart it." });
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/runner", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, secret: secret ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setStatus((prev) => (prev ? { ...prev, runner: data.runner, ready: data.runner.connected } : prev));
      setMsg(
        data.runner.connected
          ? {
              ok: true,
              text: `Connected · python ${data.runner.python} · ${data.runner.latencyMs} ms round trip`,
            }
          : { ok: false, text: `Not reachable yet: ${data.runner.error}. Check the URL, the port and the firewall.` }
      );
      await load();
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message ?? "failed" });
    } finally {
      setBusy(false);
    }
  };

  const cmd = useMemo(() => commands(provider, secret ?? ""), [provider, secret]);
  const connected = Boolean(status?.runner.connected);

  const steps = [
    { label: "Runner online", done: connected },
    { label: "Secret saved", done: Boolean(secret) },
    { label: "Bot deployed", done: (status?.bots.total ?? 0) > 0 },
    { label: "Bot running", done: (status?.bots.running ?? 0) > 0 },
  ];
  const progress = steps.filter((s) => s.done).length;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Host your bot 24/7</h1>
          <p className="text-[12.5px] text-slate-500">
            Three things stand between you and a permanently online bot. This page walks you through them.
          </p>
        </div>
        <span className="pill">
          {progress}/{steps.length} done
        </span>
      </div>

      {/* progress rail */}
      <div className="glass flex flex-wrap items-center gap-2 p-3">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <span
              className={cx(
                "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold",
                s.done ? "bg-emerald-400/20 text-emerald-300" : "bg-white/[0.06] text-slate-500"
              )}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <span className={cx("text-[11.5px]", s.done ? "text-slate-200" : "text-slate-500")}>{s.label}</span>
            {i < steps.length - 1 && <span className="text-slate-700">·</span>}
          </div>
        ))}
        <button className="btn btn-ghost ml-auto !py-1 !text-[11px]" onClick={load}>
          <IconRefresh size={11} /> Re-check
        </button>
      </div>

      {/* step 1 — database */}
      <section className="glass p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-white/12 bg-white/[0.05] text-[11px] font-bold text-slate-300">
            1
          </span>
          <h2 className="text-[14px] font-semibold text-white">Make storage permanent (2 minutes)</h2>
          <span
            className={cx(
              "pill ml-auto !text-[10px]",
              status?.databaseConfigured
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/30 bg-amber-400/10 text-amber-200"
            )}
          >
            <span className={cx("dot", status?.databaseConfigured ? "dot-live" : "dot-warn")} />
            {status?.databaseConfigured ? "postgres attached" : `using ${status?.storage ?? "file"} store`}
          </span>
        </div>

        {status?.databaseConfigured ? (
          <p className="mt-2 text-[12px] text-slate-400">
            Accounts, bots and logs are stored in Postgres — they survive redeploys and cold starts.
          </p>
        ) : (
          <>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
              Without a database, Vercel keeps state in a per-instance temp folder: a cold start can make your
              bot list look empty. A free Neon/Supabase Postgres fixes it permanently.
            </p>
            <ol className="mt-2 space-y-1 text-[12px] text-slate-400">
              <li>
                <strong className="text-slate-200">a.</strong> Create a free database at{" "}
                <a className="text-cyan-300 underline" href="https://neon.tech" target="_blank" rel="noreferrer">
                  neon.tech
                </a>{" "}
                (or Supabase) and copy the connection string.
              </li>
              <li>
                <strong className="text-slate-200">b.</strong> Vercel → project <code className="mono">botforge-cloud</code> →
                Settings → Environment Variables → add <code className="mono">DATABASE_URL</code>.
              </li>
              <li>
                <strong className="text-slate-200">c.</strong> Redeploy (Deployments → ⋯ → Redeploy). Tables
                create themselves.
              </li>
            </ol>
            <p className="mt-2 text-[11px] text-slate-500">
              Your bots keep working meanwhile — only the history/dashboard state is affected.
            </p>
          </>
        )}
      </section>

      {/* step 2 — runner */}
      <section className="glass p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-white/12 bg-white/[0.05] text-[11px] font-bold text-slate-300">
            2
          </span>
          <h2 className="text-[14px] font-semibold text-white">Start a runner (this is what runs Python)</h2>
          <span
            className={cx(
              "pill ml-auto !text-[10px]",
              connected
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/30 bg-amber-400/10 text-amber-200"
            )}
          >
            <span className={cx("dot", connected ? "dot-live" : "dot-warn")} />
            {connected ? `online · ${status?.runner.latencyMs} ms` : "not attached"}
          </span>
        </div>

        <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
          Vercel functions are short-lived, so a Telegram bot cannot stay connected inside one. The runner is a
          tiny always-on service that holds the process. <strong className="text-slate-200">One runner hosts
          unlimited bots.</strong> Pick any host below — the command already contains your secret.
        </p>

        <div className="mt-3 rounded-lg border border-violet-400/25 bg-violet-400/[0.06] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-violet-200">your runner secret</p>
            <div className="ml-auto flex items-center gap-1.5">
              {secret && <CopyBtn text={secret} />}
              <button className="btn btn-ghost !px-2 !py-1 !text-[10.5px]" onClick={rotate} disabled={busy}>
                regenerate
              </button>
            </div>
          </div>
          <p className="mono mt-1 break-all text-[11.5px] text-violet-100">
            {secret ?? "— generate one to continue —"}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={cx(
                "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                provider === p.id
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
              )}
              title={p.hint}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="relative mt-2">
          <pre className="mono max-h-[240px] overflow-auto rounded-lg border border-white/10 bg-black/55 p-3 text-[11.5px] leading-relaxed text-cyan-100">
{cmd}
          </pre>
          <div className="absolute right-2 top-2">
            <CopyBtn text={cmd} />
          </div>
        </div>

        <p className="mt-2 text-[11px] text-slate-500">
          {provider === "vps" &&
            "Installs Docker if needed, builds the image and starts it with --restart unless-stopped. Open the port: sudo ufw allow 8081/tcp"}
          {provider === "docker" && "Works on macOS, Linux or Windows/WSL. The volume keeps session files across restarts."}
          {provider === "fly" && "auto_stop_machines is disabled on purpose so your bots never sleep."}
          {provider === "render" &&
            "⚠️ Render's free instance sleeps when idle and will stop your bots — choose the starter plan."}
          {provider === "railway" && "Any provider that accepts a Dockerfile path works, plus a volume at /data."}
        </p>
      </section>

      {/* step 3 — connect */}
      <section className="glass p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-white/12 bg-white/[0.05] text-[11px] font-bold text-slate-300">
            3
          </span>
          <h2 className="text-[14px] font-semibold text-white">Connect it to this dashboard</h2>
          <span className="pill ml-auto !text-[10px] border-white/10">
            <IconShield size={10} /> secret-authenticated
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="input mono !text-[12px]"
            placeholder="http://203.0.113.10:8081  ·  or https://botforge-runner.fly.dev"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="btn btn-primary !px-4" onClick={verify} disabled={busy || !url}>
            {busy ? "Testing…" : "Save & verify"}
          </button>
        </div>

        {msg && (
          <p
            className={cx(
              "mt-2 rounded-lg border px-3 py-2 text-[11.5px]",
              msg.ok
                ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200"
                : "border-rose-400/25 bg-rose-400/[0.07] text-rose-200"
            )}
          >
            {msg.ok ? <IconCheck size={11} className="mr-1 inline" /> : <IconWarn size={11} className="mr-1 inline" />}
            {msg.text}
          </p>
        )}

        {connected && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px] sm:grid-cols-4">
            {[
              ["mode", status?.runner.mode],
              ["python", status?.runner.python ?? "—"],
              ["running", status?.runner.running ?? 0],
              ["latency", status?.runner.latencyMs ? `${status.runner.latencyMs} ms` : "—"],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
                <p className="text-[9.5px] uppercase tracking-wider text-slate-500">{k}</p>
                <p className="mono text-slate-200">{String(v ?? "—")}</p>
              </div>
            ))}
          </div>
        )}

        <details className="mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
          <summary className="cursor-pointer text-[11.5px] font-semibold text-slate-300">
            Troubleshooting — “not reachable”
          </summary>
          <ul className="mt-2 space-y-1 text-[11.5px] leading-relaxed text-slate-400">
            <li>• <code className="mono">curl http://YOUR_IP:8081/health</code> should return JSON. If not, the container is not running: <code className="mono">docker logs botforge-runner</code>.</li>
            <li>• Cloud firewall? Open the port at the provider too (Security Group / Firewall → inbound TCP 8081).</li>
            <li>• Secret mismatch returns 401 — copy it again from the box above and restart the runner.</li>
            <li>• Behind HTTPS? Use the <code className="mono">https://</code> URL, e.g. via Caddy or Cloudflare Tunnel.</li>
          </ul>
        </details>
      </section>

      {/* step 4 — deploy */}
      <section className="glass p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-white/12 bg-white/[0.05] text-[11px] font-bold text-slate-300">
            4
          </span>
          <h2 className="text-[14px] font-semibold text-white">Deploy your bot</h2>
          {status?.bots.total ? (
            <span className="pill ml-auto !text-[10px] border-emerald-400/25 text-emerald-300">
              {status.bots.total} deployed · {status.bots.running} live
            </span>
          ) : null}
        </div>
        <ul className="mt-2 space-y-1.5 text-[12px] text-slate-400">
          <li className="flex gap-1.5">
            <IconCheck size={12} className="mt-0.5 shrink-0 text-emerald-400" />
            Open <Link href="/console/new" className="text-cyan-300 underline">Deploy a bot</Link>, paste your whole
            Python file — requirements are detected from the imports.
          </li>
          <li className="flex gap-1.5">
            <IconCheck size={12} className="mt-0.5 shrink-0 text-emerald-400" />
            Put your token in <strong className="text-slate-200">Environment variables</strong> as{" "}
            <code className="mono">BOT_TOKEN</code> (a hard-coded token is detected and masked, but env vars are safer).
          </li>
          <li className="flex gap-1.5">
            <IconCheck size={12} className="mt-0.5 shrink-0 text-emerald-400" />
            Click <strong className="text-slate-200">Deploy &amp; run 24/7</strong> — pip installs, the process starts
            and logs stream live.
          </li>
        </ul>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/console/new" className="btn btn-primary">
            <IconBolt size={13} /> Deploy a bot
          </Link>
          {status?.bots.newest && (
            <Link href={`/console/bots/${status.bots.newest.id}`} className="btn">
              <IconTerminal size={13} /> Open “{status.bots.newest.name}” logs
            </Link>
          )}
          <Link href="/console" className="btn btn-ghost">
            <IconRobot size={13} /> Back to fleet
          </Link>
        </div>
      </section>

      <div className="glass border-cyan-400/20 p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-200">
          <IconCloud size={12} /> what happens on deploy
        </p>
        <div className="mt-2 grid gap-2 text-[11.5px] leading-relaxed text-slate-400 sm:grid-cols-2">
          <p>
            <strong className="text-slate-200">1.</strong> Your files are written to an isolated workspace on the
            runner.{" "}
            <strong className="text-slate-200">2.</strong> <code className="mono">pip install -r
            requirements.txt</code> runs (output appears in the log window).{" "}
            <strong className="text-slate-200">3.</strong> <code className="mono">python -u main.py</code> starts in
            its own process group.
          </p>
          <p>
            <strong className="text-slate-200">4.</strong> stdout/stderr stream to this dashboard.{" "}
            <strong className="text-slate-200">5.</strong> If the process dies, the supervisor restarts it with
            backoff (1s → 60s). <strong className="text-slate-200">6.</strong> Docker keeps the runner itself alive
            across reboots.
          </p>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
          <IconPlay size={10} /> Useful env vars your bot receives: <code className="mono">BOTFORGE_BOT_ID</code>,{" "}
          <code className="mono">HOME=workspace</code>, plus everything you set per bot.
        </p>
      </div>
    </div>
  );
}
