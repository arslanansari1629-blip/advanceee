import Link from "next/link";
import { Activity, Bug, Radio, Users2, Zap } from "lucide-react";
import { ActivityFeed } from "@/components/activity-feed";
import { ActionButton } from "@/components/actions";
import { Avatar, Badge, Card, CardHead, Metric, PageHeader, Progress, StatusBadge } from "@/components/ui";
import { bots, logs, users } from "@/lib/data";
import { fmt, relTime } from "@/lib/format";

export const metadata = { title: "Activity · BotForge Admin" };

export default function ActivityPage() {
  const online = users.slice(0, 6);
  const queue = bots.filter((b) => b.status === "compiling" || b.status === "draft").slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Command"
        title="Activity"
        subtitle="A single pulse across the platform: incoming updates, compiled replies, deploys, auth events and failures — refreshed live."
        actions={
          <>
            <ActionButton label="Mark all read" icon={<Radio size={12} />} kind="info" title="Stream marked read" body="Unread counter reset" />
            <ActionButton
              label="Export stream"
              icon={<Activity size={12} />}
              kind="success"
              title="Stream exported"
              body="260 events · NDJSON"
              variant="primary"
            />
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Events · 1h" value={fmt(4120)} delta={{ value: "9.2%" }} hint="updates + replies" spark={[320, 380, 355, 410, 460, 442, 480]} icon={<Activity size={13} />} />
        <Metric label="Deploys · 24h" value="61" delta={{ value: "12" }} hint="34 succeeded" icon={<Zap size={13} />} color="#8b7cff" />
        <Metric label="Errors · 1h" value="17" delta={{ value: "0.08%", positive: false }} hint="of all traffic" icon={<Bug size={13} />} color="#ff5d6c" />
        <Metric label="Operators online" value={String(online.length)} hint="last 15 min" icon={<Users2 size={13} />} color="#4cc9f0" />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityFeed logs={logs.slice(-40).reverse()} />
        </div>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-ink">Operators online</h3>
            <div className="mt-2 space-y-1.5">
              {online.map((u) => (
                <div key={u.id} className="flex items-center gap-2">
                  <Avatar name={u.name} color={u.color} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11.5px] text-ink">{u.name}</div>
                    <div className="text-[9.5px] text-faint">{u.telegram} · {u.role}</div>
                  </div>
                  <span className="flex items-center gap-1 text-[9.5px] text-[#4fdfb0]">
                    <span className="h-1 w-1 rounded-full bg-brand" /> active
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHead title="Deploy queue" subtitle="analyser workers" action={<Badge tone="warn">{queue.length} pending</Badge>} />
            <div className="space-y-2 p-4">
              {queue.map((b) => (
                <div key={b.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] text-ink">{b.name}</span>
                    <span className="block truncate font-mono text-[9.5px] text-faint">{b.slug}</span>
                  </span>
                  <StatusBadge status={b.status} pulse />
                </div>
              ))}
              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-faint">
                  <span>worker capacity</span>
                  <span>64%</span>
                </div>
                <div className="mt-1"><Progress value={64} color="#8b7cff" height={4} /></div>
              </div>
              <Link href="/admin/bots" className="btn-ghost h-7 w-full text-[10.5px]">
                Open fleet →
              </Link>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <Bug size={12} className="text-[#ff7c88]" /> Top error classes
            </h3>
            <div className="mt-2 space-y-1.5">
              {[
                { e: "TelegramError: message is too long", n: 9, p: 52 },
                { e: "ETIMEDOUT api.telegram.org", n: 4, p: 24 },
                { e: "Webhook 401 · stale secret", n: 2, p: 12 },
                { e: "ModuleNotFoundError", n: 2, p: 12 },
              ].map((r) => (
                <div key={r.e}>
                  <div className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="truncate text-muted">{r.e}</span>
                    <span className="font-mono text-faint">{r.n}</span>
                  </div>
                  <div className="mt-1"><Progress value={r.p} color="#ff5d6c" height={2} /></div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-ink">Freshest deploys</h3>
            <div className="mt-2 space-y-1.5">
              {bots.slice(0, 4).map((b) => (
                <Link key={b.id} href={`/admin/bots/${b.id}`} className="flex items-center gap-2 rounded-md border border-line/60 bg-canvas/40 px-2 py-1.5 hover:border-brand/30">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] text-ink">{b.name}</span>
                    <span className="block text-[9.5px] text-faint">{relTime(b.lastDeploy)}</span>
                  </span>
                  <span className="font-mono text-[9.5px] text-faint">{b.region}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
