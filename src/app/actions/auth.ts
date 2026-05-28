"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/current-user";

const DASHBOARD_FOR: Record<Role, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  // Pending users get their own holding screen until admin promotes them.
  pending: "/pending",
};

export interface SignInFormState {
  error?: string;
  // Echoed back so the form preserves the typed email after a failed submit.
  email?: string;
}

// Shared sign-in logic. Each entry point declares which roles it accepts,
// so a teacher session can't establish itself at /admin/login (and vice versa).
async function signInWithRoles(
  formData: FormData,
  expectedRoles: Role[]
): Promise<SignInFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { email, error: "Enter your email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // Don't differentiate "no such user" vs "wrong password" — leaks
    // enumeration. Always the same message.
    return { email, error: "Incorrect email or password." };
  }

  const role = (data.user.app_metadata as Record<string, unknown>)?.role as
    | Role
    | undefined;

  if (!role || !expectedRoles.includes(role)) {
    // Drop the half-valid session — we don't want a teacher-cookie hanging
    // around after they tried to use the admin login.
    await supabase.auth.signOut();
    return { email, error: "This account doesn't have access here." };
  }

  // Cookies were set by the server client during signInWithPassword().
  // redirect() carries them back atomically — no client handoff window.
  const target =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : DASHBOARD_FOR[role];
  redirect(target);
}

export async function studentTeacherSignIn(
  _prevState: SignInFormState,
  formData: FormData
): Promise<SignInFormState> {
  return signInWithRoles(formData, ["student", "teacher"]);
}

export async function adminSignIn(
  _prevState: SignInFormState,
  formData: FormData
): Promise<SignInFormState> {
  return signInWithRoles(formData, ["admin"]);
}

export async function signOutAction(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
