import { redirect } from "next/navigation";
import ConsoleShell from "@/components/ConsoleShell";
import { currentUser } from "@/lib/auth";
import NoticeBar from "@/components/NoticeBar";
import { getPlatformSettings } from "@/lib/settings";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await ensureSeed();
  const user = await currentUser();
  if (!user) redirect("/login");
  const platform = await getPlatformSettings();
  return (
    <ConsoleShell>
      {(platform.maintenance || platform.broadcast) && (
        <div className="mb-4">
          <NoticeBar
            maintenance={platform.maintenance}
            maintenanceMessage={platform.maintenanceMessage}
            broadcast={platform.broadcast}
          />
        </div>
      )}
      {children}
    </ConsoleShell>
  );
}
