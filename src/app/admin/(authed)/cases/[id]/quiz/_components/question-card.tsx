"use client";

import { useState } from "react";
import { QuestionEditor } from "./question-editor";
import type { QuizScope } from "../actions";

export interface QuestionCardProps {
  caseId: string;
  scope: QuizScope;
  index: number;
  question: {
    id: string;
    prompt: string;
    choices: Array<{ id: string; text: string; isCorrect: boolean }>;
  };
}

// Collapsed shows prompt preview + choice count. Click expands into the
// editor. Same pattern as the stage card in the case authoring UI.
export function QuestionCard({
  caseId,
  scope,
  index,
  question,
}: QuestionCardProps) {
  const [open, setOpen] = useState(false);
  const correctIndex = question.choices.findIndex((c) => c.isCorrect);

  if (open) {
    return (
      <QuestionEditor
        caseId={caseId}
        scope={scope}
        question={question}
        onSaved={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="w-full flex items-center gap-[18px] px-[22px] py-4 text-left bg-surface border border-rule-strong hover:border-ink-fade rounded-[2px] mb-2 transition-colors"
    >
      <span className="font-mono text-[11px] text-ink-fade w-6 tracking-[0.05em]">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="font-serif text-[16px] flex-1 text-ink truncate">
        {question.prompt || (
          <span className="text-ink-fade italic">No prompt yet</span>
        )}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
        {question.choices.length} choices · correct{" "}
        {correctIndex === -1 ? "—" : String.fromCharCode(65 + correctIndex)}
      </span>
    </button>
  );
}
