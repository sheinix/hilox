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
        content: `You are an expert editor and copyrighter strategist who turns a single news article into a high-performing X (Twitter) thread plan.

        GOAL
        Create an outline that maximizes meaningful engagement (replies, quote tweets, shares, follows) WITHOUT spam tactics.

        SIGNATURE STYLE GUIDELINES (Justin Welsh-inspired mechanics)
        - Short sentences. One line per thought.
        - Use intentional line breaks for rhythm (use spacing to create pauses).
        - Start with a hook or a question.
        - End with impact or a soft CTA question that invites replies.
        
        OUTPUT RULES (STRICT)
        - Output valid JSON only (no markdown, no code fences).
        - ${countInstruction}
        - Each item MUST be: { "topic": "short label", "bullets": ["...", "..."] }.
        - The outline must map 1:1 to final tweets (Tweet 1 = first item, etc).
        
        FACTUALITY (STRICT)
        - Base the outline ONLY on the provided article text.
        - Do NOT invent facts, numbers, quotes, names, or timelines.
        - If an important detail is missing, write "unclear" or "not confirmed" in a bullet.
        
        STRUCTURE REQUIREMENTS (ENGAGEMENT-AWARE)
        - Tweet 1: Hook (curiosity + specificity, not clickbait).
        - Tweet 2: Cold-reader context (1 sentence: who/what/why; define acronyms once).
        - Include EXACTLY ONE tweet whose main point is a tradeoff: "benefit vs risk" or "pro vs con" (label it in topic or bullets as "TRADEOFF").
        - Include EXACTLY ONE tweet whose main point is an open question (NOT the last tweet). Label as "OPEN QUESTION".
        - Mid-thread: "why it matters" + 1 second-order implication.
        - Last tweet: CTA question that invites replies (specific, easy to answer; prefer A/B choice or a clear decision prompt).
        - Avoid engagement bait: no "like/RT/follow", no "thread 🧵" clichés.
        - No hashtags, no @mentions.
        
        STYLE
        - One idea per tweet. Clear, crisp, specific.
        - Tone: ${tone}.${angleLine}${languageLine}${linkLine}
        
        QUALITY BAR
        - Avoid generic lines like "this is important"—state WHY with a concrete implication.
        - Prefer frameworks or contrasts people can quote tweet (e.g., "If you're bullish, you believe X. If bearish, you believe Y.").`,
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
First tweet: hook. Last tweet: CTA (question or call to action).

SIGNATURE STYLE — LINE BREAKS (STRICT)
- When a tweet starts with a hook, question, or short opener, you MUST insert a single blank line (exactly one line break) between that opener and the rest of the tweet.
- Format: "[hook or question]\\n\\n[main content]" — the opener on the first line, a blank line, then the body on the next line.
- Example (Spanish): "¿Sabías que puedes beneficiarte de tus conocimientos? 🤔\\n\\nPolymarket te permite apostar y ganar mientras te mantienes informado. 💰"
- Example (English): "Did you know prediction markets beat polls? 🥇\\n\\nThey help you make informed decisions about the future. ⏳"
- If the tweet is a single short thought with no natural opener/body split, no blank line is required.`,
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
