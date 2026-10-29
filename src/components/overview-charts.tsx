"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { AreaChart, Bars } from "./charts";
import { cn, fmt } from "@/lib/format";

type RangeKey = "24h" | "7d" | "30d" | "90d";
type Payload = Record<RangeKey, { labels: string[]; updates: number[]; replies: number[]; errors: number[]; latency: number[] }>;

const tabs: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

export function TrafficCard({ data, mrrByDay }: { data: Payload; mrrByDay: number[] }) {
  const [range, setRange] = useState<RangeKey>("7d");
  const [show, setShow] = useState({ updates: true, replies: true, errors: false });
  const d = data[range];

  const series = [
    show.updates ? { name: "Updates", color: "#34e0a1", data: d.updates } : null,
    show.replies ? { name: "Replies", color: "#8b7cff", data: d.replies } : null,
    show.errors ? { name: "Errors", color: "#ff5d6c", data: d.errors } : null,
  ].filter(Boolean) as { name: string; color: string; data: number[] }[];

  const total = d.updates.reduce((a, b) => a + b, 0);
  const peak = Math.max(...d.updates);
  const avgLatency = Math.round(d.latency.reduce((a, b) => a + b, 0) / d.latency.length);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-ink">Update traffic</h3>
            <span className="chip h-[18px] px-1.5 py-0 text-[9.5px]">engine telemetry</span>
          </div>
          <p className="mt-0.5 text-[11.5px] text-faint">
            Webhook deliveries across the fleet · peak {fmt(peak)}/{range === "24h" ? "h" : "bucket"}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas/60 p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setRange(t.key)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                range === t.key ? "bg-raised text-ink shadow-sm" : "text-faint hover:text-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 px-5 text-[11px]">
        <span className="font-mono text-[15px] font-semibold text-ink">{fmt(total)}</span>
        <span className="text-faint">updates in window</span>
        <button
          onClick={() => setShow((s) => ({ ...s, updates: !s.updates }))}
          className={cn("flex items-center gap-1.5", show.updates ? "text-muted" : "text-faint/60 line-through")}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#34e0a1]" /> updates
        </button>
        <button
          onClick={() => setShow((s) => ({ ...s, replies: !s.replies }))}
          className={cn("flex items-center gap-1.5", show.replies ? "text-muted" : "text-faint/60 line-through")}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#8b7cff]" /> replies
        </button>
        <button
          onClick={() => setShow((s) => ({ ...s, errors: !s.errors }))}
          className={cn("flex items-center gap-1.5", show.errors ? "text-muted" : "text-faint/60 line-through")}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5d6c]" /> errors
        </button>
        <span className="ml-auto flex items-center gap-1 text-faint">
          <Maximize2 size={10} /> p95 {avgLatency}ms
        </span>
      </div>

      <div className="px-3 pb-2 pt-2">
        <AreaChart series={series} labels={d.labels} height={244} format={(n) => fmt(n)} legend={false} />
      </div>

      <div className="grid grid-cols-2 divide-x divide-line/70 border-t border-line/70 sm:grid-cols-4">
        {[
          { label: "Delivered", value: fmt(total), tone: "text-ink" },
          { label: "Replies", value: fmt(d.replies.reduce((a, b) => a + b, 0)), tone: "text-ink" },
          { label: "Errors", value: fmt(d.errors.reduce((a, b) => a + b, 0)), tone: "text-[#ff929c]" },
          { label: "Avg latency", value: `${avgLatency} ms`, tone: "text-ink" },
        ].map((s) => (
          <div key={s.label} className="px-4 py-2.5">
            <div className="text-[9.5px] uppercase tracking-[0.1em] text-faint">{s.label}</div>
            <div className={cn("mt-0.5 font-mono text-[13px] font-medium", s.tone)}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueBars({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="px-4 pb-3 pt-1">
      <Bars data={data} color="#8b7cff" height={128} format={(n) => `$${fmt(n)}`} />
    </div>
  );
}
