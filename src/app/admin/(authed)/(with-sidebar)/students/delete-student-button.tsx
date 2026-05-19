"use client";

import { useActionState, useState } from "react";
import { deleteStudent, type DeleteStudentState } from "./actions";

export interface DeleteStudentButtonProps {
  studentId: string;
  studentName: string;
}

export function DeleteStudentButton({
  studentId,
  studentName,
}: DeleteStudentButtonProps) {
  const [state, formAction, pending] = useActionState<
    DeleteStudentState,
    FormData
  >(deleteStudent, {});
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-[var(--warning)] transition-colors"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2 justify-end">
      <input type="hidden" name="id" value={studentId} />
      <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-mute">
        Delete {studentName}?
      </span>
      <button
        type="submit"
        disabled={pending}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--warning)] hover:text-ink disabled:opacity-50"
      >
        {pending ? "…" : "Yes"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
      >
        Cancel
      </button>
      {state.error && (
        <span className="font-mono text-[10px] text-[var(--warning)]">
          {state.error}
        </span>
      )}
    </form>
  );
}
