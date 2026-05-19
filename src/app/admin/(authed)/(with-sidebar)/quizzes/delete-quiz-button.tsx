"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteQuiz } from "./actions";

export interface DeleteQuizButtonProps {
  quizId: string;
  quizTitle: string;
}

export function DeleteQuizButton({ quizId, quizTitle }: DeleteQuizButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteQuiz({ quizId });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Could not delete quiz."
        );
      }
    });
  };

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
    <div className="flex items-center gap-2 justify-end">
      <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-mute">
        Delete {quizTitle}?
      </span>
      <button
        type="button"
        onClick={handleDelete}
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
      {error && (
        <span className="font-mono text-[10px] text-[var(--warning)]">
          {error}
        </span>
      )}
    </div>
  );
}
