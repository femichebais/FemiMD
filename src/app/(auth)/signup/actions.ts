"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { profiles, pendingSignups } from "@/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface SignupFormState {
  error?: string;
  values?: { name: string; email: string };
}

// Self-serve signup. The account is created in the *pending* state right away
// — profile + pending_signups row — so it shows up in the admin Signups queue
// immediately. We do NOT send any email here and the account cannot reach app
// content yet (role 'pending'); the approval email + access are granted later
// when an admin approves (see admin/signups/actions.ts → promoteAndNotify).
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

  // Create the auth user directly (no confirmation email). email_confirm:true
  // marks the address usable so that, once approved, they can sign in with the
  // password they just chose. Role starts as 'pending' — middleware shunts
  // them to /pending until an admin promotes them to 'student'.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "pending" },
    user_metadata: { name },
  });

  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "";
    if (/already (registered|exists)/i.test(msg)) {
      return {
        error:
          "An account with that email already exists. Sign in instead, or use \"Forgot password\" if you don't remember yours.",
        values: { name, email },
      };
    }
    console.error("[signup] createUser failed:", createErr);
    return {
      error: "Could not create your account. Try again.",
      values: { name, email },
    };
  }

  const userId = created.user.id;

  // Profile (role 'pending') + queue entry, in one transaction. On failure,
  // roll back the auth user so the email isn't left half-registered.
  try {
    await db.transaction(async (tx) => {
      await tx.insert(profiles).values({ id: userId, role: "pending" });
      await tx.insert(pendingSignups).values({ id: userId, email, name });
    });
  } catch (err) {
    console.error("[signup] DB insert failed:", err);
    await admin.auth.admin.deleteUser(userId);
    return {
      error: "Could not create your account. Try again.",
      values: { name, email },
    };
  }

  redirect(`/signup/pending?email=${encodeURIComponent(email)}`);
}
