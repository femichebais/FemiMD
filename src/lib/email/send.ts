import { Resend } from "resend";

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// Single entry point for transactional email. Soft-fails when RESEND_API_KEY
// isn't configured so local bring-up doesn't 500; callers can fall back to
// showing the link inline.
export async function sendEmail(
  args: SendEmailArgs
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[email/send] RESEND_API_KEY or RESEND_FROM_EMAIL not configured"
      );
    } else {
      console.warn(
        "[email/send] Email not sent (RESEND_API_KEY / RESEND_FROM_EMAIL missing)"
      );
    }
    return { ok: false, error: "email_not_configured" };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });

    if (result.error) {
      console.error("[email/send] Resend error:", result.error);
      return { ok: false, error: result.error.message };
    }

    return { ok: true, id: result.data?.id ?? "" };
  } catch (err) {
    console.error("[email/send] threw:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "send_failed",
    };
  }
}
