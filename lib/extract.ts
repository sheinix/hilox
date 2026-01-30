import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { ExtractResponse } from "./validators";
import { assertSafeUrl, safeFetchHtml, type FetchMetrics } from "./security/ssrf";
import { AppError, EXTRACT_ERROR_CODES } from "./observability/errors";

const MIN_EXTRACT_LENGTH = 800;

/**
 * Parses HTML with JSDOM + Readability. Throws AppError if no article or content too short.
 */
export function extractFromHtml(html: string, finalUrl: string): ExtractResponse {
  // Suppress CSS parsing errors from jsdom to avoid polluting logs with huge CSS dumps
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("error", () => {
    // Silently ignore CSS parsing errors (common with complex stylesheets)
  });

  const dom = new JSDOM(html, { 
    url: finalUrl,
    virtualConsole 
  });
  const document = dom.window.document;
  const reader = new Readability(document, { charThreshold: 0 });
  const article = reader.parse();

  if (!article || !article.textContent || !article.textContent.trim()) {
    throw new AppError(
      EXTRACT_ERROR_CODES.READABILITY_EMPTY,
      "Could not extract article content from this page.",
      422
    );
  }

  const text = article.textContent.trim();
  if (text.length < MIN_EXTRACT_LENGTH) {
    throw new AppError(
      EXTRACT_ERROR_CODES.EXTRACT_TOO_SHORT,
      "Extracted content is too short. Try pasting the article text.",
      422,
      { details: { extracted_chars: text.length, min_required: MIN_EXTRACT_LENGTH } }
    );
  }

  const ogSite = document.querySelector("meta[property='og:site_name']");
  const hostname = new URL(finalUrl).hostname.replace(/^www\./, "");
  const siteName =
    article.siteName?.trim() ||
    (ogSite?.getAttribute("content")?.trim() || hostname);

  return {
    title: article.title?.trim() || "Untitled",
    siteName: siteName.trim(),
    byline: article.byline?.trim() || undefined,
    text,
    excerpt: article.excerpt?.trim() || undefined,
  };
}

export interface ExtractFromUrlMetrics extends FetchMetrics {
  extracted_chars: number;
}

export interface ExtractFromUrlResult {
  extracted: ExtractResponse;
  metrics: ExtractFromUrlMetrics;
}

/**
 * Fetches HTML via SSRF-safe fetch, then extracts with Readability.
 * Throws AppError on invalid/blocked URL, fetch failure, or insufficient content.
 */
export async function extractFromUrl(url: string): Promise<ExtractFromUrlResult> {
  const parsed = assertSafeUrl(url);
  const { html, finalUrl, metrics: fetchMetrics } = await safeFetchHtml(parsed);
  const extracted = extractFromHtml(html, finalUrl);

  const metrics: ExtractFromUrlMetrics = {
    ...fetchMetrics,
    extracted_chars: extracted.text.length,
  };

  return { extracted, metrics };
}

/**
 * Build extract from pasted plain text (no URL).
 */
export function extractFromPastedText(
  pastedText: string,
  options: { title?: string; siteName?: string } = {}
): ExtractResponse {
  const text = pastedText.trim();
  if (!text) {
    throw new AppError(
      EXTRACT_ERROR_CODES.EXTRACT_TOO_SHORT,
      "Pasted text is empty.",
      400
    );
  }
  return {
    title: options.title?.trim() || "Pasted article",
    siteName: options.siteName?.trim() || "Unknown",
    text,
    excerpt: text.slice(0, 300).trim() + (text.length > 300 ? "…" : ""),
  };
}
