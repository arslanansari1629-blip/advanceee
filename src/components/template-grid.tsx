"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Code2, Copy, Rocket, Search, Star, Terminal, X, Zap } from "lucide-react";
import { Badge, Card } from "./ui";
import { CopyButton } from "./actions";
import { useToast } from "./toast";
import { cn, fmt } from "@/lib/format";
import type { Template } from "@/lib/types";

export function TemplateGrid({ templates }: { templates: Template[] }) {
  const { push } = useToast();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [lib, setLib] = useState("all");
  const [preview, setPreview] = useState<Template | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [done, setDone] = useState(false);

  const libs = [...new Set(templates.map((t) => t.library))];
  const filtered = templates.filter((t) => {
    if (lib !== "all" && t.library !== lib) return false;
    if (q && !`${t.name} ${t.description} ${t.tags.join(" ")} ${t.library}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const deploy = (t: Template) => {
    setDeploying(true);
    setTimeout(() => {
      setDeploying(false);
      setDone(true);
      push({ kind: "success", title: `${t.name} deployed`, body: "Paste your token to go live · 3 handlers compiled" });
      setTimeout(() => {
        setPreview(null);
        setDone(false);
        router.push("/admin/bots?new=1");
      }, 900);
    }, 1400);
  };

  return (
    <>
      <div className="panel mb-3 flex flex-wrap items-center gap-2 p-2.5">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates, tags…"
            className="h-8 w-[230px] rounded-lg border border-line bg-canvas/60 pl-7 pr-2 text-[12px] text-ink outline-none placeholder:text-faint focus:border-brand/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-line bg-canvas/60 p-0.5">
          <button
            onClick={() => setLib("all")}
            className={cn("rounded-md px-2 py-1 text-[11px]", lib === "all" ? "bg-raised text-ink" : "text-faint hover:text-muted")}
          >
            all
          </button>
          {libs.map((l) => (
            <button
              key={l}
              onClick={() => setLib(l)}
              className={cn("rounded-md px-2 py-1 text-[11px]", lib === l ? "bg-raised text-ink" : "text-faint hover:text-muted")}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[10.5px] text-faint">{filtered.length} templates · {fmt(templates.reduce((a, t) => a + t.deploys, 0))} deploys</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((t) => (
          <Card key={t.id} className="group flex flex-col overflow-hidden p-0">
            <div className="relative h-[74px] overflow-hidden border-b border-line/70" style={{ background: `linear-gradient(135deg, ${t.accent}22, transparent 70%)` }}>
              <div className="absolute inset-0 grid-bg opacity-40" />
              <div className="relative flex h-full items-center gap-2 px-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg border"
                  style={{ borderColor: `${t.accent}55`, background: `${t.accent}18`, color: t.accent }}
                >
                  <Code2 size={14} />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-[13px] font-semibold text-ink">{t.name}</h3>
                  <p className="truncate font-mono text-[9.5px] text-faint">{t.library}</p>
                </div>
                <span className="ml-auto flex items-center gap-1 rounded-full border border-line bg-panel/80 px-1.5 py-0.5 text-[9.5px] text-muted">
                  <Star size={8} className="text-[#f5b544]" /> {t.rating}
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-3">
              <p className="text-[11.5px] leading-relaxed text-muted">{t.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {t.tags.map((tag) => (
                  <span key={tag} className="chip px-1.5 py-0 text-[9px]">{tag}</span>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-2 pt-3">
                <span className="flex items-center gap-1 text-[10px] text-faint">
                  <Rocket size={9} /> {fmt(t.deploys)} deploys
                </span>
                <button onClick={() => setPreview(t)} className="btn ml-auto h-7 px-2 text-[10.5px]">
                  Preview
                </button>
                <button
                  onClick={() => setPreview(t)}
                  className="btn-primary h-7 px-2 text-[10.5px]"
                >
                  Use template
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {preview ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[7vh] backdrop-blur-sm" onClick={() => !deploying && setPreview(null)}>
          <div className="w-full max-w-[680px] animate-rise overflow-hidden rounded-xl border border-line bg-panel shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-line/80 px-4 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border" style={{ borderColor: `${preview.accent}55`, background: `${preview.accent}18`, color: preview.accent }}>
                <Code2 size={13} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-[13px] font-semibold text-ink">{preview.name}</h2>
                <p className="truncate text-[10.5px] text-faint">{preview.library} · {fmt(preview.deploys)} deploys · ★ {preview.rating}</p>
              </div>
              <button onClick={() => !deploying && setPreview(null)} className="ml-auto rounded p-1 text-faint hover:text-ink">
                <X size={14} />
              </button>
            </div>
            <div className="max-h-[46vh] overflow-auto bg-[#080b12] p-3 font-mono text-[10.5px] leading-relaxed">
              {preview.source.split("\n").map((line, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-5 shrink-0 select-none text-right text-[#3d4a5e]">{i + 1}</span>
                  <span className={cn("whitespace-pre", /^(import|from)/.test(line) ? "text-[#b3a8ff]" : /^(async def|def|@)/.test(line) ? "text-[#5eeac0]" : "text-[#c3cfdf]")}>
                    {line || " "}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line/80 p-3">
              <Badge tone="info">{preview.library}</Badge>
              {preview.tags.map((t) => (
                <span key={t} className="chip text-[9.5px]">{t}</span>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <CopyButton value={preview.source} label="Copy code" />
                <button onClick={() => deploy(preview)} disabled={deploying || done} className="btn-primary h-8 text-[11.5px] disabled:opacity-70">
                  {done ? <Check size={12} /> : deploying ? <Terminal size={12} className="animate-pulse" /> : <Zap size={12} />}
                  {done ? "Deployed" : deploying ? "Compiling…" : "Deploy this template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
