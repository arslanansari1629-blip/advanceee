import { KeyRound, Lock, ScrollText, ShieldAlert } from "lucide-react";
import { AuditTable } from "@/components/audit-table";
import { Card, Metric, PageHeader } from "@/components/ui";
import { audit, users } from "@/lib/data";

export const metadata = { title: "Audit log · BotForge Admin" };

export default function AuditPage() {
  const high = audit.filter((a) => a.severity === "high").length;
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Audit log"
        subtitle="Every privileged action on the workspace — bot lifecycle, secret reveals, role changes, impersonations and exports — with actor, IP and hash-chained metadata."
        actions={
          <>
            <span className="chip h-8 px-2.5">
              <Lock size={11} /> hash-chained
            </span>
            <span className="chip h-8 px-2.5">
              <ShieldAlert size={11} className="text-[#ff929c]" /> {high} high
            </span>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Events · 30d" value={String(audit.length * 38)} hint="sampled view below" icon={<ScrollText size={13} />} />
        <Metric label="High severity" value={String(high)} hint="reviewed daily" icon={<ShieldAlert size={13} />} color="#ff5d6c" />
        <Metric label="Secret reveals" value="6" hint="env.reveal · audited" icon={<KeyRound size={13} />} color="#f5b544" />
        <Metric label="Admin seats" value={String(users.filter((u) => u.role === "admin" || u.role === "owner").length)} hint="2FA required" icon={<Lock size={13} />} color="#8b7cff" />
      </div>

      <AuditTable entries={audit} />

      <Card className="mt-3 p-3 text-[11px] text-faint">
        <span className="text-muted">Compliance:</span> SOC 2 Type II evidence pack auto-generated monthly · GDPR erasure requests
        route through the same log · all events signed with the workspace key <span className="font-mono text-muted">whsec_••••c41f</span>.
      </Card>
    </>
  );
}
