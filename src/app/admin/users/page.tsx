import { Suspense } from "react";
import { ArrowUpRight, Bot, CircleAlert, Users } from "lucide-react";
import { ConnectionState } from "@/components/connection-state";
import { RefreshButton } from "@/components/refresh-button";
import { UsersExplorer } from "@/components/users-explorer";
import { PageHeader } from "@/components/ui";
import { fmt, pct } from "@/lib/format";
import { loadAdminState } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const now = Date.now();
  const state = await loadAdminState();

  if (state.state !== "ok") {
    return (
      <>
        <PageHeader eyebrow="accounts" title="Accounts" subtitle="Registered users as stored by the product." />
        <ConnectionState state={state} />
      </>
    );
  }

  const { data, baseUrl } = state;
  const { users, bots, stats } = data;
  const withBots = users.filter((u) => u.bots > 0).length;
  const allBots = users.reduce((n, u) => n + u.bots, 0);

  const summary = [
    { label: "Accounts", value: fmt(users.length), hint: `product total ${stats.users}`, tone: "#8b7cff", icon: <Users size={13} /> },
    { label: "With bots", value: fmt(withBots), hint: `${pct(users.length ? (withBots / users.length) * 100 : 0, 0)} of accounts`, tone: "#34e0a1", icon: <Bot size={13} /> },
    { label: "Deployed bots", value: fmt(allBots), hint: `${fmt(stats.live)} live now`, tone: "#4cc9f0", icon: <Bot size={13} /> },
    { label: "Suspended", value: fmt(stats.suspended), hint: stats.suspended ? "plan set to suspended" : "no suspensions", tone: stats.suspended ? "#ff5d6c" : "#34e0a1", icon: <CircleAlert size={13} /> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="accounts"
        title="Accounts"
        subtitle={`${users.length} account${users.length === 1 ? "" : "s"} and ${bots.length} bot${bots.length === 1 ? "" : "s"} from ${baseUrl}/api/admin/data. Plans, bot counts and update totals are the product's own numbers.`}
        actions={<RefreshButton />}
      />

      <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="panel flex items-center gap-3 p-3.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in oklab, ${s.tone} 14%, transparent)`, color: s.tone }}
            >
              {s.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.08em] text-faint">{s.label}</p>
              <p className="truncate text-[13.5px] font-medium text-ink">{s.value}</p>
              <p className="truncate text-[10.5px] text-faint">{s.hint}</p>
            </div>
          </div>
        ))}
      </div>

      <Suspense fallback={<div className="panel h-40 animate-pulse" />}>
        <UsersExplorer users={users} bots={bots} now={now} />
      </Suspense>

      <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-faint">
        <ArrowUpRight size={10} /> Plans are read-only here — change them in the product console.
      </p>
    </>
  );
}
