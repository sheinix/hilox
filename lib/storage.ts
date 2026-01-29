import type { GenerateResponse } from "./validators";

const STORAGE_KEY = "news-to-thread-history";
const MAX_ITEMS = 10;

export interface HistoryItem {
  id: string;
  meta: GenerateResponse["meta"];
  tweets: string[];
  sources: GenerateResponse["sources"];
  createdAt: string;
}

/**
 * Client-only: read last N generations from localStorage.
 */
export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ITEMS) as HistoryItem[];
  } catch {
    return [];
  }
}

/**
 * Client-only: prepend one result and keep at most MAX_ITEMS.
 */
export function pushHistory(item: Omit<HistoryItem, "id">): void {
  if (typeof window === "undefined") return;
  const list = getHistory();
  const withId: HistoryItem = {
    ...item,
    id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };
  const next = [withId, ...list].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota or disabled storage
  }
}

/**
 * Client-only: clear history.
 */
export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
