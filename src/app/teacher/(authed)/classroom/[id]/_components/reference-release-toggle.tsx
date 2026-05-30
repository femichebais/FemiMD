"use client";

import { useState, useTransition } from "react";
import {
  toggleLibraryRelease,
  toggleResourceRelease,
  type ToggleResult,
} from "../actions";

export type ReferenceKind = "library" | "resource";

export interface ReferenceReleaseToggleProps {
  kind: ReferenceKind;
  classroomId: string;
  itemId: string;
  initialReleased: boolean;
}

// Teacher → student release toggle for reference content (library pages and
// resources). Mirrors the case ReleaseToggle; one component drives both kinds.
export function ReferenceReleaseToggle({
  kind,
  classroomId,
  itemId,
  initialReleased,
}: ReferenceReleaseToggleProps) {
  const [released, setReleased] = useState(initialReleased);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (release: boolean): Promise<ToggleResult> =>
    kind === "library"
      ? toggleLibraryRelease({ classroomId, libraryPageId: itemId, release })
      : toggleResourceRelease({ classroomId, resourceId: itemId, release });

  const handleClick = () => {
    setError(null);
    const next = !released;
    setReleased(next); // optimistic
    startTransition(async () => {
      try {
        const result = await run(next);
        if (!result.ok) {
          setReleased(!next); // rollback
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
