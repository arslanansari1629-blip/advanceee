import { Suspense } from "react";
import { ArrowUpRight, Bot, CircleAlert, Radio } from "lucide-react";
import { BotsExplorer } from "@/components/bots-explorer";
import { ConnectionState } from "@/components/connection-state";
import { RefreshButton } from "@/components/refresh-button";
import { PageHeader } from "@/components/ui";
import { fmt, pct } from "@/lib/format";
import { loadAdminState } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BotsPage() {
  const now = Date.now();
  const state = await loadAdminState();

  if (state.state !== "ok") {
    return (
      <>
        <PageHeader eyebrow="fleet" title="Bots" subtitle="Deployment records straight from the product operator API." />
        <ConnectionState state={state} />
      </>
    );
  }

  const { data, baseUrl } = state;
  const { bots, stats } = data;
  const plans = Object.fromEntries(data.users.map((u) => [u.id, u.plan]));
  const liveShare = stats.bots ? (stats.live / stats.bots) * 100 : 0;
  const topFramework = Object.entries(
    bots.reduce<Record<string, number>>((acc, b) => {
      const key = b.framework || "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0];

  const summary = [
    { label: "Bots", value: fmt(stats.bots), hint: `${fmt(stats.live)} live (${pct(liveShare, 0)})`, icon: <Bot size={13} />, tone: "#34e0a1" },
    { label: "Drafts", value: fmt(stats.drafts), hint: "never started", icon: <Radio size={13} />, tone: "#7c879e" },
    { label: "Errored", value: fmt(stats.errors), hint: stats.errors ? "needs a fix" : "all healthy", icon: <CircleAlert size={13} />, tone: stats.errors ? "#ff5d6c" : "#34e0a1" },
    {
      label: "Top framework",
      value: topFramework ? topFramework[0] : "—",
      hint: topFramework ? `${topFramework[1]} bot${topFramework[1] === 1 ? "" : "s"}` : "no bots",
      icon: <ArrowUpRight size={13} />,
      tone: "#8b7cff",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="fleet"
        title="Bots"
        subtitle={`${bots.length} deployment record${bots.length === 1 ? "" : "s"} fetched from ${baseUrl}/api/admin/data. Search, filter and sort operate on that payload — no sample rows.`}
        actions={
          <>
            <RefreshButton />
            <a href={`${baseUrl}/console`} target="_blank" rel="noreferrer" className="btn h-8 text-[12px]">
              Product console <ArrowUpRight size={13} />
            </a>
          </>
        }
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
        <BotsExplorer bots={bots} now={now} baseUrl={baseUrl} plans={plans} />
      </Suspense>
    </>
  );
}
