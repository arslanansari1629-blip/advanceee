import { db } from "./db";

export interface PlatformSettings {
  id: string;
  maintenance: boolean;
  maintenanceMessage: string;
  broadcast: string;
  signupsOpen: boolean;
  updatedAt: number;
}

const DEFAULTS: PlatformSettings = {
  id: "platform",
  maintenance: false,
  maintenanceMessage: "",
  broadcast: "",
  signupsOpen: true,
  updatedAt: 0,
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const doc = (await db.get("meta", "platform")) as unknown as PlatformSettings | null;
  return { ...DEFAULTS, ...(doc ?? {}) };
}

export async function setPlatformSettings(
  patch: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  const current = await getPlatformSettings();
  const next: PlatformSettings = {
    ...current,
    ...patch,
    id: "platform",
    updatedAt: Date.now(),
  };
  await db.put("meta", "platform", next as unknown as Record<string, unknown>);
  return next;
}
