import { ArrowDownRight, ArrowUpRight, CreditCard, Percent, Repeat, TrendingUp, Wallet } from "lucide-react";
import { AreaChart, Bars, Donut } from "@/components/charts";
import { InvoicesTable } from "@/components/invoices-table";
import { ActionButton } from "@/components/actions";
import { Badge, Card, CardHead, Metric, PageHeader, Progress } from "@/components/ui";
import { invoices, kpis, planMix, revenueSeries, users } from "@/lib/data";
import { money, pct } from "@/lib/format";

export const metadata = { title: "Revenue · BotForge Admin" };

export default function RevenuePage() {
  const labels = revenueSeries.map((r) => r.label);
  const planColors: Record<string, string> = { free: "#5c6880", pro: "#8b7cff", scale: "#34e0a1" };
  const donut = planMix
    .filter((p) => p.revenue > 0)
    .map((p) => ({ label: p.plan, value: p.revenue, color: planColors[p.plan] }));
  const arr = kpis.mrr * 12;
  const nrr = 112.4;

  return (
    <>
      <PageHeader
        eyebrow="Growth"
        title="Revenue"
        subtitle="MRR, expansion and invoice operations in one ledger. Every refund immediately updates the audit trail and the customer's balance."
        actions={
          <>
            <ActionButton label="Sync Stripe" icon={<Repeat size={12} />} kind="success" title="Stripe synced" body="28 invoices reconciled · 0 mismatches" />
            <ActionButton label="New invoice" kind="info" title="Invoice draft created" body="Send from the ledger once reviewed" variant="primary" />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="MRR" value={money(kpis.mrr)} delta={{ value: "8.1%" }} hint="vs last month" spark={revenueSeries.map((r) => r.mrr)} icon={<Wallet size={13} />} />
        <Metric label="ARR" value={money(arr)} delta={{ value: "8.1%" }} hint="annualised" icon={<TrendingUp size={13} />} color="#8b7cff" />
        <Metric label="Net retention" value={`${nrr}%`} delta={{ value: "3.2pt" }} hint="expansion − churn" icon={<Repeat size={13} />} color="#4cc9f0" />
        <Metric label="ARPU" value={`$${kpis.arpu}`} delta={{ value: "2.3%" }} hint="per paying seat" icon={<CreditCard size={13} />} />
        <Metric label="Churn" value={pct(kpis.churn)} delta={{ value: "0.4pt", positive: false }} hint="30d rolling" icon={<Percent size={13} />} color="#f5b544" spark={[2.4, 2.2, 2.1, 2.0, 1.9, 1.8, 1.8]} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHead
            title="MRR growth"
            subtitle="last 30 days · net of refunds"
            action={
              <div className="flex items-center gap-1.5">
                <Badge tone="success">+{money(revenueSeries[revenueSeries.length - 1].mrr - revenueSeries[0].mrr)}</Badge>
                <Badge tone="neutral">30d</Badge>
              </div>
            }
          />
          <div className="p-3">
            <AreaChart
              series={[
                { name: "MRR", color: "#34e0a1", data: revenueSeries.map((r) => r.mrr) },
                { name: "Expansion", color: "#8b7cff", data: revenueSeries.map((r) => r.expansion) },
              ]}
              labels={labels}
              height={236}
              formatKind="money"
            />
          </div>
          <div className="grid grid-cols-2 divide-x divide-line/70 border-t border-line/70 sm:grid-cols-4">
            {[
              { k: "new business", v: "$4,120", d: "+11%", up: true },
              { k: "expansion", v: `$${revenueSeries[revenueSeries.length - 1].expansion}`, d: "+6%", up: true },
              { k: "contraction", v: "$1,180", d: "-3%", up: false },
              { k: "churned", v: `$${revenueSeries[revenueSeries.length - 1].churn}`, d: "-2%", up: false },
            ].map((s) => (
              <div key={s.k} className="px-3 py-2">
                <div className="text-[9.5px] uppercase tracking-wide text-faint">{s.k}</div>
                <div className="font-mono text-[12.5px] text-ink">{s.v}</div>
                <div className={`flex items-center gap-0.5 text-[9.5px] ${s.up ? "text-[#4fdfb0]" : "text-[#ff929c]"}`}>
                  {s.up ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />} {s.d}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-ink">Revenue by plan</h3>
              <Badge tone="accent">{planMix.filter((p) => p.revenue > 0).length} tiers</Badge>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <Donut data={donut} centerValue={money(kpis.mrr)} centerLabel="MRR" size={124} thickness={12} />
              <div className="flex-1 space-y-2">
                {planMix.map((p) => (
                  <div key={p.plan}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 capitalize text-muted">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: planColors[p.plan] }} />
                        {p.plan}
                      </span>
                      <span className="font-mono text-ink">{money(p.revenue)}</span>
                    </div>
                    <div className="mt-1">
                      <Progress value={(p.revenue / kpis.mrr) * 100} height={3} color={planColors[p.plan]} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="flex-1 p-4">
            <h3 className="text-[13px] font-semibold text-ink">Pricing tiers</h3>
            <div className="mt-2 space-y-2">
              {[
                { name: "Free", price: "$0", meta: `${planMix[0].users} accounts · 30k updates`, tone: "#5c6880" },
                { name: "Pro", price: "$29", meta: `${planMix[1].users} accounts · 250k updates`, tone: "#8b7cff" },
                { name: "Scale", price: "$149", meta: `${planMix[2].users} accounts · 800k updates`, tone: "#34e0a1" },
              ].map((t) => (
                <div key={t.name} className="flex items-center gap-2.5 rounded-lg border border-line/70 bg-canvas/40 p-2">
                  <span className="h-6 w-1 rounded-full" style={{ background: t.tone }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] font-medium text-ink">
                      {t.name} <span className="font-mono text-[10.5px] text-faint">/mo</span>
                    </div>
                    <div className="truncate text-[10px] text-faint">{t.meta}</div>
                  </div>
                  <span className="font-mono text-[12px] text-ink">{t.price}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-[#f5b544]/25 bg-[#f5b544]/[0.06] p-2 text-[10.5px] text-[#f7c66b]">
              18 accounts are within 12% of their update quota — upsell sequence queued.
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-ink">Expansion vs churn</h3>
              <p className="text-[11.5px] text-faint">daily split · 30 days</p>
            </div>
            <Badge tone="success">net positive</Badge>
          </div>
          <div className="mt-3">
            <Bars
              data={revenueSeries.slice(-14).map((r) => ({ label: r.label, value: r.expansion }))}
              color="#8b7cff"
              height={120}
              formatKind="money"
            />
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-[13px] font-semibold text-ink">Billing runs</h3>
          <div className="mt-2 space-y-1.5">
            {[
              { at: "02:00 UTC today", what: "Monthly renewal · 24 subscriptions", ok: true },
              { at: "02:00 UTC today", what: "Dunning retry · 2 cards", ok: false },
              { at: "yesterday", what: "Metering rollup · 1.2M updates", ok: true },
              { at: "3 days ago", what: "Refund batch · 3 invoices", ok: true },
            ].map((r, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border border-line/60 bg-canvas/40 px-2 py-1.5">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${r.ok ? "bg-brand" : "bg-[#f5b544]"}`} />
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-muted">{r.what}</p>
                  <p className="text-[9.5px] text-faint">{r.at}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-3">
        <InvoicesTable invoices={invoices} />
      </div>

      <p className="mt-3 text-[10.5px] text-faint">
        Demo ledger · {invoices.length} invoices across {users.length} accounts · seeded deterministically for 2026-10-29.
      </p>
    </>
  );
}
