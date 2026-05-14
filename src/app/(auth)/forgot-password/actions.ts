"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { getSiteUrl } from "@/lib/site-url";

export interface ForgotPasswordState {
  // Always returns a generic message — never leaks whether an email exists.
  sent?: boolean;
  error?: string;
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email." };
  }

  const admin = createSupabaseAdminClient();

  // generateLink returns a 422 if the email doesn't exist. We swallow it
  // and return the same generic "sent" response either way — avoids
  // disclosing whether an account exists.
  const siteUrl = await getSiteUrl();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl}/reset-password` },
  });
  const recoveryUrl = data?.properties?.action_link ?? "";

  if (!error && recoveryUrl) {
    const tpl = passwordResetEmail({ recoveryUrl });
    const sendResult = await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
    });
    if (!sendResult.ok) {
      console.warn("[forgot-password] email send failed:", sendResult.error);
    }
  } else if (error) {
    // Log internally but keep the response generic.
    console.warn("[forgot-password] generateLink result:", error.message);
  }

  return { sent: true };
}
