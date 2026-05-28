import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, pendingSignups } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Where the user lands after clicking the confirmation link in their email.
//
// Supabase's verify endpoint runs *before* we see the request: by the time
// this handler fires, the user already has a session (cookies are set on
// the redirect that brought them here). Our job is to:
//
//   1. Promote them from "confirmed but unrecognized" to role='pending'
//      (app_metadata + profiles row + pending_signups queue entry).
//   2. Refresh the session so the new role lands in the JWT immediately —
//      otherwise the middleware reads the pre-promotion JWT (which has no
//      role) and bounces them to login.
//
// The whole flow is idempotent: clicking the same link twice (or landing
// here after they're already approved) won't double-insert or downgrade.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/pending";
  const errParam = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (errParam) {
    const back = new URL("/login", request.url);
    back.searchParams.set("error", "confirm_failed");
    return NextResponse.redirect(back);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    const back = new URL("/login", request.url);
    back.searchParams.set("error", "confirm_failed");
    return NextResponse.redirect(back);
  }

  // If they already have a profile, leave their state alone — they're either
  // already pending (clicked the link twice) or already approved.
  const [existing] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!existing) {
    const name =
      (user.user_metadata as Record<string, unknown> | null)?.name?.toString()?.trim() ||
      (user.email?.split("@")[0] ?? "Student");

    try {
      await db.transaction(async (tx) => {
        await tx.insert(profiles).values({ id: user.id, role: "pending" });
        await tx.insert(pendingSignups).values({
          id: user.id,
          email: user.email ?? "",
          name,
        });
      });
    } catch (err) {
      console.error("[auth/confirm] DB insert failed:", err);
      const back = new URL("/login", request.url);
      back.searchParams.set("error", "signup_failed");
      return NextResponse.redirect(back);
    }

    const admin = createSupabaseAdminClient();
    const { error: metaErr } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { role: "pending" },
    });
    if (metaErr) {
      console.error("[auth/confirm] updateUserById failed:", metaErr);
      // DB rows are in place; without role metadata the user can't progress,
      // so surface this as a confirm failure rather than silently stranding them.
      const back = new URL("/login", request.url);
      back.searchParams.set("error", "confirm_failed");
      return NextResponse.redirect(back);
    }

    // Force a token refresh so the next request sees role='pending' in the JWT.
    await supabase.auth.refreshSession();
  }

  return NextResponse.redirect(new URL(next, request.url));
}
