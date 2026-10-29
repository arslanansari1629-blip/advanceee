"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Grid2X2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  SlidersHorizontal,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { Avatar, Badge, PlanBadge, Sparkline, StatusBadge } from "./ui";
import { ExportButton } from "./actions";
import { NewBotModal } from "./new-bot-modal";
import { useToast } from "./toast";
import { cn, fmt } from "@/lib/format";
import type { Bot, BotStatus, User } from "@/lib/types";

type SortKey = "name" | "updates24h" | "successRate" | "p95" | "createdAt";

const statusTabs: { key: BotStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "paused", label: "Paused" },
  { key: "error", label: "Error" },
  { key: "draft", label: "Draft" },
  { key: "compiling", label: "Compiling" },
];

export function BotsTable({
  bots,
  owners,
  initialNew = false,
}: {
  bots: Bot[];
  owners: Record<string, User>;
  initialNew?: boolean;
}) {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<BotStatus | "all">("all");
  const [library, setLibrary] = useState("all");
  const [region, setRegion] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "updates24h", dir: "desc" });
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [density, setDensity] = useState<"table" | "grid">("table");
  const [modal, setModal] = useState(initialNew);
  const [stateOverrides, setStateOverrides] = useState<Record<string, BotStatus>>({});

  const libraries = useMemo(() => [...new Set(bots.map((b) => b.library))], [bots]);
  const regions = useMemo(() => [...new Set(bots.map((b) => b.region))], [bots]);

  const filtered = useMemo(() => {
    const rows = bots.filter((b) => {
      const owner = owners[b.ownerId];
      if (status !== "all" && (stateOverrides[b.id] ?? b.status) !== status) return false;
      if (library !== "all" && b.library !== library) return false;
      if (region !== "all" && b.region !== region) return false;
      if (q) {
        const hay = `${b.name} ${b.slug} ${b.handle} ${b.handlers.join(" ")} ${owner?.name ?? ""} ${owner?.email ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      const pick = (x: Bot) => (x as unknown as Record<string, string | number>)[sort.key];
      const av = pick(a);
      const bv = pick(b);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [bots, owners, q, status, library, region, sort, stateOverrides]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * perPage, safePage * perPage + perPage);
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  const setBotStatus = (id: string, next: BotStatus) => {
    setStateOverrides((prev) => ({ ...prev, [id]: next }));
    push({
      kind: next === "paused" ? "warn" : "success",
      title: next === "paused" ? "Bot paused" : "Bot resumed",
      body: `${bots.find((b) => b.id === id)?.name} · ${next === "paused" ? "webhook drained, updates 503" : "webhook re-registered"}`,
    });
  };

  const bulk = (action: "pause" | "resume" | "recompile" | "delete") => {
    setStateOverrides((prev) => {
      const next = { ...prev };
      selected.forEach((id) => {
        if (action === "pause") next[id] = "paused";
        if (action === "resume") next[id] = "live";
        if (action === "recompile") next[id] = "compiling";
        if (action === "delete") next[id] = "draft";
      });
      return next;
    });
    push({
      kind: action === "delete" ? "error" : action === "pause" ? "warn" : "success",
      title: `${selected.length} bot${selected.length > 1 ? "s" : ""} · ${action}`,
      body: action === "delete" ? "Soft-deleted · restorable for 30 days from audit log" : "Action queued on the edge worker",
    });
    setSelected([]);
  };

  const sortIcon = (key: SortKey) =>
    sort.key !== key ? <ArrowUpDown size={10} className="text-faint/60" /> : sort.dir === "desc" ? <ArrowDown size={10} /> : <ArrowUp size={10} />;

  return (
    <>
      <div className="panel overflow-hidden">
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line/80 px-3 py-2.5">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search bots, owners, handlers…"
              className="h-8 w-[240px] rounded-lg border border-line bg-canvas/60 pl-7 pr-2 text-[12px] text-ink outline-none placeholder:text-faint focus:border-brand/50"
            />
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-canvas/60 p-0.5">
            {statusTabs.map((t) => {
              const count = t.key === "all" ? bots.length : bots.filter((b) => (stateOverrides[b.id] ?? b.status) === t.key).length;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setStatus(t.key);
                    setPage(0);
                  }}
                  className={cn(
                    "rounded-md px-2 py-[5px] text-[11px] font-medium transition-colors",
                    status === t.key ? "bg-raised text-ink shadow-sm" : "text-faint hover:text-muted",
                  )}
                >
                  {t.label}
                  <span className="ml-1 text-[9.5px] text-faint">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setAdvanced((a) => !a)}
              className={cn("btn h-8 px-2 text-[11.5px]", advanced && "border-brand/40 text-brand")}
            >
              <SlidersHorizontal size={12} /> Filters
              {(library !== "all" || region !== "all") && <span className="h-1 w-1 rounded-full bg-brand" />}
            </button>
            <div className="flex items-center gap-0.5 rounded-lg border border-line bg-canvas/60 p-0.5">
              <button
                onClick={() => setDensity("table")}
                className={cn("rounded p-1.5", density === "table" ? "bg-raised text-ink" : "text-faint")}
                aria-label="Table view"
              >
                <Rows3 size={12} />
              </button>
              <button
                onClick={() => setDensity("grid")}
                className={cn("rounded p-1.5", density === "grid" ? "bg-raised text-ink" : "text-faint")}
                aria-label="Grid view"
              >
                <Grid2X2 size={12} />
              </button>
            </div>
            <ExportButton
              filename="botforge-bots.csv"
              rows={[
                ["id", "name", "handle", "status", "library", "version", "owner", "updates_24h", "success", "p95", "region"],
                ...filtered.map((b) => [
                  b.id,
                  b.name,
                  b.handle,
                  b.status,
                  b.library,
                  b.version,
                  owners[b.ownerId]?.email ?? "",
                  b.updates24h,
                  b.successRate,
                  b.p95,
                  b.region,
                ]),
              ]}
            />
            <button onClick={() => setModal(true)} className="btn-primary h-8 text-[11.5px]">
              <Plus size={12} strokeWidth={2.6} /> New bot
            </button>
          </div>
        </div>

        {advanced ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-line/70 bg-canvas/30 px-3 py-2">
            <select
              value={library}
              onChange={(e) => setLibrary(e.target.value)}
              className="h-7 rounded-md border border-line bg-panel px-1.5 text-[11px] text-muted outline-none"
            >
              <option value="all">any library</option>
              {libraries.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="h-7 rounded-md border border-line bg-panel px-1.5 text-[11px] text-muted outline-none"
            >
              <option value="all">any region</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <span className="chip h-7">engine v3 · pinned</span>
            <span className="chip h-7">webhook mode only</span>
            <button
              onClick={() => {
                setLibrary("all");
                setRegion("all");
                setStatus("all");
                setQ("");
              }}
              className="ml-auto text-[11px] text-faint hover:text-ink"
            >
              reset filters
            </button>
            <span className="text-[11px] text-faint">
              {filtered.length} of {bots.length} bots
            </span>
          </div>
        ) : null}

        {/* bulk bar */}
        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-brand/20 bg-brand/[0.06] px-3 py-2 animate-rise">
            <span className="text-[11.5px] font-medium text-brand">
              {selected.length} selected
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <button onClick={() => bulk("resume")} className="btn h-7 px-2 text-[11px]">
                <Play size={11} /> Resume
              </button>
              <button onClick={() => bulk("pause")} className="btn h-7 px-2 text-[11px]">
                <Pause size={11} /> Pause
              </button>
              <button onClick={() => bulk("recompile")} className="btn h-7 px-2 text-[11px]">
                <RefreshCw size={11} /> Recompile
              </button>
              <button onClick={() => bulk("delete")} className="btn-danger h-7 px-2 text-[11px]">
                <Trash2 size={11} /> Delete
              </button>
              <button onClick={() => setSelected([])} className="btn-ghost h-7 px-2 text-[11px]">
                clear
              </button>
            </div>
          </div>
        ) : null}

        {density === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-line/70 bg-canvas/30">
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => {
                        const ids = rows.map((r) => r.id);
                        setSelected((prev) => (e.target.checked ? [...new Set([...prev, ...ids])] : prev.filter((id) => !ids.includes(id))));
                      }}
                      className="h-3 w-3 accent-[#34e0a1]"
                    />
                  </th>
                  <th className="th cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <span className="flex items-center gap-1">Bot {sortIcon("name")}</span>
                  </th>
                  <th className="th">Owner</th>
                  <th className="th">Status</th>
                  <th className="th">Runtime</th>
                  <th className="th cursor-pointer select-none text-right" onClick={() => toggleSort("updates24h")}>
                    <span className="flex items-center justify-end gap-1">Updates 24h {sortIcon("updates24h")}</span>
                  </th>
                  <th className="th">14d trend</th>
                  <th className="th cursor-pointer select-none text-right" onClick={() => toggleSort("successRate")}>
                    <span className="flex items-center justify-end gap-1">Success {sortIcon("successRate")}</span>
                  </th>
                  <th className="th cursor-pointer select-none text-right" onClick={() => toggleSort("p95")}>
                    <span className="flex items-center justify-end gap-1">p95 {sortIcon("p95")}</span>
                  </th>
                  <th className="th w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const owner = owners[b.ownerId];
                  const st = stateOverrides[b.id] ?? b.status;
                  return (
                    <tr
                      key={b.id}
                      className={cn(
                        "group border-b border-line/50 transition-colors last:border-0 hover:bg-raised/40",
                        selected.includes(b.id) && "bg-brand/[0.04]",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.includes(b.id)}
                          onChange={(e) =>
                            setSelected((prev) => (e.target.checked ? [...prev, b.id] : prev.filter((id) => id !== b.id)))
                          }
                          className="h-3 w-3 accent-[#34e0a1]"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/bots/${b.id}`} className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-gradient-to-br from-raised to-canvas font-mono text-[11px] text-muted group-hover:border-brand/40 group-hover:text-brand">
                            {b.name.slice(0, 2)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-medium text-ink group-hover:text-brand">{b.name}</span>
                            <span className="block truncate font-mono text-[10px] text-faint">{b.handle}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="td">
                        <span className="flex items-center gap-1.5">
                          <Avatar name={owner?.name ?? "?"} color={owner?.color} size={18} />
                          <span className="max-w-[92px] truncate text-[11.5px]">{owner?.name}</span>
                        </span>
                      </td>
                      <td className="td">
                        <StatusBadge status={st} pulse />
                      </td>
                      <td className="td">
                        <span className="block text-[11px] text-muted">{b.library}</span>
                        <span className="font-mono text-[9.5px] text-faint">
                          v{b.version} · {b.region}
                        </span>
                      </td>
                      <td className="td text-right font-mono text-[12px] text-ink">{fmt(b.updates24h)}</td>
                      <td className="td">
                        <Sparkline
                          data={b.updates7d.slice(-12)}
                          color={st === "error" ? "#ff5d6c" : st === "paused" ? "#f5b544" : "#34e0a1"}
                          width={72}
                          height={20}
                        />
                      </td>
                      <td className="td text-right">
                        <span className={cn("font-mono text-[11.5px]", b.successRate < 90 ? "text-[#ff929c]" : "text-muted")}>
                          {b.successRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="td text-right">
                        <span className={cn("font-mono text-[11.5px]", b.p95 > 300 ? "text-[#f7c66b]" : "text-muted")}>
                          {b.p95} ms
                        </span>
                      </td>
                      <td className="px-2">
                        <button
                          onClick={(e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            setMenu(menu?.id === b.id ? null : { id: b.id, x: r.right - 176, y: r.bottom + 4 });
                          }}
                          className="rounded p-1 text-faint opacity-0 transition-opacity hover:bg-raised hover:text-ink group-hover:opacity-100"
                          aria-label="Row actions"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((b) => {
              const owner = owners[b.ownerId];
              const st = stateOverrides[b.id] ?? b.status;
              return (
                <Link
                  key={b.id}
                  href={`/admin/bots/${b.id}`}
                  className="group rounded-xl border border-line/80 bg-canvas/40 p-3 transition-colors hover:border-brand/30 hover:bg-raised/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-raised font-mono text-[11px] text-muted group-hover:text-brand">
                        {b.name.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-medium text-ink">{b.name}</div>
                        <div className="truncate font-mono text-[10px] text-faint">{b.handle}</div>
                      </div>
                    </div>
                    <StatusBadge status={st} pulse />
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Sparkline data={b.updates7d.slice(-12)} width={90} height={24} color={st === "error" ? "#ff5d6c" : "#34e0a1"} />
                    <div className="ml-auto text-right">
                      <div className="font-mono text-[12px] text-ink">{fmt(b.updates24h)}</div>
                      <div className="text-[9px] uppercase tracking-wide text-faint">updates 24h</div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-2">
                    <span className="chip px-1.5 py-0 text-[9.5px]">{b.library}</span>
                    <span className="chip px-1.5 py-0 text-[9.5px]">{b.region}</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <Avatar name={owner?.name ?? "?"} color={owner?.color} size={16} />
                      <PlanBadge plan={owner?.plan ?? "free"} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <Search size={18} className="text-faint" />
            <p className="text-[12.5px] text-ink">No bots match those filters</p>
            <button
              onClick={() => {
                setQ("");
                setStatus("all");
                setLibrary("all");
                setRegion("all");
              }}
              className="btn h-7 text-[11px]"
            >
              Clear filters
            </button>
          </div>
        ) : null}

        {/* pagination */}
        <div className="flex flex-wrap items-center gap-3 border-t border-line/80 px-3 py-2 text-[11px] text-faint">
          <span>
            Showing <span className="text-muted">{rows.length ? safePage * perPage + 1 : 0}</span>–
            <span className="text-muted">{Math.min(filtered.length, (safePage + 1) * perPage)}</span> of{" "}
            <span className="text-muted">{filtered.length}</span>
          </span>
          <select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(0);
            }}
            className="h-6 rounded border border-line bg-panel px-1 text-[10.5px] text-muted outline-none"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-1">
            <button
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="rounded border border-line p-1 disabled:opacity-40"
            >
              <ChevronLeft size={12} />
            </button>
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  "h-6 min-w-6 rounded border px-1.5 text-[10.5px]",
                  i === safePage ? "border-brand/40 bg-brand/10 text-brand" : "border-line text-faint hover:text-ink",
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              className="rounded border border-line p-1 disabled:opacity-40"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {menu ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-44 overflow-hidden rounded-lg border border-line bg-panel shadow-pop"
            style={{ top: menu.y, left: Math.max(8, menu.x) }}
          >
            {(() => {
              const b = bots.find((x) => x.id === menu.id);
              if (!b) return null;
              const st = stateOverrides[b.id] ?? b.status;
              return (
                <>
                  <Link href={`/admin/bots/${b.id}`} className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] text-muted hover:bg-raised hover:text-ink">
                    <ExternalLink size={11} /> Open console
                  </Link>
                  <Link href={`/admin/logs?bot=${b.slug}`} className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] text-muted hover:bg-raised hover:text-ink">
                    <Terminal size={11} /> Tail logs
                  </Link>
                  <button
                    onClick={() => {
                      setBotStatus(b.id, st === "paused" ? "live" : "paused");
                      setMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-[11.5px] text-muted hover:bg-raised hover:text-ink"
                  >
                    {st === "paused" ? <Play size={11} /> : <Pause size={11} />}
                    {st === "paused" ? "Resume bot" : "Pause bot"}
                  </button>
                  <button
                    onClick={() => {
                      setBotStatus(b.id, "compiling");
                      setTimeout(() => setStateOverrides((p) => ({ ...p, [b.id]: "live" })), 1600);
                      setMenu(null);
                      push({ kind: "info", title: "Recompiling", body: `${b.name} · analyser queued` });
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-[11.5px] text-muted hover:bg-raised hover:text-ink"
                  >
                    <RefreshCw size={11} /> Recompile
                  </button>
                  <button
                    onClick={() => {
                      push({ kind: "success", title: "Webhook URL copied", body: b.webhook.url });
                      setMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-[11.5px] text-muted hover:bg-raised hover:text-ink"
                  >
                    <Copy size={11} /> Copy webhook
                  </button>
                  <button
                    onClick={() => {
                      setSelected([b.id]);
                      setMenu(null);
                      push({ kind: "warn", title: "Bot selected for deletion", body: `${b.name} · confirm from the bulk action bar` });
                    }}
                    className="flex w-full items-center gap-2 border-t border-line/70 px-3 py-1.5 text-[11.5px] text-[#ff8a94] hover:bg-[#ff5d6c]/10"
                  >
                    <Trash2 size={11} /> Delete bot
                  </button>
                </>
              );
            })()}
          </div>
        </>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-panel/60 p-3 text-[11px] text-faint">
        <Zap size={12} className="text-brand" />
        <span className="text-muted">Bulk tip:</span> select rows to pause, resume or recompile an entire fleet slice. Every
        action lands in the audit trail.
        <span className="ml-auto flex items-center gap-2">
          <Badge tone="accent">webhook engine v3</Badge>
          <Badge tone="success">99.92% success</Badge>
        </span>
      </div>

      <NewBotModal open={modal} onClose={() => setModal(false)} />
    </>
  );
}
