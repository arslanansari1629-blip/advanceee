"use client";

import { useEffect, useMemo, useState } from "react";
import type { BotStatus, LogLine } from "@/lib/types";

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 45_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour12: false });
}

/** Re-renders every second so uptime counters tick live. */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

export function StatusPill({ status, mode }: { status: BotStatus; mode?: string }) {
  const map: Record<string, { cls: string; dot: string; label: string }> = {
    running: { cls: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10", dot: "dot-live", label: "LIVE" },
    installing: { cls: "text-cyan-300 border-cyan-400/30 bg-cyan-400/10", dot: "dot-warn", label: "INSTALLING" },
    starting: { cls: "text-cyan-300 border-cyan-400/30 bg-cyan-400/10", dot: "dot-warn", label: "STARTING" },
    stopped: { cls: "text-slate-300 border-white/15 bg-white/5", dot: "dot-idle", label: "STOPPED" },
    crashed: { cls: "text-rose-300 border-rose-400/30 bg-rose-400/10", dot: "dot-err", label: "CRASHED" },
    queued: { cls: "text-amber-300 border-amber-400/30 bg-amber-400/10", dot: "dot-warn", label: "QUEUED" },
  };
  const s = map[status] ?? map.stopped;
  return (
    <span className={cx("pill", s.cls)}>
      <span className={cx("dot", s.dot)} />
      {s.label}
      {mode === "preview" && status === "running" && (
        <span className="ml-1 text-[9px] font-bold tracking-wider text-amber-300/90">PREVIEW</span>
      )}
    </span>
  );
}

export function Metric({
  label,
  value,
  sub,
  accent = "cyan",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "cyan" | "violet" | "lime" | "rose";
}) {
  const bar: Record<string, string> = {
    cyan: "from-cyan-400/80 to-sky-500/10",
    violet: "from-violet-400/80 to-fuchsia-500/10",
    lime: "from-lime-400/80 to-emerald-500/10",
    rose: "from-rose-400/80 to-orange-500/10",
  };
  return (
    <div className="glass relative overflow-hidden p-4">
      <div className={cx("absolute inset-x-0 top-0 h-px bg-gradient-to-r", bar[accent])} />
      <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-slate-400">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-white tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

export function Sparkline({
  data,
  color = "#22d3ee",
  height = 38,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const path = useMemo(() => {
    if (data.length < 2) return { line: "", area: "" };
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const w = 100;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - ((v - min) / Math.max(max - min, 0.001)) * (height - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return {
      line: `M${pts.join(" L")}`,
      area: `M0,${height} L${pts.join(" L")} L100,${height} Z`,
    };
  }, [data, height]);

  const id = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${id})`} />
      <path d={path.line} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-[13px] text-slate-300"
    >
      <span
        className={cx(
          "relative h-5 w-9 rounded-full border transition-colors",
          checked ? "border-cyan-400/50 bg-cyan-400/25" : "border-white/15 bg-white/5"
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all",
            checked ? "left-[18px] bg-cyan-300" : "left-0.5 bg-slate-400"
          )}
        />
      </span>
      {label}
    </button>
  );
}

export function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-ghost !px-2 !py-1 !text-[11px]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

export function Banner({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: "info" | "warn";
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const tones = {
    info: "border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-100",
    warn: "border-amber-400/25 bg-amber-400/[0.06] text-amber-100",
  };
  return (
    <div className={cx("flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[12.5px]", tones[tone])}>
      <div className="flex-1 min-w-[240px]">
        <p className="font-semibold">{title}</p>
        {children && <p className="mt-0.5 text-[11.5px] opacity-80">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function streamClass(stream: LogLine["stream"]) {
  switch (stream) {
    case "stderr":
      return "log-err";
    case "system":
      return "log-sys";
    case "telegram":
      return "log-tg";
    default:
      return "log-out";
  }
}
