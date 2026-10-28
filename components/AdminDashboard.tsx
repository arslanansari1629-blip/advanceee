"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LogViewer from "./LogViewer";
import {
  IconActivity,
  IconBolt,
  IconCloud,
  IconGrid,
  IconLock,
  IconPlay,
  IconRestart,
  IconRobot,
  IconSearch,
  IconSettings,
  IconShield,
  IconStop,
  IconTerminal,
  IconTrash,
  IconWarn,
} from "./icons";
import { Metric, StatusPill, Toggle, cx, fmtDuration, timeAgo, useNow } from "./ui";

type Tab = "overview" | "bots" | "users" | "logs" | "platform";

interface AdminBot {
  id: string;
  name: string;
  status: string;
  mode: string;
  framework: string;
  entry: string;
  requirements: string;
  restartCount: number;
  autoRestart: boolean;
  startedAt: number | null;
  createdAt: number;
  lastError: string | null;
  tokenMasked: string | null;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  stats: { cpu: number; memMB: number; uptimePct: number };
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  createdAt: number;
  runnerUrl: string | null;
  bots: number;
  live: number;
}

interface AdminData {
  storage: string;
  runner: { connected: boolean; mode: string; python?: string; latencyMs?: number; error?: string };
  settings: { maintenance: boolean; maintenanceMessage: string; broadcast: string; signupsOpen: boolean };
  stats: {
    users: number;
    bots: number;
    running: number;
    stopped: number;
    crashed: number;
    installing: number;
    restarts: number;
    packages: number;
    cpu: number;
    memMB: number;
    suspended: number;
  };
  users: AdminUser[];
  bots: AdminBot[];
}

const PLANS = ["unlimited-free", "pro", "founder", "suspended"];

