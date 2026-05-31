"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  CButton,
  CFieldLabel,
  CInput,
} from "@/components/clinical/primitives";
import { createSchool, type SchoolFormState } from "./actions";

export function CreateSchoolForm() {
  const [state, formAction, isPending] = useActionState<
    SchoolFormState,
    FormData
  >(createSchool, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the form after a successful submit (no error + no echoed name).
  useEffect(() => {
    if (!isPending && !state.error && !state.name) {
      formRef.current?.reset();
    }
  }, [isPending, state.error, state.name]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 mb-12 pb-12 border-b border-clinical-border"
    >
      <CFieldLabel htmlFor="school-name">New school</CFieldLabel>
      <div className="flex gap-3">
        <CInput
          id="school-name"
          name="name"
          placeholder="School name"
          defaultValue={state.name ?? ""}
          required
          maxLength={200}
          className="flex-1"
        />
        <CButton type="submit" disabled={isPending} className="shrink-0">
          {isPending ? "Adding…" : "Add school"}
        </CButton>
      </div>
      {state.error && (
        <p
          className="text-[13px] text-clinical-destructive"
          role="alert"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
