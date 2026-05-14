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
      const result = await toggleQuizRelease({
        classroomId,
        quizId,
        release: next,
      });
      if (!result.ok) {
        setReleased(!next);
        setError(result.error);
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
