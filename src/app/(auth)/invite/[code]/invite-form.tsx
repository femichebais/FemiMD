"use client";

import { useActionState } from "react";
import { Button, FieldLabel, Input } from "@/components/ui";
import { inviteSignup, type InviteSignupState } from "./actions";

export function InviteSignupForm({ code }: { code: string }) {
  const [state, formAction, isPending] = useActionState<
    InviteSignupState,
    FormData
  >(inviteSignup, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="code" value={code} />

      <div>
        <FieldLabel htmlFor="name">Your name</FieldLabel>
        <Input
          id="name"
          name="name"
          required
          autoComplete="name"
          defaultValue={state.values?.name ?? ""}
        />
      </div>

      <div>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email ?? ""}
        />
      </div>

      <div>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
          8 characters or more.
        </p>
      </div>

      {state.error && (
        <p
          role="alert"
          className="font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating account…" : "Join classroom →"}
        </Button>
      </div>
    </form>
  );
}
