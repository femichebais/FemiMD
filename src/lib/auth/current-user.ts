import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Role = "admin" | "teacher" | "student" | "pending";

export interface CurrentUser {
  user: User;
  role: Role;
}

function readRoleFromJwt(user: User): Role | null {
  // app_metadata is set by the service role at signup time and is NOT
  // user-mutable, so we treat it as authoritative. The JWT is signed, so
  // tampering would fail signature verification at the Supabase edge.
  const role = (user.app_metadata as Record<string, unknown> | undefined)?.role;
  return role === "admin" ||
    role === "teacher" ||
    role === "student" ||
    role === "pending"
    ? role
    : null;
}

// React cache memoizes the result per request — multiple Server Components
// (layouts + pages + nested loaders) can call currentUser() and we'll only
// roundtrip to Supabase once.
//
// We use getUser() instead of getSession(): getSession() returns cached
// cookie data without verifying with the auth server (spoofable!), while
// getUser() hits Supabase and validates the JWT.
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const role = readRoleFromJwt(user);
  if (!role) {
    // Authenticated but unprovisioned — shouldn't happen in practice
    // because admin always sets role on user creation. Treat as logged out.
    return null;
  }

  return { user, role };
});

// Helper for pages that must have a user. Use sparingly — most callers
// should check `currentUser()` themselves and render appropriate fallback.
export async function requireUser(): Promise<CurrentUser> {
  const result = await currentUser();
  if (!result) {
    throw new Error("requireUser: no authenticated user — gate this route");
  }
  return result;
}

// Defense-in-depth role check. Middleware gates the URL, but a stray
// Server Action POST, an internal API call, or a future refactor that
// forgets the middleware matcher would still need this guard. Throws a
// hard error rather than silently returning so misconfigured callers
// fail loudly.
export async function requireRole(...allowed: Role[]): Promise<CurrentUser> {
  const result = await requireUser();
  if (!allowed.includes(result.role)) {
    throw new Error(
      `requireRole: user role '${result.role}' not in allowed [${allowed.join(", ")}]`
    );
  }
  return result;
}
