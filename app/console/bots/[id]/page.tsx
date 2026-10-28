"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CodeEditor from "@/components/CodeEditor";
import LogViewer from "@/components/LogViewer";
import {
  IconActivity,
  IconBolt,
  IconCheck,
  IconChevron,
  IconFile,
  IconPlay,
  IconPlus,
  IconRestart,
  IconRobot,
  IconStop,
  IconTrash,
  IconWarn,
} from "@/components/icons";
import { Metric, StatusPill, Toggle, cx, fmtDuration, timeAgo, useNow } from "@/components/ui";
import type { Bot } from "@/lib/types";

type Tab = "logs" | "code" | "requirements" | "env" | "events";

export default function BotDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bot, setBot] = useState<Bot | null>(null);
  const [tab, setTab] = useState<Tab>("logs");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<{ path: string; content: string }[]>([]);
  const [activeFile, setActiveFile] = useState("main.py");
  const [requirements, setRequirements] = useState("");
  const [env, setEnv] = useState<{ k: string; v: string }[]>([]);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const now = useNow();

  const load = useCallback(async () => {
    const res = await fetch(`/api/bots/${id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const b: Bot = data.bot;
    setBot(b);
    setFiles(b.files?.length ? b.files : [{ path: "main.py", content: b.content ?? "" }]);
    setActiveFile((prev) => (b.files?.some((f) => f.path === prev) ? prev : b.files?.[0]?.path ?? "main.py"));
    setRequirements(b.requirements ?? "");
    setEnv(Object.entries(b.env ?? {}).map(([k, v]) => ({ k, v })));
    setName(b.name);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: string) => {
    setBusy(true);
    try {
      if (action === "delete") {
        if (!confirm("Delete this bot and all its logs?")) return;
        await fetch(`/api/bots/${id}`, { method: "DELETE" });
        router.push("/console");
        return;
      }
      await fetch(`/api/bots/${id}/action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const envObj: Record<string, string> = {};
      for (const row of env) if (row.k.trim()) envObj[row.k.trim()] = row.v;
      await fetch(`/api/bots/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, files, requirements, env: envObj }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!bot) {
    return <div className="shimmer h-64 rounded-2xl" />;
  }

  const running = bot.status === "running";
  const uptime = running && bot.startedAt ? fmtDuration(now - bot.startedAt) : "—";
  const installed = (bot.installed ?? []).length;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "logs", label: "Live logs" },
    { id: "code", label: "Source", count: files.length },
    { id: "requirements", label: "Requirements", count: requirements.split("\n").filter(Boolean).length },
    { id: "env", label: "Secrets", count: env.filter((e) => e.k).length },
    { id: "events", label: "Timeline", count: bot.events?.length },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex items-center gap-2 text-[11.5px] text-slate-500">
        <Link href="/console" className="hover:text-slate-300">
          fleet
        </Link>
        <IconChevron size={11} />
        <span className="text-slate-300">{bot.name}</span>
      </div>

      {/* header */}
      <div className="glass relative overflow-hidden p-4">
        <div className={cx("absolute inset-x-0 top-0 h-px", running ? "bg-gradient-to-r from-emerald-400/70 via-cyan-400/40 to-transparent" : "bg-white/10")} />
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-300">
            <IconRobot size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 max-w-full bg-transparent text-[20px] font-semibold tracking-tight text-white outline-none focus:border-b focus:border-cyan-400/50"
              />
              <StatusPill status={bot.status} mode={bot.mode} />
              {bot.autoRestart && <span className="pill !text-[9.5px] border-emerald-400/25 text-emerald-300">auto-restart</span>}
              {bot.mode === "preview" && <span className="pill !text-[9.5px] border-amber-400/25 text-amber-200">simulated gateway</span>}
            </div>
            <p className="mono mt-1 text-[10.5px] text-slate-500">
              {bot.framework} · {bot.entry} · id {bot.id}
            </p>
            <p className="mono mt-0.5 text-[10.5px] text-slate-500">
              token {bot.tokenMasked ?? "from env"} · created {timeAgo(bot.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {running ? (
              <button className="btn !py-1.5 !text-[11.5px]" onClick={() => act("stop")} disabled={busy}>
                <IconStop size={12} /> Stop
              </button>
            ) : (
              <button className="btn !py-1.5 !text-[11.5px]" onClick={() => act("start")} disabled={busy}>
                <IconPlay size={12} /> Start
              </button>
            )}
            <button className="btn !py-1.5 !text-[11.5px]" onClick={() => act("restart")} disabled={busy}>
              <IconRestart size={12} /> Restart
            </button>
            <button className="btn btn-primary !py-1.5 !text-[11.5px]" onClick={() => act("redeploy")} disabled={busy}>
              <IconBolt size={12} /> Redeploy
            </button>
            <button className="btn btn-danger !py-1.5 !text-[11.5px]" onClick={() => act("delete")} disabled={busy}>
              <IconTrash size={12} />
            </button>
          </div>
        </div>

        {bot.lastError && bot.status === "crashed" && (
          <p className="mono mt-3 flex items-start gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/[0.07] px-2.5 py-1.5 text-[11px] text-rose-200">
            <IconWarn size={12} className="mt-0.5 shrink-0" /> {bot.lastError}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Uptime" value={uptime} sub={running ? "since last restart" : "not running"} accent="lime" />
        <Metric label="Restarts" value={bot.restartCount} sub={`auto-restart ${bot.autoRestart ? "on" : "off"}`} accent="violet" />
        <Metric
          label="CPU / RSS"
          value={running ? `${bot.stats.cpu.toFixed(1)}%` : "—"}
          sub={running ? `${Math.round(bot.stats.memMB)} MB resident` : "process idle"}
          accent="cyan"
        />
        <Metric label="Packages" value={installed} sub={bot.installState} accent="cyan" />
      </div>

      {/* tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.07] pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
              tab === t.id ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1 text-[10px] text-slate-500">{t.count}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {saved && <span className="text-[11px] text-emerald-300">saved ✓</span>}
          {tab !== "logs" && tab !== "events" && (
            <button className="btn !py-1 !text-[11.5px]" onClick={save} disabled={busy}>
              <IconCheck size={11} /> Save changes
            </button>
          )}
        </div>
      </div>

      {tab === "logs" && (
        <div className="space-y-3">
          <LogViewer botId={bot.id} height={480} />
          <div className="glass flex flex-wrap items-center gap-3 px-4 py-3 text-[11.5px]">
            <span className="flex items-center gap-1.5 text-slate-400">
              <IconActivity size={12} /> supervisor
            </span>
            <span className="text-slate-500">
              auto-restart {bot.autoRestart ? "armed" : "disabled"} · backoff 1s→60s · max 10 attempts/min
            </span>
            <div className="ml-auto">
              <Toggle
                checked={bot.autoRestart}
                onChange={() => act("toggle-auto-restart")}
                label="Auto-restart"
              />
            </div>
          </div>
        </div>
      )}

      {tab === "code" && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {files.map((f) => (
              <button
                key={f.path}
                onClick={() => setActiveFile(f.path)}
                className={cx(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px]",
                  activeFile === f.path
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 bg-white/[0.03] text-slate-400"
                )}
              >
                <IconFile size={11} /> {f.path}
              </button>
            ))}
            <button
              className="btn btn-ghost !px-1.5 !py-1"
              onClick={() => {
                const path = prompt("New file name", `module_${files.length + 1}.py`);
                if (!path) return;
                setFiles([...files, { path, content: "" }]);
                setActiveFile(path);
              }}
            >
              <IconPlus size={13} />
            </button>
            <span className="mono ml-auto text-[10.5px] text-slate-500">editing → save → redeploy</span>
          </div>
          <CodeEditor
            value={files.find((f) => f.path === activeFile)?.content ?? ""}
            onChange={(v) =>
              setFiles(files.map((f) => (f.path === activeFile ? { ...f, content: v } : f)))
            }
            height={520}
          />
        </div>
      )}

      {tab === "requirements" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="glass p-4">
            <label className="label">requirements.txt</label>
            <textarea
              className="textarea mono !text-[12px]"
              style={{ minHeight: 220 }}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
            <p className="mt-2 text-[11px] text-slate-500">
              Save, then hit <strong>Redeploy</strong> — pip resolves the diff and restarts the process.
            </p>
          </div>
          <div className="glass p-4">
            <p className="label">installed on runner</p>
            <div className="flex flex-wrap gap-1.5">
              {(bot.installed ?? []).map((p) => (
                <span key={p} className="pill !py-0.5 !text-[10.5px] border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200">
                  <IconCheck size={9} /> {p}
                </span>
              ))}
              {(bot.installed ?? []).length === 0 && <p className="text-[12px] text-slate-600">nothing installed yet</p>}
            </div>
            <p className="mt-4 label">detected framework</p>
            <p className="text-[12.5px] text-slate-300">{bot.framework}</p>
            <p className="mt-4 label">build state</p>
            <p className="mono text-[12.5px] text-slate-300">{bot.installState}</p>
          </div>
        </div>
      )}

      {tab === "env" && (
        <div className="glass max-w-2xl p-4">
          <label className="label">environment variables</label>
          <div className="space-y-1.5">
            {env.map((row, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  className="input mono !py-1.5 !text-[11.5px]"
                  style={{ width: "40%" }}
                  value={row.k}
                  onChange={(e) => setEnv(env.map((r, idx) => (idx === i ? { ...r, k: e.target.value } : r)))}
                />
                <input
                  className="input mono !py-1.5 !text-[11.5px]"
                  value={row.v}
                  onChange={(e) => setEnv(env.map((r, idx) => (idx === i ? { ...r, v: e.target.value } : r)))}
                />
                <button className="btn btn-ghost !px-1.5" onClick={() => setEnv(env.filter((_, idx) => idx !== i))}>
                  <IconTrash size={12} />
                </button>
              </div>
            ))}
            <button className="btn !py-1 !text-[11px]" onClick={() => setEnv([...env, { k: "", v: "" }])}>
              <IconPlus size={11} /> Add variable
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Values are injected into the process environment at boot. Changing a secret requires a redeploy.
          </p>
        </div>
      )}

      {tab === "events" && (
        <div className="glass p-4">
          <div className="space-y-3">
            {(bot.events ?? []).map((e) => (
              <div key={e.id} className="flex gap-3">
                <span
                  className={cx(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    e.type === "crash" ? "bg-rose-400" : e.type === "restart" ? "bg-violet-400" : e.type === "stop" ? "bg-slate-500" : "bg-emerald-400"
                  )}
                />
                <div>
                  <p className="text-[12.5px] text-slate-200">{e.message}</p>
                  <p className="text-[10.5px] text-slate-600">
                    {new Date(e.ts).toLocaleString()} · {timeAgo(e.ts)} · {e.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
