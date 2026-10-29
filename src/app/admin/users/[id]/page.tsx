import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Bot as BotIcon, CalendarDays, Fingerprint, Mail, MessageSquare, Radio } from "lucide-react";
import { ConnectionState } from "@/components/connection-state";
import { CopyButton, RefreshButton } from "@/components/refresh-button";
import { Avatar, Badge, Card, CardHead, EmptyState, Mono, PageHeader, PlanBadge, StatusBadge } from "@/components/ui";
import { dateAt, fmt, stampUTC, timeAgo } from "@/lib/format";
import { loadAdminState } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const now = Date.now();
  const state = await loadAdminState();

  if (state.state !== "ok") {
    return (
      <>
        <PageHeader eyebrow="account" title="Account record" subtitle="Live product data only." />
        <ConnectionState state={state} />
      </>
    );
  }

  const { data, baseUrl } = state;
  const user = data.users.find((u) => u.id === params.id);
  if (!user) notFound();

  const owned = data.bots.filter((b) => b.ownerId === user.id);
  const live = owned.filter((b) => b.status === "live").length;
  const failing = owned.filter((b) => b.status === "error");

  return (
    <>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-faint transition-colors hover:text-ink">
        <ArrowLeft size={13} /> All accounts
      </Link>

      <div className="panel mb-3 flex flex-wrap items-center gap-4 p-5">
        <Avatar name={user.name || user.email} size={48} color={user.plan === "suspended" ? "#ff5d6c" : "#8b7cff"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[21px] font-semibold tracking-[-0.02em] text-ink">{user.name || user.email}</h1>
            <PlanBadge plan={user.plan} />
            {user.plan === "suspended" ? <Badge tone="danger">suspended</Badge> : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
            <span className="flex items-center gap-1">
              <Mail size={11} /> {user.email}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays size={11} /> joined {dateAt(user.createdAt)} · {timeAgo(user.createdAt, now)}
            </span>
            <span className="flex items-center gap-1">
              <Fingerprint size={11} />
              <Mono>{user.id}</Mono>
              <CopyButton value={user.id} />
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton label="Refresh" />
          <a href={`${baseUrl}/console`} target="_blank" rel="noreferrer" className="btn-primary h-8 text-[12px]">
            Product console <ArrowUpRight size={13} strokeWidth={2.6} />
          </a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Bots deployed", value: String(user.bots), hint: `${owned.length} in this snapshot`, icon: <BotIcon size={13} /> },
          { label: "Live bots", value: String(user.live), hint: `${live} running webhooks`, icon: <Radio size={13} /> },
          { label: "Updates", value: fmt(user.updates), hint: "sum across this owner's bots", icon: <MessageSquare size={13} /> },
          { label: "Failing bots", value: String(failing.length), hint: failing.length ? "needs a fix" : "all healthy", icon: <Radio size={13} /> },
        ].map((s) => (
          <div key={s.label} className="panel p-4">
            <p className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">
              {s.label}
              <span className="text-faint/80">{s.icon}</span>
            </p>
            <p className="mt-1.5 text-[22px] font-semibold leading-none text-ink">{s.value}</p>
            <p className="mt-2 text-[11px] text-faint">{s.hint}</p>
          </div>
        ))}
      </div>

      <Card className="mt-3 overflow-hidden">
        <CardHead
          title="Bots owned by this account"
          subtitle="Matched on ownerId in the same live payload"
          action={<Badge tone="neutral">{owned.length}</Badge>}
        />
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="border-y border-line/60 bg-raised/30">
                <th className="th">Bot</th>
                <th className="th">Status</th>
                <th className="th">Framework</th>
                <th className="th text-right">Updates</th>
                <th className="th text-right">Restarts</th>
                <th className="th text-right">Created</th>
                <th className="th w-8" />
              </tr>
            </thead>
            <tbody>
              {owned.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={<BotIcon size={22} />} title="This account owns no bots" body="Nothing to list — the product returned none for this ownerId." />
                  </td>
                </tr>
              ) : null}
              {owned.map((bot) => (
                <tr key={bot.id} className="border-b border-line/40 last:border-0 hover:bg-raised/30">
                  <td className="td">
                    <Link href={`/admin/bots/${bot.id}`} className="flex items-center gap-2 text-ink hover:text-brand">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-raised text-faint">
                        <BotIcon size={12} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium">{bot.name}</span>
                        <span className="block truncate font-mono text-[10.5px] text-faint">{bot.username ? `@${bot.username}` : bot.id}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="td">
                    <StatusBadge status={bot.status} />
                  </td>
                  <td className="td text-[11.5px]">{bot.framework || "unknown"}</td>
                  <td className="td text-right tabular-nums">{fmt(bot.updates)}</td>
                  <td className="td text-right tabular-nums">{bot.restartCount}</td>
                  <td className="td text-right text-[11.5px]">{timeAgo(bot.createdAt, now)}</td>
                  <td className="td text-right">
                    <Link href={`/admin/bots/${bot.id}`} className="inline-flex text-faint hover:text-ink">
                      <ArrowUpRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-3 overflow-hidden">
        <CardHead title="Raw account record" subtitle="Field-for-field from the product" />
        <pre className="max-h-[240px] overflow-auto border-t border-line/60 bg-canvas/50 px-4 py-3 font-mono text-[10.5px] leading-relaxed text-muted">
          {JSON.stringify(user, null, 2)}
        </pre>
      </Card>

      <p className="mt-4 text-[10.5px] text-faint">
        Snapshot {stampUTC(now)} · {baseUrl}/api/admin/data
      </p>
    </>
  );
}
