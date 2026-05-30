"use client";

import { useState, useTransition } from "react";
import {
  adminToggleCaseAssignment,
  adminToggleQuizAssignment,
  adminToggleLibraryAssignment,
  adminToggleResourceAssignment,
  type ToggleResult,
} from "../actions";

export type AssignKind = "case" | "quiz" | "library" | "resource";

export interface AssignToggleProps {
  kind: AssignKind;
  classroomId: string;
  itemId: string;
  initialAssigned: boolean;
}

// Admin → teacher assignment toggle. Presence of an assignment lets the
// classroom's teacher see this content; the teacher then releases it to
// students. One component drives all four content types.
export function AssignToggle({
  kind,
  classroomId,
  itemId,
  initialAssigned,
}: AssignToggleProps) {
  const [assigned, setAssigned] = useState(initialAssigned);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const next = !assigned;
  const label = isPending ? "Working…" : assigned ? "Unassign" : "Assign";

  function run(): Promise<ToggleResult> {
    switch (kind) {
      case "case":
        return adminToggleCaseAssignment({
          classroomId,
          caseId: itemId,
          assign: next,
        });
      case "quiz":
        return adminToggleQuizAssignment({
          classroomId,
          quizId: itemId,
          assign: next,
        });
      case "library":
        return adminToggleLibraryAssignment({
          classroomId,
          libraryPageId: itemId,
          assign: next,
        });
      case "resource":
        return adminToggleResourceAssignment({
          classroomId,
          resourceId: itemId,
          assign: next,
        });
    }
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        setError(null);
        // Optimistic flip — revert on failure.
        setAssigned(next);
        startTransition(async () => {
          const result = await run();
          if (!result.ok) {
            setAssigned(!next);
            setError(result.error);
          }
        });
      }}
      title={error ?? undefined}
      className={
        assigned
          ? "font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-2 rounded-[2px] border border-rule-strong text-ink-mute hover:text-[var(--warning)] hover:border-[var(--warning)] disabled:opacity-50 transition-colors"
          : "font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-2 rounded-[2px] bg-ink text-paper hover:bg-accent disabled:opacity-50 transition-colors"
      }
    >
      {label}
    </button>
  );
}
