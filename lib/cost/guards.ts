import { DEFAULT_MAX_OUTPUT_TOKENS, MAX_EXTRACTED_CHARS } from "./constants";

/**
 * Clamps extracted article text to MAX_EXTRACTED_CHARS. Cuts at character boundary.
 */
export function clampExtractedText(text: string): string {
  if (text.length <= MAX_EXTRACTED_CHARS) return text;
  return text.slice(0, MAX_EXTRACTED_CHARS);
}

/**
 * Max output tokens for OpenAI requests. Env OVERRIDE_MAX_OUTPUT_TOKENS overrides default.
 */
export function getMaxOutputTokens(): number {
  const raw = process.env.OVERRIDE_MAX_OUTPUT_TOKENS;
  if (raw == null || raw === "") return DEFAULT_MAX_OUTPUT_TOKENS;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1 || n > 4096) return DEFAULT_MAX_OUTPUT_TOKENS;
  return n;
}

export { MAX_EXTRACTED_CHARS, DEFAULT_MAX_OUTPUT_TOKENS };
