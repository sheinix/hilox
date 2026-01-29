/**
 * Security-related constants. Keep editable without touching business logic.
 */

// --- SSRF: URL / fetch ---

/** Allowed URL protocols for user-submitted links. */
export const ALLOWED_PROTOCOLS = ["http:", "https:"] as const;

/** Hostnames (lowercase) that are always blocked. */
export const BLOCKED_HOSTNAMES: string[] = ["localhost"];

/** Suffix for blocked hostnames (e.g. "localhost" blocks "foo.localhost"). */
export const BLOCKED_HOSTNAME_SUFFIX = ".localhost";

/** Max redirects when fetching. Re-validate URL + DNS on each hop. */
export const MAX_REDIRECTS = 3;

/** Fetch timeout in ms. */
export const FETCH_TIMEOUT_MS = 8_000;

/** Max response size in bytes (e.g. 1.5MB). */
export const MAX_RESPONSE_BYTES = 1_572_864;

// --- SSRF: private / link-local IP ranges (IPv4) ---
// 10/8, 192.168/16, 172.16/12, 127/8, 169.254/16 (incl. 169.254.169.254)

export interface IpRange {
  /** First octet (0–255). */
  a: number;
  /** Second octet; optional for /8. */
  b?: number;
  /** Mask for second octet (e.g. 16–31 for 172.16/12). */
  bMask?: [number, number];
}

/** Ranges to block. /8: only `a` set. /16: `a`,`b` set. /12: `a`,`bMask` [lo, hi]. */
export const PRIVATE_IP_RANGES: IpRange[] = [
  { a: 10 }, // 10.0.0.0/8
  { a: 127 }, // 127.0.0.0/8
  { a: 169, b: 254 }, // 169.254.0.0/16 (link-local, metadata)
  { a: 172, bMask: [16, 31] }, // 172.16.0.0/12
  { a: 192, b: 168 }, // 192.168.0.0/16
];

// --- Rate limiting (Upstash Redis) ---

/** Max requests per hour per IP. */
export const RATE_LIMIT_HOUR_MAX = 5;

/** Max requests per day per IP. */
export const RATE_LIMIT_DAY_MAX = 20;

/** Failure tracking window in seconds. */
export const FAILURE_WINDOW_SEC = 600;

/** Failure threshold; exceeding triggers cooldown. */
export const FAILURE_THRESHOLD = 5;

/** Cooldown duration in seconds after too many failures. */
export const COOLDOWN_SEC = 900;

/** Redis key prefixes. */
export const REDIS_KEY = {
  HOUR: "rl:h",
  DAY: "rl:d",
  FAILURES: "failures",
  COOLDOWN: "cooldown",
} as const;
