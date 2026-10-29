"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CornerDownLeft,
  Flag,
  Inbox,
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Tag,
  UserPlus,
  X,
} from "lucide-react";
import { Avatar, Badge } from "./ui";
import { useToast } from "./toast";
import { cn, stampUTC } from "@/lib/format";
import type { Ticket } from "@/lib/types";

const priorityTone = {
  urgent: "danger",
  high: "warn",
  normal: "info",
  low: "neutral",
} as const;

const categoryTone = {
  billing: "accent",
  deploy: "info",
  bug: "warn",
  abuse: "danger",
  feature: "neutral",
} as const;

const canned = [
  "Thanks for the report — I've flushed the webhook secret cache for your bot. Please send /start once and tell me if the 401 persists.",
  "I've issued a refund for the duplicate charge; it lands back on your card in 3–5 business days.",
  "The analyser worker restarted and your bot compiled cleanly. It should be answering now — sorry for the wait.",
  "That's a great idea — I've logged it as a feature request and linked your account so we can follow up.",
  "I've escalated this to the security team and frozen the bot pending review. Thanks for flagging it.",
];

const fmtTime = (iso: string) => new Date(iso).toISOString().slice(11, 16);

export function TicketQueue({ tickets }: { tickets: Ticket[] }) {
  const { push } = useToast();
  const [list, setList] = useState(tickets);
  const [selected, setSelected] = useState(tickets[0]?.id ?? "");
  const [filter, setFilter] = useState<"all" | Ticket["status"]>("all");
  const [q, setQ] = useState("");
  const [reply, setReply] = useState("");
  const [showCanned, setShowCanned] = useState(false);

  const filtered = useMemo(
    () =>
      list.filter((t) => {
        if (filter !== "all" && t.status !== filter) return false;
        if (q && !`${t.subject} ${t.user} ${t.email} ${t.id}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [list, filter, q],
  );

  const active = list.find((t) => t.id === selected) ?? null;

  const update = (id: string, patch: Partial<Ticket>) =>
    setList((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const send = () => {
    if (!active || !reply.trim()) return;
    update(active.id, {
      messages: [...active.messages, { from: "admin", author: "Arslan Ansari", body: reply.trim(), at: new Date().toISOString() }],
      status: "pending",
      updated: new Date().toISOString(),
      unread: 0,
    });
    setReply("");
    push({ kind: "success", title: "Reply sent", body: `${active.id} · customer notified by email` });
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
      {/* list */}
      <div className={cn("panel overflow-hidden lg:col-span-4", active && "hidden lg:block")}>
        <div className="border-b border-line/80 p-2.5">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tickets…"
              className="h-8 w-full rounded-lg border border-line bg-canvas/60 pl-7 pr-2 text-[12px] text-ink outline-none placeholder:text-faint focus:border-brand/50"
            />
          </div>
          <div className="mt-2 flex items-center gap-0.5 rounded-lg border border-line bg-canvas/60 p-0.5">
            {(["all", "open", "pending", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 rounded-md px-1 py-1 text-[10.5px] font-medium capitalize transition-colors",
                  filter === f ? "bg-raised text-ink" : "text-faint hover:text-muted",
                )}
              >
                {f}
                <span className="ml-1 text-[9px] text-faint">
                  {f === "all" ? list.length : list.filter((t) => t.status === f).length}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[620px] overflow-y-auto">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelected(t.id);
                update(t.id, { unread: 0 });
              }}
              className={cn(
                "flex w-full flex-col gap-1 border-b border-line/50 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-raised/40",
                active?.id === t.id && "bg-brand/[0.06]",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9.5px] text-faint">{t.id}</span>
                <Badge tone={priorityTone[t.priority]} className="px-1 py-0 text-[9px]">{t.priority}</Badge>
                {t.unread > 0 ? (
                  <span className="rounded-full bg-[#ff5d6c] px-1.5 text-[9px] font-semibold text-white">{t.unread}</span>
                ) : null}
                <span className="ml-auto text-[9.5px] text-faint">{fmtTime(t.updated)}</span>
              </div>
              <p className={cn("truncate text-[12px]", active?.id === t.id ? "text-ink" : "text-muted")}>{t.subject}</p>
              <div className="flex items-center gap-1.5">
                <Avatar name={t.user} color="#8b7cff" size={14} />
                <span className="truncate text-[10px] text-faint">{t.user}</span>
                <Badge tone={categoryTone[t.category]} className="ml-auto px-1 py-0 text-[9px]">{t.category}</Badge>
              </div>
            </button>
          ))}
          {filtered.length === 0 ? <p className="px-3 py-10 text-center text-[11.5px] text-faint">Inbox zero on this filter.</p> : null}
        </div>
      </div>

      {/* conversation */}
      <div className="panel flex flex-col overflow-hidden lg:col-span-8">
        {active ? (
          <>
            <div className="flex flex-wrap items-start gap-2 border-b border-line/80 p-3">
              <button onClick={() => setSelected("")} className="btn-ghost h-7 px-1.5 text-[11px] lg:hidden">
                <X size={13} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-faint">{active.id}</span>
                  <Badge tone={priorityTone[active.priority]}>{active.priority}</Badge>
                  <Badge tone={active.status === "open" ? "warn" : active.status === "pending" ? "info" : "success"}>
                    {active.status}
                  </Badge>
                  <Badge tone={categoryTone[active.category]}>{active.category}</Badge>
                </div>
                <h2 className="mt-1 truncate text-[14px] font-semibold text-ink">{active.subject}</h2>
                <p className="text-[11px] text-faint">
                  {active.user} · {active.email} · updated {stampUTC(active.updated)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  value={active.priority}
                  onChange={(e) => {
                    update(active.id, { priority: e.target.value as Ticket["priority"] });
                    push({ kind: "info", title: "Priority updated", body: `${active.id} → ${e.target.value}` });
                  }}
                  className="h-7 rounded-md border border-line bg-canvas/60 px-1.5 text-[10.5px] text-muted outline-none"
                >
                  <option value="urgent">urgent</option>
                  <option value="high">high</option>
                  <option value="normal">normal</option>
                  <option value="low">low</option>
                </select>
                <button
                  onClick={() => {
                    update(active.id, { status: active.status === "resolved" ? "open" : "resolved" });
                    push({
                      kind: active.status === "resolved" ? "info" : "success",
                      title: active.status === "resolved" ? "Ticket reopened" : "Ticket resolved",
                      body: `${active.id} · CSAT survey queued`,
                    });
                  }}
                  className={cn("btn h-7 px-2 text-[10.5px]", active.status !== "resolved" && "border-brand/30 text-brand")}
                >
                  <CheckCircle2 size={11} />
                  {active.status === "resolved" ? "Reopen" : "Resolve"}
                </button>
                <button
                  onClick={() => push({ kind: "info", title: "Assigned to you", body: `${active.id} · SLA 4h` })}
                  className="btn h-7 px-2 text-[10.5px]"
                >
                  <UserPlus size={11} /> Assign
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-canvas/20 p-3" style={{ maxHeight: 380 }}>
              {active.messages.map((m, i) => (
                <div key={i} className={cn("flex gap-2", m.from === "admin" && "flex-row-reverse")}>
                  <Avatar name={m.author} color={m.from === "admin" ? "#34e0a1" : "#8b7cff"} size={24} />
                  <div className={cn("max-w-[78%] rounded-lg border p-2.5", m.from === "admin" ? "border-brand/25 bg-brand/[0.06]" : "border-line/80 bg-panel")}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-medium text-ink">{m.author}</span>
                      <span className="text-[9px] text-faint">{fmtTime(m.at)} UTC</span>
                      {m.from === "admin" ? <Badge tone="success" className="px-1 py-0 text-[8.5px]">staff</Badge> : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-muted">{m.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-line/80 p-2.5">
              <div className="relative">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                  }}
                  placeholder="Write a reply… ⌘↵ to send"
                  className="h-[74px] w-full resize-none rounded-lg border border-line bg-canvas/60 p-2.5 pr-24 text-[11.5px] text-ink outline-none placeholder:text-faint focus:border-brand/50"
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                  <button
                    onClick={() => setShowCanned((s) => !s)}
                    className="btn h-6 px-1.5 text-[10px]"
                    title="Canned responses"
                  >
                    <Sparkles size={10} /> macro
                  </button>
                  <button onClick={send} disabled={!reply.trim()} className="btn-primary h-6 px-2 text-[10px] disabled:opacity-40">
                    <Send size={10} /> send
                  </button>
                </div>
                {showCanned ? (
                  <div className="absolute bottom-full right-0 mb-1 w-[320px] overflow-hidden rounded-lg border border-line bg-panel shadow-pop">
                    {canned.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setReply(c);
                          setShowCanned(false);
                        }}
                        className="block w-full border-b border-line/60 px-2.5 py-2 text-left text-[10.5px] text-muted last:border-0 hover:bg-raised hover:text-ink"
                      >
                        {c.slice(0, 96)}…
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[9.5px] text-faint">
                <span className="flex items-center gap-1"><Clock size={9} /> first response 12m</span>
                <span className="flex items-center gap-1"><MessageSquare size={9} /> {active.messages.length} messages</span>
                <button onClick={() => push({ kind: "warn", title: "Escalated", body: "Security team paged · #incident-ops" })} className="ml-auto flex items-center gap-1 hover:text-ink">
                  <ShieldAlert size={9} /> escalate
                </button>
                <button onClick={() => push({ kind: "info", title: "Tag added", body: "tag:webhook" })} className="flex items-center gap-1 hover:text-ink">
                  <Tag size={9} /> tag
                </button>
                <button onClick={() => push({ kind: "info", title: "Linked to INC-2291", body: "Incident timeline updated" })} className="flex items-center gap-1 hover:text-ink">
                  <Flag size={9} /> link incident
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 text-center">
            <Inbox size={20} className="text-faint" />
            <p className="text-[12.5px] text-ink">Pick a ticket</p>
            <p className="max-w-xs text-[11px] text-faint">The queue on the left shows every open conversation, sorted by recency.</p>
            <button onClick={() => setSelected(tickets[0].id)} className="btn h-7 text-[11px] lg:hidden">
              <ArrowUpRight size={11} /> Open newest
            </button>
            <span className="mt-1 flex items-center gap-1 text-[10px] text-faint"><CornerDownLeft size={9} /> ⌘↵ sends a reply</span>
          </div>
        )}
      </div>
    </div>
  );
}
