import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { ExtractResponse } from "./validators";

const MIN_EXTRACT_LENGTH = 800;
const USER_AGENT =
  "Mozilla/5.0 (compatible; NewsToThread/1.0; +https://github.com/news-to-thread)";
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Fetches HTML from URL, parses with jsdom, runs Readability.
 * Returns extracted article or null if too short / failed.
 */
export async function extractFromUrl(url: string): Promise<ExtractResponse | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    return null;
  }

  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;
  const reader = new Readability(document, { charThreshold: 0 });
  const article = reader.parse();

  if (!article || !article.textContent || article.textContent.trim().length < MIN_EXTRACT_LENGTH) {
    return null;
  }

  const ogSite = dom.window.document.querySelector("meta[property='og:site_name']");
  const siteName =
    article.siteName?.trim() ||
    (ogSite?.getAttribute("content")?.trim() || new URL(url).hostname.replace(/^www\./, ""));

  return {
    title: article.title?.trim() || "Untitled",
    siteName: siteName.trim(),
    byline: article.byline?.trim() || undefined,
    text: article.textContent.trim(),
    excerpt: article.excerpt?.trim() || undefined,
  };
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
    throw new Error("Pasted text is empty");
  }
  return {
    title: options.title?.trim() || "Pasted article",
    siteName: options.siteName?.trim() || "Unknown",
    text,
    excerpt: text.slice(0, 300).trim() + (text.length > 300 ? "…" : ""),
  };
}
