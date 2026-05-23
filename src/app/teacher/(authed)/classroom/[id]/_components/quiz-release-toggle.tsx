"use client";

import { useState, useTransition } from "react";
import { toggleQuizRelease } from "../actions";

export interface QuizReleaseToggleProps {
  classroomId: string;
  quizId: string;
  initialReleased: boolean;
}

export function QuizReleaseToggle({
  classroomId,
  quizId,
  initialReleased,
}: QuizReleaseToggleProps) {
  const [released, setReleased] = useState(initialReleased);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);
    const next = !released;
    setReleased(next); // optimistic
    startTransition(async () => {
      try {
        const result = await toggleQuizRelease({
          classroomId,
          quizId,
          release: next,
        });
        if (!result.ok) {
          setReleased(!next);
          setError(result.error);
        }
      } catch (err) {
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
