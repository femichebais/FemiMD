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
        className={
          "font-mono text-[10px] uppercase tracking-[0.18em] py-2 px-3 rounded-[2px] transition-colors disabled:opacity-50 " +
          (released
            ? "bg-accent-soft text-accent border border-accent"
            : "border border-rule-strong text-ink-mute hover:border-accent hover:text-accent")
        }
      >
        {released ? "Released" : "Release"}
      </button>
      {error && (
        <span className="font-mono text-[10px] text-[var(--warning)]">
          {error}
        </span>
      )}
    </div>
  );
}
