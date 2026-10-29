"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Bot,
  ChevronDown,
  Download,
  Filter,
  MessageSquare,
  Repeat2,
  Search,
  Users,
} from "lucide-react";
import type { ProductBot } from "@/lib/types";
import { cn, fmt, pct, since, timeAgo } from "@/lib/format";
import { EmptyState, PlanBadge, StatusBadge } from "./ui";

type SortKey = "updates" | "replies" | "restarts" | "created" | "name";

const statuses: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "draft", label: "Draft" },
  { key: "paused", label: "Paused" },
  { key: "deploying", label: "Deploying" },
  { key: "error", label: "Error" },
];

export function BotsExplorer({
  bots,
  now,
  baseUrl,
  plans,
}: {
  bots: ProductBot[];
  now: number;
  baseUrl: string;
  plans: Record<string, string>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState<string>(params.get("status") ?? "all");
  const [framework, setFramework] = useState(params.get("framework") ?? "all");
  const [sort, setSort] = useState<SortKey>("updates");
  const [desc, setDesc] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const frameworks = useMemo(
    () => [...new Set(bots.map((b) => b.framework).filter(Boolean))].sort(),
    [bots],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: bots.length };
    for (const b of bots) map[b.status] = (map[b.status] ?? 0) + 1;
    return map;
  }, [bots]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = bots.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (framework !== "all" && b.framework !== framework) return false;
      if (!q) return true;
      return `${b.name} ${b.id} ${b.username ?? ""} ${b.framework} ${b.entry} ${b.ownerEmail} ${b.ownerName}`
        .toLowerCase()
        .includes(q);
    });
    const dir = desc ? -1 : 1;
    return filtered.sort((a, b) => {
      switch (sort) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "created":
          return dir * (a.createdAt - b.createdAt);
        case "restarts":
          return dir * (a.restartCount - b.restartCount);
        case "replies":
          return dir * (a.replies - b.replies);
        default:
          return dir * (a.updates - b.updates);
      }
    });
  }, [bots, query, status, framework, sort, desc]);

  const exportCsv = () => {
    const head = [
      "id",
      "name",
      "status",
      "username",
      "framework",
      "entry",
      "owner_email",
      "updates",
      "replies",
      "restarts",
      "auto_restart",
      "uptime_pct",
      "last_error",
      "created_at",
    ];
    const lines = rows.map((b) =>
      [
        b.id,
        b.name,
        b.status,
        b.username ?? "",
        b.framework,
        b.entry,
        b.ownerEmail,
        b.updates,
        b.replies,
        b.restartCount,
        b.autoRestart,
        b.stats.uptimePct,
        (b.lastError ?? "").replace(/[\n,]/g, " "),
        new Date(b.createdAt).toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `botforge-bots-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDesc((d) => !d);
    else {
      setSort(key);
      setDesc(true);
    }
  };

  const Th = ({ label, k, right }: { label: string; k?: SortKey; right?: boolean }) => (
    <th className={cn("th", right && "text-right")}>
      {k ? (
        <button onClick={() => toggleSort(k)} className={cn("inline-flex items-center gap-1 hover:text-ink", sort === k && "text-ink")}>
          {label}
          <ArrowDownUp size={9} className={cn(sort === k ? "text-brand" : "text-faint/60", sort === k && !desc && "rotate-180")} />
        </button>
      ) : (
        label
      )}
    </th>
  );

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line/70 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, id, @username, owner…"
            className="input h-8 pl-8 text-[12px]"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas/60 p-0.5">
          {statuses.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              className={cn(
                "rounded-md px-2 py-1 text-[11.5px] transition-colors",
                status === s.key ? "bg-raised text-ink" : "text-faint hover:text-muted",
              )}
            >
              {s.label}
              <span className="ml-1 text-[10px] text-faint">{counts[s.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Filter size={11} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint" />
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            className="input h-8 w-[150px] appearance-none pl-6 pr-6 text-[11.5px]"
          >
            <option value="all">All frameworks</option>
            {frameworks.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-faint" />
        </div>

        <button onClick={exportCsv} className="btn h-8 text-[11.5px]" title="Exports exactly the rows on screen">
          <Download size={12} /> CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-line/60 bg-raised/30">
              <Th label="Bot" k="name" />
              <Th label="Status" />
              <Th label="Framework" />
              <Th label="Owner" />
              <Th label="Updates" k="updates" right />
              <Th label="Replies" k="replies" right />
              <Th label="Restarts" k="restarts" right />
              <Th label="Created" k="created" right />
              <th className="th w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    icon={<Bot size={22} />}
                    title={bots.length === 0 ? "The product has no bots yet" : "No bots match these filters"}
                    body={
                      bots.length === 0
                        ? "This table is fed by GET /api/admin/data — it stays empty until a bot exists on the product."
                        : "Clear the search or pick another status."
                    }
                  />
                </td>
              </tr>
            ) : null}
            {rows.map((bot) => (
              <tr key={bot.id} className="group border-b border-line/40 transition-colors last:border-0 hover:bg-raised/30">
                <td className="td">
                  <button
                    onClick={() => setExpanded(expanded === bot.id ? null : bot.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-raised text-faint group-hover:text-muted">
                      <Bot size={13} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium text-ink">{bot.name}</span>
                      <span className="block truncate font-mono text-[10.5px] text-faint">
                        {bot.username ? `@${bot.username}` : bot.id}
                      </span>
                    </span>
                    <ChevronDown
                      size={11}
                      className={cn("shrink-0 text-faint transition-transform", expanded === bot.id && "rotate-180")}
                    />
                  </button>
                </td>
                <td className="td">
                  <StatusBadge status={bot.status} pulse />
                </td>
                <td className="td">
                  <span className="chip py-0.5 text-[10.5px]">{bot.framework || "unknown"}</span>
                </td>
                <td className="td">
                  <span className="block truncate text-[11.5px] text-ink">{bot.ownerName || bot.ownerEmail}</span>
                  <span className="block truncate text-[10px] text-faint">{bot.ownerEmail}</span>
                </td>
                <td className="td text-right tabular-nums text-ink">{fmt(bot.updates)}</td>
                <td className="td text-right tabular-nums">{fmt(bot.replies)}</td>
                <td className="td text-right tabular-nums">
                  <span className={cn(bot.restartCount > 0 && "text-[#f7c66b]")}>{bot.restartCount}</span>
                </td>
                <td className="td text-right text-[11.5px]">{timeAgo(bot.createdAt, now)}</td>
                <td className="td text-right">
                  <Link href={`/admin/bots/${bot.id}`} className="inline-flex text-faint hover:text-ink" aria-label={`Open ${bot.name}`}>
                    <ArrowUpRight size={13} />
                  </Link>
                </td>
              </tr>
            ))}
            {rows.map((bot) =>
              expanded === bot.id ? (
                <tr key={`${bot.id}-detail`} className="border-b border-line/40 bg-canvas/40">
                  <td colSpan={9} className="px-4 py-3">
                    <div className="grid gap-3 lg:grid-cols-4">
                      <div>
                        <p className="label">Entry point</p>
                        <p className="mt-0.5 font-mono text-[11.5px] text-ink">{bot.entry}</p>
                        <p className="label mt-2.5">Token</p>
                        <p className="mt-0.5 font-mono text-[11.5px] text-muted">{bot.tokenMasked ?? "not set"}</p>
                      </div>
                      <div>
                        <p className="label">Runtime</p>
                        <p className="mt-0.5 text-[11.5px] text-ink">
                          start {bot.startedAt ? since(bot.startedAt, now) : "never"} · restart now {bot.autoRestart ? "on" : "off"}
                        </p>
                        <p className="label mt-2.5">Measured</p>
                        <p className="mt-0.5 text-[11.5px] text-muted">
                          {pct(bot.stats.uptimePct)} uptime · {bot.stats.cpu}% cpu · {bot.stats.memMB} MB
                        </p>
                      </div>
                      <div className="lg:col-span-2">
                        <p className="label">Last error reported by the product</p>
                        <p className={cn("mt-0.5 text-[11.5px]", bot.lastError ? "text-[#ff929c]" : "text-faint")}>
                          {bot.lastError ?? "none"}
                        </p>
                        {plans[bot.ownerId] ? (
                          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-faint">
                            <Users size={10} /> owner plan <PlanBadge plan={plans[bot.ownerId]} />
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link href={`/admin/bots/${bot.id}`} className="btn h-7 text-[11.5px]">
                        Full bot record
                      </Link>
                      <a
                        href={`${baseUrl}/console/bots/${bot.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost h-7 text-[11.5px]"
                      >
                        Open on product <ArrowUpRight size={11} />
                      </a>
                      <span className="ml-auto flex items-center gap-3 text-[10.5px] text-faint">
                        <span className="flex items-center gap-1">
                          <MessageSquare size={10} /> {fmt(bot.updates)} updates
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat2 size={10} /> {fmt(bot.replies)} replies
                        </span>
                      </span>
                    </div>
                  </td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-2.5 text-[11px] text-faint">
        <span>
          Showing <span className="text-muted">{rows.length}</span> of {bots.length} bots · read from the product
        </span>
        <span className="flex items-center gap-3">
          <button onClick={() => router.refresh()} className="hover:text-muted">
            reload
          </button>
          <span>click a row for its deployment record</span>
        </span>
      </div>
    </div>
  );
}
