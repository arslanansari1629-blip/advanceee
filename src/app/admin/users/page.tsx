import { CreditCard, TrendingUp, UserCheck, Users2, Wallet } from "lucide-react";
import { UsersTable } from "@/components/users-table";
import { Bars } from "@/components/charts";
import { Metric, PageHeader } from "@/components/ui";
import { bots, kpis, revenueSeries, users } from "@/lib/data";
import { money } from "@/lib/format";

export const metadata = { title: "Users · BotForge Admin" };

export default function UsersPage() {
  const rows = users.map((u) => ({ ...u, botList: bots.filter((b) => b.ownerId === u.id) }));
  const signups = Array.from({ length: 30 }, (_, i) => ({
    label: `${i + 1}`,
    value: Math.round(38 + Math.sin(i / 3) * 12 + i * 1.6),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Growth"
        title="Users"
        subtitle="Every account, plan and role across the workspace. Click a row to open the operator drawer with quota, bots and moderation actions."
      />

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Accounts" value={String(kpis.users)} delta={{ value: "12.4%" }} hint="vs last month" spark={signups.map((s) => s.value)} icon={<Users2 size={13} />} />
        <Metric label="Paying" value={String(kpis.paidUsers)} hint={`${((kpis.paidUsers / kpis.users) * 100).toFixed(0)}% conversion`} icon={<UserCheck size={13} />} color="#8b7cff" />
        <Metric label="MRR" value={money(kpis.mrr)} delta={{ value: "8.1%" }} hint="net of refunds" icon={<Wallet size={13} />} color="#8b7cff" spark={revenueSeries.map((r) => r.mrr)} />
        <Metric label="ARPU" value={`$${kpis.arpu}`} delta={{ value: "2.3%" }} hint="per paying seat" icon={<CreditCard size={13} />} />
        <Metric label="Churn" value={`${kpis.churn}%`} delta={{ value: "0.4pt", positive: false }} hint="30d rolling" icon={<TrendingUp size={13} />} color="#f5b544" />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="panel xl:col-span-2 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-ink">Signups · last 30 days</h3>
              <p className="text-[11.5px] text-faint">Organic + referral traffic to the deploy flow</p>
            </div>
            <span className="chip">1,284 new / 7d</span>
          </div>
          <div className="mt-3">
            <Bars data={signups} height={120} color="#8b7cff" />
          </div>
        </div>
        <div className="panel p-4">
          <h3 className="text-[13px] font-semibold text-ink">Top countries</h3>
          <div className="mt-2 space-y-2">
            {Object.entries(
              users.reduce<Record<string, number>>((acc, u) => {
                acc[u.countryCode] = (acc[u.countryCode] ?? 0) + 1;
                return acc;
              }, {}),
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([code, count]) => (
                <div key={code} className="flex items-center gap-2">
                  <span className="w-6 font-mono text-[10.5px] text-faint">{code}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-brand/70" style={{ width: `${(count / 4) * 100}%` }} />
                  </div>
                  <span className="w-4 text-right font-mono text-[10.5px] text-muted">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <UsersTable rows={rows} />
    </>
  );
}
