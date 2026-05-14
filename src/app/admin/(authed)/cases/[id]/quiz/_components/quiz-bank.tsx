"use client";

import { useState } from "react";
import { QuestionCard } from "./question-card";
import { QuestionEditor } from "./question-editor";
import type { QuestionWithChoices } from "@/lib/queries/quiz";
import type { QuizScope } from "../actions";

export interface QuizBankProps {
  caseId: string;
  initial: { pre: QuestionWithChoices[]; post: QuestionWithChoices[] };
  defaultQuizQuestionCount: number;
}

// Two-tab manager (Pre / Post). Each tab lists collapsible question cards
// + an inline "+ Add question" button that swaps into the new-question
// editor when clicked.
export function QuizBank({ caseId, initial }: QuizBankProps) {
  const [tab, setTab] = useState<QuizScope>("pre");
  const [adding, setAdding] = useState(false);

  const questions = initial[tab];

  return (
    <div>
      {/* Tab strip */}
      <div className="flex gap-8 mb-10 border-b border-rule">
        {(["pre", "post"] as const).map((s) => {
          const count = initial[s].length;
          const active = tab === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => {
                setTab(s);
                setAdding(false);
              }}
              className={
                "py-3 -mb-px border-b font-mono text-[10px] uppercase tracking-[0.2em] transition-colors " +
                (active
                  ? "text-ink border-accent"
                  : "text-ink-mute border-transparent hover:text-ink")
              }
            >
              {s}-test
              <span className="ml-2 text-ink-fade">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Question list */}
      {questions.length === 0 && !adding && (
        <p className="font-serif italic text-[16px] text-ink-mute mb-6">
          No {tab}-test questions yet. Add your first below.
        </p>
      )}

      {questions.map((q, i) => (
        <QuestionCard
          key={q.question.id}
          caseId={caseId}
          scope={tab}
          index={i}
          question={{
            id: q.question.id,
            prompt: q.question.prompt,
            choices: q.choices.map((c) => ({
              id: c.id,
              text: c.text,
              isCorrect: c.isCorrect,
            })),
          }}
        />
      ))}

      {/* Add new question */}
      {adding ? (
        <QuestionEditor
          caseId={caseId}
          scope={tab}
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
