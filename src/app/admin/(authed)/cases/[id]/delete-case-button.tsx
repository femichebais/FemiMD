"use client";

import { useActionState } from "react";
import { deleteCase, type DeleteCaseState } from "../actions";

export function DeleteCaseButton({ id, title }: { id: string; title: string }) {
  const [state, formAction, isPending] = useActionState<
    DeleteCaseState,
    FormData
  >(deleteCase, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `Soft-delete "${title}"? Student attempt history is kept; the case won't appear in any classroom.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={isPending}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade hover:text-[var(--warning)] transition-colors disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete case"}
      </button>
      {state.error && (
        <span className="ml-3 font-mono text-[10px] text-[var(--warning)]">
          {state.error}
        </span>
      )}
    </form>
  );
}
