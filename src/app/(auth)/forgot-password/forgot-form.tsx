"use client";

import { useActionState } from "react";
import { Button, FieldLabel, Input } from "@/components/ui";
import {
  requestPasswordReset,
  type ForgotPasswordState,
} from "./actions";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<
    ForgotPasswordState,
    FormData
  >(requestPasswordReset, {});

  if (state.sent) {
    return (
      <div className="border border-rule-strong bg-paper-2 rounded-[2px] p-6">
        <p className="font-serif text-[16px] mb-2">Check your inbox.</p>
        <p className="font-mono text-[11px] text-ink-mute tracking-[0.05em]">
          If we have an account for that email, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Sending…" : "Send reset link →"}
        </Button>
      </div>
    </form>
  );
}
