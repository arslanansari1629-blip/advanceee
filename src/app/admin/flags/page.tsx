import { Activity, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { FlagsList } from "@/components/flags-list";
import { Metric, PageHeader } from "@/components/ui";
import { flags } from "@/lib/data";

export const metadata = { title: "Feature flags · BotForge Admin" };

export default function FlagsPage() {
  const on = flags.filter((f) => f.enabled).length;
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Feature flags"
        subtitle="Progressive rollouts, environment targeting and instant kill switches for the compiler, the console and the billing metering path."
        actions={
          <>
            <span className="chip h-8 px-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {on} enabled
            </span>
            <span className="chip h-8 px-2.5">sticky bucketing</span>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Flags" value={String(flags.length)} hint={`${on} enabled · ${flags.length - on} dark`} icon={<SlidersHorizontal size={13} />} />
        <Metric label="At partial rollout" value={String(flags.filter((f) => f.rollout > 0 && f.rollout < 100).length)} hint="canary cohorts" icon={<Activity size={13} />} color="#f5b544" />
        <Metric label="Kill switches" value="2" hint="pullable in <1s" icon={<ShieldCheck size={13} />} color="#ff5d6c" />
        <Metric label="Owners" value={String(new Set(flags.map((f) => f.owner)).size)} hint="across 4 squads" icon={<Users size={13} />} color="#8b7cff" />
      </div>

      <FlagsList flags={flags} />
    </>
  );
}
