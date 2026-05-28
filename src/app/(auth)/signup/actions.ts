"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { signupConfirmationEmail } from "@/lib/email/templates";
import { getSiteUrl } from "@/lib/site-url";

export interface SignupFormState {
  error?: string;
  values?: { name: string; email: string };
}

export async function signUp(
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Name is required.", values: { name, email } };
  if (!email || !email.includes("@"))
    return { error: "Enter a valid email.", values: { name, email } };
  if (password.length < 8)
    return {
      error: "Password must be at least 8 characters.",
      values: { name, email },
    };

  const admin = createSupabaseAdminClient();
  const siteUrl = await getSiteUrl();

  // generateLink with type='signup' creates the unconfirmed auth user AND
  // returns a confirmation URL in one call — we then mail it ourselves via
  // Resend (consistent with how teacher invites work). Role is NOT set yet;
  // the /auth/confirm callback promotes them to 'pending' on email verify.
  const { data, error: linkErr } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: { name },
      redirectTo: `${siteUrl}/auth/confirm?next=/pending`,
    },
  });

  if (linkErr || !data?.properties?.action_link) {
    const msg = linkErr?.message ?? "";
    if (/already (registered|exists)/i.test(msg)) {
      return {
        error:
          "An account with that email already exists. Sign in instead, or use \"Forgot password\" if you don't remember yours.",
        values: { name, email },
      };
    }
    console.error("[signup] generateLink failed:", linkErr);
    return {
      error: "Could not create your account. Try again.",
      values: { name, email },
    };
  }

  const confirmUrl = data.properties.action_link;
  const tpl = signupConfirmationEmail({ name, confirmUrl });
  const emailResult = await sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
  });

  if (!emailResult.ok) {
    // Email failed — log so admin can investigate; user still sees the
    // "check your inbox" screen because their account *was* created and
    // they can request a resend later via password reset.
    console.warn("[signup] confirmation email failed:", emailResult.error);
  }

  redirect(`/signup/check-email?email=${encodeURIComponent(email)}`);
}
