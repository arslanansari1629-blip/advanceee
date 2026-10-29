"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  ArrowUpRight,
  Check,
  Clock,
  Code2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";
import { AreaChart, Bars } from "./charts";
import { LogConsole } from "./log-console";
import { useToast } from "./toast";
import { Badge, Card, CardHead, Divider, Mono, Progress } from "./ui";
import { CopyButton } from "./actions";
import { cn, fmt, money, stampUTC } from "@/lib/format";
import type { Bot, LogLine, User } from "@/lib/types";

const tabs = ["Overview", "Source", "Environment", "Webhook", "Logs", "Danger zone"] as const;
type Tab = (typeof tabs)[number];

export function BotTabs({ bot, owner, logs }: { bot: Bot; owner: User; logs: LogLine[] }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState(bot.status);
  const [confirm, setConfirm] = useState("");
  const { push } = useToast();

  const labels = Array.from({ length: 14 }, (_, i) => `D${i + 1}`);
  const replies = bot.updates7d.map((u) => Math.round(u * 0.93));

  return (
    <div>
      <div className="mb-3 flex gap-1 overflow-x-auto border-b border-line/70 pb-0 no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative shrink-0 px-3 py-2 text-[12px] font-medium transition-colors",
              tab === t ? "text-ink" : "text-faint hover:text-muted",
            )}
          >
            {t}
            {tab === t ? <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-brand" /> : null}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHead
              title="Traffic · last 14 days"
              subtitle={`${fmt(bot.updates24h)} updates in the last 24h · ${bot.successRate.toFixed(2)}% success`}
              action={<Badge tone={status === "live" ? "success" : status === "error" ? "danger" : "warn"}>{status}</Badge>}
            />
            <div className="p-3">
              <AreaChart
                series={[
                  { name: "Updates", color: "#34e0a1", data: bot.updates7d },
                  { name: "Replies", color: "#8b7cff", data: replies },
                ]}
                labels={labels}
                height={220}
              />
            </div>
            <div className="grid grid-cols-2 divide-x divide-line/70 border-t border-line/70 sm:grid-cols-4">
              {[
                { k: "updates 24h", v: fmt(bot.updates24h) },
                { k: "p95 latency", v: `${bot.p95} ms` },
                { k: "cpu / update", v: `${bot.cpuMs} ms` },
                { k: "storage", v: `${bot.storageKb} KB` },
              ].map((s) => (
                <div key={s.k} className="px-3 py-2">
                  <div className="text-[9.5px] uppercase tracking-wide text-faint">{s.k}</div>
                  <div className="font-mono text-[12.5px] text-ink">{s.v}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            <Card className="p-4">
              <h3 className="text-[13px] font-semibold text-ink">Compiled behaviour</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bot.handlers.map((h) => (
                  <span key={h} className="chip font-mono text-[10px] text-[#8ea7c9]">
                    {h}
                  </span>
                ))}
              </div>
              <Divider className="my-3" />
              <h4 className="label">Resolved requirements</h4>
              <div className="mt-1.5 space-y-1">
                {bot.imports.map((i) => (
                  <div key={i.module} className="flex items-center justify-between font-mono text-[10.5px]">
                    <span className="text-muted">{i.module}</span>
                    <span className="text-brand">{i.pypi}</span>
                  </div>
                ))}
              </div>
              <Divider className="my-3" />
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-faint">owner</span>
                <Link href={`/admin/users/${owner.id}`} className="flex items-center gap-1 text-ink hover:text-brand">
                  {owner.name} <ArrowUpRight size={10} />
                </Link>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11.5px]">
                <span className="text-faint">created</span>
                <span className="text-muted">{stampUTC(bot.createdAt)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11.5px]">
                <span className="text-faint">last deploy</span>
                <span className="text-muted">{stampUTC(bot.lastDeploy)}</span>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                <Zap size={12} className="text-brand" /> Engine control
              </h3>
              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    setStatus(status === "paused" ? "live" : "paused");
                    push({
                      kind: status === "paused" ? "success" : "warn",
                      title: status === "paused" ? "Bot resumed" : "Bot paused",
                      body: status === "paused" ? "setWebhook re-registered" : "updates answered 503 · Telegram retries",
                    });
                  }}
                  className="btn h-8 text-[11px]"
                >
                  {status === "paused" ? <Play size={11} /> : <Pause size={11} />}
                  {status === "paused" ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={() => {
                    setStatus("compiling");
                    setTimeout(() => setStatus("live"), 1800);
                    push({ kind: "info", title: "Recompiling", body: "analyser worker picked up main.py" });
                  }}
                  className="btn h-8 text-[11px]"
                >
                  <RefreshCw size={11} /> Recompile
                </button>
                <Link href={`/admin/logs?bot=${bot.slug}`} className="btn h-8 text-[11px]">
                  <Code2 size={11} /> Tail logs
                </Link>
                <button onClick={() => setTab("Danger zone")} className="btn-danger h-8 text-[11px]">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "Source" ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card className="overflow-hidden xl:col-span-2">
            <CardHead
              title="main.py"
              subtitle={`${bot.source.split("\n").length} lines · analyser snapshot`}
              action={<CopyButton value={bot.source} label="Copy source" />}
            />
            <div className="mt-2 max-h-[520px] overflow-auto bg-[#080b12] p-3 font-mono text-[11px] leading-[1.7]">
              {bot.source.split("\n").map((line, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-6 shrink-0 select-none text-right text-[#3d4a5e]">{i + 1}</span>
                  <span
                    className={cn(
                      "whitespace-pre",
                      /^(import|from)/.test(line)
                        ? "text-[#b3a8ff]"
                        : /^(async def|def|@)/.test(line)
                          ? "text-[#5eeac0]"
                          : /^#/.test(line)
                            ? "text-[#4a5a70]"
                            : "text-[#c3cfdf]",
                    )}
                  >
                    {line || " "}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <div className="flex flex-col gap-3">
            <Card className="p-4">
              <h3 className="text-[13px] font-semibold text-ink">Detected handlers</h3>
              <div className="mt-2 space-y-1.5">
                {bot.handlers.map((h, i) => (
                  <div key={h} className="flex items-center justify-between rounded-md border border-line/70 bg-canvas/40 px-2 py-1.5">
                    <span className="font-mono text-[11px] text-ink">{h}</span>
                    <span className="text-[9.5px] text-faint">{i % 3 === 0 ? "command" : i % 3 === 1 ? "message" : "callback"}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-[13px] font-semibold text-ink">Requirements.txt</h3>
              <pre className="mt-2 rounded-md border border-line/70 bg-canvas/50 p-2 font-mono text-[10.5px] leading-relaxed text-[#8ea7c9]">
                {bot.imports.map((i) => i.pypi + (i.pin ?? "")).join("\n")}
              </pre>
              <p className="mt-2 text-[10.5px] text-faint">
                Generated by the analyser. Pin conflicts are resolved against the compiler matrix before deploy.
              </p>
            </Card>
            <Card className="p-4">
              <h3 className="text-[13px] font-semibold text-ink">Token hygiene</h3>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-line/70 bg-canvas/40 p-2">
                <KeyRound size={12} className="text-faint" />
                <Mono>{bot.tokenMask}</Mono>
                <Badge tone="success" className="ml-auto">
                  masked
                </Badge>
              </div>
              <p className="mt-2 text-[10.5px] text-faint">
                The token is redacted in the analyser, the log stream and every export.
              </p>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "Environment" ? (
        <Card className="overflow-hidden">
          <CardHead
            title="Env vault"
            subtitle="encrypted at rest · injected at compile time"
            action={<Badge tone="accent">AES-256-GCM</Badge>}
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-y border-line/70 bg-canvas/30">
                  <th className="th">Key</th>
                  <th className="th">Value</th>
                  <th className="th">Visibility</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {bot.env.map((e) => (
                  <tr key={e.key} className="border-b border-line/50 last:border-0">
                    <td className="td font-mono text-[11.5px] text-ink">{e.key}</td>
                    <td className="td font-mono text-[11.5px]">
                      {e.secret && !reveal[e.key] ? "••••••••••••••••" : e.value}
                    </td>
                    <td className="td">
                      {e.secret ? <Badge tone="warn">secret</Badge> : <Badge>plain</Badge>}
                    </td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-1">
                        {e.secret ? (
                          <button
                            onClick={() => {
                              setReveal((r) => ({ ...r, [e.key]: !r[e.key] }));
                              if (!reveal[e.key]) push({ kind: "warn", title: "Secret revealed", body: "env.reveal was written to the audit log" });
                            }}
                            className="btn h-6 px-1.5 text-[10px]"
                          >
                            {reveal[e.key] ? <EyeOff size={10} /> : <Eye size={10} />}
                            {reveal[e.key] ? "hide" : "reveal"}
                          </button>
                        ) : null}
                        <button
                          onClick={() => push({ kind: "success", title: "Copied", body: `${e.key} copied to clipboard` })}
                          className="btn h-6 px-1.5 text-[10px]"
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input placeholder="NEW_KEY" className="input h-8 w-[150px] font-mono text-[11px]" />
              <input placeholder="value" className="input h-8 w-[240px] font-mono text-[11px]" />
              <button
                onClick={() => push({ kind: "success", title: "Env var added", body: "Redeploy to inject it into the runtime" })}
                className="btn h-8 text-[11px]"
              >
                <Check size={11} /> Add variable
              </button>
              <span className="ml-auto text-[10.5px] text-faint">4 of 20 variables used · free tier</span>
            </div>
          </div>
        </Card>
      ) : null}

      {tab === "Webhook" ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHead
              title="Telegram webhook"
              subtitle={bot.webhook.url}
              action={<Badge tone="success">200 · registered</Badge>}
            />
            <div className="mt-3 grid grid-cols-2 gap-2 px-4 sm:grid-cols-4">
              {[
                { k: "deliveries", v: fmt(bot.webhook.deliveries) },
                { k: "failures", v: String(bot.webhook.failures) },
                { k: "last status", v: String(bot.webhook.lastStatus) },
                { k: "secret token", v: bot.webhook.secretSet ? "set" : "missing" },
              ].map((s) => (
                <div key={s.k} className="rounded-lg border border-line/70 bg-canvas/40 p-2">
                  <div className="text-[9.5px] uppercase tracking-wide text-faint">{s.k}</div>
                  <div className="font-mono text-[12.5px] text-ink">{s.v}</div>
                </div>
              ))}
            </div>
            <div className="p-4">
              <div className="label">setWebhook payload</div>
              <pre className="mt-1.5 overflow-x-auto rounded-lg border border-line/70 bg-[#080b12] p-3 font-mono text-[10.5px] leading-relaxed text-[#8ea7c9]">
{`POST https://api.telegram.org/bot${bot.tokenMask}/setWebhook
{
  "url": "${bot.webhook.url}",
  "secret_token": "whsec_••••••••••••",
  "allowed_updates": ["message", "callback_query", "inline_query"],
  "drop_pending_updates": false,
  "max_connections": 40
}`}
              </pre>
            </div>
            <div className="border-t border-line/70 p-3">
              <div className="label mb-2">Recent deliveries</div>
              <div className="space-y-1">
                {logs.slice(0, 5).map((l) => (
                  <div key={l.id} className="flex items-center gap-2 rounded-md border border-line/60 bg-canvas/30 px-2 py-1 font-mono text-[10px]">
                    <span className="text-[#3d4a5e]">{new Date(l.ts).toISOString().slice(11, 19)}</span>
                    <span className={l.level === "error" ? "text-[#ff929c]" : "text-brand"}>
                      {l.level === "error" ? "500" : "200"}
                    </span>
                    <span className="truncate text-muted">{l.event} · {l.message}</span>
                    <span className="ml-auto text-faint">{l.latency ?? 0}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <div className="flex flex-col gap-3">
            <Card className="p-4">
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                <Webhook size={12} className="text-[#7edcf7]" /> Actions
              </h3>
              <div className="mt-2 space-y-1.5">
                <button
                  onClick={() => push({ kind: "success", title: "Webhook re-registered", body: "Telegram accepted the URL · 118ms" })}
                  className="btn h-8 w-full text-[11px]"
                >
                  <RefreshCw size={11} /> Re-register webhook
                </button>
                <button
                  onClick={() => push({ kind: "warn", title: "Secret rotated", body: "Telegram deliveries use the new secret immediately" })}
                  className="btn h-8 w-full text-[11px]"
                >
                  <ShieldCheck size={11} /> Rotate secret
                </button>
                <button
                  onClick={() => push({ kind: "info", title: "deleteWebhook called", body: "Updates buffered for 24h while paused" })}
                  className="btn-danger h-8 w-full text-[11px]"
                >
                  <Link2 size={11} /> Drop webhook
                </button>
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-[13px] font-semibold text-ink">Success rate</h3>
              <div className="mt-2">
                <Progress value={bot.successRate} color="#34e0a1" height={6} />
                <div className="mt-1 flex justify-between text-[10.5px] text-faint">
                  <span>{bot.successRate.toFixed(2)}% delivered</span>
                  <span>{(100 - bot.successRate).toFixed(2)}% retried</span>
                </div>
              </div>
              <div className="mt-3">
                <Bars data={bot.updates7d.slice(-7).map((v, i) => ({ label: `D${i + 1}`, value: v }))} height={90} />
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                <Clock size={12} className="text-faint" /> Region {bot.region}
              </h3>
              <p className="mt-1 text-[11px] text-faint">
                Edge function pinned to {bot.region} · cold start 812ms · keep-warm active.
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10.5px] text-[#4fdfb0]">
                <Check size={10} /> health checks passing
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "Logs" ? <LogConsole initial={logs} /> : null}

      {tab === "Danger zone" ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card className="border-[#ff5d6c]/25 p-4">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[#ff929c]">
              <AlertOctagon size={13} /> Delete this bot
            </h3>
            <p className="mt-1 text-[11.5px] text-muted">
              The webhook is dropped, compiled behaviour is purged and the token is revoked from the vault. Restorable from
              the audit log for 30 days.
            </p>
            <label className="label mt-3 block">Type {bot.slug} to confirm</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={bot.slug}
              className="input mt-1 font-mono text-[11.5px]"
            />
            <button
              disabled={confirm !== bot.slug}
              onClick={() => {
                push({ kind: "error", title: "Bot scheduled for deletion", body: `${bot.name} · purge in 30 days` });
                setStatus("draft");
                setConfirm("");
              }}
              className="btn-danger mt-2 w-full disabled:opacity-40"
            >
              <Trash2 size={12} /> Permanently delete
            </button>
          </Card>
          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-ink">Transfer & billing footprint</h3>
            <p className="mt-1 text-[11.5px] text-muted">
              This bot consumes {fmt(bot.updates24h * 30)} updates / month, billed on the {owner.plan} plan ({money(owner.mrr)}
              /mo).
            </p>
            <div className="mt-3 space-y-2">
              <button onClick={() => push({ kind: "info", title: "Transfer link created", body: `${bot.slug} → ${owner.email}` })} className="btn h-8 w-full text-[11px]">
                Transfer ownership
              </button>
              <button onClick={() => push({ kind: "warn", title: "Bot frozen", body: "New updates answered 503 · messages buffered" })} className="btn h-8 w-full text-[11px]">
                Freeze bot (abuse hold)
              </button>
              <button onClick={() => push({ kind: "success", title: "Snapshot exported", body: "source + env (secrets redacted)" })} className="btn h-8 w-full text-[11px]">
                Export snapshot
              </button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
