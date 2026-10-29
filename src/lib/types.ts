export type BotStatus = "live" | "paused" | "error" | "draft" | "compiling";
export type Plan = "free" | "pro" | "scale";
export type Library = "python-telegram-bot" | "aiogram" | "pyTelegramBotAPI" | "pyrogram";

export interface Bot {
  id: string;
  slug: string;
  name: string;
  handle: string;
  tokenMask: string;
  ownerId: string;
  status: BotStatus;
  library: Library;
  version: string;
  handlers: string[];
  imports: { module: string; pypi: string; pin?: string }[];
  updates24h: number;
  updates7d: number[];
  successRate: number;
  p95: number;
  createdAt: string;
  lastDeploy: string;
  region: string;
  env: { key: string; value: string; secret: boolean }[];
  webhook: { url: string; deliveries: number; failures: number; lastStatus: number; secretSet: boolean };
  source: string;
  flags: string[];
  cpuMs: number;
  storageKb: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  telegram: string;
  plan: Plan;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "suspended" | "invited";
  bots: number;
  updates: number;
  mrr: number;
  joined: string;
  lastSeen: string;
  country: string;
  countryCode: string;
  color: string;
}

export type LogLevel = "info" | "success" | "warn" | "error" | "debug";
export interface LogLine {
  id: string;
  ts: string;
  level: LogLevel;
  bot: string;
  event: "update" | "reply" | "webhook" | "compile" | "error" | "auth";
  message: string;
  latency: number | null;
  chat: string;
  payload?: Record<string, unknown>;
}

export interface Invoice {
  id: string;
  customer: string;
  email: string;
  plan: Plan;
  amount: number;
  status: "paid" | "open" | "failed" | "refunded";
  date: string;
  method: string;
}

export interface Ticket {
  id: string;
  subject: string;
  user: string;
  email: string;
  category: "deploy" | "billing" | "bug" | "abuse" | "feature";
  priority: "urgent" | "high" | "normal" | "low";
  status: "open" | "pending" | "resolved";
  updated: string;
  unread: number;
  messages: { from: "user" | "admin"; author: string; body: string; at: string }[];
}

export interface AuditEntry {
  id: string;
  actor: string;
  actorColor: string;
  action: string;
  target: string;
  ip: string;
  time: string;
  severity: "low" | "medium" | "high";
  meta: string;
}

export interface Flag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: number;
  envs: string[];
  owner: string;
  updated: string;
  tag: string;
}

export interface Template {
  id: string;
  name: string;
  library: Library;
  description: string;
  deploys: number;
  rating: number;
  tags: string[];
  accent: string;
  source: string;
}

export interface Service {
  name: string;
  status: "operational" | "degraded" | "outage";
  uptime: number;
  latency: number;
  region: string;
  days: number[];
}

export interface Incident {
  id: string;
  title: string;
  severity: "minor" | "major" | "critical";
  status: "resolved" | "monitoring" | "investigating";
  started: string;
  duration: string;
  services: string[];
  summary: string;
}
