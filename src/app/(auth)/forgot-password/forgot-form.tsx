"use client";

import { useActionState } from "react";
import { ArrowRight, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import {
  CButton,
  CFieldLabel,
  CInput,
} from "@/components/clinical/primitives";
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
      <div className="text-center py-2">
        <EnvelopeSimple
          weight="duotone"
          className="h-9 w-9 text-clinical-primary mx-auto mb-3"
        />
        <p className="font-serif text-[18px] text-clinical-fg mb-1">
          Check your inbox.
        </p>
        <p className="text-[13.5px] text-clinical-muted-fg">
          If we have an account for that email, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <CFieldLabel htmlFor="email">Email</CFieldLabel>
        <CInput
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.edu"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-[13px] text-clinical-destructive">
          {state.error}
        </p>
      )}

      <CButton type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Sending…" : "Send reset link"}
        <ArrowRight weight="bold" className="h-4 w-4" />
      </CButton>
    </form>
  );
}
