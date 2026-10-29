import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="panel w-full max-w-md p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-raised text-faint">
          <Compass size={20} />
        </span>
        <h1 className="mt-4 text-[18px] font-semibold text-ink">404 · off the fleet map</h1>
        <p className="mt-1 text-[12.5px] text-muted">
          The page you asked for does not exist in this console. Try the command palette with <span className="kbd">⌘K</span>.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Link href="/admin" className="btn-primary h-8 text-[11.5px]">
            Back to overview
          </Link>
          <Link href="/admin/bots" className="btn h-8 text-[11.5px]">
            Browse bots
          </Link>
        </div>
      </div>
    </main>
  );
}
