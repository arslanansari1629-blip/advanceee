"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BotStatus, LogLine } from "@/lib/types";
import { clockTime, cx, streamClass } from "./ui";
import { IconDownload, IconPause, IconPlay, IconSearch, IconTerminal, IconTrash } from "./icons";

type Filter = "all" | LogLine["stream"];

export default function LogViewer({
  botId,
  height = 420,
  onStatus,
  className,
  endpoint,
  readOnly = false,
}: {
  botId: string;
  height?: number;
  onStatus?: (s: BotStatus) => void;
  className?: string;
  /** override the log endpoint (operator console uses /api/admin/logs) */
  endpoint?: string;
  readOnly?: boolean;
}) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [seq, setSeq] = useState(0);
  const [status, setStatus] = useState<BotStatus>("draft");
  const [follow, setFollow] = useState(true);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const poll = useCallback(async () => {
    if (pausedRef.current) return;
    try {
      const base = endpoint ?? `/api/bots/${botId}/logs`;
      const res = await fetch(`${base}?after=${seqRef.current}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "log stream failed");
      const data = await res.json();
      setError(null);
      setStatus(data.status);
      onStatus?.(data.status);
      if (data.lines?.length) {
        setLines((prev) => {
          const merged = [...prev, ...(data.lines as LogLine[])];
          return merged.slice(-600);
        });
      }
      if (typeof data.nextSeq === "number" && data.nextSeq > 0) {
        seqRef.current = data.nextSeq;
        setSeq(data.nextSeq);
      }
    } catch (err: any) {
      setError(err?.message ?? "log stream failed");
    }
  }, [botId, onStatus, endpoint]);

  useEffect(() => {
    seqRef.current = 0;
    setLines([]);
    poll();
    const id = setInterval(poll, 1400);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    if (!follow || paused) return;
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, follow, paused]);

  const visible = lines.filter((l) => {
    if (filter !== "all" && l.stream !== filter) return false;
    if (query && !l.message.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const download = () => {
    const text = lines
      .map((l) => `${new Date(l.ts).toISOString()} [${l.stream}] ${l.message}`)
      .join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${botId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clear = async () => {
    if (readOnly) return;
    await fetch(`/api/bots/${botId}/logs`, { method: "DELETE" });
    setLines([]);
    seqRef.current = 0;
    setSeq(0);
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `All ${lines.length}` },
    { id: "update", label: "Updates" },
    { id: "reply", label: "Replies" },
    { id: "telegram", label: "Telegram" },
    { id: "system", label: "System" },
    { id: "error", label: "Errors" },
  ];

  return (
    <div className={cx("glass overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <IconTerminal size={13} /> live logs
        </span>
        <span
          className={cx(
            "pill !text-[10px]",
            status === "live"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : status === "error"
              ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
              : "border-white/10 text-slate-400"
          )}
        >
          <span className={cx("dot", status === "live" ? "dot-live" : status === "error" ? "dot-err" : "dot-idle")} />
          {status}
        </span>
        <span className="mono text-[10.5px] text-slate-500">#{seq}</span>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <IconSearch size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="filter…"
              className="w-32 rounded-md border border-white/10 bg-black/40 py-1 pl-6.5 pr-2 text-[11px] outline-none focus:border-cyan-400/40"
              style={{ paddingLeft: 24 }}
            />
          </div>
          <button className="btn btn-ghost !px-2 !py-1 !text-[11px]" onClick={() => setFollow((f) => !f)}>
            {follow ? "Following" : "Follow tail"}
          </button>
          <button className="btn btn-ghost !px-2 !py-1 !text-[11px]" onClick={() => setPaused((p) => !p)}>
            {paused ? <IconPlay size={11} /> : <IconPause size={11} />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button className="btn btn-ghost !px-2 !py-1 !text-[11px]" onClick={download} title="Download logs">
            <IconDownload size={12} />
          </button>
          {!readOnly && (
            <button className="btn btn-ghost !px-2 !py-1 !text-[11px]" onClick={clear} title="Clear buffer">
              <IconTrash size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-white/[0.05] px-3 py-1.5">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cx(
              "rounded-md px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
              filter === f.id ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {f.label}
          </button>
        ))}
        {error && <span className="ml-auto text-[10.5px] text-rose-400">{error}</span>}
      </div>

      <div
        ref={boxRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight > 48) setFollow(false);
        }}
        className="logs overflow-auto bg-[#04060c]/60"
        style={{ height }}
      >
        {visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-[12px] text-slate-600">
            <IconTerminal size={22} />
            waiting for output…
          </div>
        ) : (
          <div className="py-2">
            {visible.map((l) => (
              <div key={l.seq} className="log-row">
                <span className="log-ts">{clockTime(l.ts)}</span>
                <span className={cx("text-[10px] uppercase", streamClass(l.stream))}>{l.stream}</span>
                <span className={streamClass(l.stream)}>{l.message}</span>
              </div>
            ))}
            {status === "live" && !paused && (
              <div className="log-row opacity-60">
                <span className="log-ts" />
                <span />
                <span className="text-emerald-400">▍streaming…</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
