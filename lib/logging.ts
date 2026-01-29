/**
 * Minimal server-side logging for extraction failures. Never log secrets (e.g. API keys).
 */

export interface ExtractFailureLog {
  code: string;
  message: string;
  url?: string;
  /** Extra context when available (e.g. "1234 chars", "HTTP 404"). */
  detail?: string;
}

export function logExtractFailure(payload: ExtractFailureLog): void {
  const { code, message, url, detail } = payload;
  const parts = [`[extract] ${code}: ${message}`];
  if (detail) parts.push(`(${detail})`);
  if (url) parts.push(`url=${url}`);
  console.error(parts.join(" "));
}
