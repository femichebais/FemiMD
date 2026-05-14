import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Server-only client that bypasses RLS. Use sparingly — never expose to the browser.
export function createSupabaseAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
