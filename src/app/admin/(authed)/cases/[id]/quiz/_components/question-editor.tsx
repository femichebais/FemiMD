"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, FieldLabel, Input } from "@/components/ui";
import {
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  type QuestionDraft,
  type QuizScope,
} from "../actions";

let tempIdSeq = 0;
function nextTempId() {
  tempIdSeq += 1;
  return `c_${tempIdSeq}_${Math.random().toString(36).slice(2, 6)}`;
}

interface ClientChoice {
  tempId: string;
  text: string;
  isCorrect: boolean;
}

function emptyChoice(): ClientChoice {
  return { tempId: nextTempId(), text: "", isCorrect: false };
}

export interface QuestionEditorProps {
  caseId: string;
  scope: QuizScope;
  // Set for existing questions; absent for the "new" form.
  question?: {
    id: string;
    prompt: string;
    choices: Array<{ id: string; text: string; isCorrect: boolean }>;
  };
  onSaved?: () => void;
  onCancel?: () => void;
}

export function QuestionEditor({
  caseId,
  scope,
  question,
  onSaved,
  onCancel,
}: QuestionEditorProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [choices, setChoices] = useState<ClientChoice[]>(
    question
      ? question.choices.map((c) => ({
          tempId: nextTempId(),
          text: c.text,
          isCorrect: c.isCorrect,
        }))
      : [
          { tempId: nextTempId(), text: "", isCorrect: true },
          emptyChoice(),
          emptyChoice(),
          emptyChoice(),
        ]
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const handleSave = () => {
    setError(null);
    const draft: QuestionDraft = {
      prompt,
      choices: choices.map((c) => ({
        text: c.text,
        isCorrect: c.isCorrect,
      })),
    };
    startSave(async () => {
      const result = question
        ? await updateQuizQuestion({
            questionId: question.id,
            caseId,
            draft,
          })
        : await createQuizQuestion({ caseId, scope, draft });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSaved?.();
    });
  };

  const handleDelete = () => {
    if (!question) return;
    if (!confirm("Delete this question?")) return;
    startDelete(async () => {
      const result = await deleteQuizQuestion({
        questionId: question.id,
        caseId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSaved?.();
    });
  };

  const setCorrect = (tempId: string) => {
    setChoices((prev) =>
      prev.map((c) => ({ ...c, isCorrect: c.tempId === tempId }))
    );
  };

  return (
    <div className="border border-rule-strong bg-surface rounded-[2px] p-6 mb-3">
      <div>
        <FieldLabel>Prompt</FieldLabel>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Which of the following is the most likely cause of…"
          className="font-serif"
        />
      </div>

      <div className="mt-6">
        <FieldLabel>Choices · mark one correct</FieldLabel>
        <div className="border border-rule-strong rounded-[2px]">
          {choices.map((c, i) => (
            <div
              key={c.tempId}
              className="grid grid-cols-[28px_1fr_110px_24px] gap-3 items-center px-4 py-3 border-b border-rule last:border-b-0"
            >
              <span className="font-mono text-[12px] text-ink-fade">
                {String.fromCharCode(65 + i)}
              </span>
              <input
                type="text"
                value={c.text}
                onChange={(e) =>
                  setChoices((prev) =>
                    prev.map((p) =>
                      p.tempId === c.tempId
                        ? { ...p, text: e.target.value }
                        : p
                    )
                  )
                }
                placeholder="Choice text"
                className="bg-transparent border-none font-serif text-[15px] text-ink focus:outline-none"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`correct-${question?.id ?? "new"}`}
                  checked={c.isCorrect}
                  onChange={() => setCorrect(c.tempId)}
                  className="accent-accent"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-mute">
                  Correct
                </span>
              </label>
              <button
                type="button"
                disabled={choices.length <= 2}
                onClick={() =>
                  setChoices((prev) =>
                    prev.filter((p) => p.tempId !== c.tempId)
                  )
                }
                title={
                  choices.length <= 2
                    ? "A question needs at least 2 choices"
                    : "Remove choice"
                }
                className="font-mono text-[14px] text-ink-fade hover:text-[var(--warning)] disabled:opacity-30 disabled:cursor-not-allowed leading-none"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setChoices((prev) => [...prev, emptyChoice()])
            }
            className="w-full text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent border-t border-rule transition-colors"
          >
            + Add choice
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
        >
          {error}
        </p>
      )}

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-rule">
        {question ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade hover:text-[var(--warning)] disabled:opacity-50 transition-colors"
          >
            {isDeleting ? "Deleting…" : "Delete question"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
            >
              Cancel
            </button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : question ? "Save changes" : "Add question"}
          </Button>
        </div>
      </div>
    </div>
  );
}
