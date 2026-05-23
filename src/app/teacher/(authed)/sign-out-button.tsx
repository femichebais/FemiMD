"use client";

import { signOutAction } from "@/app/actions/auth";

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
