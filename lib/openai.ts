import OpenAI from "openai";
import { threadOutlineSchema, getMaxPostsForLength } from "./validators";
import { enforceCharLimitBatch } from "./thread";
import { getMaxOutputTokens } from "./cost/guards";

const DEFAULT_MODEL = "gpt-4o-mini";

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key || typeof key !== "string" || key.length === 0) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return key;
}

function getModel(): string {
  return process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
}

export function createOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: getApiKey() });
}

/**
 * Request outline (JSON plan) for the thread from article text.
 */
export async function requestOutline(
  client: OpenAI,
  articleText: string,
  tone: string,
  length: string,
  angle?: string,
  threadLanguage?: string,
  includeOriginalLink?: boolean,
  originalUrl?: string
): Promise<{ tweets: { topic: string; bullets: string[] }[] }> {
  const model = getModel();
  const maxTokens = getMaxOutputTokens();
  const angleLine = angle ? `\nOptional angle/focus: ${angle}.` : "";
  const languageLine =
    threadLanguage && threadLanguage !== "English"
      ? `\nWrite the entire thread in ${threadLanguage}. Keep the same structure (hook, points, CTA).`
      : "";
  const linkLine =
    includeOriginalLink && originalUrl
      ? `\nIMPORTANT: Include this exact shortened link in the last tweet (CTA): ${originalUrl}\nDo NOT modify or shorten this URL further. Include it exactly as provided. Ensure the final tweet with the link stays under 280 characters.`
      : "";

  const maxPosts = getMaxPostsForLength(length);
  const countInstruction =
    length === "10+"
      ? `Output a JSON object with a single key "tweets", an array of 10 to 15 items (choose the right number for the content).`
      : `Output a JSON object with a single key "tweets", an array of exactly ${maxPosts} items.`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are an expert at turning news articles into engaging X (Twitter) threads.
Style inspiration: punchy hooks, clear value, like Justin Welsh or similar thought leaders. Use emojis sparingly to highlight key points.

Output valid JSON only. No markdown code fences.
${countInstruction}
Each item: { "topic": "short topic label", "bullets": ["point 1", "point 2", ...] }.
Base the outline ONLY on the provided article text. Do not invent facts, numbers, or quotes. If something is not in the text, note "not confirmed" in the bullet.
Tone: ${tone}.
First tweet should be a hook. Last tweet should be a CTA (question or call to action).${angleLine}${languageLine}${linkLine}`,
      },
      {
        role: "user",
        content: `Article text (use only this for the outline):\n\n${articleText}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: maxTokens,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(raw) as unknown;
  const result = threadOutlineSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Invalid outline shape: " + result.error.message);
  }

  return { tweets: result.data.tweets };
}

/**
 * Request final tweet strings from outline.
 */
export async function requestRender(
  client: OpenAI,
  outline: { topic: string; bullets: string[] }[],
  tone: string,
  angle?: string,
  threadLanguage?: string,
  includeOriginalLink?: boolean,
  originalUrl?: string
): Promise<string[]> {
  const model = getModel();
  const maxTokens = getMaxOutputTokens();
  const angleLine = angle ? ` Optional angle: ${angle}.` : "";
  const languageLine =
    threadLanguage && threadLanguage !== "English"
      ? ` Write the entire thread in ${threadLanguage}.`
      : "";
  const linkLine =
    includeOriginalLink && originalUrl
      ? `\nIMPORTANT: Include this exact shortened link in the last tweet (CTA): ${originalUrl}\nDo NOT modify or shorten this URL further. Include it exactly as provided. Ensure the final tweet with the link stays under 280 characters.`
      : "";

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are an expert at writing X (Twitter) thread copy.
Style: punchy, scroll-stopping. Inspired by Justin Welsh: clear hooks, one idea per tweet, emojis to highlight when helpful.

Convert the outline into final tweet copy.
Output valid JSON only. No markdown code fences.
Output a JSON object with a single key "tweets": array of strings, one per tweet, in order.
Each tweet MUST be at most 280 characters.
No invented facts, numbers, or quotes. Tone: ${tone}.${angleLine}${languageLine}${linkLine}
First tweet: hook. Last tweet: CTA (question or call to action).`,
      },
      {
        role: "user",
        content: `Outline:\n${JSON.stringify(outline, null, 2)}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: maxTokens,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(raw) as { tweets?: unknown };
  if (!Array.isArray(parsed.tweets)) {
    throw new Error("Invalid render response: tweets array expected");
  }

  const tweets = (parsed.tweets as string[]).map((t) => (typeof t === "string" ? t : String(t)).trim());
  return enforceCharLimitBatch(tweets);
}
