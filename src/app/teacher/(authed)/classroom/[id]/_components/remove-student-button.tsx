"use client";

import { useActionState } from "react";
import { removeStudent, type RemoveStudentState } from "../actions";

export interface RemoveStudentButtonProps {
  classroomId: string;
  studentId: string;
  studentName: string;
}

export function RemoveStudentButton({
  classroomId,
  studentId,
  studentName,
}: RemoveStudentButtonProps) {
  const [state, formAction, isPending] = useActionState<
    RemoveStudentState,
    FormData
  >(removeStudent, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `Remove ${studentName} from this classroom? They will lose access immediately.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="classroomId" value={classroomId} />
      <input type="hidden" name="studentId" value={studentId} />
      <button
        type="submit"
        disabled={isPending}
        title={state.error}
        className="text-[11.5px] font-medium text-clinical-muted-fg hover:text-clinical-destructive disabled:opacity-50 transition-colors"
      >
        {isPending ? "Removing…" : "Remove"}
      </button>
    </form>
  );
}
