/**
 * Application errors with stable codes and safe messages for API responses.
 */

/** Stable error codes for extraction and fetch. */
export const EXTRACT_ERROR_CODES = {
  INVALID_URL: "INVALID_URL",
  DISALLOWED_URL: "DISALLOWED_URL",
  DNS_BLOCKED: "DNS_BLOCKED",
  PRIVATE_IP_BLOCKED: "PRIVATE_IP_BLOCKED",
  FETCH_TIMEOUT: "FETCH_TIMEOUT",
  FETCH_TOO_LARGE: "FETCH_TOO_LARGE",
  FETCH_NON_HTML: "FETCH_NON_HTML",
  FETCH_HTTP_ERROR: "FETCH_HTTP_ERROR",
  TOO_MANY_REDIRECTS: "TOO_MANY_REDIRECTS",
  READABILITY_EMPTY: "READABILITY_EMPTY",
  EXTRACT_TOO_SHORT: "EXTRACT_TOO_SHORT",
} as const;

/** Stable error codes for OpenAI. */
export const OPENAI_ERROR_CODES = {
  OPENAI_MISSING_KEY: "OPENAI_MISSING_KEY",
  OPENAI_RATE_LIMIT: "OPENAI_RATE_LIMIT",
  OPENAI_BAD_RESPONSE: "OPENAI_BAD_RESPONSE",
  OPENAI_ERROR: "OPENAI_ERROR",
} as const;

export type ExtractErrorCode = (typeof EXTRACT_ERROR_CODES)[keyof typeof EXTRACT_ERROR_CODES];
export type OpenAiErrorCode = (typeof OPENAI_ERROR_CODES)[keyof typeof OPENAI_ERROR_CODES];
export type AppErrorCode = ExtractErrorCode | OpenAiErrorCode | string;

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly safeMessage: string,
    public readonly httpStatus: number,
    options?: {
      details?: Record<string, unknown>;
      cause?: unknown;
    }
  ) {
    super(safeMessage);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
    if (options?.details) this.details = options.details;
    if (options?.cause !== undefined) this.cause = options.cause;
  }

  details?: Record<string, unknown>;
  override cause?: unknown;
}

/**
 * Converts unknown errors (including SsrfError, RateLimitError, etc.) to AppError with stable codes.
 */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const errObj = err instanceof Error ? err : new Error(String(err));
  const msg = errObj.message;

  // SsrfError-style codes (if still thrown from legacy paths)
  if (msg.includes("SSRF_") || (err as { code?: string }).code?.startsWith?.("SSRF_")) {
    const code = (err as { code: string }).code;
    const mapping: Record<string, { code: AppErrorCode; status: number }> = {
      SSRF_INVALID_URL: { code: EXTRACT_ERROR_CODES.INVALID_URL, status: 400 },
      SSRF_UNSUPPORTED_PROTOCOL: { code: EXTRACT_ERROR_CODES.DISALLOWED_URL, status: 400 },
      SSRF_BLOCKED_HOSTNAME: { code: EXTRACT_ERROR_CODES.DISALLOWED_URL, status: 400 },
      SSRF_PRIVATE_OR_LINKLOCAL_IP: { code: EXTRACT_ERROR_CODES.PRIVATE_IP_BLOCKED, status: 400 },
      SSRF_TOO_MANY_REDIRECTS: { code: EXTRACT_ERROR_CODES.TOO_MANY_REDIRECTS, status: 400 },
      SSRF_FETCH_TIMEOUT: { code: EXTRACT_ERROR_CODES.FETCH_TIMEOUT, status: 408 },
      SSRF_RESPONSE_TOO_LARGE: { code: EXTRACT_ERROR_CODES.FETCH_TOO_LARGE, status: 413 },
      SSRF_FETCH_FAILED: { code: EXTRACT_ERROR_CODES.FETCH_HTTP_ERROR, status: 400 },
    };
    const mapped = mapping[code] ?? { code: EXTRACT_ERROR_CODES.FETCH_HTTP_ERROR, status: 400 };
    return new AppError(mapped.code as string, safeMessageFor(code, msg), mapped.status, {
      cause: err,
    });
  }

  // Rate limit (do not wrap; preserve code/message)
  if ((err as { name?: string }).name === "RateLimitError") {
    const code = (err as { code: string }).code ?? "RATE_LIMIT";
    const safeMsg = (err as Error).message || "Too many requests.";
    return new AppError(code, safeMsg, 429, { cause: err });
  }

  // OpenAI
  if (msg.includes("OPENAI_API_KEY") || msg.includes("not set") || msg.includes("API key")) {
    return new AppError(
      OPENAI_ERROR_CODES.OPENAI_MISSING_KEY,
      "OpenAI API key not configured.",
      500,
      { cause: err }
    );
  }
  if (msg.includes("rate limit") || msg.includes("429")) {
    return new AppError(
      OPENAI_ERROR_CODES.OPENAI_RATE_LIMIT,
      "OpenAI rate limit. Try again shortly.",
      429,
      { cause: err }
    );
  }
  if (
    msg.includes("Empty response") ||
    msg.includes("Invalid outline") ||
    msg.includes("Invalid render") ||
    msg.includes("tweets array")
  ) {
    return new AppError(
      OPENAI_ERROR_CODES.OPENAI_BAD_RESPONSE,
      "Invalid response from OpenAI. Please try again.",
      502,
      { cause: err }
    );
  }
  if (err instanceof Error && err.name?.toLowerCase().includes("openai")) {
    return new AppError(
      OPENAI_ERROR_CODES.OPENAI_ERROR,
      "OpenAI request failed. Please try again.",
      502,
      { cause: err }
    );
  }

  // Generic
  const safeMsg = err instanceof Error ? (err.message.length > 200 ? "An error occurred." : err.message) : "An error occurred.";
  return new AppError("SERVER_ERROR", safeMsg, 500, { cause: err });
}

function safeMessageFor(ssrfCode: string, rawMessage: string): string {
  const safe: Record<string, string> = {
    SSRF_INVALID_URL: "Invalid URL.",
    SSRF_UNSUPPORTED_PROTOCOL: "Only http and https URLs are allowed.",
    SSRF_BLOCKED_HOSTNAME: "This URL is not allowed.",
    SSRF_PRIVATE_OR_LINKLOCAL_IP: "This URL points to a private or blocked address.",
    SSRF_TOO_MANY_REDIRECTS: "Too many redirects.",
    SSRF_FETCH_TIMEOUT: "Request timed out.",
    SSRF_RESPONSE_TOO_LARGE: "Response too large.",
    SSRF_FETCH_FAILED: "Could not fetch the URL. Check the link or try pasting the article.",
  };
  return safe[ssrfCode] ?? "Could not fetch the URL. Try pasting the article text.";
}
