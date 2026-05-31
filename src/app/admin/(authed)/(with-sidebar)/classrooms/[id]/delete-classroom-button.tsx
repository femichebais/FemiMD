"use client";

import { useActionState, useState } from "react";
import {
  deleteClassroom,
  type DeleteClassroomState,
} from "../actions";

export interface DeleteClassroomButtonProps {
  classroomId: string;
  classroomName: string;
}

export function DeleteClassroomButton({
  classroomId,
  classroomName,
}: DeleteClassroomButtonProps) {
  const [state, formAction, pending] = useActionState<
    DeleteClassroomState,
    FormData
  >(deleteClassroom, {});
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-[var(--warning)] transition-colors"
      >
        Delete classroom
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="classroomId" value={classroomId} />
      <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-mute">
        Delete {classroomName}? Students lose access.
      </span>
      <button
        type="submit"
        disabled={pending}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--warning)] hover:text-ink disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Confirm"}
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
