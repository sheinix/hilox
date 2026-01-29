/**
 * Cost-guard constants. Adjust here without touching business logic.
 */

/** Max characters from extracted article text passed to OpenAI. */
export const MAX_EXTRACTED_CHARS = 20_000;

/** Default max tokens for OpenAI completion output (outline + render). */
export const DEFAULT_MAX_OUTPUT_TOKENS = 900;
