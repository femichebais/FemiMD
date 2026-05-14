"use client";

import { useActionState } from "react";
import { deleteTeacher, type DeleteTeacherState } from "./actions";

export function DeleteTeacherButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [state, formAction, isPending] = useActionState<
    DeleteTeacherState,
    FormData
  >(deleteTeacher, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Soft-delete ${name}? They'll lose access immediately.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={isPending}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade hover:text-[var(--warning)] disabled:opacity-50 transition-colors"
        title={state.error}
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
    </form>
  );
}
