"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production this would go to the error reporter (Sentry / Axiom).
    console.error("admin console error", error);
  }, [error]);

  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-20 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ff5d6c]/30 bg-[#ff5d6c]/10 text-[#ff929c]">
        <TriangleAlert size={18} />
      </span>
      <h1 className="mt-1 text-[15px] font-semibold text-ink">This view crashed</h1>
      <p className="max-w-md text-[12px] text-faint">
        {error.message || "An unexpected error occurred while rendering the console."}
        {error.digest ? <span className="ml-1 font-mono text-[10.5px]">({error.digest})</span> : null}
      </p>
      <button onClick={reset} className="btn-primary mt-3 h-8 text-[11.5px]">
        Retry render
      </button>
    </div>
  );
}
