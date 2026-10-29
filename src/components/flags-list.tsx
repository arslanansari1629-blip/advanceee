"use client";

import { useMemo, useState } from "react";
import { Flag, Plus, Search, ShieldAlert, SlidersHorizontal, Tag, Zap } from "lucide-react";
import { Badge, Card, Progress } from "./ui";
import { useToast } from "./toast";
import { cn, stampUTC } from "@/lib/format";
import type { Flag as FlagType } from "@/lib/types";

const tagTone: Record<string, "success" | "accent" | "warn" | "info" | "neutral"> = {
  engine: "success",
  console: "info",
  security: "warn",
  analyser: "accent",
  billing: "neutral",
  infra: "info",
  auth: "accent",
};

function Switch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      className={cn(
        "relative h-[18px] w-[32px] shrink-0 rounded-full border transition-colors",
        on ? "border-brand/40 bg-brand/80" : "border-line bg-line/80",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[12px] w-[12px] rounded-full bg-white transition-transform",
          on ? "translate-x-[16px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

export function FlagsList({ flags }: { flags: FlagType[] }) {
  const { push } = useToast();
  const [list, setList] = useState(flags);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");
  const [env, setEnv] = useState("all");
  const [openKey, setOpenKey] = useState<string | null>(flags[0]?.key ?? null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ key: "", name: "", description: "" });

  const tags = useMemo(() => [...new Set(list.map((f) => f.tag))], [list]);
  const envs = useMemo(() => [...new Set(list.flatMap((f) => f.envs))], [list]);

  const filtered = list.filter((f) => {
    if (tag !== "all" && f.tag !== tag) return false;
    if (env !== "all" && !f.envs.includes(env)) return false;
    if (q && !`${f.key} ${f.name} ${f.description} ${f.owner}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const update = (key: string, patch: Partial<FlagType>) =>
    setList((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch, updated: new Date().toISOString() } : f)));

  return (
    <>
      <div className="panel mb-3 flex flex-wrap items-center gap-2 p-2.5">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search flags…"
            className="h-8 w-[210px] rounded-lg border border-line bg-canvas/60 pl-7 pr-2 text-[12px] text-ink outline-none placeholder:text-faint focus:border-brand/50"
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-canvas/60 p-0.5">
          <button
            onClick={() => setTag("all")}
            className={cn("rounded-md px-2 py-1 text-[11px]", tag === "all" ? "bg-raised text-ink" : "text-faint hover:text-muted")}
          >
            all
          </button>
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={cn("rounded-md px-2 py-1 text-[11px]", tag === t ? "bg-raised text-ink" : "text-faint hover:text-muted")}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={env}
          onChange={(e) => setEnv(e.target.value)}
          className="h-8 rounded-lg border border-line bg-canvas/60 px-2 text-[11.5px] text-muted outline-none"
        >
          <option value="all">all environments</option>
          {envs.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <span className="ml-auto text-[10.5px] text-faint">
          {filtered.filter((f) => f.enabled).length} on · {filtered.length} flags
        </span>
        <button onClick={() => setCreating((c) => !c)} className="btn-primary h-8 text-[11.5px]">
          <Plus size={12} strokeWidth={2.6} /> New flag
        </button>
      </div>

      {creating ? (
        <Card className="mb-3 animate-rise p-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
              <Flag size={12} className="text-brand" /> Create feature flag
            </h3>
            <button onClick={() => setCreating(false)} className="text-[10.5px] text-faint hover:text-ink">
              cancel
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              value={draft.key}
              onChange={(e) => setDraft({ ...draft, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              placeholder="flag-key"
              className="input h-8 font-mono text-[11px]"
            />
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Human readable name"
              className="input h-8 text-[11.5px]"
            />
            <input
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What does it do?"
              className="input h-8 text-[11.5px]"
            />
          </div>
          <button
            disabled={!draft.key || !draft.name}
            onClick={() => {
              setList((prev) => [
                {
                  key: draft.key,
                  name: draft.name,
                  description: draft.description || "No description yet.",
                  enabled: false,
                  rollout: 0,
                  envs: ["staging"],
                  owner: "Arslan Ansari",
                  updated: new Date().toISOString(),
                  tag: "engine",
                },
                ...prev,
              ]);
              setDraft({ key: "", name: "", description: "" });
              setCreating(false);
              push({ kind: "success", title: "Flag created", body: "Off by default · staging only" });
            }}
            className="btn-primary mt-2 h-7 text-[11px] disabled:opacity-40"
          >
            <Zap size={11} /> Create
          </button>
        </Card>
      ) : null}

      <div className="space-y-2">
        {filtered.map((f) => {
          const open = openKey === f.key;
          return (
            <Card key={f.key} className={cn("overflow-hidden transition-colors", f.enabled && "border-brand/20")}>
              <div className="flex flex-wrap items-center gap-3 p-3">
                <Switch
                  on={f.enabled}
                  onChange={() => {
                    update(f.key, { enabled: !f.enabled, rollout: !f.enabled ? Math.max(f.rollout, 10) : 0 });
                    push({
                      kind: f.enabled ? "warn" : "success",
                      title: `${f.name} ${f.enabled ? "disabled" : "enabled"}`,
                      body: `${f.key} · audit: flag.toggle`,
                    });
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setOpenKey(open ? null : f.key)} className="text-[12.5px] font-medium text-ink hover:text-brand">
                      {f.name}
                    </button>
                    <code className="rounded border border-line bg-canvas/60 px-1 py-px font-mono text-[9.5px] text-muted">{f.key}</code>
                    <Badge tone={tagTone[f.tag] ?? "neutral"}>{f.tag}</Badge>
                    {f.envs.map((e) => (
                      <span key={e} className="chip h-[17px] px-1.5 py-0 text-[9px]">{e}</span>
                    ))}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-faint">{f.description}</p>
                </div>
                <div className="w-[150px]">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-faint">rollout</span>
                    <span className="font-mono text-muted">{f.rollout}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={f.rollout}
                    onChange={(e) => update(f.key, { rollout: Number(e.target.value), enabled: Number(e.target.value) > 0 })}
                    className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-[#34e0a1]"
                    style={{
                      background: `linear-gradient(90deg, rgb(var(--brand)) ${f.rollout}%, rgb(var(--line)) ${f.rollout}%)`,
                    }}
                  />
                </div>
                <div className="hidden w-[120px] text-[10px] text-faint sm:block">
                  <div className="truncate">{f.owner}</div>
                  <div>{stampUTC(f.updated)}</div>
                </div>
                <button
                  onClick={() => {
                    update(f.key, { enabled: false, rollout: 0 });
                    push({ kind: "error", title: "Kill switch pulled", body: `${f.key} → 0% in every environment` });
                  }}
                  className="btn-danger h-7 px-2 text-[10px]"
                >
                  <ShieldAlert size={10} /> kill
                </button>
              </div>
              {open ? (
                <div className="grid grid-cols-1 gap-3 border-t border-line/70 bg-canvas/30 p-3 sm:grid-cols-3">
                  <div>
                    <div className="label">Targeting</div>
                    <div className="mt-1.5 space-y-1 text-[10.5px] text-muted">
                      <div className="flex justify-between"><span className="text-faint">plan</span> <span>pro, scale</span></div>
                      <div className="flex justify-between"><span className="text-faint">region</span> <span>iad1, fra1</span></div>
                      <div className="flex justify-between"><span className="text-faint">min version</span> <span className="font-mono">v3.4.1</span></div>
                      <div className="flex justify-between"><span className="text-faint">owner</span> <span>{f.owner}</span></div>
                    </div>
                  </div>
                  <div>
                    <div className="label">Rollout progress</div>
                    <div className="mt-2">
                      <Progress value={f.rollout} color={f.rollout === 0 ? "#5c6880" : "#34e0a1"} />
                    </div>
                    <div className="mt-1 flex justify-between text-[9.5px] text-faint">
                      <span>cohort A</span>
                      <span>{f.rollout}% of traffic</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-faint">
                      <SlidersHorizontal size={9} /> sticky bucketing by user id
                    </div>
                  </div>
                  <div>
                    <div className="label">SDK snippet</div>
                    <pre className="mt-1.5 overflow-x-auto rounded-md border border-line/70 bg-[#080b12] p-2 font-mono text-[9.5px] leading-relaxed text-[#8ea7c9]">
{`if (flags.${f.key.replace(/-/g, "_")}(user)) {
  enable();
}`}
                    </pre>
                    <button
                      onClick={() => push({ kind: "info", title: "Linked to audit", body: `${f.key} history opened` })}
                      className="mt-1.5 flex items-center gap-1 text-[10px] text-[#8fb3d9] hover:text-ink"
                    >
                      <Tag size={9} /> view change history
                    </button>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
        {filtered.length === 0 ? <p className="panel px-4 py-12 text-center text-[12px] text-faint">No flags match those filters.</p> : null}
      </div>
    </>
  );
}
