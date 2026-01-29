import { NextResponse } from "next/server";
import { generateRequestSchema, generateResponseSchema } from "@/lib/validators";
import { extractFromUrl, extractFromPastedText } from "@/lib/extract";
import { createOpenAIClient, requestOutline, requestRender } from "@/lib/openai";
import { z } from "zod";

export const runtime = "nodejs";

// Minimal in-memory rate limit: 20 req/min per IP (MVP)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const ipCounts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry) {
    ipCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (now >= entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Too many requests. Try again in a minute." } },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = generateRequestSchema.parse(body);
    const { url, pastedText, tone, length, angle, threadLanguage } = parsed;

    let title: string;
    let siteName: string;
    let text: string;
    let urlUsed: string | undefined;

    if (pastedText?.trim()) {
      const extracted = extractFromPastedText(pastedText.trim());
      title = extracted.title;
      siteName = extracted.siteName;
      text = extracted.text;
    } else if (url) {
      const extracted = await extractFromUrl(url);
      if (!extracted || extracted.text.length < 800) {
        return NextResponse.json(
          {
            error: {
              code: "EXTRACT_FAILED",
              message: "Could not extract enough content from URL. Try pasting the article text.",
            },
          },
          { status: 422 }
        );
      }
      title = extracted.title;
      siteName = extracted.siteName;
      text = extracted.text;
      urlUsed = url;
    } else {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Provide url or pastedText." } },
        { status: 400 }
      );
    }

    const client = createOpenAIClient();
    const angleOpt = typeof angle === "string" ? angle.trim() || undefined : undefined;
    const langOpt = typeof threadLanguage === "string" ? threadLanguage : undefined;
    const outlineResult = await requestOutline(client, text, tone, length, angleOpt, langOpt);
    const tweets = await requestRender(client, outlineResult.tweets, tone, angleOpt, langOpt);

    const createdAt = new Date().toISOString();
    const meta = {
      title,
      siteName,
      url: urlUsed,
      tone,
      length,
      createdAt,
    };
    const sources = { title, url: urlUsed, siteName };
    const payload = {
      tweets,
      meta,
      sources,
      debug: { extractedCharCount: text.length, model: process.env.OPENAI_MODEL ?? "gpt-4o-mini" },
    };

    const validated = generateResponseSchema.parse(payload);
    return NextResponse.json(validated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: e.errors.map((x) => x.message).join("; ") } },
        { status: 400 }
      );
    }
    if (e instanceof Error) {
      if (e.message.includes("OPENAI_API_KEY")) {
        return NextResponse.json(
          { error: { code: "CONFIG_ERROR", message: "OpenAI API key not configured." } },
          { status: 500 }
        );
      }
      if (e.message.includes("rate limit") || e.message.includes("429")) {
        return NextResponse.json(
          { error: { code: "RATE_LIMIT", message: "OpenAI rate limit. Try again shortly." } },
          { status: 429 }
        );
      }
    }
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Generation failed." } },
      { status: 500 }
    );
  }
}
