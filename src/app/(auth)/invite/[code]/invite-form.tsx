"use client";

import { useActionState } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import {
  CButton,
  CFieldLabel,
  CInput,
} from "@/components/clinical/primitives";
import { inviteSignup, type InviteSignupState } from "./actions";

export function InviteSignupForm({ code }: { code: string }) {
  const [state, formAction, isPending] = useActionState<
    InviteSignupState,
    FormData
  >(inviteSignup, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="code" value={code} />

      <div>
        <CFieldLabel htmlFor="name">Your name</CFieldLabel>
        <CInput
          id="name"
          name="name"
          required
          autoComplete="name"
          defaultValue={state.values?.name ?? ""}
          placeholder="Your first and last name"
        />
      </div>

      <div>
        <CFieldLabel htmlFor="email">Email</CFieldLabel>
        <CInput
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email ?? ""}
          placeholder="you@school.edu"
        />
      </div>

      <div>
        <CFieldLabel htmlFor="password">Password</CFieldLabel>
        <CInput
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
        />
        <p className="mt-2 text-[12px] text-clinical-muted-fg">
          8 characters or more.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-[13px] text-clinical-destructive">
          {state.error}
        </p>
      )}

      <CButton type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Creating account…" : "Join classroom"}
        <ArrowRight weight="bold" className="h-4 w-4" />
      </CButton>
    </form>
  );
}
