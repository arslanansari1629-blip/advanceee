"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDownUp, ArrowUpRight, Bot, ChevronDown, Download, Search, Users } from "lucide-react";
import type { ProductBot, ProductUser } from "@/lib/types";
import { cn, fmt, timeAgo } from "@/lib/format";
import { Avatar, EmptyState, PlanBadge, StatusBadge } from "./ui";

type SortKey = "created" | "name" | "bots" | "updates";

export function UsersExplorer({
  users,
  bots,
  now,
}: {
  users: ProductUser[];
  bots: ProductBot[];
  now: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [plan, setPlan] = useState(params.get("plan") ?? "all");
  const [sort, setSort] = useState<SortKey>("created");
  const [desc, setDesc] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(params.get("plan") === "suspended" ? users.find((u) => u.plan === "suspended")?.id ?? null : null);

  const plans = useMemo(() => {
    const map: Record<string, number> = { all: users.length };
    for (const u of users) map[u.plan || "free"] = (map[u.plan || "free"] ?? 0) + 1;
    return map;
  }, [users]);

  const botsByOwner = useMemo(() => {
    const map: Record<string, ProductBot[]> = {};
    for (const b of bots) (map[b.ownerId] ??= []).push(b);
    return map;
  }, [bots]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = users.filter((u) => {
      if (plan !== "all" && (u.plan || "free") !== plan) return false;
      if (!q) return true;
      return `${u.name} ${u.email} ${u.id} ${u.plan}`.toLowerCase().includes(q);
    });
    const dir = desc ? -1 : 1;
    return filtered.sort((a, b) => {
      switch (sort) {
        case "name":
          return dir * (a.name || a.email).localeCompare(b.name || b.email);
        case "bots":
          return dir * (a.bots - b.bots);
        case "updates":
          return dir * (a.updates - b.updates);
        default:
          return dir * (a.createdAt - b.createdAt);
      }
    });
  }, [users, query, plan, sort, desc]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDesc((d) => !d);
    else {
      setSort(key);
      setDesc(true);
    }
  };

  const exportCsv = () => {
    const head = ["id", "name", "email", "plan", "bots", "live", "updates", "created_at"];
    const lines = rows.map((u) =>
      [u.id, u.name, u.email, u.plan, u.bots, u.live, u.updates, new Date(u.createdAt).toISOString()]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `botforge-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            placeholder="Search by name, email or plan…"
            className="input h-8 pl-8 text-[12px]"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas/60 p-0.5">
          <button
            onClick={() => setPlan("all")}
            className={cn("rounded-md px-2 py-1 text-[11.5px]", plan === "all" ? "bg-raised text-ink" : "text-faint hover:text-muted")}
          >
            All <span className="text-[10px] text-faint">{plans.all ?? 0}</span>
          </button>
          {Object.keys(plans)
            .filter((p) => p !== "all")
            .sort()
            .map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={cn("rounded-md px-2 py-1 text-[11.5px] capitalize", plan === p ? "bg-raised text-ink" : "text-faint hover:text-muted")}
              >
                {p} <span className="text-[10px] text-faint">{plans[p]}</span>
              </button>
            ))}
        </div>
        <button onClick={exportCsv} className="btn h-8 text-[11.5px]" title="Exports exactly the rows on screen">
          <Download size={12} /> CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-line/60 bg-raised/30">
              <Th label="Account" k="name" />
              <Th label="Plan" />
              <Th label="Bots" k="bots" right />
              <Th label="Live" right />
              <Th label="Updates" k="updates" right />
              <Th label="Joined" k="created" right />
              <th className="th w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={<Users size={22} />}
                    title={users.length === 0 ? "The product has no accounts yet" : "No accounts match this filter"}
                    body={users.length === 0 ? "Rows come from the live /api/admin/data payload." : "Clear the search or pick another plan."}
                  />
                </td>
              </tr>
            ) : null}
            {rows.map((u) => {
              const owned = botsByOwner[u.id] ?? [];
              return (
                <tr key={u.id} className="group border-b border-line/40 transition-colors last:border-0 hover:bg-raised/30">
                  <td className="td">
                    <button onClick={() => setExpanded(expanded === u.id ? null : u.id)} className="flex items-center gap-2.5 text-left">
                      <Avatar name={u.name || u.email} size={28} color={u.plan === "suspended" ? "#ff5d6c" : "#8b7cff"} />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium text-ink">{u.name || u.email}</span>
                        <span className="block truncate text-[10.5px] text-faint">{u.email}</span>
                      </span>
                      <ChevronDown size={11} className={cn("shrink-0 text-faint transition-transform", expanded === u.id && "rotate-180")} />
                    </button>
                  </td>
                  <td className="td">
                    <PlanBadge plan={u.plan} />
                  </td>
                  <td className="td text-right tabular-nums text-ink">{u.bots}</td>
                  <td className="td text-right tabular-nums">
                    <span className={u.live > 0 ? "text-[#5eeac0]" : "text-faint"}>{u.live}</span>
                  </td>
                  <td className="td text-right tabular-nums">{fmt(u.updates)}</td>
                  <td className="td text-right text-[11.5px]">{timeAgo(u.createdAt, now)}</td>
                  <td className="td text-right">
                    <Link href={`/admin/users/${u.id}`} className="inline-flex text-faint hover:text-ink" aria-label={`Open ${u.email}`}>
                      <ArrowUpRight size={13} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.map((u) => {
              const owned = botsByOwner[u.id] ?? [];
              return expanded === u.id ? (
                <tr key={`${u.id}-detail`} className="border-b border-line/40 bg-canvas/40">
                  <td colSpan={7} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-faint">
                      <span className="font-mono">{u.id}</span>
                      <span>·</span>
                      <span>joined {new Date(u.createdAt).toISOString().slice(0, 10)}</span>
                      <span>·</span>
                      <span>
                        {u.live} of {u.bots} bots live
                      </span>
                      <Link href={`/admin/users/${u.id}`} className="btn ml-auto h-7 text-[11.5px]">
                        Account record
                      </Link>
                    </div>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {owned.length === 0 ? <p className="text-[11.5px] text-faint">This account owns no bots.</p> : null}
                      {owned.map((b) => (
                        <Link
                          key={b.id}
                          href={`/admin/bots/${b.id}`}
                          className="flex items-center gap-2 rounded-md border border-line/60 bg-panel px-2 py-1.5 text-[11.5px] text-muted hover:border-faint/60 hover:text-ink"
                        >
                          <Bot size={11} className="text-faint" />
                          <span className="flex-1 truncate">{b.name}</span>
                          <StatusBadge status={b.status} />
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : null;
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-2.5 text-[11px] text-faint">
        <span>
          Showing <span className="text-muted">{rows.length}</span> of {users.length} accounts
        </span>
        <button onClick={() => router.refresh()} className="hover:text-muted">
          reload
        </button>
      </div>
    </div>
  );
}
