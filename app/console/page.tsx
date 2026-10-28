"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconActivity,
  IconBolt,
  IconChevron,
  IconCloud,
  IconGrid,
  IconPause,
  IconPlay,
  IconPlus,
  IconRestart,
  IconRobot,
  IconTerminal,
  IconWarn,
} from "@/components/icons";
import { Banner, Metric, Sparkline, StatusPill, cx, timeAgo } from "@/components/ui";
import type { Bot } from "@/lib/types";

interface Overview {
  engine: { mode: string; siteUrl: string; database: string; online: boolean };
  storage: string;
  stats: {
    total: number;
    live: number;
    drafts: number;
    paused: number;
    errors: number;
    updates: number;
    replies: number;
    failed: number;
    pending: number;
    uptime: number;
  };
  bots: (Bot & { hasToken: boolean })[];
  events: { id: string; type: string; message: string; ts: number; botId: string; botName: string }[];
}

function BotCard({ bot, onAction, busy }: { bot: Bot & { hasToken: boolean }; onAction: (a: string) => void; busy: boolean }) {
  const live = bot.status === "live";
  return (
    <div className="glass group relative overflow-hidden p-4 transition-colors hover:border-white/20">
      <div
        className={cx(
          "absolute inset-x-0 top-0 h-px",
          live
            ? "bg-gradient-to-r from-emerald-400/70 to-transparent"
            : bot.status === "error"
            ? "bg-gradient-to-r from-rose-500/70 to-transparent"
            : "bg-white/10"
        )}
      />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/console/bots/${bot.id}`} className="truncate text-[14px] font-semibold text-white hover:text-cyan-300">
              {bot.name}
            </Link>
            <StatusPill status={bot.status} />
          </div>
          <p className="mono mt-0.5 truncate text-[10.5px] text-slate-500">
            {bot.telegram.username ? `@${bot.telegram.username}` : bot.framework}
          </p>
        </div>
        <Link href={`/console/bots/${bot.id}`} className="btn btn-ghost !px-1.5 !py-1">
          <IconChevron size={14} />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">updates</p>
          <p className="mono mt-0.5 text-[12px] font-semibold text-cyan-200">{bot.telegram.updates}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">replies</p>
          <p className="mono mt-0.5 text-[12px] font-semibold text-emerald-300">{bot.telegram.replies}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">cmds</p>
          <p className="mono mt-0.5 text-[12px] font-semibold text-slate-200">
            {bot.behaviour.commands.filter((c) => c.source === "code").length}
          </p>
        </div>
      </div>

      {bot.lastError && (bot.status === "error" || bot.status === "draft") && (
        <p className="mono mt-2 line-clamp-2 rounded-md border border-rose-400/20 bg-rose-400/[0.07] px-2 py-1 text-[10px] text-rose-300">
          {bot.lastError}
        </p>
      )}

      <div className="mt-3 flex items-center gap-1.5">
        {live ? (
          <button className="btn !px-2 !py-1 !text-[11px]" onClick={() => onAction("stop")} disabled={busy}>
            <IconPause size={11} /> Pause
          </button>
        ) : (
          <button className="btn !px-2 !py-1 !text-[11px]" onClick={() => onAction("start")} disabled={busy}>
            <IconPlay size={11} /> Go live
          </button>
        )}
        <button className="btn !px-2 !py-1 !text-[11px]" onClick={() => onAction("restart")} disabled={busy}>
          <IconRestart size={11} /> Re-register
        </button>
        <Link href={`/console/bots/${bot.id}`} className="btn !px-2 !py-1 !text-[11px]">
          <IconTerminal size={11} /> Logs
        </Link>
        {bot.telegram.username && (
          <a
            href={`https://t.me/${bot.telegram.username}`}
            target="_blank"
            rel="noreferrer"
            className="btn ml-auto !px-2 !py-1 !text-[11px]"
          >
            Open
          </a>
        )}
      </div>
    </div>
  );
}

