"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconActivity,
  IconBolt,
  IconChevron,
  IconCloud,
  IconGrid,
  IconPlay,
  IconPlus,
  IconRestart,
  IconRobot,
  IconStop,
  IconTerminal,
  IconTrash,
  IconWarn,
} from "@/components/icons";
import {
  Banner,
  Metric,
  Sparkline,
  StatusPill,
  cx,
  fmtDuration,
  timeAgo,
  useNow,
} from "@/components/ui";

interface OverviewBot {
  id: string;
  name: string;
  status: string;
  mode: string;
  framework: string;
  entry: string;
  requirements: string;
  startedAt: number | null;
  stoppedAt: number | null;
  createdAt: number;
  restartCount: number;
  autoRestart: boolean;
  tokenMasked: string | null;
  lastError: string | null;
  stats: { cpu: number; memMB: number; uptimePct: number };
}

interface Overview {
  runner: { connected: boolean; mode: string; latencyMs?: number; python?: string; error?: string };
  storage: string;
  stats: {
    total: number;
    running: number;
    stopped: number;
    crashed: number;
    installing: number;
    restarts: number;
    packages: number;
    uptime: number;
    cpu: number;
    memMB: number;
  };
  bots: OverviewBot[];
  events: { id: string; type: string; message: string; ts: number; botId: string; botName: string }[];
}

const reqCount = (r: string) => r.split("\n").filter(Boolean).length;

