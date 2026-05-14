"use client";

import { useActionState } from "react";
import { deleteLibraryPage, type DeleteLibraryState } from "../actions";

export function DeleteLibraryButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [state, formAction, isPending] = useActionState<
    DeleteLibraryState,
    FormData
  >(deleteLibraryPage, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Soft-delete "${title}"?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={isPending}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade hover:text-[var(--warning)] disabled:opacity-50 transition-colors"
        title={state.error}
      >
        {isPending ? "Deleting…" : "Delete page"}
      </button>
    </form>
  );
}
