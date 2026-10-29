import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";
import { SESSION_COOKIE, readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession(cookies().get(SESSION_COOKIE)?.value);

  return (
    <ToastProvider>
      <AppShell admin={session ? { user: session.user, name: session.name } : undefined}>{children}</AppShell>
    </ToastProvider>
  );
}
