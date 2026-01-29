import { describe, it, expect } from "vitest";
import {
  clampExtractedText,
  MAX_EXTRACTED_CHARS,
} from "./guards";

describe("clampExtractedText", () => {
  it("returns text unchanged when within limit", () => {
    const short = "Short article.";
    expect(clampExtractedText(short)).toBe(short);
    const atLimit = "x".repeat(MAX_EXTRACTED_CHARS);
    expect(clampExtractedText(atLimit)).toBe(atLimit);
  });

  it("truncates to MAX_EXTRACTED_CHARS when over limit", () => {
    const long = "a".repeat(MAX_EXTRACTED_CHARS + 1000);
    const result = clampExtractedText(long);
    expect(result.length).toBe(MAX_EXTRACTED_CHARS);
    expect(result).toBe("a".repeat(MAX_EXTRACTED_CHARS));
  });

  it("handles empty string", () => {
    expect(clampExtractedText("")).toBe("");
  });
});
