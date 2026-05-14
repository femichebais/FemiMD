"use client";

import { signOutAction } from "@/app/actions/auth";

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
