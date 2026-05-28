"use client";

import { useState, useTransition } from "react";
import { adminToggleCaseRelease } from "../actions";

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

  const next = !released;
  const label = isPending
    ? "Working…"
    : released
      ? "Unrelease"
      : "Release";

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        setError(null);
        // Optimistic flip — revert on failure.
        setReleased(next);
        startTransition(async () => {
          const result = await adminToggleCaseRelease({
            classroomId,
            caseId,
            release: next,
          });
          if (!result.ok) {
            setReleased(!next);
            setError(result.error);
          }
        });
      }}
      title={error ?? undefined}
      className={
        released
          ? "font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-2 rounded-[2px] border border-rule-strong text-ink-mute hover:text-[var(--warning)] hover:border-[var(--warning)] disabled:opacity-50 transition-colors"
          : "font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-2 rounded-[2px] bg-ink text-paper hover:bg-accent disabled:opacity-50 transition-colors"
      }
    >
      {label}
    </button>
  );
}
