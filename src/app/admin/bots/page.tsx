import { Activity, Bot as BotIcon, CircleAlert, Pause, Rocket, Zap } from "lucide-react";
import { BotsTable } from "@/components/bots-table";
import { PageHeader } from "@/components/ui";
import { bots, kpis, users } from "@/lib/data";
import { fmt } from "@/lib/format";

export const metadata = { title: "Bots · BotForge Admin" };

export default function BotsPage({ searchParams }: { searchParams: { new?: string } }) {
  const owners = Object.fromEntries(users.map((u) => [u.id, u]));
  const stats = [
    { label: "Live", value: bots.filter((b) => b.status === "live").length, icon: Rocket, tone: "text-[#34e0a1]" },
    { label: "Paused", value: bots.filter((b) => b.status === "paused").length, icon: Pause, tone: "text-[#f7c66b]" },
    { label: "Errors", value: bots.filter((b) => b.status === "error").length, icon: CircleAlert, tone: "text-[#ff929c]" },
    { label: "Drafts", value: bots.filter((b) => b.status === "draft").length, icon: BotIcon, tone: "text-muted" },
    { label: "Updates 24h", value: fmt(kpis.updates24h), icon: Activity, tone: "text-[#8fb3d9]" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title="Bots"
        subtitle="Every deployed Telegram bot with its runtime, compiled handlers and live traffic. Pause, recompile or delete in bulk — the engine keeps answering while you do."
        actions={
          <>
            <span className="chip h-8 px-2.5">
              <Zap size={11} className="text-brand" /> webhook engine v3
            </span>
            <span className="chip h-8 px-2.5">{bots.length} total</span>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="panel flex items-center gap-2.5 p-3">
              <Icon size={14} className={s.tone} />
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.08em] text-faint">{s.label}</div>
                <div className="font-mono text-[14px] font-medium text-ink">{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <BotsTable bots={bots} owners={owners} initialNew={searchParams?.new === "1"} />
    </>
  );
}
