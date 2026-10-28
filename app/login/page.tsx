import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { currentUser } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; demo?: string }>;
}) {
  await ensureSeed();
  const user = await currentUser();
  if (user) redirect("/console");
  const sp = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center">
      <AuthForm initialMode={sp.mode === "register" ? "register" : "login"} autoDemo={sp.demo === "1"} />
    </main>
  );
}
