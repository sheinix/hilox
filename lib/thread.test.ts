import { describe, it, expect } from "vitest";
import {
  enforceCharLimit,
  enforceCharLimitBatch,
  tweetCharCount,
} from "./thread";

describe("enforceCharLimit", () => {
  it("returns string unchanged when <= 280 chars", () => {
    const short = "Hello world";
    expect(enforceCharLimit(short)).toBe(short);
    expect(enforceCharLimit(short, 280).length).toBeLessThanOrEqual(280);
  });

  it("truncates at word boundary when over limit", () => {
    const long =
      "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur";
    const result = enforceCharLimit(long, 280);
    expect(result.length).toBeLessThanOrEqual(280);
    expect(result.endsWith("…")).toBe(true);
  });

  it("uses custom maxChars", () => {
    const text = "Hello world";
    // maxChars 5 => 4 chars + "…" = 5 total
    expect(enforceCharLimit(text, 5)).toBe("Hell…");
    expect(enforceCharLimit("Hi", 5)).toBe("Hi");
  });

  it("trims input", () => {
    expect(enforceCharLimit("  abc  ", 10)).toBe("abc");
  });
});

describe("enforceCharLimitBatch", () => {
  it("applies limit to each tweet", () => {
    const tweets = ["Short", "A".repeat(300), "Medium length"];
    const result = enforceCharLimitBatch(tweets, 280);
    expect(result[0]).toBe("Short");
    expect(result[1].length).toBeLessThanOrEqual(280);
    expect(result[2]).toBe("Medium length");
  });

  it("returns empty array for empty input", () => {
    expect(enforceCharLimitBatch([])).toEqual([]);
  });
});

describe("tweetCharCount", () => {
  it("returns string length", () => {
    expect(tweetCharCount("")).toBe(0);
    expect(tweetCharCount("Hello")).toBe(5);
    expect(tweetCharCount("Hello world")).toBe(11);
  });
});
