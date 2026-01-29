import { Redis } from "@upstash/redis";
import {
  COOLDOWN_SEC,
  FAILURE_THRESHOLD,
  FAILURE_WINDOW_SEC,
  RATE_LIMIT_DAY_MAX,
  RATE_LIMIT_HOUR_MAX,
  REDIS_KEY,
} from "./constants";
import { hashIp, logWarn } from "@/lib/observability/logger";

const HOUR_TTL = 3600;
const DAY_TTL = 86400;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || typeof url !== "string" || typeof token !== "string") return null;
  return new Redis({ url, token });
}

export class RateLimitError extends Error {
  constructor(
    public readonly code: "RATE_LIMIT" | "COOLDOWN",
    message: string
  ) {
    super(message);
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/** IPs we treat as local (dev/testing); rate limits are skipped. */
const LOCAL_IPS = new Set(["127.0.0.1", "::1", "localhost"]);

/**
 * True when the request is from the local machine (dev/testing).
 */
export function isLocalRequest(ip: string): boolean {
  return LOCAL_IPS.has(ip.toLowerCase());
}

/**
 * Extracts client IP from request. Prefers first x-forwarded-for, else x-real-ip.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/**
 * Checks cooldown for IP. Returns true if in cooldown.
 */
async function isInCooldown(redis: Redis, ip: string): Promise<boolean> {
  const key = `${REDIS_KEY.COOLDOWN}:${ip}`;
  const v = await redis.get(key);
  return v != null;
}

/**
 * Enforces rate limits: cooldown first, then 5/hour and 20/day.
 * Increments hour and day counters on success. Throws RateLimitError (429) when exceeded.
 * Skips all limits when the request is from localhost (dev/testing).
 */
export async function enforceRateLimits(ip: string): Promise<void> {
  if (isLocalRequest(ip)) return;

  const redis = getRedis();
  if (!redis) return;

  const cooldown = await isInCooldown(redis, ip);
  if (cooldown) {
    logWarn("rate_limited", {}, { ip_hash: hashIp(ip), limit_type: "COOLDOWN" });
    throw new RateLimitError(
      "COOLDOWN",
      "Too many recent failures. Try again in 15 minutes."
    );
  }

  const hKey = `${REDIS_KEY.HOUR}:${ip}`;
  const dKey = `${REDIS_KEY.DAY}:${ip}`;

  const [hVal, dVal] = await Promise.all([redis.get<number>(hKey), redis.get<number>(dKey)]);
  const h = typeof hVal === "number" ? hVal : 0;
  const d = typeof dVal === "number" ? dVal : 0;

  if (h >= RATE_LIMIT_HOUR_MAX) {
    logWarn("rate_limited", {}, { ip_hash: hashIp(ip), limit_type: "RATE_LIMIT" });
    throw new RateLimitError(
      "RATE_LIMIT",
      "Hourly limit exceeded. Try again later."
    );
  }
  if (d >= RATE_LIMIT_DAY_MAX) {
    logWarn("rate_limited", {}, { ip_hash: hashIp(ip), limit_type: "RATE_LIMIT" });
    throw new RateLimitError(
      "RATE_LIMIT",
      "Daily limit exceeded. Try again tomorrow."
    );
  }

  const [hNew, dNew] = await Promise.all([
    redis.incr(hKey),
    redis.incr(dKey),
  ]);

  if (hNew === 1) await redis.expire(hKey, HOUR_TTL);
  if (dNew === 1) await redis.expire(dKey, DAY_TTL);
}

/**
 * Records a failure for IP. If failures in window >= FAILURE_THRESHOLD, sets cooldown.
 * No-op for local IPs (dev/testing).
 */
export async function recordFailure(ip: string): Promise<void> {
  if (isLocalRequest(ip)) return;

  const redis = getRedis();
  if (!redis) return;

  const key = `${REDIS_KEY.FAILURES}:${ip}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, FAILURE_WINDOW_SEC);

  if (n >= FAILURE_THRESHOLD) {
    const cooldownKey = `${REDIS_KEY.COOLDOWN}:${ip}`;
    await redis.set(cooldownKey, "1", { ex: COOLDOWN_SEC });
  }
}

/**
 * Clears failure count for IP on successful request. Cooldown TTL is unchanged.
 * No-op for local IPs (dev/testing).
 */
export async function clearFailures(ip: string): Promise<void> {
  if (isLocalRequest(ip)) return;

  const redis = getRedis();
  if (!redis) return;

  const key = `${REDIS_KEY.FAILURES}:${ip}`;
  await redis.del(key);
}
