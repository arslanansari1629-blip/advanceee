import Link from "next/link";
import { Activity, CircleCheck, CircleDot, Clock4, Globe2, Server, TriangleAlert } from "lucide-react";
import { Heatmap } from "@/components/charts";
import { ActionButton } from "@/components/actions";
import { Badge, Card, CardHead, PageHeader, Progress } from "@/components/ui";
import { incidents, services } from "@/lib/data";
import { relTime } from "@/lib/format";

export const metadata = { title: "Health · BotForge Admin" };

export default function HealthPage() {
  const degraded = services.filter((s) => s.status !== "operational");
  const overall = degraded.length === 0 ? "operational" : degraded.some((s) => s.status === "outage") ? "outage" : "degraded";

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Health & incidents"
        subtitle="Uptime, latency and error budgets for every dependency in the answering path. The engine answers regardless — this page is about how fast it answers."
        actions={
          <>
            <ActionButton label="Run probes" icon={<Activity size={12} />} kind="success" title="Probe sweep complete" body="6/6 services reachable · 41ms avg" />
            <ActionButton label="Open incident" icon={<TriangleAlert size={12} />} kind="warn" title="Incident draft created" body="INC-2292 · awaiting severity" />
          </>
        }
      />

      <Card
        className={`mb-3 flex flex-wrap items-center gap-3 p-3 ${
          overall === "operational" ? "border-[#34e0a1]/25" : "border-[#f5b544]/25"
        }`}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            overall === "operational" ? "bg-[#34e0a1]/10 text-[#34e0a1]" : "bg-[#f5b544]/10 text-[#f5b544]"
          }`}
        >
          {overall === "operational" ? <CircleCheck size={17} /> : <TriangleAlert size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">
            {overall === "operational" ? "All systems operational" : "Partial degradation · log pipeline"}
          </p>
          <p className="text-[11.5px] text-faint">
            {degraded.length === 0
              ? "No active incidents. Error budget at 82% for the 30-day window."
              : `${degraded.map((d) => d.name).join(", ")} · incident INC-2290 under monitoring · webhook answering unaffected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={overall === "operational" ? "success" : "warn"}>{overall}</Badge>
          <span className="text-[10.5px] text-faint">checked 12s ago</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="space-y-2 xl:col-span-2">
          {services.map((s) => (
            <Card key={s.name} className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    s.status === "operational" ? "bg-[#34e0a1]" : s.status === "degraded" ? "bg-[#f5b544]" : "bg-[#ff5d6c]"
                  }`}
                />
                <span className="text-[12.5px] font-medium text-ink">{s.name}</span>
                <span className="flex items-center gap-1 text-[10px] text-faint">
                  <Globe2 size={9} /> {s.region}
                </span>
                <Badge
                  tone={s.status === "operational" ? "success" : s.status === "degraded" ? "warn" : "danger"}
                  className="ml-auto"
                >
                  {s.status}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-[92px] shrink-0">
                  <div className="font-mono text-[13px] text-ink">{s.uptime.toFixed(2)}%</div>
                  <div className="text-[9px] uppercase tracking-wide text-faint">90d uptime</div>
                </div>
                <div className="w-[92px] shrink-0">
                  <div className="font-mono text-[13px] text-ink">{s.latency} ms</div>
                  <div className="text-[9px] uppercase tracking-wide text-faint">p50 latency</div>
                </div>
                <div className="min-w-0 flex-1">
                  <Heatmap values={s.days} columns={45} cell={8} gap={2} color={s.status === "operational" ? "52, 224, 161" : "245, 181, 68"} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-ink">SLO burn · 30d</h3>
            <div className="mt-2.5 space-y-3">
              {[
                { k: "Webhook availability", v: 82, target: "99.95%", tone: "#34e0a1" },
                { k: "Reply latency p95", v: 64, target: "< 250ms", tone: "#4cc9f0" },
                { k: "Compile success", v: 91, target: "> 99.5%", tone: "#8b7cff" },
                { k: "Log freshness", v: 23, target: "< 5s lag", tone: "#f5b544" },
              ].map((s) => (
                <div key={s.k}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted">{s.k}</span>
                    <span className="font-mono text-[10.5px] text-faint">{s.target}</span>
                  </div>
                  <div className="mt-1"><Progress value={s.v} height={4} color={s.tone} /></div>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[10px] text-faint">Budget remaining shown as % of the 30-day allowance.</p>
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <Server size={12} className="text-[#7edcf7]" /> Edge regions
            </h3>
            <div className="mt-2 space-y-1.5">
              {[
                { r: "iad1", bots: 12, lat: 168, ok: true },
                { r: "fra1", bots: 9, lat: 812, ok: false },
                { r: "bom1", bots: 6, lat: 194, ok: true },
                { r: "sin1", bots: 4, lat: 231, ok: true },
                { r: "sfo1", bots: 3, lat: 178, ok: true },
              ].map((r) => (
                <div key={r.r} className="flex items-center gap-2 text-[11px]">
                  <CircleDot size={9} className={r.ok ? "text-[#34e0a1]" : "text-[#f5b544]"} />
                  <span className="font-mono text-muted">{r.r}</span>
                  <span className="text-faint">{r.bots} bots</span>
                  <span className={`ml-auto font-mono ${r.ok ? "text-muted" : "text-[#f7c66b]"}`}>{r.lat} ms</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHead title="Incident timeline" subtitle="last 7 days · newest first" action={<Badge tone="warn">1 monitoring</Badge>} />
          <div className="mt-2 divide-y divide-line/60">
            {incidents.map((i) => (
              <div key={i.id} className="flex flex-wrap items-start gap-2 px-4 py-2.5">
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    i.severity === "critical" ? "bg-[#ff5d6c]" : i.severity === "major" ? "bg-[#f5b544]" : "bg-[#4cc9f0]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-faint">{i.id}</span>
                    <span className="text-[12px] font-medium text-ink">{i.title}</span>
                    <Badge tone={i.status === "resolved" ? "success" : i.status === "monitoring" ? "warn" : "danger"}>
                      {i.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-faint">{i.summary}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[9.5px] text-faint">
                    <span className="flex items-center gap-1"><Clock4 size={9} /> {relTime(i.started)}</span>
                    <span>·</span>
                    <span>{i.duration}</span>
                    <span>·</span>
                    <span>{i.services.join(" · ")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-[13px] font-semibold text-ink">Runbook shortcuts</h3>
          <div className="mt-2 space-y-1.5">
            {[
              "Drain fra1 traffic to iad1",
              "Flush webhook secret cache",
              "Restart analyser workers",
              "Replay buffered updates",
              "Rotate Telegram webhook secret",
            ].map((r) => (
              <Link
                key={r}
                href="/admin/logs"
                className="flex items-center gap-2 rounded-md border border-line/70 bg-canvas/40 px-2 py-1.5 text-[11px] text-muted hover:border-brand/30 hover:text-ink"
              >
                <Activity size={10} className="text-brand" /> {r}
              </Link>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-line/70 bg-canvas/40 p-2 text-[10.5px] text-faint">
            On-call: <span className="text-muted">Arslan Ansari</span> · escalation to <span className="text-muted">#incident-ops</span> after 10m.
          </div>
        </Card>
      </div>
    </>
  );
}
