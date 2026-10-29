/**
 * Shapes returned by the live BotForge Cloud operator API
 * (`GET /api/admin/data`, `GET|POST /api/admin/settings`).
 *
 * Everything the console renders comes from these payloads — there is no local
 * fixture data anywhere in this app.
 */

export type ProductBotStatus = "live" | "draft" | "paused" | "deploying" | "error";

/**
 * Status strings are passed through from the product untouched. The console
 * renders any value it does not recognise as a neutral badge instead of
 * inventing a state.
 */
export type BotStatusValue = string;

export interface ProductBot {
  id: string;
  name: string;
  status: BotStatusValue;
  username: string | null;
  framework: string;
  entry: string;
  requirements: string;
  restartCount: number;
  autoRestart: boolean;
  startedAt: number | null;
  createdAt: number;
  lastError: string | null;
  tokenMasked: string | null;
  updates: number;
  replies: number;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  stats: { uptimePct: number; cpu: number; memMB: number };
}

export interface ProductUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  createdAt: number;
  bots: number;
  live: number;
  updates: number;
}

export interface ProductStats {
  users: number;
  bots: number;
  live: number;
  drafts: number;
  paused: number;
  errors: number;
  updates: number;
  replies: number;
  restarts: number;
  packages: number;
  suspended: number;
}

export interface PlatformSettings {
  id?: string;
  maintenance: boolean;
  maintenanceMessage: string;
  broadcast: string;
  signupsOpen: boolean;
  updatedAt?: number;
}

export interface AdminData {
  storage: string;
  engine: { mode: string; online: boolean };
  settings: PlatformSettings;
  stats: ProductStats;
  users: ProductUser[];
  bots: ProductBot[];
}

export interface ProductHealth {
  ok: boolean;
  service: string;
  version: string;
  mode: string;
  runner: string;
  storage: string;
  siteUrl: string;
  endpoint: string;
  time: string;
}

export type AdminState =
  | { state: "ok"; data: AdminData; latencyMs: number; baseUrl: string }
  | { state: "unlinked"; baseUrl: string }
  | { state: "unauthorized"; baseUrl: string }
  | { state: "unreachable"; baseUrl: string; error: string };
