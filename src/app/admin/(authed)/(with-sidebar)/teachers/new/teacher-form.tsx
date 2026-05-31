"use client";

import { useActionState, useEffect, useRef } from "react";
import { StageLabel } from "@/components/ui";
import {
  CButton,
  CFieldLabel,
  CInput,
} from "@/components/clinical/primitives";
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
        <div className="mb-12 p-6 bg-clinical-primary-soft border border-clinical-border rounded-clinical">
          <StageLabel className="mb-3">
            Teacher created · share this link
          </StageLabel>
          <p className="font-serif text-[16px] mb-3">
            <strong className="font-medium">{state.invite.name}</strong>{" "}
            <span className="text-clinical-muted-fg">
              ({state.invite.email})
            </span>
          </p>
          <p className="text-[13px] text-clinical-muted-fg mb-3">
            They&apos;ll use this one-time link to set their password. We also
            email it to them automatically.
          </p>
          {state.invite.recoveryUrl ? (
            <div className="flex gap-3 items-stretch">
              <input
                readOnly
                value={state.invite.recoveryUrl}
                className="flex-1 rounded-clinical border border-clinical-border bg-clinical-card px-3 py-2 font-mono text-[11px] text-clinical-fg"
                onFocus={(e) => e.target.select()}
              />
              <CopyButton text={state.invite.recoveryUrl} />
            </div>
          ) : (
            <p className="text-[12px] text-clinical-destructive">
              Could not generate link — trigger a password reset from
              the Supabase auth dashboard.
            </p>
          )}
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex flex-col gap-6">
        <div>
          <CFieldLabel htmlFor="name">Name</CFieldLabel>
          <CInput
            id="name"
            name="name"
            required
            defaultValue={state.name ?? ""}
            autoComplete="name"
          />
        </div>

        <div>
          <CFieldLabel htmlFor="email">Email</CFieldLabel>
          <CInput
            id="email"
            name="email"
            type="email"
            required
            defaultValue={state.email ?? ""}
            autoComplete="email"
          />
        </div>

        <div>
          <CFieldLabel htmlFor="school_id">School</CFieldLabel>
          <select
            id="school_id"
            name="school_id"
            required
            defaultValue={state.schoolId ?? ""}
            className="w-full h-11 rounded-clinical border border-clinical-border bg-clinical-card px-3.5 text-[15px] text-clinical-fg focus:outline-none focus:border-clinical-primary focus:ring-2 focus:ring-clinical-primary/15 transition-colors"
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
            className="text-[13px] text-clinical-destructive"
            role="alert"
          >
            {state.error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <a
            href="/admin/teachers"
            className="text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors"
          >
            ← Back
          </a>
          <CButton type="submit" disabled={isPending || schools.length === 0}>
            {isPending ? "Creating…" : "Create teacher"}
          </CButton>
        </div>
      </form>
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <CButton
      type="button"
      size="sm"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
      }}
      className="shrink-0"
    >
      Copy
    </CButton>
  );
}
