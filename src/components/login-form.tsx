"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, ShieldCheck, TriangleAlert, User } from "lucide-react";
import { cn } from "@/lib/format";

export function LoginForm({ configured, loggedOut }: { configured: boolean; loggedOut: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("e") ? "Wrong username or password. Try again." : null,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/login?next=${encodeURIComponent(next)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password, remember }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string; redirect?: string };
      if (!res.ok) {
        setError(
          res.status === 429
            ? "Too many attempts — wait 5 minutes and try again."
            : (data.detail ?? "Wrong username or password."),
        );
        setPending(false);
        return;
      }
      router.replace(data.redirect && data.redirect.startsWith("/admin") ? data.redirect : next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Network error — check your connection and retry.");
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} action={`/api/auth/login?next=${encodeURIComponent(next)}`} method="post" className="mt-6 space-y-3" noValidate>
      {!configured ? (
        <div className="flex items-start gap-2 rounded-lg border border-[#f5b544]/30 bg-[#f5b544]/[0.07] p-2.5 text-[11px] text-[#f7c66b]">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" />
          <span>
            No sign-in is configured. Set <code className="font-mono">BOTFORGE_API_URL</code> to reach the product
            operator API, or provide <code className="font-mono">ADMIN_USERNAME</code> /{" "}
            <code className="font-mono">ADMIN_PASSWORD</code> as a fallback, then redeploy.
          </span>
        </div>
      ) : null}

      {loggedOut ? (
        <div className="rounded-lg border border-[#34e0a1]/25 bg-[#34e0a1]/[0.07] p-2.5 text-[11px] text-[#5eeac0]">
          You have been signed out. See you soon.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-[#ff5d6c]/30 bg-[#ff5d6c]/[0.08] p-2.5 text-[11px] text-[#ff929c]"
        >
          <TriangleAlert size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div>
        <label htmlFor="username" className="label">
          Username
        </label>
        <div className="relative mt-1">
          <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            id="username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
            placeholder="Arslan"
            className="input h-10 pl-9 text-[13px]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <div className="relative mt-1">
          <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="input h-10 pl-9 pr-10 text-[13px]"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint transition-colors hover:text-ink"
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-[11.5px] text-muted">
          <input
            type="checkbox"
            name="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3 w-3 accent-[#34e0a1]"
          />
          Keep me signed in for 7 days
        </label>
        <span className="flex items-center gap-1 text-[10px] text-faint">
          <ShieldCheck size={10} /> httpOnly · signed
        </span>
      </div>

      <button
        type="submit"
        disabled={pending || !username || !password || !configured}
        className={cn("btn-primary h-10 w-full text-[13px]", pending && "cursor-wait")}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : null}
        {pending ? "Signing in…" : "Sign in to console"}
        {!pending ? <ArrowRight size={14} /> : null}
      </button>

      <p className="pt-1 text-center text-[10.5px] leading-relaxed text-faint">
        Sessions are HMAC-SHA256 signed and expire after 12 hours (7 days with remember me). Credentials live in the
        deployment environment — never in the repository.
      </p>
    </form>
  );
}