export default function ConsoleOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "draft" | "paused" | "error">("all");
  const [history, setHistory] = useState<{ updates: number[]; replies: number[]; live: number[] }>({
    updates: [],
    replies: [],
    live: [],
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      if (!res.ok) return;
      const json: Overview = await res.json();
      setData(json);
      setHistory((h) => ({
        updates: [...h.updates, json.stats.updates].slice(-40),
        replies: [...h.replies, json.stats.replies].slice(-40),
        live: [...h.live, json.stats.live].slice(-40),
      }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [load]);

  const action = async (botId: string, act: string) => {
    setBusy(botId);
    try {
      if (act === "delete") {
        if (!confirm("Delete this bot and its logs?")) return;
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Fleet overview</h1>
          <p className="text-[12.5px] text-slate-500">
            {s.total} bot{s.total === 1 ? "" : "s"} · {s.live} live · webhook engine · storage:{" "}
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

      {data.storage === "file" && (
        <Banner
          tone="warn"
          title="Ephemeral storage on this deployment"
          action={
            <Link href="/console/settings" className="btn !py-1 !text-[11.5px]">
              Connect Postgres
            </Link>
          }
        >
          Your bots keep answering on Telegram, but the dashboard state resets when a serverless instance
          is recycled. A free Neon/Supabase database makes it permanent.
        </Banner>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric label="Bots" value={s.total} sub="unlimited plan" accent="cyan" />
        <Metric label="Live now" value={s.live} sub={`${s.drafts} draft · ${s.paused} paused`} accent="lime" />
        <Metric label="Updates" value={s.updates} sub="from Telegram" accent="violet" />
        <Metric label="Replies" value={s.replies} sub={`${s.failed} failed`} accent="cyan" />
        <Metric label="Pending" value={s.pending} sub="queued by Telegram" accent="violet" />
        <Metric
          label="Errors"
          value={s.errors}
          sub={s.errors ? "needs attention" : "all healthy"}
          accent={s.errors ? "rose" : "lime"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="glass overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <IconActivity size={13} /> traffic
              </span>
              <div className="ml-auto flex items-center gap-3 text-[10.5px] text-slate-500">
                <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-cyan-400" /> updates</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-violet-400" /> replies</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-3 rounded-full bg-lime-400" /> live</span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
              {[
                { label: "updates", data: history.updates, color: "#22d3ee" },
                { label: "replies", data: history.replies, color: "#a78bfa" },
                { label: "live bots", data: history.live, color: "#a3e635" },
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

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <IconGrid size={13} /> your bots
            </span>
            <div className="ml-auto flex gap-1">
              {(["all", "live", "draft", "paused", "error"] as const).map((f) => (
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
                <p className="text-[12px] text-slate-500">Paste your Python and a bot token — it goes live immediately.</p>
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

        <div className="space-y-4">
          <div className="glass p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <IconCloud size={13} /> engine
            </p>
            <div className="mt-2.5 space-y-2 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">mode</span>
                <span className="text-emerald-300">webhook</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">inbound</span>
                <span className="mono truncate text-slate-300" title={data.engine.siteUrl}>
                  {data.engine.siteUrl.replace(/^https?:\/\//, "")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">uptime</span>
                <span className="mono text-slate-300">{s.uptime}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">storage</span>
                <span className="mono text-slate-300">{data.storage}</span>
              </div>
            </div>
            <p className="mt-2 rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-1.5 text-[10.5px] leading-relaxed text-emerald-100/80">
              Bots answer from this deployment — no server, container or runner. Telegram retries if an
              instance is cold, so nothing is ever missed.
            </p>
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
                      e.type === "error" ? "bg-rose-400" : e.type === "stop" ? "bg-slate-500" : e.type === "restart" ? "bg-violet-400" : "bg-emerald-400"
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

          {s.errors > 0 && (
            <div className="glass border-rose-400/25 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                <IconWarn size={12} /> attention
              </p>
              <p className="mt-1.5 text-[11.5px] text-slate-400">
                {s.errors} bot{s.errors > 1 ? "s" : ""} in error state — usually an invalid token. Open the bot,
                paste a fresh token from @BotFather and press Re-register.
              </p>
              <button className="btn mt-2 w-full !py-1.5 !text-[11.5px]" onClick={() => setFilter("error")}>
                Show error bots
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
