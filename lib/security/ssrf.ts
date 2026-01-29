import * as dns from "node:dns";
import {
  ALLOWED_PROTOCOLS,
  BLOCKED_HOSTNAMES,
  BLOCKED_HOSTNAME_SUFFIX,
  FETCH_TIMEOUT_MS,
  MAX_REDIRECTS,
  MAX_RESPONSE_BYTES,
  PRIVATE_IP_RANGES,
} from "./constants";
import type { IpRange } from "./constants";
import { AppError, EXTRACT_ERROR_CODES } from "@/lib/observability/errors";

const dnsPromises = dns.promises;

const USER_AGENT =
  "Mozilla/5.0 (compatible; NewsToThread/1.0; +https://github.com/news-to-thread)";

/** Re-export for tests that assert on stable codes. */
export { AppError } from "@/lib/observability/errors";
export const SSRF_ERROR_CODES = {
  UNSUPPORTED_PROTOCOL: EXTRACT_ERROR_CODES.DISALLOWED_URL,
  BLOCKED_HOSTNAME: EXTRACT_ERROR_CODES.DISALLOWED_URL,
  PRIVATE_OR_LINKLOCAL_IP: EXTRACT_ERROR_CODES.PRIVATE_IP_BLOCKED,
  INVALID_URL: EXTRACT_ERROR_CODES.INVALID_URL,
  TOO_MANY_REDIRECTS: EXTRACT_ERROR_CODES.TOO_MANY_REDIRECTS,
  FETCH_TIMEOUT: EXTRACT_ERROR_CODES.FETCH_TIMEOUT,
  RESPONSE_TOO_LARGE: EXTRACT_ERROR_CODES.FETCH_TOO_LARGE,
  FETCH_FAILED: EXTRACT_ERROR_CODES.FETCH_HTTP_ERROR,
} as const;

// --- Pure IP checks (unit-testable) ---

function parseIpv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => parseInt(p, 10));
  if (octets.some((n) => n < 0 || n > 255 || Number.isNaN(n))) return null;
  return octets;
}

function matchRange(octets: number[], r: IpRange): boolean {
  if (octets[0] !== r.a) return false;
  if (r.b !== undefined) return octets[1] === r.b;
  if (r.bMask) {
    const b = octets[1];
    return b >= r.bMask[0] && b <= r.bMask[1];
  }
  return true;
}

/**
 * Returns true if the IPv4 address is in a private or link-local range
 * (10/8, 192.168/16, 172.16/12, 127/8, 169.254/16). Pure function for testing.
 */
export function isPrivateOrLinkLocalIp(ip: string): boolean {
  const octets = parseIpv4(ip);
  if (!octets) return false;
  return PRIVATE_IP_RANGES.some((r) => matchRange(octets, r));
}

function isBlockedIpv6(ip: string): boolean {
  const norm = ip.toLowerCase();
  if (norm === "::1") return true;
  if (norm.startsWith("fe80:")) return true;
  if (norm.startsWith("fd") || norm.startsWith("fc")) return true;
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(lower)) return true;
  if (lower.endsWith(BLOCKED_HOSTNAME_SUFFIX)) return true;
  return false;
}

function throwInvalidUrl(reason: string): never {
  throw new AppError(EXTRACT_ERROR_CODES.INVALID_URL, reason, 400);
}

function throwDisallowedUrl(reason: string): never {
  throw new AppError(EXTRACT_ERROR_CODES.DISALLOWED_URL, reason, 400);
}

/**
 * Asserts URL is http/https and hostname not blocked. Returns parsed URL.
 * Does not perform DNS resolution; use resolveAndAssertPublicHost for that.
 */
export function assertSafeUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new AppError(EXTRACT_ERROR_CODES.INVALID_URL, "Invalid URL", 400);
  }
  if (!ALLOWED_PROTOCOLS.includes(url.protocol as (typeof ALLOWED_PROTOCOLS)[number])) {
    throw new AppError(
      EXTRACT_ERROR_CODES.DISALLOWED_URL,
      "Only http and https URLs are allowed",
      400
    );
  }
  const host = url.hostname;
  if (!host) {
    throwInvalidUrl("Missing hostname");
  }
  if (isBlockedHostname(host)) {
    throwDisallowedUrl("Blocked hostname");
  }
  return url;
}

/**
 * Resolves hostname via DNS and ensures no address is private or link-local.
 * Covers IPv4 (10/8, 127/8, 169.254/16, 172.16/12, 192.168/16) and
 * IPv6 (::1, fe80::/10, fd00::/8, fc00::/7).
 */
