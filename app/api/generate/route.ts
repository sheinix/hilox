import { NextResponse } from "next/server";
import { generateRequestSchema, generateResponseSchema } from "@/lib/validators";
import { extractFromUrl, extractFromPastedText } from "@/lib/extract";
import { createOpenAIClient, requestOutline, requestRender } from "@/lib/openai";
import {
  getClientIp,
  enforceRateLimits,
  recordFailure,
  clearFailures,
  RateLimitError,
} from "@/lib/security/rateLimit";
import { clampExtractedText } from "@/lib/cost/guards";
import { AppError, toAppError } from "@/lib/observability/errors";
import {
  logInfo,
  logWarn,
  logError,
  normalizeUrlForLogs,
  hashIp,
} from "@/lib/observability/logger";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";

function requestId(): string {
  return crypto.randomUUID();
}

async function respondWithFailure(
  request_id: string,
  ip: string,
  code: string,
  message: string,
  status: number,
  recordFail: boolean
): Promise<NextResponse> {
  if (recordFail) await recordFailure(ip);
  return NextResponse.json({ error: { code, message, request_id } }, { status });
}

export async function POST(request: Request) {
  const request_id = requestId();
  const ip = getClientIp(request);
  const ctx = { request_id };

  logInfo("request_received", ctx, { ip_hash: hashIp(ip) });

  try {
    await enforceRateLimits(ip);
  } catch (e) {
    if (e instanceof RateLimitError) {
      logWarn("rate_limited", ctx, {
        ip_hash: hashIp(ip),
        limit_type: e.code,
      });
      return NextResponse.json(
        { error: { code: e.code, message: e.message, request_id } },
        { status: 429 }
      );
    }
    throw e;
  }

  const start = Date.now();
  let model: string | undefined;
  let extractionMetrics: {
    duration_ms?: number;
    html_bytes?: number;
    extracted_chars?: number;
    content_type?: string;
    http_status?: number;
    final_url_host?: string;
  } | undefined;

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
      const urlNorm = normalizeUrlForLogs(url);
      logInfo("extraction_started", ctx, { url_host: urlNorm.host, url_path: urlNorm.path });

      const { extracted, metrics } = await extractFromUrl(url);
      extractionMetrics = {
        duration_ms: metrics.duration_ms,
        html_bytes: metrics.html_bytes,
        extracted_chars: metrics.extracted_chars,
        content_type: metrics.content_type,
        http_status: metrics.http_status,
        final_url_host: metrics.final_url_host,
      };

      logInfo("extraction_success", ctx, {
        url_host: urlNorm.host,
        final_url_host: metrics.final_url_host,
        duration_ms: metrics.duration_ms,
        html_bytes: metrics.html_bytes,
        extracted_chars: metrics.extracted_chars,
      });

      title = extracted.title;
      siteName = extracted.siteName;
      text = extracted.text;
      urlUsed = url;
    } else {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Provide url or pastedText.", request_id } },
        { status: 400 }
      );
    }

    const clamped = clampExtractedText(text);
    model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    logInfo("openai_started", ctx, { model });

    const client = createOpenAIClient();
    const angleOpt = typeof angle === "string" ? angle.trim() || undefined : undefined;
    const langOpt = typeof threadLanguage === "string" ? threadLanguage : undefined;
    const outlineResult = await requestOutline(client, clamped, tone, length, angleOpt, langOpt);
    const tweets = await requestRender(client, outlineResult.tweets, tone, angleOpt, langOpt);

    const duration_ms = Date.now() - start;
    logInfo("openai_success", ctx, { model, duration_ms });

    await clearFailures(ip);

    const createdAt = new Date().toISOString();
    const meta = { title, siteName, url: urlUsed, tone, length, createdAt };
    const sources = { title, url: urlUsed, siteName };
    const payload = {
      tweets,
      meta,
      sources,
      debug: {
        extractedCharCount: clamped.length,
        model,
      },
    };

    const validated = generateResponseSchema.parse(payload);
    return NextResponse.json({ ...validated, request_id });
  } catch (e) {
    const duration_ms = Date.now() - start;
    const err = toAppError(e);

    let urlNorm: { host: string; path: string } | undefined;
    try {
      const b = (await request.clone().json()) as { url?: string };
      urlNorm = typeof b?.url === "string" ? normalizeUrlForLogs(b.url) : undefined;
    } catch {
      urlNorm = undefined;
    }

    const stage = err.code.startsWith("OPENAI") ? "openai" : "extraction";
    const eventName = stage === "openai" ? "openai_failed" : "extraction_failed";
    logError(eventName, ctx, {
      error_code: err.code,
      duration_ms,
      ...(urlNorm && { url_host: urlNorm.host, url_path: urlNorm.path }),
      ...(extractionMetrics && {
        http_status: extractionMetrics.http_status,
        content_type: extractionMetrics.content_type,
        html_bytes: extractionMetrics.html_bytes,
        extracted_chars: extractionMetrics.extracted_chars,
        final_url_host: extractionMetrics.final_url_host,
      }),
    });

    Sentry.withScope((scope) => {
      scope.setTag("error_code", err.code);
      scope.setTag("stage", stage);
      if (urlNorm) scope.setTag("url_host", urlNorm.host);
      if (extractionMetrics?.final_url_host)
        scope.setTag("final_url_host", extractionMetrics.final_url_host);
      if (model) scope.setTag("model", model);
      scope.setExtra("request_id", request_id);
      scope.setExtra("duration_ms", duration_ms);
      if (extractionMetrics) {
        scope.setExtra("http_status", extractionMetrics.http_status);
        scope.setExtra("content_type", extractionMetrics.content_type);
        scope.setExtra("html_bytes", extractionMetrics.html_bytes);
        scope.setExtra("extracted_chars", extractionMetrics.extracted_chars);
      }
      scope.setUser({ id: undefined, ip_address: undefined });
      Sentry.captureException(e instanceof Error ? e : new Error(String(e)));
    });

    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: e.errors.map((x) => x.message).join("; "),
            request_id,
          },
        },
        { status: 400 }
      );
    }

    if (e instanceof RateLimitError) {
      return NextResponse.json(
        { error: { code: e.code, message: e.message, request_id } },
        { status: 429 }
      );
    }

    return respondWithFailure(
      request_id,
      ip,
      err.code,
      err.safeMessage,
      err.httpStatus,
      true
    );
  }
}
