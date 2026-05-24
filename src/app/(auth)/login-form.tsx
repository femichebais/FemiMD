"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import {
  CButton,
  CFieldLabel,
  CInput,
} from "@/components/clinical/primitives";
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
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next ?? ""} />

      <div>
        <CFieldLabel htmlFor="email">Email</CFieldLabel>
        <CInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email ?? ""}
          placeholder="you@school.edu"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <CFieldLabel htmlFor="password" className="mb-0">
            Password
          </CFieldLabel>
          <Link
            href={forgotHref}
            className="text-[12px] font-medium text-clinical-primary hover:text-clinical-fg transition-colors"
          >
            Forgot?
          </Link>
        </div>
        <CInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p
          className="text-[13px] text-clinical-destructive"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <CButton type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Signing in…" : "Sign in"}
        <ArrowRight weight="bold" className="h-4 w-4" />
      </CButton>
    </form>
  );
}
