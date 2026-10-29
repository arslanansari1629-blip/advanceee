import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CircleAlert,
  Clock4,
  Cpu,
  Gauge as GaugeIcon,
  Radio,
  Sparkles,
  Timer,
  TrendingUp,
  Users2,
  Wallet,
  Zap,
} from "lucide-react";
import { TrafficCard } from "@/components/overview-charts";
import { LogConsole } from "@/components/log-console";
import { ActionButton, ExportButton } from "@/components/actions";
import { Gauge, Donut } from "@/components/charts";
import {
  Avatar,
  Badge,
  Card,
  CardHead,
  Dot,
  Metric,
  PageHeader,
  Progress,
  Sparkline,
  StatusBadge,
} from "@/components/ui";
import {
  bots,
  botOwner,
  incidents,
  kpis,
  libraryMix,
  logs,
  overviewSeries,
  planMix,
  revenueSeries,
  statusMix,
  topBots,
  users,
} from "@/lib/data";
import { fmt, money, pct, relTime } from "@/lib/format";

export const metadata = { title: "Overview · BotForge Admin" };

export default function OverviewPage() {
  const ranges = ["24h", "7d", "30d", "90d"] as const;
  const seriesByRange = Object.fromEntries(ranges.map((r) => [r, overviewSeries(r)])) as Record<
    (typeof ranges)[number],
    ReturnType<typeof overviewSeries>
  >;

  const planColors: Record<string, string> = { free: "#5c6880", pro: "#8b7cff", scale: "#34e0a1" };
  const planData = planMix.map((p) => ({ label: p.plan, value: p.users, color: planColors[p.plan] }));

  return (
    <>
      <PageHeader
        eyebrow="Fleet control"
        title="Good evening, Arslan"
        subtitle="Every bot, every update, every dollar — one console. Traffic is 12.4% above last week and the engine is answering in under 200ms at p95."
        actions={
          <>
            <ExportButton
              filename="botforge-fleet.csv"
              rows={[
                ["bot", "owner", "status", "library", "updates_24h", "success_rate", "p95_ms", "region"],
                ...bots.map((b) => [
                  b.slug,
                  botOwner(b).email,
                  b.status,
                  b.library,
                  b.updates24h,
                  b.successRate,
                  b.p95,
                  b.region,
                ]),
              ]}
            />
            <Link href="/admin/logs" className="btn">
              <Radio size={13} /> Live logs
            </Link>
            <Link href="/admin/bots?new=1" className="btn-primary">
              <Zap size={13} strokeWidth={2.6} /> Deploy bot
            </Link>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric
          label="Live bots"
          value={`${kpis.liveBots}`}
          delta={{ value: "3 this week" }}
          hint={`of ${kpis.totalBots} deployed`}
          spark={[8, 9, 9, 11, 12, 12, 13, 14, 15]}
          icon={<Bot size={13} />}
        />
        <Metric
          label="Updates · 24h"
          value={fmt(kpis.updates24h)}
          delta={{ value: "12.4%" }}
          hint="vs yesterday"
          spark={seriesByRange["24h"].updates}
          icon={<Activity size={13} />}
        />
        <Metric
          label="Success rate"
          value={pct(kpis.successRate, 2)}
          delta={{ value: "0.04pt" }}
          hint="1.4k replies/min"
          spark={[99.8, 99.86, 99.9, 99.88, 99.92, 99.94, 99.92]}
          icon={<GaugeIcon size={13} />}
        />
        <Metric
          label="p95 latency"
          value={`${kpis.p95} ms`}
          delta={{ value: "9 ms", positive: false }}
          hint="budget 250 ms"
          spark={[210, 198, 204, 190, 186, 192, 186]}
          color="#f5b544"
          icon={<Timer size={13} />}
        />
        <Metric
          label="MRR"
          value={money(kpis.mrr)}
          delta={{ value: "8.1%" }}
          hint={`${kpis.paidUsers} paying · ARPU $${kpis.arpu}`}
          spark={revenueSeries.map((r) => r.mrr)}
          color="#8b7cff"
          icon={<Wallet size={13} />}
        />
      </div>

      {/* main grid */}
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TrafficCard data={seriesByRange} mrrByDay={revenueSeries.map((r) => r.mrr)} />
        </div>

        <Card className="flex flex-col">
          <CardHead
            title="Engine health"
            subtitle="webhook process · last 60 min"
            action={<Badge tone="success">nominal</Badge>}
          />
          <div className="mt-3 flex items-center justify-around px-3">
            <Gauge value={99.99} label="uptime" />
            <Gauge value={82.4} label="error budget" color="#8b7cff" />
          </div>
          <div className="mt-1 space-y-2.5 px-5 pb-1">
            {[
              { label: "Cold starts", value: "0.4%", bar: 4, tone: "#34e0a1" },
              { label: "429 retries", value: "0.08%", bar: 8, tone: "#f5b544" },
              { label: "Queue depth", value: "12", bar: 12, tone: "#4cc9f0" },
              { label: "Compile backlog", value: "1", bar: 3, tone: "#8b7cff" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="text-muted">{row.label}</span>
                  <span className="font-mono text-[11px] text-ink">{row.value}</span>
                </div>
                <div className="mt-1">
                  <Progress value={Math.max(3, row.bar * 4)} height={3} color={row.tone} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto grid grid-cols-3 divide-x divide-line/70 border-t border-line/70 text-center">
            {[
              { label: "regions", value: "5" },
              { label: "avg reply", value: "41 ms" },
              { label: "errors 1h", value: "17" },
            ].map((s) => (
              <div key={s.label} className="px-2 py-2">
                <div className="font-mono text-[12px] text-ink">{s.value}</div>
                <div className="text-[9.5px] uppercase tracking-wide text-faint">{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* top bots + plan mix */}
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHead
            title="Busiest bots"
            subtitle="sorted by updates in the last 24 hours"
            action={
              <Link href="/admin/bots" className="btn-ghost h-7 px-2 text-[11.5px]">
                All {bots.length} bots <ArrowUpRight size={11} />
              </Link>
            }
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-y border-line/70 bg-canvas/30">
                  <th className="th">Bot</th>
                  <th className="th">Owner</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Updates 24h</th>
                  <th className="th">Trend</th>
                  <th className="th text-right">Success</th>
                  <th className="th text-right">p95</th>
                </tr>
              </thead>
              <tbody>
                {topBots.map((b) => {
                  const owner = botOwner(b);
                  return (
                    <tr key={b.id} className="group border-b border-line/50 transition-colors last:border-0 hover:bg-raised/40">
                      <td className="td">
                        <Link href={`/admin/bots/${b.id}`} className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-raised/70 font-mono text-[10px] text-muted group-hover:border-brand/40 group-hover:text-brand">
                            {b.name.slice(0, 1)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-medium text-ink">{b.name}</span>
                            <span className="block truncate font-mono text-[10px] text-faint">{b.handle}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="td">
                        <span className="flex items-center gap-1.5">
                          <Avatar name={owner.name} color={owner.color} size={18} />
                          <span className="text-[11.5px]">{owner.name.split(" ")[0]}</span>
                        </span>
                      </td>
                      <td className="td">
                        <StatusBadge status={b.status} pulse />
                      </td>
                      <td className="td text-right font-mono text-[12px] text-ink">{fmt(b.updates24h)}</td>
                      <td className="td">
                        <Sparkline data={b.updates7d.slice(-10)} color={b.status === "error" ? "#ff5d6c" : "#34e0a1"} width={70} height={20} />
                      </td>
                      <td className="td text-right font-mono text-[11.5px]">{b.successRate.toFixed(2)}%</td>
                      <td className="td text-right font-mono text-[11.5px]">{b.p95} ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-semibold text-ink">Plan mix</h3>
                <p className="text-[11.5px] text-faint">{kpis.users} accounts</p>
              </div>
              <Link href="/admin/users" className="text-[11px] text-faint hover:text-ink">
                manage →
              </Link>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <Donut data={planData} centerValue={`${kpis.paidUsers}`} centerLabel="paying" size={124} thickness={12} />
              <div className="flex-1 space-y-2">
                {planMix.map((p) => (
                  <div key={p.plan} className="flex items-center justify-between text-[11.5px]">
                    <span className="flex items-center gap-1.5 capitalize text-muted">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: planColors[p.plan] }} />
                      {p.plan}
                    </span>
                    <span className="font-mono text-[11px] text-ink">{money(p.revenue)}/mo</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-line/70 pt-2 text-[11.5px]">
                  <span className="text-faint">churn</span>
                  <span className="font-mono text-[11px] text-[#4fdfb0]">{kpis.churn}%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="flex-1 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-ink">Fleet composition</h3>
              <Link href="/admin/bots" className="text-[11px] text-faint hover:text-ink">
                inspect →
              </Link>
            </div>
            <div className="mt-3 space-y-2.5">
              {statusMix.map((s) => {
                const colors: Record<string, string> = {
                  live: "#34e0a1",
                  paused: "#f5b544",
                  error: "#ff5d6c",
                  draft: "#5c6880",
                  compiling: "#8b7cff",
                };
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="flex items-center gap-1.5 capitalize text-muted">
                        <Dot color={colors[s.status]} /> {s.status}
                      </span>
                      <span className="font-mono text-[11px] text-ink">{s.count}</span>
                    </div>
                    <div className="mt-1">
                      <Progress value={(s.count / bots.length) * 100} height={3} color={colors[s.status]} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line/70 pt-3">
              {libraryMix.map((l) => (
                <span key={l.label} className="chip text-[9.5px]">
                  {l.label} · {l.value}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* logs + incidents */}
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LogConsole initial={logs.slice(-40)} compact botList={bots.map((b) => b.slug)} />
        </div>
        <div className="flex flex-col gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                <CircleAlert size={13} className="text-[#f5b544]" /> Active incidents
              </h3>
              <Link href="/admin/health" className="text-[11px] text-faint hover:text-ink">
                status page →
              </Link>
            </div>
            <div className="mt-3 space-y-2.5">
              {incidents.slice(0, 3).map((i) => (
                <div key={i.id} className="rounded-lg border border-line/70 bg-canvas/40 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-faint">{i.id}</span>
                    <Badge tone={i.severity === "critical" ? "danger" : i.severity === "major" ? "warn" : "info"}>
                      {i.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11.5px] font-medium leading-snug text-ink">{i.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-faint">
                    <span className="flex items-center gap-1">
                      <Clock4 size={9} /> {relTime(i.started)}
                    </span>
                    <span>·</span>
                    <span className="capitalize">{i.status}</span>
                    <span>·</span>
                    <span>{i.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <Sparkles size={13} className="text-[#b3a8ff]" /> Quick actions
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/admin/bots?new=1" className="btn h-auto flex-col items-start gap-1 px-2.5 py-2 text-[11px]">
                <Zap size={13} className="text-brand" />
                Deploy bot
              </Link>
              <Link href="/admin/logs" className="btn h-auto flex-col items-start gap-1 px-2.5 py-2 text-[11px]">
                <Radio size={13} className="text-[#7edcf7]" />
                Tail logs
              </Link>
              <Link href="/admin/users" className="btn h-auto flex-col items-start gap-1 px-2.5 py-2 text-[11px]">
                <Users2 size={13} className="text-[#b3a8ff]" />
                Invite user
              </Link>
              <Link href="/admin/tickets" className="btn h-auto flex-col items-start gap-1 px-2.5 py-2 text-[11px]">
                <Cpu size={13} className="text-[#f7c66b]" />
                Triage inbox
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* mini stats strip */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "New users · 7d", value: fmt(kpis.newUsers7d), delta: "+18.2%", icon: <TrendingUp size={12} /> },
          { label: "Deploys · 24h", value: `${kpis.deploys24h}`, delta: `${kpis.avgDeploySeconds}s avg`, icon: <Zap size={12} /> },
          { label: "Error rate", value: `${kpis.errorRate}%`, delta: "-0.02pt", icon: <CircleAlert size={12} /> },
          { label: "Support backlog", value: "3 open", delta: "1 urgent", icon: <Activity size={12} /> },
        ].map((s) => (
          <div key={s.label} className="panel flex items-center gap-3 p-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-raised/60 text-muted">
              {s.icon}
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.08em] text-faint">{s.label}</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[14px] font-semibold text-ink">{s.value}</span>
                <span className="text-[10px] text-faint">{s.delta}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between text-[10.5px] text-faint">
        <span>Last refreshed {relTime(new Date().toISOString())} · demo dataset, deterministic seed 20261029</span>
        <ActionButton label="Refresh data" icon={<Activity size={11} />} kind="success" title="Metrics refreshed" body="Snapshot pulled from the edge cache · 41ms" variant="ghost" className="h-6 text-[10.5px]" />
      </div>
    </>
  );
}
