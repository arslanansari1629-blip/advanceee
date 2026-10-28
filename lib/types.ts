// Shared types for BotForge Cloud

/** live = webhook registered and answering · draft = no token yet · paused = webhook removed */
export type BotStatus = "live" | "draft" | "paused" | "deploying" | "error";

export interface BotFile {
  path: string;
  content: string;
}

export type BotEventType =
  | "create"
  | "deploy"
  | "start"
  | "stop"
  | "restart"
  | "error"
  | "edit"
  | "delete"
  | "note";

export interface BotEvent {
  id: string;
  type: BotEventType;
  message: string;
  ts: number;
}

/** One compiled command of the running bot program. */
export interface BehaviourCommand {
  cmd: string;
  reply: string;
  /** where the reply came from: user code or the engine */
  source: "code" | "engine";
}

/** The executable behaviour compiled from the pasted Python. */
export interface Behaviour {
  commands: BehaviourCommand[];
  echo: string | null;
  fallback: string | null;
  parseMode: "HTML" | "Markdown" | "MarkdownV2" | null;
  buttons: { label: string; data: string; reply: string }[];
  notes: string[];
}

export interface TelegramState {
  username: string | null;
  botId: number | null;
  firstName: string | null;
  webhookUrl: string | null;
  webhookOk: boolean;
  pendingUpdates: number;
  lastError: string | null;
  lastSyncAt: number | null;
  lastUpdateAt: number | null;
  updates: number;
  replies: number;
  errors: number;
}

export interface Bot {
  id: string;
  userId: string;
  name: string;
  path: string;
  content: string;
  entry: string;
  files: BotFile[];
  requirements: string;
  env: Record<string, string>;
  status: BotStatus;
  desired: "live" | "paused";
  tokenMasked: string | null;
  /** AES-GCM encrypted bot token — server only, never serialised to the client */
  tokenEnc: string | null;
  webhookSecret: string | null;
  framework: string;
  frameworkId: string;
  behaviour: Behaviour;
  telegram: TelegramState;
  autoRestart: boolean;
  restartCount: number;
  lastError: string | null;
  startedAt: number | null;
  stoppedAt: number | null;
  createdAt: number;
  updatedAt: number;
  events: BotEvent[];
  stats: { uptimePct: number; cpu: number; memMB: number };
}

export interface LogLine {
  seq: number;
  stream: "update" | "reply" | "system" | "error" | "telegram";
  message: string;
  ts: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passHash: string;
  createdAt: number;
  plan: string;
}

export interface PackageHint {
  pkg: string;
  reason: string;
  pinned?: boolean;
}

export interface DetectedImport {
  module: string;
  pkg: string | null;
  stdlib: boolean;
  known: boolean;
  line: number;
}

export interface Analysis {
  imports: DetectedImport[];
  packages: PackageHint[];
  requirements: string;
  frameworks: string[];
  framework: string;
  frameworkId: string;
  tokens: string[];
  tokenMasked: string | null;
  warnings: string[];
  notes: string[];
  stats: { lines: number; chars: number; imports: number; stdlib: number };
  localImports: string[];
}
