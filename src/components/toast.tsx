"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cn } from "@/lib/format";

type Kind = "success" | "error" | "info" | "warn";
type Toast = { id: number; kind: Kind; title: string; body?: string };

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} });

export const useToast = () => useContext(ToastCtx);

const icons: Record<Kind, React.ReactNode> = {
  success: <CheckCircle2 size={15} className="text-[#34e0a1]" />,
  error: <XCircle size={15} className="text-[#ff7c88]" />,
  info: <Info size={15} className="text-[#7edcf7]" />,
  warn: <TriangleAlert size={15} className="text-[#f5b544]" />,
};

const rings: Record<Kind, string> = {
  success: "border-[#34e0a1]/30",
  error: "border-[#ff5d6c]/30",
  info: "border-[#4cc9f0]/30",
  warn: "border-[#f5b544]/30",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[330px] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex animate-rise items-start gap-2.5 rounded-xl border bg-panel/95 p-3 shadow-pop backdrop-blur",
              rings[t.kind],
            )}
          >
            <span className="mt-0.5">{icons[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium leading-snug text-ink">{t.title}</p>
              {t.body ? <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{t.body}</p> : null}
            </div>
            <button
              onClick={() => setItems((prev) => prev.filter((i) => i.id !== t.id))}
              className="rounded p-0.5 text-faint transition-colors hover:text-ink"
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
