"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconCloud, IconCopy, IconLock, IconShield, IconWarn } from "@/components/icons";
import { CopyBtn, cx } from "@/components/ui";

const DOCKER = `docker run -d --restart unless-stopped \\
  -p 8081:8081 \\
  -e RUNNER_SECRET=change-me \\
  -v botforge-data:/data \\
  botforge/runner:latest`;

export default function Settings() {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [me, setMe] = useState<any>(null);
  const [runner, setRunner] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadRunner = async () => {
    const res = await fetch("/api/runner", { cache: "no-store" });
    const data = await res.json();
    setRunner(data.runner);
    if (data.runnerUrl) setUrl(data.runnerUrl);
  };

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe);
    loadRunner();
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/runner", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setRunner(data.runner);
      setMsg({
        ok: data.runner.connected,
        text: data.runner.connected
          ? `Connected · ${data.runner.python} · ${data.runner.latencyMs} ms`
          : `Saved, but not reachable: ${data.runner.error}`,
      });
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message ?? "failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Runner &amp; settings</h1>
        <p className="text-[12.5px] text-slate-500">
          The dashboard runs anywhere. The runner is the machine that keeps your Python processes alive 24/7.
        </p>
      </div>

      <div className="glass p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <IconCloud size={13} /> runner connection
          </p>
          <span
            className={cx(
              "pill ml-auto",
              runner?.connected
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/30 bg-amber-400/10 text-amber-200"
            )}
          >
            <span className={cx("dot", runner?.connected ? "dot-live" : "dot-warn")} />
            {runner?.connected ? "connected" : runner?.url ? "unreachable" : "not attached"}
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Runner URL</label>
            <input
              className="input mono !text-[12px]"
              placeholder="http://203.0.113.10:8081"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Runner secret</label>
            <input
              className="input mono !text-[12px]"
              placeholder="same value as RUNNER_SECRET"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              type="password"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="btn btn-primary !py-1.5 !text-[12px]" onClick={save} disabled={busy}>
            {busy ? "Testing…" : "Save & test connection"}
          </button>
          <button className="btn !py-1.5 !text-[12px]" onClick={loadRunner}>
            Re-check
          </button>
          {msg && (
            <span className={cx("text-[11.5px]", msg.ok ? "text-emerald-300" : "text-rose-300")}>{msg.text}</span>
          )}
        </div>

        {runner && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px] sm:grid-cols-4">
            {[
              ["mode", runner.mode],
              ["python", runner.python ?? "—"],
              ["running", runner.running ?? 0],
              ["latency", runner.latencyMs ? `${runner.latencyMs} ms` : "—"],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
                <p className="text-[9.5px] uppercase tracking-wider text-slate-500">{k}</p>
                <p className="mono text-slate-200">{String(v)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* how to run */}
      <div className="glass p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <IconCloud size={13} /> start a runner in 30 seconds
        </p>
        <div className="relative mt-2">
          <pre className="mono overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-3 text-[11.5px] text-cyan-100">
{DOCKER}
          </pre>
          <div className="absolute right-2 top-2">
            <CopyBtn text={DOCKER} />
          </div>
        </div>
        <ol className="mt-3 space-y-1.5 text-[12px] text-slate-400">
          <li>
            <strong className="text-slate-200">1.</strong> Build once:{" "}
            <code className="mono rounded bg-black/40 px-1">docker build -t botforge/runner ./runner</code>
          </li>
          <li>
            <strong className="text-slate-200">2.</strong> Run it on any VPS, Raspberry Pi, Railway or Fly.io
            machine and expose port 8081.
          </li>
          <li>
            <strong className="text-slate-200">3.</strong> Paste the public URL + secret above and save.
          </li>
          <li>
            <strong className="text-slate-200">4.</strong> Deploy bots — they now execute real Python instead of
            the preview gateway.
          </li>
        </ol>
        <p className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.05] p-2.5 text-[11px] leading-relaxed text-cyan-100/80">
          The runner is a 400-line FastAPI service: it writes your files into an isolated workspace, runs{" "}
          <code className="mono">pip install -r</code>, spawns the entry script with a supervisor and streams stdout
          / stderr over HTTP. It never sees your dashboard password — only a per-user runner secret.
        </p>
      </div>

      {/* account */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <IconLock size={13} /> account
          </p>
          <div className="mt-2 space-y-1.5 text-[12px]">
            <p className="flex justify-between"><span className="text-slate-500">name</span><span className="text-slate-200">{me?.user?.name ?? "…"}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">email</span><span className="text-slate-200">{me?.user?.email ?? "…"}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">plan</span><span className="text-emerald-300">unlimited · free forever</span></p>
            <p className="flex justify-between"><span className="text-slate-500">bots</span><span className="text-slate-200">unlimited</span></p>
          </div>
        </div>
        <div className="glass p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <IconShield size={13} /> security
          </p>
          <ul className="mt-2 space-y-1.5 text-[11.5px] text-slate-400">
            <li className="flex items-start gap-1.5"><IconCheck size={11} className="mt-0.5 text-emerald-400" /> passwords hashed with scrypt + per-user salt</li>
            <li className="flex items-start gap-1.5"><IconCheck size={11} className="mt-0.5 text-emerald-400" /> httpOnly, sameSite session cookies</li>
            <li className="flex items-start gap-1.5"><IconCheck size={11} className="mt-0.5 text-emerald-400" /> bot tokens masked in every UI surface</li>
            <li className="flex items-start gap-1.5"><IconCheck size={11} className="mt-0.5 text-emerald-400" /> per-bot filesystem isolation on the runner</li>
          </ul>
        </div>
      </div>

      <div className="glass border-amber-400/20 p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
          <IconWarn size={12} /> limits worth knowing
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
          Telegram bots require a long-lived process. Vercel functions cannot host one, so the hosted dashboard
          handles accounts, code, analysis and logs, while the runner handles execution. Bots deployed before a
          runner is attached run in <strong className="text-amber-200">preview mode</strong> — genuine lifecycle,
          simulated gateway, clearly labelled in the UI.
        </p>
      </div>
    </div>
  );
}
