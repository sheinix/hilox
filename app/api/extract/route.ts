import { NextResponse } from "next/server";
import { extractFromUrl } from "@/lib/extract";
import { extractResponseSchema } from "@/lib/validators";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = bodySchema.parse(body);
    const result = await extractFromUrl(url);
    if (!result) {
      return NextResponse.json(
        { error: { code: "EXTRACT_FAILED", message: "Could not extract article or content too short." } },
        { status: 422 }
      );
    }
    const validated = extractResponseSchema.parse(result);
    return NextResponse.json(validated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: e.errors.map((x) => x.message).join("; ") } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: e instanceof Error ? e.message : "Extract failed." } },
      { status: 500 }
    );
  }
}
