import { Code2, Rocket, Star, Users } from "lucide-react";
import { TemplateGrid } from "@/components/template-grid";
import { Metric, PageHeader } from "@/components/ui";
import { templates } from "@/lib/data";
import { fmt } from "@/lib/format";

export const metadata = { title: "Templates · BotForge Admin" };

export default function TemplatesPage() {
  const deploys = templates.reduce((a, t) => a + t.deploys, 0);
  const avg = templates.reduce((a, t) => a + t.rating, 0) / templates.length;

  return (
    <>
      <PageHeader
        eyebrow="Fleet"
        title="Template library"
        subtitle="Curated starters that already compile — PTB 21, aiogram 3.15, pyTelegramBotAPI and pyrogram. Preview the code, copy it, or deploy straight into the wizard."
        actions={
          <>
            <span className="chip h-8 px-2.5">
              <Code2 size={11} /> {templates.length} templates
            </span>
            <span className="chip h-8 px-2.5">
              <Star size={11} className="text-[#f5b544]" /> {avg.toFixed(1)} avg
            </span>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Templates" value={String(templates.length)} hint="4 libraries" icon={<Code2 size={13} />} />
        <Metric label="Total deploys" value={fmt(deploys)} hint="all time" icon={<Rocket size={13} />} color="#8b7cff" />
        <Metric label="Avg rating" value={avg.toFixed(1)} hint={`${fmt(deploys * 2)} reviews`} icon={<Star size={13} />} color="#f5b544" />
        <Metric label="Community authors" value="18" hint="open source" icon={<Users size={13} />} color="#4cc9f0" />
      </div>

      <TemplateGrid templates={templates} />
    </>
  );
}
