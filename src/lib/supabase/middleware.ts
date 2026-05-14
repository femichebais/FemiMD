import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

// Runs on every matched request. Two jobs:
//
//   1. Validate the access token with the auth server via supabase.auth.getUser().
//      Calling getUser() (not getSession()) is what triggers the SDK's refresh
//      flow — without it, expired tokens leak into RSCs and stay cached for
//      the rest of the request lifecycle.
//
//   2. Propagate any refreshed cookies onto BOTH the inbound request (so any
//      RSC server client created later in this same request sees the new
//      session) AND the outbound response (so the browser stores the rotated
//      cookies).
//
// Returns { response, user } so the caller can read user without doing a
// second getUser() roundtrip in the role-gating layer.
export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured (e.g. during local bring-up before .env is
  // populated), skip the network call but still let the request through.
  // Treating the user as null is the safe default — protected routes still
  // bounce to login, public routes still render.
  if (!url || !anon) {
    if (process.env.NODE_ENV === "production") {
      // Surface this loudly in production; a missing env in prod is a
      // deployment bug, not a normal state.
      console.error(
        "[supabase/middleware] Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY"
      );
    }
    return { response, user: null };
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANT: do not put any logic between createServerClient and getUser.
  // The SDK relies on this being the first auth call to know it should
  // refresh, and any await between them can let stale tokens slip through.
  let user: User | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    // Network or config issue. Treat as unauthenticated rather than 500ing
    // the whole tree — same fallback path as missing env.
    if (process.env.NODE_ENV === "production") {
      console.error("[supabase/middleware] getUser failed:", err);
    }
  }

  return { response, user };
}
