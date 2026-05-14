"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, FieldLabel, Input } from "@/components/ui";
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
      className="flex flex-col gap-4 mb-12 pb-12 border-b border-rule"
    >
      <FieldLabel htmlFor="school-name">New school</FieldLabel>
      <div className="flex gap-3">
        <Input
          id="school-name"
          name="name"
          placeholder="School name"
          defaultValue={state.name ?? ""}
          required
          maxLength={200}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add school"}
        </Button>
      </div>
      {state.error && (
        <p
          className="font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
          role="alert"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
