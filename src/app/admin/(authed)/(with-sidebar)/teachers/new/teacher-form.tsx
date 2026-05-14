"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, FieldLabel, Input, StageLabel } from "@/components/ui";
import { createTeacher, type TeacherFormState } from "../actions";

export interface TeacherFormProps {
  schools: Array<{ id: string; name: string }>;
}

export function TeacherForm({ schools }: TeacherFormProps) {
  const [state, formAction, isPending] = useActionState<
    TeacherFormState,
    FormData
  >(createTeacher, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form on successful create — the invite block then renders
  // above it for the admin to copy.
  useEffect(() => {
    if (state.invite && !isPending) {
      formRef.current?.reset();
    }
  }, [state.invite, isPending]);

  return (
    <>
      {state.invite && (
        <div className="mb-12 p-6 bg-accent-soft border-l-2 border-accent rounded-[2px]">
          <StageLabel className="mb-3 !text-accent">
            Teacher created · share this link
          </StageLabel>
          <p className="font-serif text-[16px] mb-3">
            <strong className="font-medium">{state.invite.name}</strong>{" "}
            <span className="text-ink-mute">({state.invite.email})</span>
          </p>
          <p className="font-mono text-[11px] text-ink-mute tracking-[0.05em] mb-3">
            They&apos;ll use this one-time link to set their password.
            Until Resend is wired up (step 15), share it manually.
          </p>
          {state.invite.recoveryUrl ? (
            <div className="flex gap-3 items-stretch">
              <input
                readOnly
                value={state.invite.recoveryUrl}
                className="flex-1 border border-rule-strong bg-surface rounded-[2px] px-3 py-2 font-mono text-[11px] text-ink"
                onFocus={(e) => e.target.select()}
              />
              <CopyButton text={state.invite.recoveryUrl} />
            </div>
          ) : (
            <p className="font-mono text-[11px] text-[var(--warning)]">
              Could not generate link — trigger a password reset from
              the Supabase auth dashboard.
            </p>
          )}
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex flex-col gap-6">
        <div>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            defaultValue={state.name ?? ""}
            autoComplete="name"
          />
        </div>

        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={state.email ?? ""}
            autoComplete="email"
          />
        </div>

        <div>
          <FieldLabel htmlFor="school_id">School</FieldLabel>
          <select
            id="school_id"
            name="school_id"
            required
            defaultValue={state.schoolId ?? ""}
            className="w-full border border-rule-strong bg-surface rounded-[2px] px-[14px] py-3 font-serif text-[16px] text-ink focus:outline-none focus:border-accent"
          >
            <option value="" disabled>
              {schools.length === 0
                ? "No schools — create one first"
                : "Select a school"}
            </option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
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
          <a
            href="/admin/teachers"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
          >
            ← Back
          </a>
          <Button type="submit" disabled={isPending || schools.length === 0}>
            {isPending ? "Creating…" : "Create teacher"}
          </Button>
        </div>
      </form>
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
      }}
      className="bg-ink text-paper px-4 py-2 font-sans text-[13px] rounded-[2px] hover:bg-accent transition-colors"
    >
      Copy
    </button>
  );
}
