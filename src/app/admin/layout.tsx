import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";
import { getSession, loadAdminState } from "@/lib/session";
import { shellFrom } from "@/lib/shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, state] = await Promise.all([getSession(), loadAdminState()]);

  return (
    <ToastProvider>
      <AppShell
        admin={session ? { user: session.user, name: session.name, via: session.via } : undefined}
        shell={shellFrom(state)}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
