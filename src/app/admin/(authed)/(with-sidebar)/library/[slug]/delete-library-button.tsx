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
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-[var(--warning)] hover:border-[var(--warning)] border border-rule-strong px-3 py-2 rounded-[2px] disabled:opacity-50 transition-colors"
        title={state.error}
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
    </form>
  );
}
