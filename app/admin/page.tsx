import type { Metadata } from "next";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";
import { adminConfigured, isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operator console",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminPage() {
  const authed = await isAdmin();
  if (!authed) return <AdminLogin configured={adminConfigured()} />;
  return <AdminDashboard />;
}
