"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CodeEditor from "@/components/CodeEditor";
import LogViewer from "@/components/LogViewer";
import {
  IconActivity,
  IconBolt,
  IconChevron,
  IconClose,
  IconFile,
  IconGlobe,
  IconPause,
  IconPlay,
  IconPlus,
  IconRestart,
  IconRobot,
  IconSettings,
  IconTrash,
  IconWarn,
} from "@/components/icons";
import { Banner, Metric, StatusPill, cx, timeAgo } from "@/components/ui";
import type { Bot, BehaviourCommand } from "@/lib/types";

type Tab = "overview" | "code" | "behaviour" | "settings";
type LiveBot = Bot & { hasToken: boolean };

const EVENT_DOT: Record<string, string> = {
  create: "bg-cyan-400",
  deploy: "bg-emerald-400",
  start: "bg-emerald-400",
  restart: "bg-violet-400",
  stop: "bg-slate-500",
  error: "bg-rose-400",
  edit: "bg-cyan-400",
  note: "bg-amber-400",
  delete: "bg-rose-400",
};

export default function BotDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bot, setBot] = useState<LiveBot | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const [files, setFiles] = useState<{ path: string; content: string }[]>([]);
  const [activeFile, setActiveFile] = useState("main.py");
  const [requirements, setRequirements] = useState("");
  const [dirty, setDirty] = useState(false);

  const [cmds, setCmds] = useState<BehaviourCommand[]>([]);
  const [echo, setEcho] = useState("");
  const [fallback, setFallback] = useState("");
  const [fallbackOn, setFallbackOn] = useState(false);
  const [behaviourDirty, setBehaviourDirty] = useState(false);

  const [token, setToken] = useState("");
  const [tokenOpen, setTokenOpen] = useState(false);
  const [env, setEnv] = useState<{ k: string; v: string }[]>([]);
  const [name, setName] = useState("");
  const hydrated = useRef(false);

  const load = useCallback(
    async (silent = false) => {
      const res = await fetch(`/api/bots/${id}${silent ? "?sync=1" : ""}`, { cache: "no-store" });
      if (!res.ok) return;
      const data: LiveBot = (await res.json()).bot;
      setBot(data);
      if (!hydrated.current) {
        hydrated.current = true;
        setFiles(data.files?.length ? data.files : [{ path: data.entry, content: data.content }]);
        setActiveFile(data.entry);
        setRequirements(data.requirements ?? "");
        setName(data.name);
        setToken("");
        setEnv(Object.entries(data.env ?? {}).map(([k, v]) => ({ k, v })));
        setCmds(data.behaviour?.commands ?? []);
        setEcho(data.behaviour?.echo ?? "");
        setFallback(data.behaviour?.fallback ?? "");
        setFallbackOn(Boolean(data.behaviour?.fallback));
      }
    },
    [id]
  );

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 20_000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (action: string) => {
    if (action === "delete") {
      if (!confirm("Delete this bot and remove its webhook? This cannot be undone.")) return;
      setBusy(action);
      await fetch(`/api/bots/${id}`, { method: "DELETE" });
      router.push("/console");
      return;
    }
    setBusy(action);
    setNote(null);
    try {
      const res = await fetch(`/api/bots/${id}/action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.bot) setBot(data.bot);
      if (data.bot?.lastError) setNote({ ok: false, text: data.bot.lastError });
      else setNote({ ok: true, text: `${action} → done` });
    } finally {
      setBusy(null);
    }
  };

  const patch = async (body: any, key: string) => {
    setBusy(key);
    setNote(null);
    try {
      const res = await fetch(`/api/bots/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "save failed");
      setBot(data.bot);
      setNote({ ok: true, text: "Saved" });
      return data.bot as LiveBot;
    } catch (err: any) {
      setNote({ ok: false, text: err?.message ?? "save failed" });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const saveCode = async () => {
    const updated = await patch({ files, requirements }, "code");
    if (updated) {
      setDirty(false);
      setCmds(updated.behaviour?.commands ?? []);
    }
  };

  const saveBehaviour = async () => {
    const updated = await patch(
      {
        behaviour: {
          commands: cmds,
          echo: echo.trim() ? echo : null,
          fallback: fallbackOn && fallback.trim() ? fallback : null,
        },
      },
      "behaviour"
    );
    if (updated) {
      setBehaviourDirty(false);
      setCmds(updated.behaviour?.commands ?? []);
    }
  };

  const saveSettings = async () => {
    const envObj: Record<string, string> = {};
    for (const r of env) if (r.k.trim()) envObj[r.k.trim()] = r.v;
    const body: any = { name, env: envObj, requirements };
    if (token.trim()) body.token = token.trim();
    const updated = await patch(body, "settings");
    if (updated) {
      setToken("");
      setTokenOpen(false);
      setBot(updated);
    }
  };

  const currentCode = files.find((f) => f.path === activeFile)?.content ?? "";
  const live = bot?.status === "live";

  const actions = useMemo(() => {
    if (!bot) return [];
    return [
      live
        ? { key: "stop", label: "Pause", icon: IconPause, tone: "" }
        : { key: "start", label: "Go live", icon: IconPlay, tone: "btn-primary" },
      { key: "restart", label: "Re-register", icon: IconRestart, tone: "" },
      { key: "redeploy", label: "Recompile", icon: IconBolt, tone: "" },
      { key: "sync", label: "Sync", icon: IconActivity, tone: "" },
    ];
  }, [bot, live]);

  if (!bot) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-3">
        <div className="shimmer h-10 w-64 rounded-lg" />
        <div className="shimmer h-28 rounded-2xl" />
        <div className="shimmer h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
            <Link href="/console" className="hover:text-slate-300">console</Link>
            <IconChevron size={11} />
            <span className="text-slate-400">{bot.name}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-[22px] font-semibold tracking-tight text-white">{bot.name}</h1>
            <StatusPill status={bot.status} />
            {bot.telegram.username && (
              <a
                href={`https://t.me/${bot.telegram.username}`}
                target="_blank"
                rel="noreferrer"
                className="pill !text-[10px] border-cyan-400/25 text-cyan-200 hover:border-cyan-400/60"
              >
                <IconGlobe size={10} /> @{bot.telegram.username}
              </a>
            )}
          </div>
          <p className="mono mt-0.5 text-[11px] text-slate-500">
            {bot.framework} · bot id {bot.telegram.botId ?? "—"} · token {bot.tokenMasked ?? "not set"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {actions.map((a) => (
            <button
              key={a.key}
              className={cx("btn !text-[11.5px]", a.tone)}
              onClick={() => act(a.key)}
              disabled={busy === a.key}
            >
              <a.icon size={12} /> {busy === a.key ? "…" : a.label}
            </button>
          ))}
          <button className="btn !px-2 !text-rose-300 hover:!border-rose-400/40" onClick={() => act("delete")} title="Delete">
            <IconTrash size={12} />
          </button>
        </div>
      </div>

      {note && (
        <p
          className={cx(
            "rounded-lg border px-3 py-2 text-[12px]",
            note.ok
              ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200"
              : "border-rose-400/25 bg-rose-400/[0.07] text-rose-200"
          )}
        >
          {note.text}
        </p>
      )}

      {(bot.status === "draft" || bot.status === "error") && (
        <Banner
          tone={bot.status === "error" ? "error" : "warn"}
          title={bot.status === "error" ? "This bot is not answering" : "Add a token to go live"}
          action={
            <button className="btn !py-1 !text-[11.5px]" onClick={() => { setTab("settings"); setTokenOpen(true); }}>
              <IconSettings size={12} /> Set token
            </button>
          }
        >
          {bot.lastError ?? "Paste the token from @BotFather in Settings, then press Go live."}
        </Banner>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Status" value={live ? "live" : bot.status} sub={live ? "answering now" : "not delivered"} accent={live ? "lime" : bot.status === "error" ? "rose" : "cyan"} />
        <Metric label="Updates" value={bot.telegram.updates} sub={`last ${bot.telegram.lastUpdateAt ? timeAgo(bot.telegram.lastUpdateAt) : "never"}`} accent="cyan" />
        <Metric label="Replies" value={bot.telegram.replies} sub={`${bot.telegram.errors} errors`} accent="violet" />
        <Metric label="Pending" value={bot.telegram.pendingUpdates} sub="queued by telegram" accent="violet" />
        <Metric label="Uptime" value={`${bot.stats.uptimePct}%`} sub="webhook mode" accent="lime" />
      </div>

      <div className="flex gap-1 border-b border-white/[0.07]">
        {([
          ["overview", "Overview"],
          ["code", "Code"],
          ["behaviour", "Behaviour"],
          ["settings", "Settings"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-[12px] font-semibold transition-colors",
              tab === k
                ? "border-cyan-400 text-white"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            {label}
            {k === "code" && dirty && <span className="ml-1 text-amber-400">•</span>}
            {k === "behaviour" && behaviourDirty && <span className="ml-1 text-amber-400">•</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 pb-1">
          {tab === "code" && (
            <button className="btn btn-primary !py-1 !text-[11.5px]" onClick={saveCode} disabled={busy === "code" || !dirty}>
              Save {dirty ? "changes" : ""}
            </button>
          )}
          {tab === "behaviour" && (
            <button className="btn btn-primary !py-1 !text-[11.5px]" onClick={saveBehaviour} disabled={busy === "behaviour"}>
              Save behaviour
            </button>
          )}
          {tab === "settings" && (
            <button className="btn btn-primary !py-1 !text-[11.5px]" onClick={saveSettings} disabled={busy === "settings"}>
              Save settings
            </button>
          )}
        </div>
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-3">
            <div className="glass p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <IconRobot size={12} /> compiled behaviour
              </p>
              <div className="mt-2 space-y-1.5">
                {(bot.behaviour.commands ?? []).map((c) => (
                  <div key={c.cmd} className="flex gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                    <span className="mono shrink-0 text-[11px] font-semibold text-cyan-300">/{c.cmd}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">{c.reply.replace(/\n/g, " ⏎ ")}</span>
                    <span
                      className={cx(
                        "pill shrink-0 !py-0 !text-[8.5px]",
                        c.source === "code" ? "border-emerald-400/30 text-emerald-300" : "border-white/10 text-slate-500"
                      )}
                    >
                      {c.source}
                    </span>
                  </div>
                ))}
                {!bot.behaviour.commands?.length && (
                  <p className="text-[12px] text-slate-500">
                    Nothing compiled — the engine only answers <code className="mono">/start</code>. Add handlers to your code.
                  </p>
                )}
              </div>
              {bot.behaviour.echo && (
                <p className="mt-2 text-[11.5px] text-slate-400">
                  <span className="text-slate-500">echo →</span> {bot.behaviour.echo.replace(/\n/g, " ⏎ ")}
                </p>
              )}
              {bot.behaviour.fallback && (
                <p className="mt-1 text-[11.5px] text-slate-400">
                  <span className="text-slate-500">fallback →</span> {bot.behaviour.fallback.replace(/\n/g, " ⏎ ")}
                </p>
              )}
              <button className="btn mt-3 !py-1 !text-[11px]" onClick={() => setTab("behaviour")}>
                <IconSettings size={11} /> Edit replies
              </button>
            </div>

            <LogViewer botId={bot.id} height={380} onStatus={(s) => setBot((b) => (b ? { ...b, status: s } : b))} />
          </div>

          <div className="space-y-3">
            <div className="glass p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <IconGlobe size={12} /> telegram
              </p>
              <div className="mt-2 space-y-2 text-[11.5px]">
                {[
                  ["username", bot.telegram.username ? `@${bot.telegram.username}` : "—"],
                  ["bot id", bot.telegram.botId ?? "—"],
                  ["webhook", bot.telegram.webhookOk ? "registered" : "not registered"],
                  ["secret", bot.hasToken ? "set" : "—"],
                  ["last sync", bot.telegram.lastSyncAt ? timeAgo(bot.telegram.lastSyncAt) : "never"],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">{k}</span>
                    <span className="mono truncate text-slate-300">{String(v)}</span>
                  </div>
                ))}
              </div>
              <p className="mono mt-2 break-all rounded-md border border-white/[0.06] bg-black/30 px-2 py-1.5 text-[10px] text-slate-400">
                {bot.telegram.webhookUrl ?? `(not set) → /api/tg/${bot.id.slice(0, 8)}…`}
              </p>
              {bot.telegram.lastError && (
                <p className="mt-2 flex items-start gap-1.5 rounded-md border border-rose-400/20 bg-rose-400/[0.07] px-2 py-1.5 text-[10.5px] text-rose-200">
                  <IconWarn size={11} className="mt-0.5 shrink-0" /> {bot.telegram.lastError}
                </p>
              )}
            </div>

            <div className="glass p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">settings</p>
              <div className="mt-2 space-y-1.5 text-[11.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">entry file</span>
                  <span className="mono text-slate-300">{bot.entry}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">files</span>
                  <span className="mono text-slate-300">{bot.files?.length ?? 1}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">requirements</span>
                  <span className="mono text-slate-300">{(bot.requirements || "").split("\n").filter(Boolean).length} pkgs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">auto re-register</span>
                  <button
                    onClick={() => patch({ autoRestart: !bot.autoRestart }, "auto")}
                    className={cx("mono text-[11px]", bot.autoRestart ? "text-emerald-300" : "text-slate-500")}
                  >
                    {bot.autoRestart ? "on" : "off"}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">restarts</span>
                  <span className="mono text-slate-300">{bot.restartCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">created</span>
                  <span className="mono text-slate-300">{timeAgo(bot.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="glass p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">events</p>
              <div className="mt-2 space-y-2">
                {(bot.events ?? []).slice(0, 8).map((e) => (
                  <div key={e.id} className="flex gap-2">
                    <span className={cx("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", EVENT_DOT[e.type] ?? "bg-slate-500")} />
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] text-slate-300">{e.message}</p>
                      <p className="text-[10px] text-slate-600">{timeAgo(e.ts)}</p>
                    </div>
                  </div>
                ))}
                {!bot.events?.length && <p className="text-[11.5px] text-slate-600">No events yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "code" && (
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {files.map((f) => (
                <div
                  key={f.path}
                  className={cx(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px]",
                    activeFile === f.path
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
                  )}
                >
                  <button onClick={() => setActiveFile(f.path)} className="flex items-center gap-1.5">
                    <IconFile size={11} /> {f.path}
                  </button>
                  {files.length > 1 && (
                    <button
                      className="text-slate-500 hover:text-rose-300"
                      onClick={() => {
                        setFiles(files.filter((x) => x.path !== f.path));
                        if (activeFile === f.path) setActiveFile(files.find((x) => x.path !== f.path)!.path);
                        setDirty(true);
                      }}
                    >
                      <IconClose size={10} />
                    </button>
                  )}
                </div>
              ))}
              <button
                className="btn btn-ghost !px-1.5 !py-1"
                onClick={() => {
                  const path = prompt("New file name", "helpers.py");
                  if (!path || files.some((f) => f.path === path)) return;
                  setFiles([...files, { path, content: "" }]);
                  setActiveFile(path);
                  setDirty(true);
                }}
              >
                <IconPlus size={13} />
              </button>
              <span className="mono ml-auto text-[10.5px] text-slate-500">{currentCode.split("\n").length} lines</span>
            </div>
            <CodeEditor
              value={currentCode}
              onChange={(v) => {
                setFiles(files.map((f) => (f.path === activeFile ? { ...f, content: v } : f)));
                setDirty(true);
              }}
              height={560}
            />
            <p className="text-[10.5px] text-slate-500">
              Saving recompiles the behaviour. Press <span className="text-slate-300">Recompile</span> afterwards to
              push the new replies live.
            </p>
          </div>
          <div className="glass space-y-3 p-4">
            <div>
              <label className="label">Requirements (auto-detected)</label>
              <textarea
                className="textarea mono !text-[11.5px]"
                style={{ minHeight: 130 }}
                value={requirements}
                onChange={(e) => {
                  setRequirements(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-slate-400">
              The webhook engine runs your <span className="text-white">handlers</span>, not arbitrary Python at
              request time. Every reply you write with{" "}
              <code className="mono text-cyan-300">reply_text</code>,{" "}
              <code className="mono text-cyan-300">bot.reply_to</code> or{" "}
              <code className="mono text-cyan-300">message.answer</code> is executed exactly as compiled, with{" "}
              <code className="mono">{"{first_name}"}</code>-style placeholders resolved per user.
            </div>
          </div>
        </div>
      )}

      {tab === "behaviour" && (
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="glass p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">command replies</p>
            <div className="mt-2 space-y-2">
              {cmds.map((c, i) => (
                <div key={`${c.cmd}-${i}`} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-md border border-white/10 bg-black/40 px-1.5">
                      <span className="mono text-[11px] text-slate-500">/</span>
                      <input
                        className="mono w-24 bg-transparent py-0.5 text-[11px] text-cyan-200 outline-none"
                        value={c.cmd}
                        onChange={(e) => {
                          setCmds(cmds.map((x, idx) => (idx === i ? { ...x, cmd: e.target.value.replace(/\W/g, "").toLowerCase() } : x)));
                          setBehaviourDirty(true);
                        }}
                      />
                    </div>
                    <span
                      className={cx(
                        "pill !py-0 !text-[8.5px]",
                        c.source === "code" ? "border-emerald-400/30 text-emerald-300" : "border-white/10 text-slate-500"
                      )}
                    >
                      {c.source}
                    </span>
                    <button
                      className="ml-auto text-slate-500 hover:text-rose-300"
                      onClick={() => {
                        setCmds(cmds.filter((_, idx) => idx !== i));
                        setBehaviourDirty(true);
                      }}
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                  <textarea
                    className="textarea mono mt-1.5 !text-[11.5px]"
                    style={{ minHeight: 54 }}
                    value={c.reply}
                    onChange={(e) => {
                      setCmds(cmds.map((x, idx) => (idx === i ? { ...x, reply: e.target.value, source: "code" } : x)));
                      setBehaviourDirty(true);
                    }}
                  />
                </div>
              ))}
              {!cmds.length && <p className="text-[12px] text-slate-500">No commands. Add one below.</p>}
            </div>
            <button
              className="btn mt-2 !py-1 !text-[11px]"
              onClick={() => {
                setCmds([...cmds, { cmd: "new", reply: "Hello from the engine!", source: "code" }]);
                setBehaviourDirty(true);
              }}
            >
              <IconPlus size={11} /> Add command
            </button>
          </div>

          <div className="glass space-y-3 p-4">
            <div>
              <label className="label">Echo reply (any plain message)</label>
              <textarea
                className="textarea mono !text-[11.5px]"
                style={{ minHeight: 60 }}
                value={echo}
                placeholder="You said: {text}"
                onChange={(e) => {
                  setEcho(e.target.value);
                  setBehaviourDirty(true);
                }}
              />
            </div>
            <div>
              <label className="label !mb-1 flex items-center justify-between">
                <span>Fallback reply</span>
                <button
                  className={cx("mono text-[10px]", fallbackOn ? "text-emerald-300" : "text-slate-500")}
                  onClick={() => {
                    setFallbackOn((v) => !v);
                    setBehaviourDirty(true);
                  }}
                >
                  {fallbackOn ? "enabled" : "disabled"}
                </button>
              </label>
              <textarea
                className="textarea mono !text-[11.5px]"
                style={{ minHeight: 60 }}
                value={fallback}
                disabled={!fallbackOn}
                placeholder="Unknown command. Try /start"
                onChange={(e) => {
                  setFallback(e.target.value);
                  setBehaviourDirty(true);
                }}
              />
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">placeholders</p>
              <p className="mono mt-1 text-[10.5px] leading-relaxed text-slate-400">
                {"{first_name} {last_name} {username} {chat_id} {user_id} {text} {args} {time} {date} {bot_name}"}
              </p>
            </div>
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.05] p-3 text-[11px] leading-relaxed text-slate-300">
              Saving behaviour republishes it immediately — the next Telegram update uses the new replies. Press{" "}
              <span className="text-white">Recompile</span> to re-read the replies from your source code.
            </div>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="glass space-y-3 p-4">
            <div>
              <label className="label">Bot name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center justify-between !mb-1">
                <span>Bot token</span>
                <button className="text-[10px] font-semibold text-cyan-300 hover:underline" onClick={() => setTokenOpen((v) => !v)}>
                  {tokenOpen ? "cancel" : "replace"}
                </button>
              </label>
              {tokenOpen ? (
                <input
                  className="input mono !text-[12px]"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="123456789:AAH…"
                  autoComplete="off"
                />
              ) : (
                <p className="mono rounded-md border border-white/[0.07] bg-black/30 px-2.5 py-2 text-[12px] text-slate-400">
                  {bot.tokenMasked ?? "not set"} · encrypted
                </p>
              )}
              <p className="mt-1 text-[10.5px] text-slate-600">
                Get it from @BotFather → /mybots → API Token. Stored with AES-256-GCM, never returned to the browser.
              </p>
            </div>
            <div>
              <label className="label !mb-1">Environment variables</label>
              <div className="space-y-1.5">
                {env.map((row, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      className="input mono !py-1.5 !text-[11px]"
                      style={{ width: "42%" }}
                      value={row.k}
                      placeholder="ADMIN_ID"
                      onChange={(e) => setEnv(env.map((r, idx) => (idx === i ? { ...r, k: e.target.value } : r)))}
                    />
                    <input
                      className="input mono !py-1.5 !text-[11px]"
                      value={row.v}
                      placeholder="771234567"
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
            </div>
          </div>

          <div className="space-y-3">
            <div className="glass p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">webhook endpoint</p>
              <p className="mono mt-2 break-all rounded-md border border-white/[0.07] bg-black/30 px-2.5 py-2 text-[10.5px] text-cyan-200">
                POST /api/tg/{bot.id}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Telegram pushes every update here. The endpoint validates{" "}
                <code className="mono">x-telegram-bot-api-secret-token</code>, compiles the reply and answers through
                the Bot API. It stays online as long as this deployment exists — nothing to babysit.
              </p>
              <button className="btn mt-2 !py-1 !text-[11px]" onClick={() => act("restart")} disabled={busy === "restart"}>
                <IconRestart size={11} /> Re-register webhook
              </button>
            </div>
            <div className="glass border-rose-400/25 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-300">danger zone</p>
              <p className="mt-1.5 text-[11.5px] text-slate-400">
                Deleting removes the bot, its webhook and its logs. This cannot be undone.
              </p>
              <button className="btn mt-2 w-full !py-1.5 !text-[11.5px] !text-rose-300 hover:!border-rose-400/50" onClick={() => act("delete")}>
                <IconTrash size={12} /> Delete bot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
