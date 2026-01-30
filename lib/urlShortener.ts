/**
 * Shortens a URL using a free URL shortening service.
 * Falls back to original URL if shortening fails.
 * 
 * Tries multiple services in order:
 * 1. is.gd (stable, been around for years)
 * 2. shorten.ly (backup)
 * 
 * Note: Failures are expected and handled gracefully (network issues, service down, etc.)
 * so we don't pollute logs with stack traces.
 */
export async function shortenUrl(url: string): Promise<string> {
  if (!url || typeof url !== "string") return url;

  // Try is.gd first (most reliable)
  try {
    const response = await fetch(
      `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`,
      {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(5000), // 5s timeout
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json() as {
      shorturl?: string;
      errormessage?: string;
    };

    if (data.shorturl) {
      return data.shorturl;
    }

    if (data.errormessage) {
      throw new Error(data.errormessage);
    }
  } catch (error) {
    // Try fallback service
    try {
      const response = await fetch(
        `https://shorten.ly/api.php?url=${encodeURIComponent(url)}`,
        {
          method: "GET",
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as {
        success?: number;
        short_url?: string;
      };

      if (data.success === 200 && data.short_url) {
        return data.short_url;
      }
    } catch (fallbackError) {
      // Both services failed, log concisely and return original
      if (error instanceof Error) {
        const errorMsg = error.message.includes("fetch failed") 
          ? "Network error" 
          : error.message;
        console.warn(`[URL Shortener] ${errorMsg} - using original URL`);
      }
    }
  }

  // Fallback to original URL
  return url;
}
