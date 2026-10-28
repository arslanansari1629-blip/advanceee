// Shared types for BotForge Cloud

export type BotStatus =
  | "running"
  | "stopped"
  | "starting"
  | "installing"
  | "crashed"
  | "queued";

export type RunnerMode = "runner" | "preview";

export interface BotFile {
  path: string;
  content: string;
}

export interface BotEvent {
  id: string;
  type:
    | "create"
    | "deploy"
    | "start"
    | "stop"
    | "restart"
    | "crash"
    | "install"
    | "edit"
    | "delete"
    | "note";
  message: string;
  ts: number;
}

export interface Bot extends BotFile {
  id: string;
  userId: string;
  name: string;
  entry: string;
  files: BotFile[];
  requirements: string;
  env: Record<string, string>;
  status: BotStatus;
  desired: "running" | "stopped";
  installed: string[];
  installLog: string;
  installState: "idle" | "installing" | "installed" | "failed";
  restartCount: number;
  autoRestart: boolean;
  crashLoop: boolean;
  lastError: string | null;
  tokenMasked: string | null;
  framework: string;
  frameworkId: string;
  mode: RunnerMode;
  startedAt: number | null;
  stoppedAt: number | null;
  createdAt: number;
  updatedAt: number;
  events: BotEvent[];
  stats: {
    cpu: number;
    memMB: number;
    uptimePct: number;
    messagesProcessed: number;
  };
  previewSeed?: number;
  previewCommands?: string[];
  previewSession?: number;
}

export interface LogLine {
  seq: number;
  stream: "stdout" | "stderr" | "system" | "telegram";
  message: string;
  ts: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passHash: string;
  createdAt: number;
  runnerUrl?: string;
  runnerSecret?: string;
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

export interface RunnerInfo {
  connected: boolean;
  url: string | null;
  mode: RunnerMode;
  version?: string;
  python?: string;
  running?: number;
  capacity?: number;
  cpu?: number;
  memMB?: number;
  latencyMs?: number;
  error?: string;
}
