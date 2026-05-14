"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, FieldLabel, Input } from "@/components/ui";
import { updateQuizMeta, deleteQuiz } from "../../actions";

export interface QuizMetaEditorProps {
  quizId: string;
  initial: { title: string; topic: string };
}

export function QuizMetaEditor({ quizId, initial }: QuizMetaEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [topic, setTopic] = useState(initial.topic);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const dirty = title !== initial.title || topic !== initial.topic;

  const handleSave = () => {
    if (!dirty || isSaving) return;
    setError(null);
    setSaved(false);
    startSave(async () => {
      const result = await updateQuizMeta({ quizId, title, topic });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (
      !confirm(
        "Delete this quiz? Soft-delete — existing attempts are kept for history."
      )
    )
      return;
    startDelete(async () => {
      const result = await deleteQuiz({ quizId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/quizzes");
    });
  };

  return (
    <div className="border border-rule-strong rounded-[2px] p-6 mb-12 bg-surface">
      <div className="grid grid-cols-[1fr_1fr] gap-5">
        <div>
          <FieldLabel htmlFor="quiz-title">Title</FieldLabel>
          <Input
            id="quiz-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaved(false);
            }}
            maxLength={200}
          />
        </div>
        <div>
          <FieldLabel htmlFor="quiz-topic">Topic</FieldLabel>
          <Input
            id="quiz-topic"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setSaved(false);
            }}
            placeholder="Cardiology"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-rule">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || isSaving}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade hover:text-[var(--warning)] disabled:opacity-50 transition-colors"
        >
          {isDeleting ? "Deleting…" : "Delete quiz"}
        </button>
        <div className="flex items-center gap-3">
          {error && (
            <span className="font-mono text-[11px] text-[var(--warning)]">
              {error}
            </span>
          )}
          {saved && !dirty && !isSaving && (
            <span className="font-mono text-[11px] text-accent tracking-[0.05em]">
              Saved
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={!dirty || isSaving}
            size="sm"
          >
            {isSaving ? "Saving…" : "Save meta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
