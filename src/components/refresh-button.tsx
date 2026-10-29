"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/format";

/** Re-fetch the live product payload for the current page (no cache anywhere). */
export function RefreshButton({ label = "Refresh live data" }: { label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      onClick={() => {
        setBusy(true);
        router.refresh();
        setTimeout(() => setBusy(false), 700);
      }}
      className="btn h-8 text-[12px]"
      title="Server components re-read /api/admin/data from the product"
    >
      <RefreshCw size={13} className={cn(busy && "animate-spin")} />
      {busy ? "Fetching…" : label}
    </button>
  );
}

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard blocked — nothing to do */
        }
      }}
      className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-faint transition-colors hover:bg-raised hover:text-ink", className)}
      title={`Copy ${value}`}
    >
      {copied ? <Check size={11} className="text-brand" /> : <Copy size={11} />}
      {label ? <span>{copied ? "Copied" : label}</span> : null}
    </button>
  );
}
