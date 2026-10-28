"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLock } from "./icons";

/**
 * Deliberately generic: no hints, no placeholders that reveal the account,
 * no autofill, no "forgot password" link, nothing that points at the operator
 * identity. Failure is always the same message.
 */
export default function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Access denied");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Access denied");
      setPassword("");
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300">
            <IconLock size={18} />
          </div>
          <h1 className="text-[15px] font-semibold tracking-tight text-white">Restricted area</h1>
          <p className="mt-1 text-[11.5px] text-slate-500">
            Operator credentials required. All access is logged.
          </p>
        </div>

        <form onSubmit={submit} className="glass space-y-3 p-5" autoComplete="off">
          <div>
            <label className="label">Identifier</label>
            <input
              className="input mono !text-[12.5px]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              required
            />
          </div>
          <div>
            <label className="label">Key</label>
            <input
              className="input mono !text-[12.5px]"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {!configured && (
            <p className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-2.5 py-2 text-[11px] text-amber-200">
              Operator access is disabled on this deployment.
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-rose-400/25 bg-rose-400/[0.07] px-2.5 py-2 text-[11px] text-rose-200">
              {error}
            </p>
          )}

          <button className="btn btn-primary w-full !py-2.5" disabled={busy || !configured}>
            {busy ? "Verifying…" : "Unlock"}
          </button>
        </form>

        <p className="mt-4 text-center text-[10px] text-slate-600">
          Unauthorised access is prohibited.
        </p>
      </div>
    </main>
  );
}
