"use client";

import { signOutAction } from "@/app/actions/auth";

// Form-wrapped button so the click POSTs to the Server Action and we get
// atomic cookie-clearing + redirect on the same response.
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade hover:text-ink transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
