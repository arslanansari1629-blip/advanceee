"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, CreditCard, Download, RotateCcw, Search, X } from "lucide-react";
import { Badge, PlanBadge } from "./ui";
import { ExportButton } from "./actions";
import { useToast } from "./toast";
import { cn, money, shortDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

const statusTone = {
  paid: "success",
  open: "warn",
  failed: "danger",
  refunded: "neutral",
} as const;

export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Invoice["status"] | "all">("all");
  const [plan, setPlan] = useState<Invoice["plan"] | "all">("all");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [state, setState] = useState<Record<string, Invoice["status"]>>({});

  const rows = useMemo(() => {
    const list = invoices.filter((i) => {
      if (status !== "all" && (state[i.id] ?? i.status) !== status) return false;
      if (plan !== "all" && i.plan !== plan) return false;
      if (q && !`${i.id} ${i.customer} ${i.email} ${i.method}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    return list.sort((a, b) =>
      dir === "desc" ? new Date(b.date).getTime() - new Date(a.date).getTime() : new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [invoices, q, status, plan, dir, state]);

  const totals = {
    paid: rows.filter((r) => (state[r.id] ?? r.status) === "paid").reduce((a, r) => a + r.amount, 0),
    failed: rows.filter((r) => (state[r.id] ?? r.status) === "failed").length,
    refunded: rows.filter((r) => (state[r.id] ?? r.status) === "refunded").reduce((a, r) => a + r.amount, 0),
  };

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line/80 px-3 py-2.5">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search invoice, customer, method…"
            className="h-8 w-[240px] rounded-lg border border-line bg-canvas/60 pl-7 pr-2 text-[12px] text-ink outline-none placeholder:text-faint focus:border-brand/50"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Invoice["status"] | "all")}
          className="h-8 rounded-lg border border-line bg-canvas/60 px-2 text-[11.5px] text-muted outline-none"
        >
          <option value="all">any status</option>
          <option value="paid">paid</option>
          <option value="open">open</option>
          <option value="failed">failed</option>
          <option value="refunded">refunded</option>
        </select>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as Invoice["plan"] | "all")}
          className="h-8 rounded-lg border border-line bg-canvas/60 px-2 text-[11.5px] text-muted outline-none"
        >
          <option value="all">any plan</option>
          <option value="pro">pro</option>
          <option value="scale">scale</option>
          <option value="free">free</option>
        </select>
        {(q || status !== "all" || plan !== "all") && (
          <button onClick={() => { setQ(""); setStatus("all"); setPlan("all"); }} className="flex items-center gap-1 text-[11px] text-faint hover:text-ink">
            <X size={10} /> clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <ExportButton
            filename="botforge-invoices.csv"
            rows={[
              ["id", "customer", "email", "plan", "amount", "status", "date", "method"],
              ...rows.map((r) => [r.id, r.customer, r.email, r.plan, r.amount, state[r.id] ?? r.status, r.date, r.method]),
            ]}
          />
          <button className="btn h-8 text-[11.5px]">
            <Download size={12} /> Ledger
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-line/70 bg-canvas/30 px-3 py-1.5 text-[10.5px] text-faint">
        <span>Collected <span className="font-mono text-[#4fdfb0]">{money(totals.paid, { cents: true })}</span></span>
        <span>Refunded <span className="font-mono text-muted">{money(totals.refunded, { cents: true })}</span></span>
        <span>Failed <span className="font-mono text-[#ff929c]">{totals.failed}</span></span>
        <span className="ml-auto">{rows.length} invoices</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-line/70 bg-canvas/30">
              <th className="th">Invoice</th>
              <th className="th">Customer</th>
              <th className="th">Plan</th>
              <th className="th">Method</th>
              <th className="th cursor-pointer select-none text-right" onClick={() => setDir((d) => (d === "desc" ? "asc" : "desc"))}>
                <span className="flex items-center justify-end gap-1">Date <ArrowUpDown size={9} /></span>
              </th>
              <th className="th text-right">Amount</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const st = state[i.id] ?? i.status;
              return (
                <tr key={i.id} className="border-b border-line/50 last:border-0 hover:bg-raised/40">
                  <td className="td font-mono text-[11px] text-ink">{i.id}</td>
                  <td className="td">
                    <div className="text-[12px] text-ink">{i.customer}</div>
                    <div className="text-[10px] text-faint">{i.email}</div>
                  </td>
                  <td className="td"><PlanBadge plan={i.plan} /></td>
                  <td className="td">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <CreditCard size={10} className="text-faint" /> {i.method}
                    </span>
                  </td>
                  <td className="td text-right text-[11px]">{shortDate(i.date)}</td>
                  <td className="td text-right font-mono text-[11.5px] text-ink">{money(i.amount, { cents: true })}</td>
                  <td className="td"><Badge tone={statusTone[st]}>{st}</Badge></td>
                  <td className="td text-right">
                    <button
                      onClick={() => {
                        setState((p) => ({ ...p, [i.id]: "refunded" }));
                        push({ kind: "warn", title: "Refund issued", body: `${i.id} · ${money(i.amount, { cents: true })} back to ${i.method}` });
                      }}
                      disabled={st === "refunded"}
                      className={cn("btn h-6 px-1.5 text-[10px]", st === "refunded" && "opacity-40")}
                    >
                      <RotateCcw size={10} /> refund
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
