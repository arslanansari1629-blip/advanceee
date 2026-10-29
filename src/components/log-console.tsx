"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ChevronDown,
  CircleDot,
  Filter,
  Pause,
  Play,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import { cn, fmt } from "@/lib/format";
import type { LogLevel, LogLine } from "@/lib/types";
import { useToast } from "./toast";

const levelStyle: Record<LogLevel, { text: string; bg: string; label: string }> = {
  success: { text: "text-[#5eeac0]", bg: "bg-[#34e0a1]/10 border-[#34e0a1]/25", label: "OK" },
  info: { text: "text-[#8fb3d9]", bg: "bg-[#4cc9f0]/10 border-[#4cc9f0]/20", label: "INFO" },
  warn: { text: "text-[#f7c66b]", bg: "bg-[#f5b544]/10 border-[#f5b544]/25", label: "WARN" },
  error: { text: "text-[#ff929c]", bg: "bg-[#ff5d6c]/10 border-[#ff5d6c]/25", label: "ERR" },
  debug: { text: "text-[#b3a8ff]", bg: "bg-[#8b7cff]/10 border-[#8b7cff]/25", label: "DBG" },
};

const eventIcon: Record<LogLine["event"], string> = {
  update: "▲",
  reply: "↩",
  webhook: "⚡",
  compile: "⚙",
  error: "✕",
  auth: "✓",
};

const bots = [
  "forge_echo_bot",
  "price_radar_bot",
  "supportdesk_bot",
  "meme_machine_bot",
  "cryptoticker_bot",
  "shopassist_bot",
  "jobalerts_in_bot",
];

const users = ["arslan", "miraok", "kenjit", "sanaiq", "lucash", "annal", "fatima", "priyan"];

const synthetic = (i: number): LogLine => {
  const roll = i % 10;
  const bot = bots[i % bots.length];
  const user = users[(i * 3) % users.length];
  const chat = String(746100000 + ((i * 7919) % 90000000));
  const base: Partial<LogLine> = { bot, chat, id: `live_${i}` };
  const ts = new Date().toISOString();
  if (roll === 0)
    return {
      ...(base as LogLine),
      ts,
      level: "info",
      event: "update",
      message: `update "/start" from @${user} · chat ${chat}`,
      latency: null,
    };
  if (roll === 1)
    return {
      ...(base as LogLine),
      ts,
      level: "success",
      event: "reply",
      message: `reply → "Hey ${user}! I am live 24/7." (${38 + (i % 60)} ms)`,
      latency: 38 + (i % 60),
    };
  if (roll === 2)
    return {
      ...(base as LogLine),
      ts,
      level: "success",
      event: "auth",
      message: `getMe → @${bot} · ok (${90 + (i % 80)} ms)`,
      latency: 90 + (i % 80),
    };
  if (roll === 3)
    return {
      ...(base as LogLine),
      ts,
      level: "info",
      event: "update",
      message: `callback "tier:pro" from @${user} · chat ${chat}`,
      latency: null,
    };
  if (roll === 4)
    return {
      ...(base as LogLine),
      ts,
      level: "warn",
      event: "webhook",
      message: `cold start resolved in ${500 + (i % 700)} ms · retry 1/3`,
      latency: null,
    };
  if (roll === 5)
    return {
      ...(base as LogLine),
      ts,
      level: "error",
      event: "error",
      message: `TelegramError: Bad Request: message is too long (429 retry in 1.2s)`,
      latency: null,
    };
  if (roll === 6)
    return {
      ...(base as LogLine),
      ts,
      level: "success",
      event: "reply",
      message: `inline keyboard sent · callback_data=price_1 (${24 + (i % 30)} ms)`,
      latency: 24 + (i % 30),
    };
  if (roll === 7)
    return {
      ...(base as LogLine),
      ts,
      level: "info",
      event: "compile",
      message: `compiled behaviour: ${2 + (i % 5)} commands · answer inline`,
      latency: null,
    };
  if (roll === 8)
    return {
      ...(base as LogLine),
      ts,
      level: "debug",
      event: "webhook",
      message: `delivery signed · X-Telegram-Bot-Api-Secret-Token verified`,
      latency: null,
    };
  return {
    ...(base as LogLine),
    ts,
    level: "success",
    event: "reply",
    message: `photo uploaded · ${40 + (i % 120)} KB · caption compiled (${60 + (i % 90)} ms)`,
    latency: 60 + (i % 90),
  };
};

