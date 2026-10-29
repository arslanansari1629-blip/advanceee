import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CircleAlert,
  CircleCheck,
  Database,
  Gauge,
  Globe,
  Megaphone,
  MessageSquare,
  Package,
  Radio,
  Repeat2,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
import { ConnectionState } from "@/components/connection-state";
import { RefreshButton } from "@/components/refresh-button";
import { Avatar, Badge, Card, CardHead, EmptyState, Mono, PageHeader, PlanBadge, Progress, StatusBadge } from "@/components/ui";
import { cn, clockUTC, fmt, pct, since, stampUTC, timeAgo } from "@/lib/format";
import { loadAdminState } from "@/lib/session";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  sub,
  icon,
  tone = "#34e0a1",
  href,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">{label}</span>
        <span className="text-faint" style={{ color: tone }}>
          {icon}
        </span>
      </div>
      <div className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.02em] text-ink">{value}</div>
      <div className="mt-2 text-[11px] leading-snug text-faint">{sub}</div>
    </>
  );
  return href ? (
    <Link href={href} className="panel p-4 transition-colors hover:border-faint/50">
      {body}
    </Link>
  ) : (
    <div className="panel p-4">{body}</div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/60 py-2 last:border-0">
      <span className="text-[11.5px] text-faint">{label}</span>
      <span className={cn("text-right text-[12px] text-ink", mono && "font-mono text-[11.5px]")}>{value}</span>
    </div>
  );
}

