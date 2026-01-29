/**
 * Structured server-side logging. Never log secrets (API keys, full URLs with tokens, etc.).
 */

import { createHash } from "node:crypto";

const ENV = process.env.NODE_ENV ?? "development";
const LOG_SALT = process.env.LOG_SALT ?? "";

/** Keys to strip from objects before logging (case-insensitive match). */
const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "x-api-key",
  "set-cookie",
  "x-auth-token",
  "token",
  "password",
  "secret",
]);

export interface LogContext {
  request_id?: string;
  [key: string]: unknown;
}

function basePayload(level: string, context?: LogContext): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    env: ENV,
    level,
  };
  if (context?.request_id !== undefined) {
    payload.request_id = context.request_id;
  }
  return payload;
}

/**
 * Merges context into payload, redacting sensitive keys and applying request_id from context.
 */
function mergeContext(
  payload: Record<string, unknown>,
  context?: LogContext,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...payload };
  if (context) {
    const redacted = redactSensitive(context as Record<string, unknown>);
    Object.assign(out, redacted);
  }
  if (extra && Object.keys(extra).length > 0) {
    const redacted = redactSensitive(extra);
    Object.assign(out, redacted);
  }
  return out;
}

/**
 * Normalizes URL for logging: returns host and path only (no query, hash, or credentials).
 */
export function normalizeUrlForLogs(url: string): { host: string; path: string } {
  try {
    const u = new URL(url);
    return {
      host: u.hostname ?? "",
      path: u.pathname ?? "/",
    };
  } catch {
    return { host: "", path: "" };
  }
}

/**
 * Returns SHA-256 hash of (ip + LOG_SALT) as hex. Uses LOG_SALT from env; fallback empty.
 */
export function hashIp(ip: string): string {
  const salt = typeof process.env.LOG_SALT === "string" ? process.env.LOG_SALT : LOG_SALT;
  const data = `${ip}${salt}`;
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Truncates string to maxLen, appending "…" if truncated.
 */
export function truncate(str: string, maxLen: number): string {
  if (maxLen <= 0 || str.length <= maxLen) return str;
  if (maxLen <= 3) return str.slice(0, maxLen);
  return str.slice(0, maxLen - 1) + "…";
}

/**
 * Returns a copy of the object with sensitive keys removed (case-insensitive).
 */
export function redactSensitive<T extends Record<string, unknown>>(fields: T): T {
  const out = { ...fields } as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower)) {
      delete out[key];
    }
  }
  return out as T;
}

export function logInfo(message: string, context?: LogContext, extra?: Record<string, unknown>): void {
  const payload = mergeContext(basePayload("info", context), context, extra);
  payload.message = message;
  console.log(JSON.stringify(payload));
}

export function logWarn(message: string, context?: LogContext, extra?: Record<string, unknown>): void {
  const payload = mergeContext(basePayload("warn", context), context, extra);
  payload.message = message;
  console.warn(JSON.stringify(payload));
}

export function logError(message: string, context?: LogContext, extra?: Record<string, unknown>): void {
  const payload = mergeContext(basePayload("error", context), context, extra);
  payload.message = message;
  console.error(JSON.stringify(payload));
}
