"use client";

import { useState } from "react";
import { QuestionEditor } from "./question-editor";

export interface QuestionListProps {
  quizId: string;
  questions: Array<{
    id: string;
    prompt: string;
    choices: Array<{ id: string; text: string; isCorrect: boolean }>;
  }>;
}

export function QuestionList({ quizId, questions }: QuestionListProps) {
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      {questions.length === 0 && !adding && (
        <p className="font-serif italic text-[16px] text-ink-mute mb-6">
          No questions yet.
        </p>
      )}

      {questions.map((q, i) => {
        if (openId === q.id) {
          return (
            <QuestionEditor
              key={q.id}
              quizId={quizId}
              question={q}
              onSaved={() => setOpenId(null)}
              onCancel={() => setOpenId(null)}
            />
          );
        }
        const correctIndex = q.choices.findIndex((c) => c.isCorrect);
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => setOpenId(q.id)}
            className="w-full flex items-center gap-[18px] px-[22px] py-4 text-left bg-surface border border-rule-strong hover:border-ink-fade rounded-[2px] mb-2 transition-colors"
          >
            <span className="font-mono text-[11px] text-ink-fade w-6 tracking-[0.05em]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-serif text-[16px] flex-1 text-ink truncate">
              {q.prompt || (
                <span className="text-ink-fade italic">No prompt yet</span>
              )}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
              {q.choices.length} choices · correct{" "}
              {correctIndex === -1 ? "—" : String.fromCharCode(65 + correctIndex)}
            </span>
          </button>
        );
      })}

      {adding ? (
        <QuestionEditor
          quizId={quizId}
          onSaved={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full mt-3 px-4 py-4 border border-dashed border-rule-strong rounded-[2px] font-sans text-[13px] text-ink-mute hover:border-accent hover:text-accent transition-colors"
        >
          + Add question
        </button>
      )}
    </div>
  );
}
