import { NextResponse } from "next/server";
import { Resend } from "resend";
import { betaRequestSchema } from "@/lib/validators";

const resendApiKey = process.env.RESEND_API_KEY;
const betaNotifyEmail = process.env.BETA_NOTIFY_EMAIL;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = betaRequestSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid request.";
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message } },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  if (!resendApiKey || !betaNotifyEmail) {
    // In dev or if not configured: still return success to avoid leaking config
    // if (process.env.NODE_ENV === "development") {
      // console.info("[beta] Signup (no Resend):", email);
      // return NextResponse.json({ success: true });
    // }
    return NextResponse.json(
      { error: { code: "CONFIG_ERROR", message: "Beta signup is not configured." } },
      { status: 503 }
    );
  }

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "Hilox Beta <onboarding@resend.dev>",
      to: betaNotifyEmail,
      replyTo: email,
      subject: `[Hilox Beta] New signup: ${email}`,
      text: `New beta signup:\n\nEmail: ${email}\n\nReply to this email to contact the user.`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[beta] Resend error:", err);
    return NextResponse.json(
      { error: { code: "SEND_FAILED", message: "Could not submit. Try again later." } },
      { status: 500 }
    );
  }
}
