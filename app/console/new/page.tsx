"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CodeEditor from "@/components/CodeEditor";
import {
  IconBolt,
  IconCheck,
  IconClose,
  IconFile,
  IconPlus,
  IconRobot,
  IconSpark,
  IconTrash,
  IconWarn,
} from "@/components/icons";
import { Toggle, cx } from "@/components/ui";
import type { Analysis, Behaviour } from "@/lib/types";

interface Template {
  id: string;
  name: string;
  description: string;
  framework: string;
  requirements: string;
  code: string;
  badges: string[];
}

interface FileTab {
  path: string;
  content: string;
}

export default function DeployStudio() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [files, setFiles] = useState<FileTab[]>([{ path: "main.py", content: "" }]);
  const [active, setActive] = useState("main.py");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [requirements, setRequirements] = useState("");
  const [reqDirty, setReqDirty] = useState(false);
  const [extraEnv, setExtraEnv] = useState<{ k: string; v: string }[]>([]);
  const [autoRestart, setAutoRestart] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [behaviour, setBehaviour] = useState<Behaviour | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [newFile, setNewFile] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const code = files.find((f) => f.path === active)?.content ?? files[0]?.content ?? "";

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => {});
  }, []);

  const runAnalysis = useCallback(
    async (source: string, allFiles: FileTab[]) => {
      if (!source.trim()) {
        setAnalysis(null);
        setBehaviour(null);
        return;
      }
      setAnalysing(true);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source, files: allFiles.filter((f) => f.path !== active), compile: true }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setAnalysis(data);
        setBehaviour(data.behaviour ?? null);
        if (!reqDirty) setRequirements(data.requirements);
        if (!token && data.tokens?.[0]) setToken(data.tokens[0]);
      } finally {
        setAnalysing(false);
      }
    },
    [active, reqDirty, token]
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => runAnalysis(code, files), 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [code, files, runAnalysis]);

  const applyTemplate = (t: Template) => {
    setFiles([{ path: "main.py", content: t.code }]);
    setActive("main.py");
    setName((n) => n || t.id);
    setRequirements(t.requirements);
    setReqDirty(false);
    setShowTemplates(false);
    setAnalysis(null);
    setBehaviour(null);
  };

  const updateActive = (content: string) =>
    setFiles((prev) => prev.map((f) => (f.path === active ? { ...f, content } : f)));

  const addFile = () => {
    const path = newFile.trim() || `module_${files.length + 1}.py`;
    if (files.some((f) => f.path === path)) return;
    setFiles([...files, { path, content: "" }]);
    setActive(path);
    setNewFile("");
  };

  const removeFile = (path: string) => {
    if (files.length === 1) return;
    const next = files.filter((f) => f.path !== path);
    setFiles(next);
    if (active === path) setActive(next[0].path);
  };

  const deploy = async (goLive: boolean) => {
    if (!code.trim()) return setError("Paste your Python code first.");
    if (goLive && !token.trim()) return setError("Paste your bot token from @BotFather — it is required to go live.");
    setDeploying(true);
    setError(null);
    try {
      const envObj: Record<string, string> = {};
      for (const row of extraEnv) if (row.k.trim()) envObj[row.k.trim()] = row.v;
      if (token.trim()) envObj.BOT_TOKEN = token.trim();
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "untitled-bot",
          entry: active,
          files,
          requirements: reqDirty ? requirements : undefined,
          env: envObj,
          autoRestart,
          deploy: goLive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deploy failed");
      router.push(`/console/bots/${data.bot.id}`);
    } catch (err: any) {
      setError(err?.message ?? "Deploy failed");
      setDeploying(false);
    }
  };

  const pkgChips = useMemo(() => requirements.split("\n").map((r) => r.trim()).filter(Boolean), [requirements]);
  const codeCmds = behaviour?.commands.filter((c) => c.source === "code") ?? [];

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Deploy a bot</h1>
          <p className="text-[12.5px] text-slate-500">
            Paste your Python + bot token. BotForge compiles your handlers into the webhook engine — live in
            seconds, no server.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setShowTemplates((s) => !s)}>
            <IconSpark size={13} /> Templates
          </button>
          <button className="btn btn-primary" onClick={() => deploy(true)} disabled={deploying}>
            {deploying ? (
              <>
                <span className="spin h-3 w-3 rounded-full border-2 border-black/30 border-t-black" /> Going live…
              </>
            ) : (
              <>
                <IconBolt size={14} /> Deploy &amp; go live
              </>
            )}
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              className="glass p-3 text-left transition-colors hover:border-cyan-400/30"
            >
              <p className="text-[12.5px] font-semibold text-white">{t.name}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{t.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {t.badges.slice(0, 3).map((b) => (
                  <span key={b} className="pill !py-0 !text-[9px]">{b}</span>
                ))}
              </div>
            </button>
          ))}
          {templates.length === 0 &&
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="shimmer h-24 rounded-2xl" />)}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {files.map((f) => (
              <div
                key={f.path}
                className={cx(
                  "group flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] transition-colors",
                  active === f.path
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
                )}
              >
                <button onClick={() => setActive(f.path)} className="flex items-center gap-1.5">
                  <IconFile size={11} /> {f.path}
                </button>
                {files.length > 1 && (
                  <button onClick={() => removeFile(f.path)} className="text-slate-500 hover:text-rose-300">
                    <IconClose size={10} />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-1">
              <input
                value={newFile}
                onChange={(e) => setNewFile(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFile()}
                placeholder="helpers.py"
                className="w-24 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] outline-none focus:border-cyan-400/40"
              />
              <button className="btn btn-ghost !px-1.5 !py-1" onClick={addFile} title="Add file">
                <IconPlus size={13} />
              </button>
            </div>
            <span className="mono ml-auto text-[10.5px] text-slate-500">
              {analysis ? `${analysis.stats.lines} lines · ${analysis.stats.imports} imports` : "waiting for code"}
            </span>
          </div>

          <CodeEditor
            value={code}
            onChange={updateActive}
            height={520}
            placeholder={`# Paste your whole bot file here.\n#\n# @bot.message_handler(commands=['start'])\n# def start(message):\n#     bot.reply_to(message, "Hello!")\n#\n# BotForge compiles your handlers and answers every Telegram update\n# from this deployment — no server, no polling.`}
          />

          {/* compiled behaviour */}
          <div className="glass p-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <IconRobot size={12} /> compiled behaviour
                {analysing && <span className="spin ml-1 h-3 w-3 rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />}
              </p>
              {behaviour && (
                <span className="pill !text-[10px] border-cyan-400/25 text-cyan-200">
                  {behaviour.commands.length} commands
                  {behaviour.echo ? " · echo" : ""}
                </span>
              )}
            </div>

            {!behaviour ? (
              <p className="mt-2 text-[12px] text-slate-600">
                Paste code to see the exact replies the engine will send.
              </p>
            ) : (
              <>
                <div className="mt-2 space-y-1.5">
                  {behaviour.commands.slice(0, 8).map((c) => (
                    <div
                      key={c.cmd}
                      className="flex gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5"
                    >
                      <span className="mono shrink-0 text-[11px] font-semibold text-cyan-300">/{c.cmd}</span>
                      <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300">
                        {c.reply.replace(/\n/g, " ⏎ ")}
                      </span>
                      <span
                        className={cx(
                          "pill shrink-0 !py-0 !text-[8.5px]",
                          c.source === "code"
                            ? "border-emerald-400/30 text-emerald-300"
                            : "border-white/10 text-slate-500"
                        )}
                      >
                        {c.source}
                      </span>
                    </div>
                  ))}
                  {behaviour.commands.length > 8 && (
                    <p className="text-[10.5px] text-slate-600">+{behaviour.commands.length - 8} more</p>
                  )}
                </div>
                {behaviour.echo && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    <span className="text-slate-500">echo →</span> {behaviour.echo.replace(/\n/g, " ⏎ ")}
                  </p>
                )}
                {behaviour.notes.map((n) => (
                  <p key={n} className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-200/90">
                    <IconWarn size={11} className="mt-0.5 shrink-0" /> {n}
                  </p>
                ))}
                <p className="mt-2 text-[10.5px] text-slate-500">
                  Placeholders supported in replies: <code className="mono">{"{first_name} {username} {chat_id} {text} {time}"}</code>
                </p>
              </>
            )}
          </div>

          <div className="glass p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <IconSpark size={12} /> requirements (detected)
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {pkgChips.map((p) => (
                <span key={p} className="pill !py-0 !text-[9.5px] border-cyan-400/20 text-cyan-200">{p}</span>
              ))}
              {pkgChips.length === 0 && <span className="text-[11px] text-slate-600">stdlib only</span>}
            </div>
            <p className="mt-1.5 text-[10.5px] text-slate-500">
              Shown for documentation — the webhook engine answers with plain HTTP calls, so nothing is
              installed at run time. Your code stays readable and portable.
            </p>
          </div>
        </div>

        {/* right column */}
        <div className="space-y-3">
          <div className="glass space-y-3 p-4">
            <div>
              <label className="label">Bot name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-echo-bot" />
            </div>

            <div>
              <label className="label">Bot token (from @BotFather)</label>
              <input
                className="input mono !text-[12px]"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456789:AAH…"
                autoComplete="off"
              />
              <p className="mt-1 text-[10.5px] text-slate-600">
                Stored encrypted (AES-256-GCM) and only used to call the Telegram API. Never shown again.
              </p>
            </div>

            <div>
              <label className="label">Requirements (auto)</label>
              <textarea
                className="textarea mono !text-[11.5px]"
                style={{ minHeight: 70 }}
                value={requirements}
                onChange={(e) => {
                  setRequirements(e.target.value);
                  setReqDirty(true);
                }}
              />
              <button
                className="mt-1 text-[10px] font-semibold text-cyan-300 hover:underline"
                onClick={() => {
                  setRequirements(analysis?.requirements ?? "");
                  setReqDirty(false);
                }}
              >
                re-detect
              </button>
            </div>

            <div>
              <label className="label !mb-1">Extra env vars</label>
              <div className="space-y-1.5">
                {extraEnv.map((row, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      className="input mono !py-1.5 !text-[11px]"
                      style={{ width: "42%" }}
                      value={row.k}
                      placeholder="ADMIN_ID"
                      onChange={(e) => setExtraEnv(extraEnv.map((r, idx) => (idx === i ? { ...r, k: e.target.value } : r)))}
                    />
                    <input
                      className="input mono !py-1.5 !text-[11px]"
                      value={row.v}
                      placeholder="771234567"
                      onChange={(e) => setExtraEnv(extraEnv.map((r, idx) => (idx === i ? { ...r, v: e.target.value } : r)))}
                    />
                    <button className="btn btn-ghost !px-1.5" onClick={() => setExtraEnv(extraEnv.filter((_, idx) => idx !== i))}>
                      <IconTrash size={12} />
                    </button>
                  </div>
                ))}
                <button className="btn !py-1 !text-[11px]" onClick={() => setExtraEnv([...extraEnv, { k: "", v: "" }])}>
                  <IconPlus size={11} /> Add variable
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
              <div>
                <p className="text-[12px] font-semibold text-white">Auto re-register</p>
                <p className="text-[10.5px] text-slate-500">re-arm the webhook if Telegram reports an error</p>
              </div>
              <Toggle checked={autoRestart} onChange={setAutoRestart} />
            </div>

            {error && (
              <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-200">{error}</p>
            )}

            <button className="btn btn-primary w-full !py-2.5" onClick={() => deploy(true)} disabled={deploying}>
              {deploying ? "Going live…" : "Deploy & go live"}
            </button>
            <button className="btn w-full !py-1.5 !text-[11.5px]" onClick={() => deploy(false)} disabled={deploying}>
              Save as draft
            </button>
          </div>

          <div className="glass p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">what happens on deploy</p>
            <ol className="mt-2 space-y-1.5 text-[11.5px] text-slate-400">
              {[
                "Your handlers are compiled into an executable behaviour spec",
                "getMe verifies the token and reads the bot username",
                "setWebhook points Telegram at this deployment",
                "The engine answers every update instantly, 24/7",
              ].map((t, i) => (
                <li key={t} className="flex gap-2">
                  <span className="mono shrink-0 text-cyan-400">0{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] p-2.5 text-[10.5px] leading-relaxed text-emerald-100/80">
              {codeCmds.length
                ? `Recognised ${codeCmds.length} of your handler(s): ${codeCmds.map((c) => "/" + c.cmd).join(", ")}`
                : "No handlers recognised yet — the engine will register /start and /help for you."}
            </div>
            <p className="mt-2 flex items-center gap-1 text-[10.5px] text-slate-500">
              <IconCheck size={10} className="text-emerald-400" /> No runner, container or VPS involved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
