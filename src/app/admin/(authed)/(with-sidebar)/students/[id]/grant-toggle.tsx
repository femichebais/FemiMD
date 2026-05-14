"use client";

import { useState, useTransition } from "react";
import { toggleCaseGrant } from "./actions";

export interface GrantToggleProps {
  studentId: string;
  caseId: string;
  initialGranted: boolean;
  classroomReleased: boolean;
}

export function GrantToggle({
  studentId,
  caseId,
  initialGranted,
  classroomReleased,
}: GrantToggleProps) {
  const [granted, setGranted] = useState(initialGranted);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (isPending) return;
    setError(null);
    const next = !granted;
    setGranted(next); // optimistic
    startTransition(async () => {
      const result = await toggleCaseGrant({
        studentId,
        caseId,
        grant: next,
      });
      if (!result.ok) {
        setGranted(!next);
        setError(result.error);
      }
    });
  };

  // If the case is released to the student's classroom, the student already
  // sees it — show that state but the toggle still works (admin can still
  // explicitly mark a grant, which is a no-op-ish but tracked).
  return (
    <div className="flex items-center gap-3">
      {classroomReleased && !granted && (
        <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
          via classroom
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          "font-mono text-[10px] uppercase tracking-[0.18em] py-2 px-3 rounded-[2px] transition-colors disabled:opacity-50 " +
          (granted
            ? "bg-accent-soft text-accent border border-accent"
            : "border border-rule-strong text-ink-mute hover:border-accent hover:text-accent")
        }
      >
        {granted ? "Granted" : "Grant"}
      </button>
      {error && (
        <span className="font-mono text-[10px] text-[var(--warning)]">
          {error}
        </span>
      )}
    </div>
  );
}
