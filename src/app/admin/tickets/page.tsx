import { AlertTriangle, Clock, Inbox, Timer, Users2 } from "lucide-react";
import { TicketQueue } from "@/components/ticket-queue";
import { Metric, PageHeader } from "@/components/ui";
import { tickets } from "@/lib/data";

export const metadata = { title: "Support · BotForge Admin" };

export default function TicketsPage() {
  const open = tickets.filter((t) => t.status !== "resolved").length;
  const urgent = tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved").length;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Support inbox"
        subtitle="Deploy failures, billing disputes, abuse reports and feature requests — triaged with macros, escalation and SLA timers."
        actions={
          <>
            <span className="chip h-8 px-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff5d6c]" /> {urgent} urgent
            </span>
            <span className="chip h-8 px-2.5">
              <Clock size={11} /> SLA 4h
            </span>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Open" value={String(open)} hint="all channels" icon={<Inbox size={13} />} />
        <Metric label="First response" value="12m" delta={{ value: "38%" }} hint="median · 7d" icon={<Timer size={13} />} color="#8b7cff" />
        <Metric label="CSAT" value="4.8" hint="128 ratings" icon={<Users2 size={13} />} color="#4cc9f0" />
        <Metric label="Breaching soon" value="2" delta={{ value: "1 urgent", positive: false }} hint="under 1h left" icon={<AlertTriangle size={13} />} color="#f5b544" />
      </div>

      <TicketQueue tickets={tickets} />
    </>
  );
}
