import { describe, it, expect } from "vitest";
import { EXTRACT_ERROR_CODES } from "@/lib/observability/errors";
import {
  isPrivateOrLinkLocalIp,
  assertSafeUrl,
  AppError,
} from "./ssrf";

describe("isPrivateOrLinkLocalIp", () => {
  it("returns true for 10/8", () => {
    expect(isPrivateOrLinkLocalIp("10.0.0.0")).toBe(true);
    expect(isPrivateOrLinkLocalIp("10.255.255.255")).toBe(true);
    expect(isPrivateOrLinkLocalIp("10.1.2.3")).toBe(true);
  });

  it("returns true for 127/8", () => {
    expect(isPrivateOrLinkLocalIp("127.0.0.1")).toBe(true);
    expect(isPrivateOrLinkLocalIp("127.255.255.255")).toBe(true);
  });

  it("returns true for 169.254/16 (link-local, metadata)", () => {
    expect(isPrivateOrLinkLocalIp("169.254.0.1")).toBe(true);
    expect(isPrivateOrLinkLocalIp("169.254.169.254")).toBe(true);
    expect(isPrivateOrLinkLocalIp("169.254.255.255")).toBe(true);
  });

  it("returns true for 172.16/12", () => {
    expect(isPrivateOrLinkLocalIp("172.16.0.0")).toBe(true);
    expect(isPrivateOrLinkLocalIp("172.31.255.255")).toBe(true);
    expect(isPrivateOrLinkLocalIp("172.20.1.1")).toBe(true);
  });

  it("returns false for 172.15 and 172.32", () => {
    expect(isPrivateOrLinkLocalIp("172.15.255.255")).toBe(false);
    expect(isPrivateOrLinkLocalIp("172.32.0.0")).toBe(false);
  });

  it("returns true for 192.168/16", () => {
    expect(isPrivateOrLinkLocalIp("192.168.0.0")).toBe(true);
    expect(isPrivateOrLinkLocalIp("192.168.255.255")).toBe(true);
    expect(isPrivateOrLinkLocalIp("192.168.1.1")).toBe(true);
  });

  it("returns false for public IPs", () => {
    expect(isPrivateOrLinkLocalIp("8.8.8.8")).toBe(false);
    expect(isPrivateOrLinkLocalIp("1.1.1.1")).toBe(false);
    expect(isPrivateOrLinkLocalIp("104.26.0.1")).toBe(false);
  });

  it("returns false for invalid strings", () => {
    expect(isPrivateOrLinkLocalIp("")).toBe(false);
    expect(isPrivateOrLinkLocalIp("256.1.1.1")).toBe(false);
    expect(isPrivateOrLinkLocalIp("1.2.3")).toBe(false);
    expect(isPrivateOrLinkLocalIp("1.2.3.4.5")).toBe(false);
  });
});

describe("assertSafeUrl", () => {
  it("returns URL for valid http/https", () => {
    const u1 = assertSafeUrl("https://example.com/path");
    expect(u1.protocol).toBe("https:");
    expect(u1.hostname).toBe("example.com");
    const u2 = assertSafeUrl("http://sub.example.com");
    expect(u2.protocol).toBe("http:");
    expect(u2.hostname).toBe("sub.example.com");
  });

  it("throws INVALID_URL for invalid URL", () => {
    expect(() => assertSafeUrl("not-a-url")).toThrow(AppError);
    try {
      assertSafeUrl("not-a-url");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe(EXTRACT_ERROR_CODES.INVALID_URL);
    }
  });

  it("throws DISALLOWED_URL for non-http(s)", () => {
    expect(() => assertSafeUrl("file:///etc/passwd")).toThrow(AppError);
    try {
      assertSafeUrl("file:///etc/passwd");
    } catch (e) {
      expect((e as AppError).code).toBe(EXTRACT_ERROR_CODES.DISALLOWED_URL);
    }
  });

  it("throws DISALLOWED_URL for localhost", () => {
    expect(() => assertSafeUrl("http://localhost/path")).toThrow(AppError);
    try {
      assertSafeUrl("http://localhost/path");
    } catch (e) {
      expect((e as AppError).code).toBe(EXTRACT_ERROR_CODES.DISALLOWED_URL);
    }
  });

  it("throws DISALLOWED_URL for *.localhost", () => {
    expect(() => assertSafeUrl("http://foo.localhost/")).toThrow(AppError);
    try {
      assertSafeUrl("https://evil.localhost");
    } catch (e) {
      expect((e as AppError).code).toBe(EXTRACT_ERROR_CODES.DISALLOWED_URL);
    }
  });
});

describe("redirect validation (assertSafeUrl on redirect targets)", () => {
  it("rejects redirect Location to blocked hostname same as direct request", () => {
    expect(() => assertSafeUrl("http://localhost/redirect-target")).toThrow(AppError);
    expect(() => assertSafeUrl("http://bar.localhost/")).toThrow(AppError);
  });
});
