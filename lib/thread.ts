const MAX_TWEET_CHARS = 280;
const ELLIPSIS = "…";

/**
 * Enforces ≤280 chars per tweet. Prefer shortening at word boundary; else truncate with ellipsis.
 */
export function enforceCharLimit(tweet: string, maxChars: number = MAX_TWEET_CHARS): string {
  const t = tweet.trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars - ELLIPSIS.length);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.6) {
    return cut.slice(0, lastSpace).trimEnd() + ELLIPSIS;
  }
  return cut.trimEnd() + ELLIPSIS;
}

/**
 * Apply char limit to each tweet in array. Returns new array.
 */
export function enforceCharLimitBatch(tweets: string[], maxChars: number = MAX_TWEET_CHARS): string[] {
  return tweets.map((t) => enforceCharLimit(t, maxChars));
}

/**
 * Character count for display (after enforcement).
 */
export function tweetCharCount(tweet: string): number {
  return tweet.length;
}

/**
 * Build system prompt for outline stage: 7–10 tweets plan from article text only.
 */
export function buildOutlineSystemPrompt(tone: string, length: string): string {
  const num = parseInt(length, 10);
  return `You are an expert at turning news articles into engaging X (Twitter) threads.
Style inspiration: punchy hooks, clear value, like Justin Welsh or similar thought leaders. Use emojis sparingly to highlight key points.

Output a JSON object with a single key "tweets", an array of exactly ${num} items.
Each item: { "topic": "short topic label", "bullets": ["point 1", "point 2", ...] }.
Base the outline ONLY on the provided article text. Do not invent facts, numbers, or quotes. If something is not in the text, note "not confirmed" in the bullet.
Tone: ${tone}.
First tweet should be a hook. Last tweet should be a CTA (question or call to action).`;
}

/**
 * Build system prompt for render stage: outline → final tweets ≤280 chars each.
 */
export function buildRenderSystemPrompt(tone: string): string {
  return `You are an expert at writing X (Twitter) thread copy.
Style: punchy, scroll-stopping. Inspired by Justin Welsh: clear hooks, one idea per tweet, emojis to highlight when helpful.

Convert the outline into final tweet copy.
Rules:
- Each tweet MUST be at most 280 characters (strict).
- No invented facts, numbers, or quotes. If not in the source, say "not confirmed" or rephrase generally.
- Output a JSON object with a single key "tweets": array of strings, one per tweet, in order.
- First tweet: hook. Last tweet: CTA (question or call to action).
- Tone: ${tone}.`;
}