export async function resolveAndAssertPublicHost(hostname: string): Promise<void> {
  const [v4, v6] = await Promise.allSettled([
    dnsPromises.resolve4(hostname),
    dnsPromises.resolve6(hostname),
  ]);
  const ips: string[] = [];
  if (v4.status === "fulfilled") ips.push(...v4.value);
  if (v6.status === "fulfilled") ips.push(...v6.value);
  if (ips.length === 0) {
    const r = v4.status === "rejected" ? v4.reason : (v6.status === "rejected" ? v6.reason : null);
    const msg = r?.message ? `DNS resolution failed: ${r.message}` : "DNS resolution failed";
    throw new AppError(EXTRACT_ERROR_CODES.DNS_BLOCKED, msg, 400, { cause: r });
  }
  for (const ip of ips) {
    if (ip.includes(":")) {
      if (isBlockedIpv6(ip)) {
        throw new AppError(
          EXTRACT_ERROR_CODES.PRIVATE_IP_BLOCKED,
          `Blocked IPv6 address`,
          400
        );
      }
    } else if (isPrivateOrLinkLocalIp(ip)) {
      throw new AppError(
        EXTRACT_ERROR_CODES.PRIVATE_IP_BLOCKED,
        "Blocked private or link-local IP",
        400
      );
    }
  }
}

export interface FetchMetrics {
  duration_ms: number;
  html_bytes: number;
  content_type: string;
  http_status: number;
  final_url_host: string;
}

export interface SafeFetchHtmlResult {
  html: string;
  finalUrl: string;
  metrics: FetchMetrics;
}

export interface SafeFetchHtmlOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

/**
 * Fetches HTML from URL with SSRF protections: redirect cap, re-validation
 * per hop, timeout, and max response size. Returns { html, finalUrl, metrics }.
 */
export async function safeFetchHtml(
  url: URL,
  opts: SafeFetchHtmlOptions = {}
): Promise<SafeFetchHtmlResult> {
  const timeoutMs = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? MAX_RESPONSE_BYTES;
  const maxRedirects = opts.maxRedirects ?? MAX_REDIRECTS;

  let currentUrl: URL = url;
  let redirectCount = 0;
  const start = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    while (true) {
      await resolveAndAssertPublicHost(currentUrl.hostname);

      const res = await fetch(String(currentUrl), {
        headers: { "User-Agent": USER_AGENT },
        redirect: "manual",
        signal: controller.signal,
      });

      const httpStatus = res.status;
      const contentType = res.headers.get("content-type") ?? "";

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) {
          throw new AppError(
            EXTRACT_ERROR_CODES.FETCH_HTTP_ERROR,
            "Redirect without Location",
            400
          );
        }
        redirectCount += 1;
        if (redirectCount > maxRedirects) {
          throw new AppError(
            EXTRACT_ERROR_CODES.TOO_MANY_REDIRECTS,
            `More than ${maxRedirects} redirects`,
            400
          );
        }
        let next: URL;
        try {
          next = new URL(loc, currentUrl);
        } catch {
          throw new AppError(EXTRACT_ERROR_CODES.INVALID_URL, "Invalid redirect Location", 400);
        }
        assertSafeUrl(next.toString());
        currentUrl = next;
        continue;
      }

      if (!res.ok) {
        throw new AppError(
          EXTRACT_ERROR_CODES.FETCH_HTTP_ERROR,
          `HTTP ${res.status} ${res.statusText}`,
          res.status >= 500 ? 502 : 400
        );
      }

      if (!contentType.toLowerCase().includes("text/html")) {
        throw new AppError(
          EXTRACT_ERROR_CODES.FETCH_NON_HTML,
          "Response is not HTML",
          400,
          { details: { content_type: contentType } }
        );
      }

      const buf = await readWithLimit(res.body, maxBytes);
      clearTimeout(timeoutId);
      const duration_ms = Date.now() - start;
      const html = new TextDecoder().decode(buf);
      const finalUrl = currentUrl.toString();
      const final_url_host = currentUrl.hostname ?? "";

      return {
        html,
        finalUrl,
        metrics: {
          duration_ms,
          html_bytes: buf.length,
          content_type: contentType,
          http_status: httpStatus,
          final_url_host,
        },
      };
    }
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof AppError) throw e;
    if (e instanceof Error) {
      if (e.name === "AbortError") {
        throw new AppError(EXTRACT_ERROR_CODES.FETCH_TIMEOUT, "Fetch timed out", 408);
      }
      throw new AppError(EXTRACT_ERROR_CODES.FETCH_HTTP_ERROR, e.message, 400, { cause: e });
    }
    throw new AppError(EXTRACT_ERROR_CODES.FETCH_HTTP_ERROR, "Unknown fetch error", 400);
  }
}

async function readWithLimit(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number
): Promise<Uint8Array> {
  if (!body) throw new AppError(EXTRACT_ERROR_CODES.FETCH_HTTP_ERROR, "No response body", 400);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        reader.cancel();
        throw new AppError(
          EXTRACT_ERROR_CODES.FETCH_TOO_LARGE,
          `Response larger than ${maxBytes} bytes`,
          413
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}