export default async function OverviewPage() {
  const now = Date.now();
  const state = await loadAdminState();

  if (state.state !== "ok") {
    return (
      <>
        <PageHeader eyebrow="overview" title="Overview" subtitle="Live product data — nothing cached, nothing simulated." />
        <ConnectionState state={state} />
      </>
    );
  }

  const { data, latencyMs, baseUrl } = state;
  const { stats, settings, engine, bots, users } = data;
  const host = baseUrl.replace(/^https?:\/\//, "");

  const livePct = stats.bots ? (stats.live / stats.bots) * 100 : 0;
  const successShare = stats.updates ? (stats.replies / stats.updates) * 100 : 0;
  const errored = bots.filter((b) => b.status === "error");
  const suspended = users.filter((u) => u.plan === "suspended");
  const busiest = [...bots].sort((a, b) => b.updates - a.updates).slice(0, 6);
  const newest = [...users].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const planMix = Object.entries(
    users.reduce<Record<string, number>>((acc, u) => {
      const key = u.plan || "free";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const statusMix = [
    { label: "Live", count: stats.live, color: "#34e0a1" },
    { label: "Draft", count: stats.drafts, color: "#7c879e" },
    { label: "Paused", count: stats.paused, color: "#f5b544" },
    { label: "Error", count: stats.errors, color: "#ff5d6c" },
  ].filter((s) => s.count > 0);

  const attention: { title: string; detail: string; href: string; tone: "danger" | "warn" | "accent" }[] = [];
  for (const bot of errored) {
    attention.push({
      title: `${bot.name} failed`,
      detail: bot.lastError ?? "No error message reported by the product",
      href: `/admin/bots/${bot.id}`,
      tone: "danger",
    });
  }
  if (stats.suspended > 0) {
    attention.push({
      title: `${stats.suspended} suspended account${stats.suspended === 1 ? "" : "s"}`,
      detail: "Plan is set to suspended on the product",
      href: "/admin/users?plan=suspended",
      tone: "warn",
    });
  }
  if (settings.maintenance) {
    attention.push({
      title: "Maintenance mode is active",
      detail: settings.maintenanceMessage || "Users cannot sign in while this is on",
      href: "/admin/settings",
      tone: "accent",
    });
  }
  if (!engine.online) {
    attention.push({
      title: "Webhook engine offline",
      detail: `Runner mode: ${engine.mode}`,
      href: "/admin/system",
      tone: "warn",
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={`live · ${host}`}
        title="Overview"
        subtitle={`Read from ${baseUrl}/api/admin/data at ${clockUTC(now)} UTC (${clockUTC(now - latencyMs)} → ${latencyMs} ms round-trip). Reloading re-reads the product — there is no local copy.`}
        actions={
          <>
            <RefreshButton />
            <a href={`${baseUrl}/console`} target="_blank" rel="noreferrer" className="btn-primary h-8 text-[12px]">
              Product console <ArrowUpRight size={13} strokeWidth={2.6} />
            </a>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Live bots"
          value={fmt(stats.live)}
          sub={`${stats.bots} total · ${pct(livePct, 0)} running webhooks`}
          icon={<Radio size={14} />}
          href="/admin/bots?status=live"
        />
        <Stat
          label="Accounts"
          value={fmt(stats.users)}
          sub={
            stats.suspended > 0
              ? `${stats.suspended} suspended · signups ${settings.signupsOpen ? "open" : "closed"}`
              : `0 suspended · signups ${settings.signupsOpen ? "open" : "closed"}`
          }
          icon={<Users size={14} />}
          tone="#8b7cff"
          href="/admin/users"
        />
        <Stat
          label="Updates handled"
          value={fmt(stats.updates)}
          sub={`${fmt(stats.replies)} replies · ${pct(successShare, 0)} answered`}
          icon={<MessageSquare size={14} />}
          tone="#4cc9f0"
        />
        <Stat
          label="Failing bots"
          value={fmt(stats.errors)}
          sub={errored[0]?.lastError ? errored[0].lastError.slice(0, 52) : "No bot is reporting an error"}
          icon={<CircleAlert size={14} />}
          tone={stats.errors > 0 ? "#ff5d6c" : "#34e0a1"}
          href="/admin/bots?status=error"
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHead
            title="Fleet composition"
            subtitle="Status counts exactly as the product reports them"
            action={<Bot size={14} className="text-faint" />}
          />
          <div className="px-5 pb-4 pt-3">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-line/70">
              {statusMix.map((s) => (
                <div key={s.label} style={{ width: `${(s.count / stats.bots) * 100}%`, background: s.color }} title={`${s.label}: ${s.count}`} />
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {statusMix.length === 0 ? <p className="text-[11.5px] text-faint">No bots exist on the product yet.</p> : null}
              {statusMix.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-[12px]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1 text-muted">{s.label}</span>
                  <span className="tabular-nums text-ink">{s.count}</span>
                  <span className="w-10 text-right tabular-nums text-[11px] text-faint">
                    {pct((s.count / stats.bots) * 100, 0)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/60 pt-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-faint">Restarts</p>
                <p className="mt-0.5 text-[15px] font-semibold text-ink">{fmt(stats.restarts)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-faint">Packages</p>
                <p className="mt-0.5 text-[15px] font-semibold text-ink">{fmt(stats.packages)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-faint">Replies</p>
                <p className="mt-0.5 text-[15px] font-semibold text-ink">{fmt(stats.replies)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHead
            title="Engine & storage"
            subtitle={`Runner mode ${engine.mode}`}
            action={<Badge tone={engine.online ? "success" : "danger"}>{engine.online ? "online" : "offline"}</Badge>}
          />
          <div className="px-5 pb-3 pt-1">
            <Row label="Storage adapter" value={<Mono>{data.storage}</Mono>} />
            <Row label="Engine state" value={engine.online ? "accepting updates" : "not accepting updates"} />
            <Row label="Operator round-trip" value={`${latencyMs} ms`} />
            <Row label="Snapshot read at" value={<Mono>{clockUTC(now)}Z</Mono>} />
            <Row
              label="Maintenance"
              value={
                settings.maintenance ? (
                  <span className="text-[#f7c66b]">on</span>
                ) : (
                  <span className="text-[#5eeac0]">off</span>
                )
              }
            />
            <Row label="Signups" value={settings.signupsOpen ? "open" : "closed"} />
          </div>
          <div className="flex items-center gap-2 border-t border-line/60 px-5 py-2.5 text-[11px] text-faint">
            <Database size={11} /> live adapter — not a mirror of another database
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHead
            title="Plan mix"
            subtitle={`${users.length} accounts, grouped by plan`}
            action={<Users size={14} className="text-faint" />}
          />
          <div className="space-y-2.5 px-5 pb-4 pt-3">
            {planMix.length === 0 ? <p className="text-[11.5px] text-faint">No accounts yet.</p> : null}
            {planMix.map(([plan, count]) => (
              <div key={plan}>
                <div className="mb-1 flex items-center justify-between text-[11.5px]">
                  <span className="flex items-center gap-1.5">
                    <PlanBadge plan={plan} />
                  </span>
                  <span className="text-muted">
                    <span className="text-ink">{count}</span> · {pct((count / users.length) * 100, 0)}
                  </span>
                </div>
                <Progress value={(count / users.length) * 100} height={4} color={plan === "suspended" ? "#ff5d6c" : "rgb(var(--brand))"} />
              </div>
            ))}
            {settings.broadcast ? (
              <div className="mt-3 flex gap-2 rounded-lg border border-[#8b7cff]/25 bg-[#8b7cff]/[0.07] p-2.5">
                <Megaphone size={13} className="mt-0.5 shrink-0 text-[#b3a8ff]" />
                <p className="line-clamp-3 text-[11.5px] leading-relaxed text-[#c9c2ff]">{settings.broadcast}</p>
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-faint">
                <Megaphone size={11} /> No broadcast banner is set.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        <Card className="overflow-hidden">
          <CardHead
            title="Busiest bots"
            subtitle="Ranked by updates the product has counted per bot"
            action={
              <Link href="/admin/bots" className="flex items-center gap-1 text-[11.5px] text-muted hover:text-ink">
                All bots <ArrowRight size={11} />
              </Link>
            }
          />
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-y border-line/60 bg-raised/30">
                  <th className="th">Bot</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Updates</th>
                  <th className="th text-right">Replies</th>
                  <th className="th text-right">Uptime</th>
                  <th className="th text-right">Owner</th>
                </tr>
              </thead>
              <tbody>
                {busiest.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState title="No bots on the product" body="Deployed bots appear here as soon as they exist." />
                    </td>
                  </tr>
                ) : null}
                {busiest.map((bot) => (
                  <tr key={bot.id} className="border-b border-line/40 transition-colors last:border-0 hover:bg-raised/40">
                    <td className="td">
                      <Link href={`/admin/bots/${bot.id}`} className="flex items-center gap-2 text-ink hover:text-brand">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-raised text-faint">
                          <Bot size={12} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-medium">{bot.name}</span>
                          <span className="block truncate text-[10.5px] text-faint">{bot.username ? `@${bot.username}` : bot.id}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="td">
                      <StatusBadge status={bot.status} pulse />
                    </td>
                    <td className="td text-right tabular-nums text-ink">{fmt(bot.updates)}</td>
                    <td className="td text-right tabular-nums">{fmt(bot.replies)}</td>
                    <td className="td text-right tabular-nums">{bot.stats.uptimePct ? pct(bot.stats.uptimePct) : "—"}</td>
                    <td className="td text-right">
                      <span className="text-[11.5px]">{bot.ownerName || bot.ownerEmail}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="overflow-hidden">
            <CardHead
              title="Needs attention"
              subtitle="Derived from bot status, plan and platform flags"
              action={
                <Badge tone={attention.length ? "danger" : "success"}>
                  {attention.length ? `${attention.length} item${attention.length === 1 ? "" : "s"}` : "all clear"}
                </Badge>
              }
            />
            <div className="mt-2">
              {attention.length === 0 ? (
                <div className="flex items-center gap-2.5 px-5 py-6">
                  <CircleCheck size={16} className="text-brand" />
                  <div>
                    <p className="text-[12.5px] font-medium text-ink">Nothing needs attention</p>
                    <p className="text-[11px] text-faint">
                      No errored bots, no suspended accounts, maintenance off
                      {engine.online ? " and the engine is online." : "."}
                    </p>
                  </div>
                </div>
              ) : null}
              {attention.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-start gap-2.5 border-b border-line/50 px-5 py-3 transition-colors last:border-0 hover:bg-raised/40"
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                    style={{
                      background:
                        item.tone === "danger"
                          ? "rgb(255 93 108 / 0.12)"
                          : item.tone === "warn"
                            ? "rgb(245 181 68 / 0.12)"
                            : "rgb(139 124 255 / 0.12)",
                      color: item.tone === "danger" ? "#ff929c" : item.tone === "warn" ? "#f7c66b" : "#b3a8ff",
                    }}
                  >
                    <ShieldAlert size={12} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-medium text-ink">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-faint">{item.detail}</span>
                  </span>
                  <ArrowRight size={12} className="mt-1 shrink-0 text-faint" />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHead
              title="Newest accounts"
              subtitle="Sorted by the product's createdAt"
              action={
                <Link href="/admin/users" className="flex items-center gap-1 text-[11.5px] text-muted hover:text-ink">
                  All <ArrowRight size={11} />
                </Link>
              }
            />
            <div className="mt-1">
              {newest.length === 0 ? <EmptyState title="No accounts yet" /> : null}
              {newest.map((user) => (
                <div key={user.id} className="flex items-center gap-2.5 border-b border-line/50 px-5 py-2.5 last:border-0">
                  <Avatar name={user.name || user.email} size={24} color="#8b7cff" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-ink">{user.name || user.email}</p>
                    <p className="truncate text-[10.5px] text-faint">
                      {user.email} · {timeAgo(user.createdAt, now)}
                    </p>
                  </div>
                  <PlanBadge plan={user.plan} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel flex items-center gap-3 p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Gauge size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-wide text-faint">Restarts</p>
            <p className="text-[13px] text-ink">
              {fmt(stats.restarts)} total across {stats.bots} bots
            </p>
          </div>
        </div>
        <div className="panel flex items-center gap-3 p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4cc9f0]/10 text-[#7edcf7]">
            <Package size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-wide text-faint">Declared packages</p>
            <p className="text-[13px] text-ink">{fmt(stats.packages)} across all bots</p>
          </div>
        </div>
        <div className="panel flex items-center gap-3 p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8b7cff]/10 text-[#b3a8ff]">
            <Repeat2 size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-wide text-faint">Replies sent</p>
            <p className="text-[13px] text-ink">
              {fmt(stats.replies)} · {pct(successShare, 0)} of updates
            </p>
          </div>
        </div>
        <div className="panel flex items-center gap-3 p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f5b544]/10 text-[#f7c66b]">
            <Activity size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-wide text-faint">Uptime signal</p>
            <p className="text-[13px] text-ink">
              {bots.length
                ? `${pct(bots.reduce((sum, b) => sum + (b.stats.uptimePct || 0), 0) / bots.length)} avg per bot`
                : "no bots to measure"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-faint">
        <span className="flex items-center gap-1.5">
          <Zap size={10} className="text-brand" /> source: {baseUrl}/api/admin/data
        </span>
        <span className="flex items-center gap-1.5">
          <Globe size={10} /> snapshot {stampUTC(now)}
        </span>
        <span className="flex items-center gap-1.5">
          <Radio size={10} /> engine {engine.online ? "online" : "offline"} · {engine.mode}
        </span>
        <span className="flex items-center gap-1.5">
          <Database size={10} /> {data.storage}
        </span>
        {errored.length ? (
          <span className="flex items-center gap-1.5 text-[#ff929c]">
            <CircleAlert size={10} /> newest fault {since(errored[0].createdAt, now)} old
          </span>
        ) : null}
      </div>
    </>
  );
}