function BotCard({ bot, onAction, busy }: { bot: OverviewBot; onAction: (a: string) => void; busy: boolean }) {
  const now = useNow();
  const running = bot.status === "running";
  const uptime = running && bot.startedAt ? fmtDuration(now - bot.startedAt) : "—";

  return (
    <div className="glass group relative overflow-hidden p-4 transition-colors hover:border-white/20">
      <div
        className={cx(
          "absolute inset-x-0 top-0 h-px",
          running ? "bg-gradient-to-r from-emerald-400/70 to-transparent" : bot.status === "crashed" ? "bg-gradient-to-r from-rose-500/70 to-transparent" : "bg-white/10"
        )}
      />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/console/bots/${bot.id}`} className="truncate text-[14px] font-semibold text-white hover:text-cyan-300">
              {bot.name}
            </Link>
            <StatusPill status={bot.status as any} mode={bot.mode} />
          </div>
          <p className="mono mt-0.5 truncate text-[10.5px] text-slate-500">
            {bot.framework} · {bot.entry}
          </p>
        </div>
        <Link href={`/console/bots/${bot.id}`} className="btn btn-ghost !px-1.5 !py-1">
          <IconChevron size={14} />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">uptime</p>
          <p className="mono mt-0.5 text-[12px] font-semibold text-emerald-300">{uptime}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">cpu / rss</p>
          <p className="mono mt-0.5 text-[12px] font-semibold text-slate-200">
            {running ? `${bot.stats.cpu.toFixed(1)}% · ${Math.round(bot.stats.memMB)}mb` : "idle"}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">restarts</p>
          <p className="mono mt-0.5 text-[12px] font-semibold text-slate-200">{bot.restartCount}</p>
        </div>
      </div>

      {bot.lastError && bot.status === "crashed" && (
        <p className="mono mt-2 line-clamp-2 rounded-md border border-rose-400/20 bg-rose-400/[0.07] px-2 py-1 text-[10px] text-rose-300">
          {bot.lastError}
        </p>
      )}

      <div className="mt-3 flex items-center gap-1.5">
        {running ? (
          <button className="btn !px-2 !py-1 !text-[11px]" onClick={() => onAction("stop")} disabled={busy}>
            <IconStop size={11} /> Stop
          </button>
        ) : (
          <button className="btn !px-2 !py-1 !text-[11px]" onClick={() => onAction("start")} disabled={busy}>
            <IconPlay size={11} /> Start
          </button>
        )}
        <button className="btn !px-2 !py-1 !text-[11px]" onClick={() => onAction("restart")} disabled={busy}>
          <IconRestart size={11} /> Restart
        </button>
        <Link href={`/console/bots/${bot.id}`} className="btn !px-2 !py-1 !text-[11px]">
          <IconTerminal size={11} /> Logs
        </Link>
        <span className="ml-auto pill !py-0 !text-[9.5px]">{reqCount(bot.requirements)} pkgs</span>
      </div>
    </div>
  );
}

export default function ConsoleOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "running" | "stopped" | "crashed">("all");
  const [history, setHistory] = useState<{ cpu: number[]; mem: number[]; bots: number[] }>({
    cpu: [],
    mem: [],
    bots: [],
  });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      if (!res.ok) return;
      const json: Overview = await res.json();
      setData(json);
      setHistory((h) => ({
        cpu: [...h.cpu, json.stats.cpu].slice(-40),
        mem: [...h.mem, json.stats.memMB].slice(-40),
        bots: [...h.bots, json.stats.running].slice(-40),
      }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const action = async (botId: string, act: string) => {
    setBusy(botId);
    try {
      if (act === "delete") {
        if (!confirm("Delete this bot and its logs permanently?")) return;
        await fetch(`/api/bots/${botId}`, { method: "DELETE" });
      } else {
        await fetch(`/api/bots/${botId}/action`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: act }),
        });
      }
      await load();
    } finally {
      setBusy(null);
    }
  };

  const bots = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.bots;
    return data.bots.filter((b) => b.status === filter);
  }, [data, filter]);

  if (!data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="shimmer h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const s = data.stats;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Fleet overview</h1>
          <p className="text-[12.5px] text-slate-500">
            {s.total} bot{s.total === 1 ? "" : "s"} · {s.running} live · unlimited slots remaining · storage:{" "}
            <span className="mono text-slate-400">{data.storage}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={load}>
            <IconRestart size={13} /> Refresh
          </button>
          <Link href="/console/new" className="btn btn-primary">
            <IconPlus size={13} /> Deploy bot
          </Link>
        </div>
      </div>

      {!data.runner.connected && (
        <Banner
          tone="warn"
          title="Preview mode — no runner attached"
          action={
            <Link href="/console/settings" className="btn !py-1 !text-[11.5px]">
              Attach runner
            </Link>
          }
        >
          Bots are deploying through the simulated gateway so you can explore every feature. Attach your runner to
          execute real Python processes 24/7.
        </Banner>
      )}

      {/* metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Metric label="Bots deployed" value={s.total} sub="unlimited plan" accent="cyan" />
        <Metric label="Live now" value={s.running} sub={`${s.uptime}% fleet uptime`} accent="lime" />
        <Metric label="Restarts" value={s.restarts} sub="auto + manual" accent="violet" />
        <Metric label="Packages" value={s.packages} sub="auto-installed" accent="cyan" />
        <Metric label="Fleet CPU" value={`${s.cpu.toFixed(1)}%`} sub={`${Math.round(s.memMB)} MB rss`} accent="violet" />
        <Metric
          label="Crashes"
          value={s.crashed}
          sub={s.crashed ? "needs attention" : "all healthy"}
          accent={s.crashed ? "rose" : "lime"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* chart */}
          <div className="glass overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <IconActivity size={13} /> fleet telemetry
              </span>
              <div className="ml-auto flex items-center gap-3 text-[10.5px] text-slate-500">
                <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-cyan-400" /> cpu</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-violet-400" /> rss</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-lime-400" /> live bots</span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
              {[
                { label: "cpu %", data: history.cpu, color: "#22d3ee" },
                { label: "rss mb", data: history.mem, color: "#a78bfa" },
                { label: "live bots", data: history.bots, color: "#a3e635" },
              ].map((c) => (
                <div key={c.label} className="h-[86px] px-3 py-2">
                  <p className="text-[9.5px] uppercase tracking-wider text-slate-500">{c.label}</p>
                  <div className="mt-1 h-[52px]">
                    <Sparkline data={c.data.length > 1 ? c.data : [0, c.data[0] ?? 0]} color={c.color} height={52} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* bots */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <IconGrid size={13} /> your bots
            </span>
            <div className="ml-auto flex gap-1">
              {(["all", "running", "stopped", "crashed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cx(
                    "rounded-md px-2 py-1 text-[10.5px] font-semibold capitalize transition-colors",
                    filter === f ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {bots.length === 0 ? (
            <div className="glass flex flex-col items-center gap-3 py-14 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-cyan-300">
                <IconRobot size={22} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white">No bots here yet</p>
                <p className="text-[12px] text-slate-500">Paste your Python and BotForge handles the rest.</p>
              </div>
              <Link href="/console/new" className="btn btn-primary">
                <IconBolt size={13} /> Deploy your first bot
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {bots.map((b) => (
                <BotCard key={b.id} bot={b} busy={busy === b.id} onAction={(a) => action(b.id, a)} />
              ))}
            </div>
          )}
        </div>

        {/* right rail */}
        <div className="space-y-4">
          <div className="glass p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <IconCloud size={13} /> runtime
            </p>
            <div className="mt-2.5 space-y-2 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">mode</span>
                <span className={data.runner.connected ? "text-emerald-300" : "text-amber-300"}>
                  {data.runner.connected ? "real runner" : "preview"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">python</span>
                <span className="mono text-slate-300">{data.runner.python ?? "3.11.9"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">latency</span>
                <span className="mono text-slate-300">{data.runner.latencyMs ? `${data.runner.latencyMs} ms` : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">storage</span>
                <span className="mono text-slate-300">{data.storage}</span>
              </div>
            </div>
            <Link href="/console/settings" className="btn mt-3 w-full !py-1.5 !text-[11.5px]">
              Manage runner
            </Link>
          </div>

          <div className="glass p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <IconActivity size={13} /> activity
            </p>
            <div className="mt-2.5 space-y-2.5">
              {data.events.length === 0 && <p className="text-[11.5px] text-slate-600">Nothing yet.</p>}
              {data.events.slice(0, 9).map((e) => (
                <div key={e.id} className="flex gap-2">
                  <span
                    className={cx(
                      "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                      e.type === "crash" ? "bg-rose-400" : e.type === "stop" ? "bg-slate-500" : e.type === "restart" ? "bg-violet-400" : "bg-emerald-400"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] text-slate-300">
                      <Link href={`/console/bots/${e.botId}`} className="font-semibold text-white hover:text-cyan-300">
                        {e.botName}
                      </Link>{" "}
                      · {e.message}
                    </p>
                    <p className="text-[10px] text-slate-600">{timeAgo(e.ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {s.crashed > 0 && (
            <div className="glass border-rose-400/25 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                <IconWarn size={12} /> attention
              </p>
              <p className="mt-1.5 text-[11.5px] text-slate-400">
                {s.crashed} bot{s.crashed > 1 ? "s" : ""} crashed. Enable auto-restart or fix the traceback in the
                log view — the fix is usually a version pin.
              </p>
              <button className="btn mt-2 w-full !py-1.5 !text-[11.5px]" onClick={() => setFilter("crashed")}>
                Show crashed bots
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
