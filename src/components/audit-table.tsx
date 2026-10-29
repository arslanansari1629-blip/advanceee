"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Filter, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { Avatar, Badge } from "./ui";
import { ExportButton } from "./actions";
import { cn, stampUTC } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

const sevTone = {
  low: "neutral",
  medium: "warn",
  high: "danger",
} as const;

export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<AuditEntry["severity"] | "all">("all");
  const [actor, setActor] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

  const actors = useMemo(() => [...new Set(entries.map((e) => e.actor))], [entries]);

  const rows = useMemo(
    () =>
      entries.filter((e) => {
        if (sev !== "all" && e.severity !== sev) return false;
        if (actor !== "all" && e.actor !== actor) return false;
        if (q && !`${e.action} ${e.target} ${e.ip} ${e.meta}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [entries, q, sev, actor],
  );

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line/80 px-3 py-2.5">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search action, target, IP…"
            className="h-8 w-[230px] rounded-lg border border-line bg-canvas/60 pl-7 pr-2 text-[12px] text-ink outline-none placeholder:text-faint focus:border-brand/50"
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-canvas/60 p-0.5">
          {(["all", "high", "medium", "low"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSev(s)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] capitalize",
                sev === s ? "bg-raised text-ink" : "text-faint hover:text-muted",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          className="h-8 rounded-lg border border-line bg-canvas/60 px-2 text-[11.5px] text-muted outline-none"
        >
          <option value="all">any actor</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-1.5">
          <ExportButton
            filename="botforge-audit.csv"
            rows={[
              ["id", "time", "actor", "action", "target", "severity", "ip", "source"],
              ...rows.map((r) => [r.id, r.time, r.actor, r.action, r.target, r.severity, r.ip, r.meta]),
            ]}
          />
          <span className="flex items-center gap-1 text-[10.5px] text-faint">
            <Filter size={10} /> {rows.length} events
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-line/70 bg-canvas/30 px-3 py-1.5 text-[10px] text-faint">
        <span className="flex items-center gap-1 text-[#ff929c]">
          <ShieldAlert size={9} /> {rows.filter((r) => r.severity === "high").length} high severity
        </span>
        <span className="flex items-center gap-1 text-[#4fdfb0]">
          <ShieldCheck size={9} /> tamper-evident hash chain
        </span>
        <span className="ml-auto">retention 400 days · exported to S3 daily</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px]">
          <thead>
            <tr className="border-b border-line/70 bg-canvas/30">
              <th className="th">Time</th>
              <th className="th">Actor</th>
              <th className="th">Action</th>
              <th className="th">Target</th>
              <th className="th">Source</th>
              <th className="th">IP</th>
              <th className="th">Severity</th>
              <th className="th w-6" />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((e) => {
              const isOpen = open === e.id;
              return (
                <Fragment key={e.id}>
                  <tr
                    onClick={() => setOpen(isOpen ? null : e.id)}
                    className="cursor-pointer border-b border-line/50 transition-colors last:border-0 hover:bg-raised/40"
                  >
                    <td className="td whitespace-nowrap text-[11px]">{stampUTC(e.time)}</td>
                    <td className="td">
                      <span className="flex items-center gap-1.5">
                        <Avatar name={e.actor} color={e.actorColor} size={18} />
                        <span className="text-[11.5px] text-ink">{e.actor}</span>
                      </span>
                    </td>
                    <td className="td">
                      <code className="rounded border border-line bg-canvas/60 px-1 py-px font-mono text-[10.5px] text-[#8fb3d9]">
                        {e.action}
                      </code>
                    </td>
                    <td className="td max-w-[220px] truncate text-[11.5px]">{e.target}</td>
                    <td className="td text-[10.5px]">{e.meta}</td>
                    <td className="td font-mono text-[10.5px]">{e.ip}</td>
                    <td className="td"><Badge tone={sevTone[e.severity]}>{e.severity}</Badge></td>
                    <td className="px-2">
                      <ChevronDown size={11} className={cn("text-faint transition-transform", isOpen && "rotate-180")} />
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr key={`${e.id}-json`} className="border-b border-line/50 bg-canvas/20">
                      <td colSpan={8} className="px-4 py-2">
                        <pre className="overflow-x-auto rounded-md border border-line/70 bg-[#080b12] p-2 font-mono text-[10px] leading-relaxed text-[#8ea7c9]">
{JSON.stringify(
  {
    id: e.id,
    ts: e.time,
    actor: e.actor,
    action: e.action,
    target: e.target,
    severity: e.severity,
    source_ip: e.ip,
    surface: e.meta,
    request_id: `req_${e.id.slice(-4)}a1`,
    hash: "sha256:7f31c4…9e02",
  },
  null,
  2,
)}
                        </pre>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > limit ? (
        <div className="border-t border-line/80 p-2 text-center">
          <button onClick={() => setLimit((l) => l + 20)} className="btn h-7 text-[11px]">
            Load 20 more
          </button>
        </div>
      ) : null}
      {rows.length === 0 ? <p className="px-4 py-12 text-center text-[12px] text-faint">No audit events match those filters.</p> : null}
    </div>
  );
}
