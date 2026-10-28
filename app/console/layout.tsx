import { redirect } from "next/navigation";
import ConsoleShell from "@/components/ConsoleShell";
import { currentUser } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await ensureSeed();
  const user = await currentUser();
  if (!user) redirect("/login");
  return <ConsoleShell>{children}</ConsoleShell>;
}
