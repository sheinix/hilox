import { NextResponse } from "next/server";
import { extractFromUrl } from "@/lib/extract";
import { extractResponseSchema } from "@/lib/validators";
import { toAppError } from "@/lib/observability/errors";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.parse(body);
    const url = parsed.url;
    const { extracted } = await extractFromUrl(url);
    const validated = extractResponseSchema.parse(extracted);
    return NextResponse.json(validated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: e.errors.map((x) => x.message).join("; ") } },
        { status: 400 }
      );
    }
    const err = toAppError(e);
    return NextResponse.json(
      { error: { code: err.code, message: err.safeMessage } },
      { status: err.httpStatus }
    );
  }
}
