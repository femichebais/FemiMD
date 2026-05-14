"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePublish } from "@/app/admin/(authed)/cases/actions";

export interface PublishToggleProps {
  caseId: string;
  initialPublishedAt: Date | null;
}

// Inline draft↔published toggle on the cases list. Uses the existing
// togglePublish server action; same idempotent semantics as the editor's
// header button.
export function PublishToggle({
  caseId,
  initialPublishedAt,
}: PublishToggleProps) {
  const router = useRouter();
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    initialPublishedAt
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isPublished = publishedAt !== null;

  const handleClick = () => {
    if (isPending) return;
    setError(null);
    const wantPublished = !isPublished;
    // Optimistic
    setPublishedAt(wantPublished ? new Date() : null);
    startTransition(async () => {
      const result = await togglePublish({ caseId, publish: wantPublished });
      if (!result.ok) {
        setPublishedAt(initialPublishedAt); // rollback
        setError(result.error);
        return;
      }
      setPublishedAt(result.publishedAt);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3">
      {error && (
        <span className="font-mono text-[10px] text-[var(--warning)]">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          "font-mono text-[10px] uppercase tracking-[0.18em] py-2 px-3 rounded-[2px] transition-colors disabled:opacity-50 whitespace-nowrap " +
          (isPublished
            ? "border border-rule-strong text-ink-mute hover:text-[var(--warning)] hover:border-[var(--warning)]"
            : "bg-ink text-paper hover:bg-accent")
        }
      >
        {isPending
          ? "…"
          : isPublished
            ? "Unpublish"
            : "Publish"}
      </button>
    </div>
  );
}
