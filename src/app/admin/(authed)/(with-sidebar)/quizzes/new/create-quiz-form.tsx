"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, FieldLabel, Input } from "@/components/ui";
import {
  createQuiz,
  type QuizMetaFormState,
} from "../actions";

export interface CreateQuizFormProps {
  cases: Array<{ id: string; title: string }>;
}

export function CreateQuizForm({ cases }: CreateQuizFormProps) {
  const [state, formAction, isPending] = useActionState<
    QuizMetaFormState,
    FormData
  >(createQuiz, {});
  const [caseId, setCaseId] = useState(state.values?.caseId ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-7">
      <div>
        <FieldLabel htmlFor="title">Title</FieldLabel>
        <Input
          id="title"
          name="title"
          required
          maxLength={200}
          defaultValue={state.values?.title ?? ""}
          placeholder="Cardiovascular basics · Quiz 1"
        />
      </div>

      <div>
        <FieldLabel htmlFor="topic">Topic</FieldLabel>
        <Input
          id="topic"
          name="topic"
          defaultValue={state.values?.topic ?? ""}
          placeholder="Cardiology"
        />
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
          Optional. Used to group quizzes for student-built-quiz-by-topic.
        </p>
      </div>

      <div>
        <FieldLabel htmlFor="case_id">Attach to case</FieldLabel>
        <select
          id="case_id"
          name="case_id"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          className="w-full border border-rule-strong bg-surface rounded-[2px] px-[14px] py-3 font-sans text-[14px] focus:outline-none focus:border-accent"
        >
          <option value="">No — standalone quiz</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
          Optional. Attach to a case to use as its pre or post test.
        </p>
      </div>

      {caseId && (
        <div>
          <FieldLabel>Scope</FieldLabel>
          <div className="flex gap-6">
            {(["pre", "post"] as const).map((s) => (
              <label
                key={s}
                className="flex items-center gap-[10px] text-[14px] cursor-pointer"
              >
                <input
                  type="radio"
                  name="scope"
                  value={s}
                  defaultChecked={state.values?.scope === s}
                  required
                  className="accent-accent"
                />
                {s === "pre" ? "Pre-test" : "Post-test"}
              </label>
            ))}
          </div>
        </div>
      )}

      {state.error && (
        <p
          role="alert"
          className="font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-rule pt-6">
        <Link
          href="/admin/quizzes"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← Back
        </Link>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create quiz"}
        </Button>
      </div>
    </form>
  );
}
