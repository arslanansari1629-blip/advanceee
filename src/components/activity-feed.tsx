"use client";

import { useState } from "react";
import Link from "next/link";
import { Bug, CircleDot, GitBranch, Radio, ShieldCheck, Terminal, Zap } from "lucide-react";
import { Badge, Card, CardHead } from "./ui";
import { cn } from "@/lib/format";
import type { LogLine } from "@/lib/types";

const filters = [
  { key: "all", label: "Everything" },
  { key: "update", label: "Updates" },
  { key: "reply", label: "Replies" },
  { key: "compile", label: "Compiles" },
  { key: "error", label: "Errors" },
  { key: "auth", label: "Auth" },
] as const;

const eventMeta: Record<LogLine["event"], { icon: React.ReactNode; color: string; label: string }> = {
  update: { icon: <Radio size={11} />, color: "#4cc9f0", label: "update" },
  reply: { icon: <Zap size={11} />, color: "#34e0a1", label: "reply" },
  webhook: { icon: <GitBranch size={11} />, color: "#8b7cff", label: "webhook" },
  compile: { icon: <Terminal size={11} />, color: "#b3a8ff", label: "compile" },
  error: { icon: <Bug size={11} />, color: "#ff5d6c", label: "error" },
  auth: { icon: <ShieldCheck size={11} />, color: "#5eeac0", label: "auth" },
};

export function ActivityFeed({ logs }: { logs: LogLine[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");
  const [onlyErrors, setOnlyErrors] = useState(false);

  const rows = logs.filter((l) => {
    if (filter !== "all" && l.event !== filter) return false;
    if (onlyErrors && l.level !== "error") return false;
    return true;
  });

  const groups = [
    { label: "Last hour", rows: rows.slice(0, 10) },
    { label: "Earlier today", rows: rows.slice(10, 24) },
    { label: "Yesterday", rows: rows.slice(24, 40) },
  ];

  return (
    <Card>
      <CardHead
        title="Event stream"
        subtitle={`${rows.length} events in the rolling window`}
        action={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setOnlyErrors((v) => !v)}
              className={cn(
                "rounded-md border px-2 py-1 text-[10.5px]",
                onlyErrors ? "border-[#ff5d6c]/40 bg-[#ff5d6c]/10 text-[#ff929c]" : "border-line text-faint hover:text-muted",
              )}
            >
              errors only
            </button>
            <Badge tone="success">
              <span className="h-1 w-1 rounded-full bg-brand" /> live
            </Badge>
          </div>
        }
      />
      <div className="mt-2 flex flex-wrap items-center gap-1 px-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-md px-2 py-1 text-[10.5px] transition-colors",
              filter === f.key ? "bg-raised text-ink" : "text-faint hover:text-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-1 space-y-4 p-4">
        {groups.map((g) =>
          g.rows.length ? (
            <div key={g.label}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-faint">{g.label}</span>
                <span className="h-px flex-1 bg-line/70" />
              </div>
              <div className="space-y-1">
                {g.rows.map((l) => {
                  const meta = eventMeta[l.event];
                  return (
                    <Link
                      key={l.id}
                      href={`/admin/logs?bot=${l.bot}`}
                      className="flex items-start gap-2.5 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-line/70 hover:bg-raised/40"
                    >
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                        style={{ borderColor: `${meta.color}44`, background: `${meta.color}14`, color: meta.color }}
                      >
                        {meta.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] text-muted">
                          <span className="font-mono text-[10px] text-faint">{l.bot}</span>{" "}
                          <span className="text-ink">{l.message}</span>
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[9.5px] text-faint">
                          <span>{new Date(l.ts).toISOString().slice(11, 19)} UTC</span>
                          <span>·</span>
                          <span>{meta.label}</span>
                          <span>·</span>
                          <span>chat {l.chat}</span>
                          {l.latency ? (
                            <>
                              <span>·</span>
                              <span>{l.latency} ms</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <CircleDot size={9} className="mt-1.5 shrink-0" style={{ color: l.level === "error" ? "#ff5d6c" : "#2a3446" }} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null,
        )}
        {rows.length === 0 ? <p className="py-10 text-center text-[11.5px] text-faint">No events on that filter.</p> : null}
      </div>
    </Card>
  );
}