export default function AdminDashboard() {
  const router = useRouter();
  const now = useNow();
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [logBot, setLogBot] = useState<AdminBot | null>(null);
  const [settings, setSettings] = useState<AdminData["settings"] | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/data", { cache: "no-store" });
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const json: AdminData = await res.json();
      setData(json);
      setSettings((prev) => prev ?? json.settings);
    } catch {
      /* ignore */
    }
  }, [router]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const botAction = async (bot: AdminBot, action: string) => {
    if (action === "delete" && !confirm(`Delete "${bot.name}" (${bot.ownerEmail}) and its logs?`)) return;
    setBusy(bot.id);
    try {
      const res = await fetch("/api/admin/bot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ botId: bot.id, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "action failed");
      flash(`${action} → ${bot.name}`);
      if (action === "delete" && logBot?.id === bot.id) setLogBot(null);
      await load();
    } catch (err: any) {
      flash(err?.message ?? "action failed");
    } finally {
      setBusy(null);
    }
  };

  const userAction = async (user: AdminUser, action: string, plan?: string) => {
    if (action === "delete" && !confirm(`Delete ${user.email} and all ${user.bots} bot(s)?`)) return;
    setBusy(user.id);
    try {
      const res = await fetch("/api/admin/user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id, action, plan }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "action failed");
      flash(action === "plan" ? `plan → ${plan}` : `${action} → ${user.email}`);
      await load();
    } catch (err: any) {
      flash(err?.message ?? "action failed");
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = async (patch: Partial<AdminData["settings"]>) => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (res.ok) {
        setSettings(json.settings);
        flash("platform settings saved");
        await load();
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  };

  const filteredBots = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    return data.bots.filter((b) => {
      if (stateFilter !== "all" && b.status !== stateFilter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.ownerEmail.toLowerCase().includes(q) ||
        b.framework.toLowerCase().includes(q)
      );
    });
  }, [data, query, stateFilter]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    return data.users.filter(
      (u) => !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    );
  }, [data, query]);

  if (!data) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-3 p-6">
        <div className="shimmer h-10 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shimmer h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const s = data.stats;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "bots", label: "All bots", count: data.bots.length },
    { id: "users", label: "Accounts", count: data.users.length },
    { id: "logs", label: "Live logs" },
    { id: "platform", label: "Platform" },
  ];

  return (
    <div className="min-h-screen">
      {/* operator chrome */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#06070c]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-300">
              <IconShield size={16} />
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight text-white">Operator console</p>
              <p className="mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                full platform control
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <span className="pill !text-[10px] border-white/10">
              storage <span className="mono ml-1 text-slate-300">{data.storage}</span>
            </span>
            <span
              className={cx(
                "pill !text-[10px]",
                data.runner.connected
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-200"
              )}
            >
              <span className={cx("dot", data.runner.connected ? "dot-live" : "dot-warn")} />
              {data.runner.connected ? "runner online" : "preview"}
            </span>
            {data.settings.maintenance && (
              <span className="pill !text-[10px] border-rose-400/30 bg-rose-400/10 text-rose-200">
                <span className="dot dot-err" /> maintenance
              </span>
            )}
            <button className="btn !py-1 !text-[11px]" onClick={load}>
              <IconRestart size={11} /> Sync
            </button>
            <button className="btn btn-danger !py-1 !text-[11px]" onClick={logout}>
              <IconLock size={11} /> Lock
            </button>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1500px] gap-1 px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                "relative px-3 py-2 text-[12px] font-semibold transition-colors",
                tab === t.id ? "text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {t.label}
              {t.count !== undefined && <span className="ml-1 text-[10px] text-slate-500">{t.count}</span>}
              {tab === t.id && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-4 px-4 py-5">
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-cyan-400/30 bg-[#0b1220] px-3.5 py-2 text-[12px] text-cyan-100 shadow-xl">
            {toast}
          </div>
        )}

        {/* ---------------------------------------------------------- overview */}
        {tab === "overview" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <Metric label="Accounts" value={s.users} sub={`${s.suspended} suspended`} accent="violet" />
              <Metric label="Bots" value={s.bots} sub={`${s.running} live`} accent="cyan" />
              <Metric label="Crashed" value={s.crashed} sub={s.crashed ? "needs attention" : "all healthy"} accent={s.crashed ? "rose" : "lime"} />
              <Metric label="Restarts" value={s.restarts} sub="all time" accent="violet" />
              <Metric label="Packages" value={s.packages} sub="installed fleet-wide" accent="cyan" />
              <Metric label="Fleet load" value={`${s.cpu.toFixed(1)}%`} sub={`${Math.round(s.memMB)} MB rss`} accent="lime" />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div className="glass overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-2.5">
                  <IconRobot size={13} className="text-slate-400" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    newest bots
                  </p>
                  <button className="btn btn-ghost ml-auto !py-1 !text-[11px]" onClick={() => setTab("bots")}>
                    view all
                  </button>
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {data.bots.slice(0, 7).map((b) => (
                    <div key={b.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-white">{b.name}</p>
                        <p className="mono truncate text-[10px] text-slate-500">
                          {b.ownerEmail} · {b.framework}
                        </p>
                      </div>
                      <StatusPill status={b.status as any} mode={b.mode} />
                      <span className="mono text-[10.5px] text-slate-500">
                        {b.status === "running" && b.startedAt ? fmtDuration(now - b.startedAt) : "—"}
                      </span>
                      <button className="btn btn-ghost !px-1.5 !py-1" onClick={() => { setLogBot(b); setTab("logs"); }}>
                        <IconTerminal size={12} />
                      </button>
                    </div>
                  ))}
                  {data.bots.length === 0 && (
                    <p className="px-4 py-6 text-center text-[12px] text-slate-600">no bots deployed yet</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <IconCloud size={13} /> runtime
                  </p>
                  <div className="mt-2 space-y-1.5 text-[11.5px]">
                    <Row k="mode" v={data.runner.connected ? "real runner" : "preview gateway"} />
                    <Row k="python" v={data.runner.python ?? "3.11.9"} />
                    <Row k="latency" v={data.runner.latencyMs ? `${data.runner.latencyMs} ms` : "—"} />
                    <Row k="storage" v={data.storage} />
                    <Row k="signups" v={data.settings.signupsOpen ? "open" : "closed"} />
                  </div>
                </div>
                <div className="glass p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <IconActivity size={13} /> newest accounts
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {data.users.slice(0, 6).map((u) => (
                      <div key={u.id} className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-cyan-400/70 to-violet-500/70 text-[10px] font-bold text-black">
                          {u.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[11.5px] text-slate-300">{u.email}</span>
                        <span className="mono text-[10px] text-slate-500">{u.bots} bots</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* -------------------------------------------------------------- bots */}
        {(tab === "bots" || tab === "users") && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <IconSearch size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === "bots" ? "search bot, owner, framework…" : "search email or name…"}
                className="input !py-1.5 !pl-8 !text-[12px]"
                style={{ width: 260 }}
              />
            </div>
            {tab === "bots" &&
              ["all", "running", "stopped", "crashed", "installing"].map((f) => (
                <button
                  key={f}
                  onClick={() => setStateFilter(f)}
                  className={cx(
                    "rounded-md px-2 py-1 text-[10.5px] font-semibold capitalize",
                    stateFilter === f ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {f}
                </button>
              ))}
            <span className="mono ml-auto text-[10.5px] text-slate-500">
              {tab === "bots" ? `${filteredBots.length} bots` : `${filteredUsers.length} accounts`}
            </span>
          </div>
        )}

        {tab === "bots" && (
          <div className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[12px]">
                <thead className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Bot</th>
                    <th className="px-3 py-2 font-semibold">Owner</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Uptime</th>
                    <th className="px-3 py-2 font-semibold">CPU / RSS</th>
                    <th className="px-3 py-2 font-semibold">Pkgs</th>
                    <th className="px-3 py-2 text-right font-semibold">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredBots.map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-white">{b.name}</p>
                        <p className="mono text-[10px] text-slate-500">{b.framework}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-slate-300">{b.ownerEmail}</p>
                        <p className="text-[10px] text-slate-600">{b.ownerName}</p>
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill status={b.status as any} mode={b.mode} />
                        {b.lastError && (
                          <p className="mono mt-1 max-w-[180px] truncate text-[9.5px] text-rose-400">{b.lastError}</p>
                        )}
                      </td>
                      <td className="mono px-3 py-2 text-slate-300">
                        {b.status === "running" && b.startedAt ? fmtDuration(now - b.startedAt) : "—"}
                      </td>
                      <td className="mono px-3 py-2 text-slate-300">
                        {b.status === "running" ? `${b.stats.cpu.toFixed(1)}% · ${Math.round(b.stats.memMB)}mb` : "—"}
                      </td>
                      <td className="mono px-3 py-2 text-slate-400">
                        {b.requirements.split("\n").filter(Boolean).length}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {b.status === "running" ? (
                            <button className="btn !px-1.5 !py-1 !text-[10px]" disabled={busy === b.id} onClick={() => botAction(b, "stop")}>
                              <IconStop size={10} />
                            </button>
                          ) : (
                            <button className="btn !px-1.5 !py-1 !text-[10px]" disabled={busy === b.id} onClick={() => botAction(b, "start")}>
                              <IconPlay size={10} />
                            </button>
                          )}
                          <button className="btn !px-1.5 !py-1 !text-[10px]" disabled={busy === b.id} onClick={() => botAction(b, "restart")} title="Restart">
                            <IconRestart size={10} />
                          </button>
                          <button className="btn !px-1.5 !py-1 !text-[10px]" onClick={() => { setLogBot(b); setTab("logs"); }} title="Logs">
                            <IconTerminal size={10} />
                          </button>
                          <button className="btn btn-danger !px-1.5 !py-1 !text-[10px]" disabled={busy === b.id} onClick={() => botAction(b, "delete")} title="Delete">
                            <IconTrash size={10} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBots.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-slate-600">no bots match</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- users */}
        {tab === "users" && (
          <div className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-[12px]">
                <thead className="border-b border-white/[0.07] text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Account</th>
                    <th className="px-3 py-2 font-semibold">Plan</th>
                    <th className="px-3 py-2 font-semibold">Bots</th>
                    <th className="px-3 py-2 font-semibold">Runner</th>
                    <th className="px-3 py-2 font-semibold">Joined</th>
                    <th className="px-3 py-2 text-right font-semibold">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-white">{u.name}</p>
                        <p className="mono text-[10.5px] text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={u.plan}
                          onChange={(e) => userAction(u, "plan", e.target.value)}
                          disabled={busy === u.id}
                          className={cx(
                            "rounded-md border bg-black/40 px-1.5 py-1 text-[11px] outline-none",
                            u.plan === "suspended"
                              ? "border-rose-400/40 text-rose-300"
                              : u.plan === "founder"
                              ? "border-violet-400/40 text-violet-200"
                              : "border-white/15 text-slate-200"
                          )}
                        >
                          {PLANS.map((p) => (
                            <option key={p} value={p} className="bg-[#0b1220]">
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-slate-300">{u.bots}</span>
                        <span className="ml-1 text-[10px] text-emerald-400">{u.live} live</span>
                      </td>
                      <td className="mono px-3 py-2 text-[10.5px] text-slate-500">{u.runnerUrl ?? "—"}</td>
                      <td className="px-3 py-2 text-[10.5px] text-slate-500">{timeAgo(u.createdAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className="btn btn-danger !px-1.5 !py-1 !text-[10px]"
                          disabled={busy === u.id}
                          onClick={() => userAction(u, "delete")}
                        >
                          <IconTrash size={10} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-slate-600">no accounts match</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------- logs */}
        {tab === "logs" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                inspected bot
              </label>
              <select
                value={logBot?.id ?? ""}
                onChange={(e) => {
                  const found = data.bots.find((b) => b.id === e.target.value) ?? null;
                  setLogBot(found);
                }}
                className="input mono !w-auto !py-1.5 !text-[11.5px]"
              >
                <option value="">— pick a bot —</option>
                {data.bots.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#0b1220]">
                    {b.name} · {b.ownerEmail} · {b.status}
                  </option>
                ))}
              </select>
              {logBot && (
                <div className="flex items-center gap-1.5">
                  <StatusPill status={logBot.status as any} mode={logBot.mode} />
                  <span className="mono text-[10.5px] text-slate-500">{logBot.framework}</span>
                </div>
              )}
            </div>

            {logBot ? (
              <LogViewer
                key={logBot.id}
                botId={logBot.id}
                endpoint={`/api/admin/logs?botId=${logBot.id}`}
                height={520}
                readOnly
              />
            ) : (
              <div className="glass grid place-items-center py-16 text-center">
                <IconTerminal size={22} className="text-slate-600" />
                <p className="mt-2 text-[12.5px] text-slate-500">Select a bot to stream its live logs.</p>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------- platform */}
        {tab === "platform" && settings && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <IconSettings size={13} /> site control
              </p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                  <div>
                    <p className="text-[12px] font-semibold text-white">Registration open</p>
                    <p className="text-[10.5px] text-slate-500">new accounts can be created</p>
                  </div>
                  <Toggle
                    checked={settings.signupsOpen}
                    onChange={(v) => saveSettings({ signupsOpen: v })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                  <div>
                    <p className="text-[12px] font-semibold text-white">Maintenance banner</p>
                    <p className="text-[10.5px] text-slate-500">shown on the landing page and console</p>
                  </div>
                  <Toggle
                    checked={settings.maintenance}
                    onChange={(v) => saveSettings({ maintenance: v })}
                  />
                </div>
                <div>
                  <label className="label">Maintenance message</label>
                  <textarea
                    className="textarea !text-[12px]"
                    style={{ minHeight: 64 }}
                    value={settings.maintenanceMessage}
                    onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                    placeholder="Deploys are paused for a few minutes while we upgrade the runtime."
                  />
                </div>
                <div>
                  <label className="label">Broadcast to all users</label>
                  <textarea
                    className="textarea !text-[12px]"
                    style={{ minHeight: 64 }}
                    value={settings.broadcast}
                    onChange={(e) => setSettings({ ...settings, broadcast: e.target.value })}
                    placeholder="New: Pyrogram session files now persist across restarts."
                  />
                </div>
                <button
                  className="btn btn-primary w-full !py-2"
                  disabled={savingSettings}
                  onClick={() =>
                    saveSettings({
                      maintenance: settings.maintenance,
                      maintenanceMessage: settings.maintenanceMessage,
                      broadcast: settings.broadcast,
                      signupsOpen: settings.signupsOpen,
                    })
                  }
                >
                  {savingSettings ? "Saving…" : "Publish settings"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <IconCloud size={13} /> deployment
                </p>
                <div className="mt-2 space-y-1.5 text-[11.5px]">
                  <Row k="storage backend" v={data.storage} />
                  <Row k="runner" v={data.runner.connected ? data.runner.mode : "preview only"} />
                  <Row k="python" v={data.runner.python ?? "3.11.9"} />
                  <Row k="region" v="iad1 (vercel)" />
                  <Row k="signups" v={data.settings.signupsOpen ? "open" : "closed"} />
                </div>
              </div>

              <div className="glass border-amber-400/20 p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  <IconWarn size={12} /> operator notes
                </p>
                <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-slate-400">
                  <li>• Deleting an account removes every bot and log owned by it.</li>
                  <li>• “Suspended” blocks sign-in immediately; bots keep running until stopped.</li>
                  <li>• Preview-mode bots simulate the gateway — attach a runner for real processes.</li>
                  <li>• This console is never linked from the public site.</li>
                </ul>
              </div>

              <div className="glass p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <IconGrid size={13} /> coverage
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    ["bots", s.bots],
                    ["live", s.running],
                    ["crashed", s.crashed],
                    ["installing", s.installing],
                    ["accounts", s.users],
                    ["suspended", s.suspended],
                  ].map(([k, v]) => (
                    <div key={k as string} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
                      <p className="text-[9.5px] uppercase tracking-wider text-slate-500">{k}</p>
                      <p className="mono text-slate-200">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{k}</span>
      <span className="mono text-slate-300">{v}</span>
    </div>
  );
}
