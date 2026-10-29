"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { useToast } from "./toast";
import { cn } from "@/lib/format";

export function ActionButton({
  label,
  icon,
  title,
  body,
  kind = "success",
  className,
  variant = "default",
}: {
  label: string;
  icon?: React.ReactNode;
  title?: string;
  body?: string;
  kind?: "success" | "error" | "info" | "warn";
  className?: string;
  variant?: "default" | "primary" | "ghost" | "danger";
}) {
  const { push } = useToast();
  return (
    <button
      onClick={() => push({ kind, title: title ?? label, body })}
      className={cn(
        variant === "primary" ? "btn-primary" : variant === "ghost" ? "btn-ghost" : variant === "danger" ? "btn-danger" : "btn",
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function ExportButton({
  label = "Export CSV",
  filename,
  rows,
}: {
  label?: string;
  filename: string;
  rows: (string | number)[][];
}) {
  const { push } = useToast();
  const [done, setDone] = useState(false);

  const download = () => {
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
    push({ kind: "success", title: "Export ready", body: `${filename} · ${rows.length - 1} rows downloaded` });
  };

  return (
    <button onClick={download} className="btn">
      {done ? <Check size={13} className="text-brand" /> : <Download size={13} />}
      {done ? "Downloaded" : label}
    </button>
  );
}

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const { push } = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* clipboard blocked in preview */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        push({ kind: "success", title: "Copied to clipboard", body: value.slice(0, 48) });
      }}
      className={cn("btn h-7 px-2 text-[11px]", className)}
    >
      {copied ? <Check size={11} className="text-brand" /> : <Copy size={11} />}
      {copied ? "Copied" : label}
    </button>
  );
}
