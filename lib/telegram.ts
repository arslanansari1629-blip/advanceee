/**
 * Telegram Bot API client + webhook payload crypto.
 *
 * BotForge runs bots in *webhook* mode: Telegram POSTs every update to our
 * serverless endpoint, which answers immediately. No long-lived process is
 * needed, so a bot stays online 24/7 with no runner, VPS or container.
 */
import crypto from "node:crypto";

const API = (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/+$/, "");

export function siteUrl(): string {
  const explicit = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const KEY = crypto
  .createHash("sha256")
  .update(process.env.AUTH_SECRET || "botforge-cloud-dev-secret-please-set-AUTH_SECRET")
  .digest();

/** AES-256-GCM. Output: iv.tag.ciphertext (base64url). */
export function seal(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), enc.toString("base64url")].join(".");
}

export function open(sealed: string): string | null {
  try {
    const [ivB, tagB, dataB] = sealed.split(".");
    if (!ivB || !tagB || !dataB) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    const out = Buffer.concat([decipher.update(Buffer.from(dataB, "base64url")), decipher.final()]);
    return out.toString("utf8");
  } catch {
    return null;
  }
}

export const maskToken = (token: string): string => {
  const [id, secret] = token.split(":");
  if (!secret) return token.slice(0, 4) + "••••";
  return `${id}:${secret.slice(0, 4)}${"•".repeat(6)}${secret.slice(-3)}`;
};

export const isValidToken = (token: string): boolean => /^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(token.trim());

/** The exact URL Telegram will POST to. Carries the sealed token so the
 *  endpoint works even on a fresh serverless instance. */
export function webhookUrl(botId: string, sealedToken: string): string {
  return `${siteUrl()}/api/tg/${botId}?d=${encodeURIComponent(sealedToken)}`;
}

export interface TgResult<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export async function callTelegram<T = any>(
  token: string,
  method: string,
  payload?: Record<string, unknown>,
  timeoutMs = 12_000
): Promise<TgResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload ?? {}),
      cache: "no-store",
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as TgResult<T>;
    if (!res.ok && json.ok !== false) {
      return { ok: false, description: `HTTP ${res.status}`, error_code: res.status };
    }
    return json;
  } catch (err: any) {
    return {
      ok: false,
      description: err?.name === "AbortError" ? "telegram timeout" : err?.message ?? "network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
}

export async function getMe(token: string) {
  return callTelegram<TgUser>(token, "getMe", {}, 10_000);
}

export async function setWebhook(token: string, url: string, secret: string) {
  return callTelegram<boolean>(token, "setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "edited_message", "callback_query", "inline_query"],
    drop_pending_updates: false,
    max_connections: 40,
  });
}

export async function deleteWebhook(token: string) {
  return callTelegram<boolean>(token, "deleteWebhook", { drop_pending_updates: false });
}

export async function getWebhookInfo(token: string) {
  return callTelegram<WebhookInfo>(token, "getWebhookInfo", {}, 8000);
}

export async function sendMessage(
  token: string,
  chatId: number | string,
  text: string,
  extra: Record<string, unknown> = {}
) {
  return callTelegram(token, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...extra,
  });
}
