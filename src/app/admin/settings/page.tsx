import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { SettingsForm } from "@/components/settings-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Settings · BotForge Admin" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Workspace settings"
        subtitle="Identity, security posture, quotas, alerting and API access for the whole workspace. Every change is versioned and rolls back automatically if probes fail."
        actions={
          <>
            <a href="https://botforge-cloud.vercel.app" target="_blank" rel="noreferrer" className="btn h-8 text-[11.5px]">
              Public site <ArrowUpRight size={12} />
            </a>
            <span className="chip h-8 px-2.5">
              <ShieldCheck size={11} className="text-brand" /> SOC 2 · GDPR
            </span>
          </>
        }
      />
      <SettingsForm />
    </>
  );
}
