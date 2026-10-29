import { Activity, Braces, Radio, Signal, Timer, Wifi } from "lucide-react";
import { LogConsole } from "@/components/log-console";
import { ActionButton } from "@/components/actions";
import { Card, CardHead, Metric, PageHeader, Progress } from "@/components/ui";
import { bots, logs } from "@/lib/data";

export const metadata = { title: "Live logs · BotForge Admin" };

export default function LogsPage({ searchParams }: { searchParams: { bot?: string } }) {
  const errors = logs.filter((l) => l.level === "error").length;
  const warns = logs.filter((l) => l.level === "warn").length;

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title="Live log console"
        subtitle="Server-sent events straight from the webhook engine: every Telegram update, every compiled reply, every Bot API error. Filter, search, pause the buffer and download it."
        actions={
          <>
            <span className="chip h-8 px-2.5">
              <Wifi size={11} className="text-brand" /> 1 stream
            </span>
            <ActionButton label="Flush buffer" icon={<Radio size={12} />} kind="info" title="Buffer flushed" body="Stream continues from a fresh offset" />
            <ActionButton label="Reconnect" icon={<Signal size={12} />} kind="success" title="SSE reconnected" body="offset 402931 · 0 dropped" variant="primary" />
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Events buffered" value={String(logs.length)} hint="rolling window" icon={<Activity size={13} />} />
        <Metric label="Errors" value={String(errors)} hint="last 10k lines" icon={<Braces size={13} />} color="#ff5d6c" />
        <Metric label="Warnings" value={String(warns)} hint="cold starts, retries" icon={<Timer size={13} />} color="#f5b544" />
        <Metric label="Avg reply" value="41 ms" delta={{ value: "6 ms", positive: false }} hint="p95 186 ms" icon={<Timer size={13} />} color="#8b7cff" />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <LogConsole initial={logs.slice(-140)} botList={bots.map((b) => b.slug)} initialBot={searchParams?.bot ?? "all"} />
        </div>
        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-ink">Stream health</h3>
            <div className="mt-2.5 space-y-2.5">
              {[
                { k: "connection", v: "open · sse", tone: "#34e0a1", bar: 100 },
                { k: "consumer lag", v: "180 ms", tone: "#34e0a1", bar: 18 },
                { k: "buffer fill", v: "62%", tone: "#f5b544", bar: 62 },
                { k: "dropped lines", v: "0", tone: "#34e0a1", bar: 2 },
              ].map((s) => (
                <div key={s.k}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted">{s.k}</span>
                    <span className="font-mono text-[10.5px] text-ink">{s.v}</span>
                  </div>
                  <div className="mt-1"><Progress value={s.bar} height={3} color={s.tone} /></div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHead title="Tail by bot" subtitle="click to filter the console" />
            <div className="mt-2 max-h-[280px] overflow-y-auto px-3 pb-3">
              {bots.slice(0, 12).map((b) => (
                <div key={b.id} className="flex items-center justify-between border-b border-line/40 py-1.5 last:border-0">
                  <span className="truncate font-mono text-[10.5px] text-muted">{b.slug}</span>
                  <span className="font-mono text-[10px] text-faint">{b.updates24h.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <Braces size={12} className="text-[#b3a8ff]" /> Stream API
            </h3>
            <pre className="mt-2 overflow-x-auto rounded-md border border-line/70 bg-[#080b12] p-2 font-mono text-[9.5px] leading-relaxed text-[#8ea7c9]">
{`GET /api/admin/logs/stream
accept: text/event-stream

event: log
data: {"level":"success",
 "bot":"forge_echo_bot",
 "message":"reply → 41ms"}`}
            </pre>
            <p className="mt-2 text-[10px] text-faint">Same buffer the console consumes — pipe it into Datadog, BigQuery or a SIEM.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
