import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Module-level singleton. @supabase/ssr's createBrowserClient is already
// memoized internally, but we belt-and-suspenders it here so any caller
// in this codebase gets the same instance — important for the auth
// state subscription, which would otherwise fire on the wrong client.
let client: SupabaseClient | undefined;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // Sessions are established explicitly — via signInWithPassword on
        // login, or a manual setSession() from the URL hash in the
        // reset-password / accept-invitation flows — and persisted through
        // SSR cookies. Auto-detection races those flows: AuthProvider (mounted
        // in the root layout) instantiates this same singleton and would
        // consume + strip the recovery hash before the reset form can read it,
        // stranding the user on "This page needs a reset link."
        auth: { detectSessionInUrl: false },
      }
    );
  }
  return client;
}
