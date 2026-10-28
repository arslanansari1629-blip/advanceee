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
  IconSpark,
  IconTrash,
  IconWarn,
} from "@/components/icons";
import { Toggle, cx } from "@/components/ui";
import type { Analysis } from "@/lib/types";

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
  const [requirements, setRequirements] = useState("");
  const [reqDirty, setReqDirty] = useState(false);
  const [env, setEnv] = useState<{ k: string; v: string }[]>([{ k: "BOT_TOKEN", v: "" }]);
  const [autoRestart, setAutoRestart] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
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
        return;
      }
      setAnalysing(true);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            source,
            files: allFiles.filter((f) => f.path !== active),
          }),
        });
        if (!res.ok) return;
        const data: Analysis = await res.json();
        setAnalysis(data);
        if (!reqDirty) setRequirements(data.requirements);
      } finally {
        setAnalysing(false);
      }
    },
    [active, reqDirty]
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => runAnalysis(code, files), 550);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [code, files, runAnalysis]);

  const applyTemplate = (t: Template) => {
    setFiles([{ path: "main.py", content: t.code }]);
    setActive("main.py");
    setName((n) => n || t.id.replace(/-/g, "-"));
    setRequirements(t.requirements);
    setReqDirty(false);
    setShowTemplates(false);
    setAnalysis(null);
    if (t.id.includes("pyrogram")) setEnv([{ k: "API_ID", v: "" }, { k: "API_HASH", v: "" }, { k: "SESSION_STRING", v: "" }]);
    else if (t.id === "worker") setEnv([{ k: "INTERVAL", v: "60" }]);
    else setEnv([{ k: "BOT_TOKEN", v: "" }]);
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

  const deploy = async () => {
    if (!code.trim()) {
      setError("Paste your Python code first.");
      return;
    }
    setDeploying(true);
    setError(null);
    try {
      const envObj: Record<string, string> = {};
      for (const row of env) if (row.k.trim()) envObj[row.k.trim()] = row.v;
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
          deploy: true,
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

  const pkgChips = useMemo(
    () => requirements.split("\n").map((r) => r.trim()).filter(Boolean),
    [requirements]
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Deploy a bot</h1>
          <p className="text-[12.5px] text-slate-500">
            Paste Python — imports are detected, requirements installed, then the process is supervised 24/7.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setShowTemplates((s) => !s)}>
            <IconSpark size={13} /> Templates
          </button>
          <button className="btn btn-primary" onClick={deploy} disabled={deploying}>
            {deploying ? (
              <>
                <span className="spin h-3 w-3 rounded-full border-2 border-black/30 border-t-black" /> Deploying…
              </>
            ) : (
              <>
                <IconBolt size={14} /> Deploy &amp; run 24/7
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
        {/* editor */}
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
            height={560}
            placeholder={`# Paste your Python bot here — the whole file, no edits needed.\n#\n# import telebot\n# bot = telebot.TeleBot(os.environ["BOT_TOKEN"])\n# ...\n#\n# Requirements are detected automatically from your imports.`}
          />

          <div className="glass p-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <IconSpark size={12} /> analysis
                {analysing && <span className="spin ml-1 h-3 w-3 rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />}
              </p>
              {analysis && (
                <span className="pill !text-[10px] border-cyan-400/25 text-cyan-200">{analysis.framework}</span>
              )}
            </div>

            {!analysis ? (
              <p className="mt-2 text-[12px] text-slate-600">
                Paste code to see detected imports, PyPI packages and warnings.
              </p>
            ) : (
              <>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2">
                    <p className="text-[9.5px] uppercase tracking-wider text-slate-500">
                      detected packages ({analysis.packages.length})
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {analysis.packages.map((p) => (
                        <span
                          key={p.pkg}
                          className={cx(
                            "pill !py-0 !text-[9.5px]",
                            p.pinned ? "border-violet-400/35 bg-violet-400/10 text-violet-200" : "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200"
                          )}
                          title={p.reason}
                        >
                          {p.pkg}
                        </span>
                      ))}
                      {analysis.packages.length === 0 && <span className="text-[11px] text-slate-600">stdlib only</span>}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2">
                    <p className="text-[9.5px] uppercase tracking-wider text-slate-500">
                      stdlib skipped ({analysis.stats.stdlib})
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {analysis.imports.filter((i) => i.stdlib).slice(0, 14).map((i) => (
                        <span key={i.module} className="pill !py-0 !text-[9.5px] border-white/10 text-slate-400">
                          {i.module}
                        </span>
                      ))}
                      {analysis.stats.stdlib === 0 && <span className="text-[11px] text-slate-600">none</span>}
                    </div>
                  </div>
                </div>

                {analysis.tokenMasked && (
                  <p className="mt-2 flex items-center gap-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-1 text-[11px] text-emerald-200">
                    <IconCheck size={11} /> token detected and masked: <span className="mono">{analysis.tokenMasked}</span>
                  </p>
                )}
                {analysis.warnings.map((w) => (
                  <p key={w} className="mt-1.5 flex items-start gap-1.5 rounded-md border border-amber-400/20 bg-amber-400/[0.06] px-2 py-1 text-[11px] leading-relaxed text-amber-200">
                    <IconWarn size={11} className="mt-0.5 shrink-0" /> {w}
                  </p>
                ))}
                {analysis.notes.map((n) => (
                  <p key={n} className="mt-1 text-[11px] leading-relaxed text-slate-500">› {n}</p>
                ))}
              </>
            )}
          </div>
        </div>

        {/* config */}
        <div className="space-y-3">
          <div className="glass space-y-3 p-4">
            <div>
              <label className="label">Bot name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-echo-bot"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label !mb-1">Requirements (auto-detected)</label>
                <button
                  className="text-[10px] font-semibold text-cyan-300 hover:underline"
                  onClick={() => {
                    setRequirements(analysis?.requirements ?? "");
                    setReqDirty(false);
                  }}
                >
                  re-detect
                </button>
              </div>
              <textarea
                className="textarea mono !text-[11.5px]"
                style={{ minHeight: 96 }}
                value={requirements}
                onChange={(e) => {
                  setRequirements(e.target.value);
                  setReqDirty(true);
                }}
                placeholder={"python-telegram-bot>=21.6\npython-dotenv"}
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {pkgChips.slice(0, 10).map((p) => (
                  <span key={p} className="pill !py-0 !text-[9.5px] border-cyan-400/20 text-cyan-200">
                    {p}
                  </span>
                ))}
                {reqDirty && <span className="pill !py-0 !text-[9.5px] border-violet-400/30 text-violet-200">manual</span>}
              </div>
              <p className="mt-1 text-[10.5px] text-slate-600">
                Any PyPI package works — pinned versions, extras and git URLs are passed straight to pip.
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
                      placeholder="BOT_TOKEN"
                      onChange={(e) =>
                        setEnv(env.map((r, idx) => (idx === i ? { ...r, k: e.target.value } : r)))
                      }
                    />
                    <input
                      className="input mono !py-1.5 !text-[11px]"
                      value={row.v}
                      placeholder="123456:AA…"
                      onChange={(e) =>
                        setEnv(env.map((r, idx) => (idx === i ? { ...r, v: e.target.value } : r)))
                      }
                    />
                    <button
                      className="btn btn-ghost !px-1.5"
                      onClick={() => setEnv(env.filter((_, idx) => idx !== i))}
                      title="Remove"
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                ))}
                <button className="btn !py-1 !text-[11px]" onClick={() => setEnv([...env, { k: "", v: "" }])}>
                  <IconPlus size={11} /> Add variable
                </button>
              </div>
              <p className="mt-1 text-[10.5px] text-slate-600">
                Secrets are stored per bot and never printed to the log stream.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
              <div>
                <p className="text-[12px] font-semibold text-white">Auto-restart on crash</p>
                <p className="text-[10.5px] text-slate-500">supervisor revives the process instantly</p>
              </div>
              <Toggle checked={autoRestart} onChange={setAutoRestart} />
            </div>

            {error && (
              <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-200">
                {error}
              </p>
            )}

            <button className="btn btn-primary w-full !py-2.5" onClick={deploy} disabled={deploying}>
              {deploying ? "Deploying…" : "Deploy & run 24/7"}
            </button>
          </div>

          <div className="glass p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">deploy checklist</p>
            <ul className="mt-2 space-y-1.5 text-[11.5px]">
              {[
                [Boolean(code.trim()), "Python source pasted"],
                [Boolean(name.trim() || code.trim()), "Bot name set"],
                [Boolean(requirements || analysis), "Requirements resolved"],
                [env.some((e) => e.v.trim()) || !/BOT_TOKEN/.test(code), "Secrets provided"],
              ].map(([ok, label]) => (
                <li key={String(label)} className="flex items-center gap-1.5">
                  <span className={cx("grid h-4 w-4 place-items-center rounded-full text-[9px]", ok ? "bg-emerald-400/20 text-emerald-300" : "bg-white/5 text-slate-600")}>
                    {ok ? "✓" : "•"}
                  </span>
                  <span className={ok ? "text-slate-300" : "text-slate-600"}>{String(label)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.05] p-2.5 text-[10.5px] leading-relaxed text-cyan-100/80">
              Files are written to an isolated workspace, <code className="mono">pip install</code> runs before the
              process starts, and the supervisor keeps it alive with exponential backoff.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
