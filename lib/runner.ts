import type { RunnerInfo, User } from "./types";

export interface RunnerTarget {
  url: string | null;
  secret: string;
}

/** Per-user runner wins over the platform-wide default runner. */
export function runnerTarget(user: User | null): RunnerTarget {
  const url = (user?.runnerUrl || process.env.RUNNER_URL || "").trim().replace(/\/+$/, "");
  const secret = (user?.runnerSecret || process.env.RUNNER_SECRET || "").trim();
  return { url: url || null, secret };
}

export function isRunnerUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function runnerFetch<T = any>(
  target: RunnerTarget,
  path: string,
  init: RequestInit = {},
  timeoutMs = 12_000
): Promise<T> {
  if (!target.url) throw new Error("no runner configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${target.url}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(target.secret ? { "x-runner-secret": target.secret } : {}),
        ...(init.headers ?? {}),
      },
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`runner returned non-JSON (${res.status})`);
    }
    if (!res.ok) throw new Error(json?.error || `runner ${res.status}`);
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function runnerHealth(user: User | null): Promise<RunnerInfo> {
  const target = runnerTarget(user);
  if (!target.url) {
    return {
      connected: false,
      url: null,
      mode: "preview",
      error: "No runner attached — preview gateway in use",
    };
  }
  const t0 = Date.now();
  try {
    const h = await runnerFetch<any>(target, "/health", { method: "GET" }, 5000);
    return {
      connected: true,
      url: target.url,
      mode: "runner",
      version: h.version,
      python: h.python,
      running: h.running,
      capacity: h.capacity,
      cpu: h.cpu,
      memMB: h.memMB,
      latencyMs: Date.now() - t0,
    };
  } catch (err: any) {
    return {
      connected: false,
      url: target.url,
      mode: "runner",
      error: err?.name === "AbortError" ? "runner timed out" : err?.message ?? "unreachable",
    };
  }
}
