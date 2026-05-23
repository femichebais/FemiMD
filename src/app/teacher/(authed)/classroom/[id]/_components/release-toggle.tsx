"use client";

import { useState, useTransition } from "react";
import { toggleCaseRelease } from "../actions";

export interface ReleaseToggleProps {
  classroomId: string;
  caseId: string;
  initialReleased: boolean;
}

export function ReleaseToggle({
  classroomId,
  caseId,
  initialReleased,
}: ReleaseToggleProps) {
  const [released, setReleased] = useState(initialReleased);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);
    const next = !released;
    setReleased(next); // optimistic
    startTransition(async () => {
      try {
        const result = await toggleCaseRelease({
          classroomId,
          caseId,
          release: next,
        });
        if (!result.ok) {
          setReleased(!next); // rollback
          setError(result.error);
        }
      } catch (err) {
        // Server action threw (auth expired, network, etc.) — without this
        // catch the optimistic UI would lock in the wrong state and the
        // user would think it persisted.
        setReleased(!next);
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Could not update release. Refresh and try again."
        );
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={released}
        className={
          "inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-clinical transition-colors disabled:opacity-50 " +
          (released
            ? "bg-clinical-primary text-clinical-primary-fg shadow-clinical-elegant"
            : "border border-clinical-border text-clinical-muted-fg hover:bg-clinical-muted hover:text-clinical-fg")
        }
      >
        {released ? "Released" : "Release"}
      </button>
      {error && (
        <span className="text-[11px] text-clinical-destructive">{error}</span>
      )}
    </div>
  );
}