const timeOf = (iso: string) => new Date(iso).toISOString().slice(11, 19);

export function LogConsole({
  initial,
  compact = false,
  botList,
  initialBot = "all",
}: {
  initial: LogLine[];
  compact?: boolean;
  botList?: string[];
  initialBot?: string;
}) {
  const { push } = useToast();
  const [rows, setRows] = useState<LogLine[]>(initial);
  const [playing, setPlaying] = useState(true);
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [bot, setBot] = useState(initialBot);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);
  const counter = useRef(1000);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      counter.current += 1;
      setRows((prev) => [...prev.slice(-320), synthetic(counter.current)]);
    }, compact ? 2600 : 1500);
    return () => clearInterval(id);
  }, [playing, compact]);

  useEffect(() => {
    if (follow && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [rows, follow]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (level !== "all" && r.level !== level) return false;
        if (bot !== "all" && r.bot !== bot) return false;
        if (q && !`${r.message} ${r.bot} ${r.chat}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [rows, level, bot, q],
  );

  const counts = useMemo(
    () => ({
      error: rows.filter((r) => r.level === "error").length,
      warn: rows.filter((r) => r.level === "warn").length,
      total: rows.length,
    }),
    [rows],
  );

  const download = () => {
    const csv = [
      ["timestamp", "level", "event", "bot", "chat", "latency_ms", "message"],
      ...filtered.map((r) => [r.ts, r.level, r.event, r.bot, r.chat, r.latency ?? "", r.message]),
    ]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "botforge-log-buffer.csv";
    a.click();
    URL.revokeObjectURL(url);
    push({ kind: "success", title: "Log buffer exported", body: `${filtered.length} lines · CSV` });
  };

  return (
    <div className={cn("panel overflow-hidden", compact && "rounded-xl")}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line/80 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className={cn("flex h-1.5 w-1.5 rounded-full bg-[#34e0a1]", playing && "live-dot")} />
          <span className="text-[11.5px] font-medium text-ink">{compact ? "Live activity" : "Log stream"}</span>
          <span className="chip h-[20px] gap-1 px-1.5 py-0 py-0 text-[9.5px]">
            <Wifi size={9} /> sse
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {!compact ? (
            <>
              <div className="relative">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter lines…"
                  className="h-[26px] w-[150px] rounded-md border border-line bg-canvas/70 pl-6 pr-2 text-[11px] text-ink outline-none placeholder:text-faint focus:border-brand/50"
                />
              </div>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as LogLevel | "all")}
                className="h-[26px] rounded-md border border-line bg-canvas/70 px-1.5 text-[11px] text-muted outline-none focus:border-brand/50"
              >
                <option value="all">all levels</option>
                <option value="success">success</option>
                <option value="info">info</option>
                <option value="warn">warn</option>
                <option value="error">error</option>
                <option value="debug">debug</option>
              </select>
              <select
                value={bot}
                onChange={(e) => setBot(e.target.value)}
                className="h-[26px] max-w-[140px] rounded-md border border-line bg-canvas/70 px-1.5 text-[11px] text-muted outline-none focus:border-brand/50"
              >
                <option value="all">all bots</option>
                {(botList ?? bots).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex h-[26px] items-center gap-1 rounded-md border border-line bg-raised/60 px-2 text-[11px] text-muted hover:text-ink"
          >
            {playing ? <Pause size={10} /> : <Play size={10} />}
            {playing ? "Pause" : "Resume"}
          </button>
          <button
            onClick={() => setFollow((f) => !f)}
            className={cn(
              "flex h-[26px] items-center gap-1 rounded-md border px-2 text-[11px]",
              follow
                ? "border-brand/30 bg-brand/10 text-brand"
                : "border-line bg-raised/60 text-muted hover:text-ink",
            )}
            title="Auto-scroll to newest"
          >
            <ArrowDownToLine size={10} /> follow
          </button>
          <button
            onClick={download}
            className="hidden h-[26px] items-center gap-1 rounded-md border border-line bg-raised/60 px-2 text-[11px] text-muted hover:text-ink sm:flex"
          >
            <Terminal size={10} /> csv
          </button>
          <button
            onClick={() => {
              setRows([]);
              push({ kind: "info", title: "Buffer cleared", body: "New lines keep streaming in." });
            }}
            className="flex h-[26px] items-center gap-1 rounded-md border border-line bg-raised/60 px-2 text-[11px] text-muted hover:text-[#ff8a94]"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight > 40) setFollow(false);
        }}
        className={cn(
          "overflow-y-auto bg-[#06080d] font-mono text-[11px] leading-[1.65] dark:bg-[#06080d]",
          compact ? "h-[268px]" : "h-[560px]",
        )}
        style={{ background: "oklch(0.16 0.014 260 / 0.55)" }}
      >
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-faint">
            <Filter size={16} />
            <p className="text-[11.5px]">No lines match the current filters</p>
          </div>
        ) : null}
        {filtered.map((r) => {
          const st = levelStyle[r.level];
          const isOpen = expanded === r.id;
          return (
            <div key={r.id} className="group border-b border-white/[0.03]">
              <button
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="flex w-full items-start gap-2 px-3 py-[3px] text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="w-[62px] shrink-0 text-[10px] text-faint/80">{timeOf(r.ts)}</span>
                <span className={cn("w-[34px] shrink-0 rounded border px-1 text-center text-[9px] font-semibold", st.bg, st.text)}>
                  {st.label}
                </span>
                <span className="w-3 shrink-0 text-center text-[9px] text-faint">{eventIcon[r.event]}</span>
                <span className="w-[116px] shrink-0 truncate text-[10px] text-[#7f98bd]">{r.bot}</span>
                <span className="min-w-0 flex-1 truncate text-[#c3cfdf]">
                  {r.message}
                  {r.latency ? <span className="ml-2 text-[10px] text-faint">{r.latency}ms</span> : null}
                </span>
                {r.payload ? <ChevronDown size={10} className={cn("mt-1 shrink-0 text-faint transition-transform", isOpen && "rotate-180")} /> : null}
              </button>
              {isOpen ? (
                <pre className="overflow-x-auto whitespace-pre-wrap border-t border-white/[0.04] bg-black/30 px-3 py-2 text-[10.5px] text-[#8ea7c9]">
                  {JSON.stringify(
                    r.payload ?? {
                      event: r.event,
                      bot: r.bot,
                      chat_id: r.chat,
                      level: r.level,
                      latency_ms: r.latency,
                      message: r.message,
                    },
                    null,
                    2,
                  )}
                </pre>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line/80 px-3 py-1.5 text-[10px] text-faint">
        <span className="flex items-center gap-1">
          <CircleDot size={9} className="text-[#34e0a1]" /> {fmt(counts.total)} buffered
        </span>
        <span className="flex items-center gap-1 text-[#f7c66b]">
          <AlertTriangle size={9} /> {counts.warn} warn
        </span>
        <span className="flex items-center gap-1 text-[#ff929c]">
          <ShieldAlert size={9} /> {counts.error} err
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Sparkles size={9} /> {filtered.length} shown
        </span>
        {q ? (
          <button onClick={() => setQ("")} className="flex items-center gap-1 text-[#8fb3d9] hover:text-ink">
            <X size={9} /> clear “{q}”
          </button>
        ) : null}
      </div>
    </div>
  );
}
