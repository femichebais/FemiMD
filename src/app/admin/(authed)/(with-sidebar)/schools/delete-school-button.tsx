"use client";

import { useActionState } from "react";
import { deleteSchool, type DeleteSchoolState } from "./actions";

export function DeleteSchoolButton({ id, name }: { id: string; name: string }) {
  const [state, formAction, isPending] = useActionState<
    DeleteSchoolState,
    FormData
  >(deleteSchool, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Delete "${name}"? Soft-delete; can be recovered.`)) {
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
