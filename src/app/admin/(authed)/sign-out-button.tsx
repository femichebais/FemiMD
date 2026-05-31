"use client";

import { signOutAction } from "@/app/actions/auth";

// Form-wrapped button so the click POSTs to the Server Action and we get
// atomic cookie-clearing + redirect on the same response.
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
