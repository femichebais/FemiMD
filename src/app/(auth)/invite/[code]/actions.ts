"use server";

import { redirect } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { classrooms, profiles, students } from "@/db/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface InviteSignupState {
  error?: string;
  values?: { name: string; email: string };
}

export async function inviteSignup(
  _prevState: InviteSignupState,
  formData: FormData
): Promise<InviteSignupState> {
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!code) return { error: "Invalid invite link." };
  if (!name) return { error: "Name is required.", values: { name, email } };
  if (!email || !email.includes("@"))
    return { error: "Enter a valid email.", values: { name, email } };
  if (password.length < 8)
    return {
      error: "Password must be at least 8 characters.",
      values: { name, email },
    };

  // Resolve the classroom from the invite code. Soft-deleted classrooms
  // shouldn't accept new signups.
  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(
      and(eq(classrooms.inviteCode, code), isNull(classrooms.deletedAt))
    )
    .limit(1);

  if (!classroom) {
    return {
      error: "This invite link is no longer valid.",
      values: { name, email },
    };
  }

  const admin = createSupabaseAdminClient();

  // Step 1: create the auth user with role baked into app_metadata so the
  // first JWT carries it. email_confirm:true skips the verification email
  // — the student is signing up *via* a trusted invite link.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "student" },
    user_metadata: { name },
  });

  if (createErr || !created.user) {
    const msg = createErr?.message ?? "";
    const friendly = /already (registered|exists)/i.test(msg)
      ? "A user with that email already exists. Sign in instead."
      : "Could not create your account.";
    return { error: friendly, values: { name, email } };
  }

  const userId = created.user.id;

  // Step 2: profile + student rows in a transaction. Rollback the auth user
  // if either insert fails so we don't leave half-provisioned accounts.
  try {
    await db.transaction(async (tx) => {
      await tx.insert(profiles).values({ id: userId, role: "student" });
      await tx
        .insert(students)
        .values({ id: userId, classroomId: classroom.id, email, name });
    });
  } catch (err) {
    console.error("[invite/signup] DB insert failed:", err);
    await admin.auth.admin.deleteUser(userId);
    return {
      error: "Could not finalize signup. Try again.",
      values: { name, email },
    };
  }

  // Step 3: establish a session by signing the user in via the cookie-bound
  // server client. This writes the auth cookies on the response that
  // carries the redirect — no client handoff window.
  const session = await createSupabaseServerClient();
  const { error: signInErr } = await session.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) {
    // User exists in the DB — they can log in via /login. But this is a
    // poor UX, so surface a friendly path.
    console.error("[invite/signup] session establish failed:", signInErr);
    return {
      error: "Your account was created — sign in to continue.",
      values: { name, email },
    };
  }

  redirect("/student");
}
