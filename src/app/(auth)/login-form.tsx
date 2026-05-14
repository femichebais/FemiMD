"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, FieldLabel, Input } from "@/components/ui";
import type { SignInFormState } from "@/app/actions/auth";

export interface LoginFormProps {
  action: (
    state: SignInFormState,
    formData: FormData
  ) => Promise<SignInFormState>;
  // Optional ?next= path captured by middleware and forwarded into the form
  // so a deep-link survives a forced sign-in.
  next?: string;
  forgotHref?: string;
}

export function LoginForm({
  action,
  next,
  forgotHref = "/forgot-password",
}: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<
    SignInFormState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next ?? ""} />

      <div>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email ?? ""}
        />
      </div>

      <div>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error && (
        <p
          className="font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <Link
          href={forgotHref}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          Forgot password
        </Link>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign in →"}
        </Button>
      </div>
    </form>
  );
}
