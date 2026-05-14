"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, StageLabel } from "@/components/ui";
import type { QuestionWithChoices } from "@/lib/queries/quiz";
import {
  submitQuizAttempt,
  type GradedAnswer,
  type QuizScope,
} from "../actions";

const SCOPE_LABEL: Record<QuizScope, string> = {
  pre: "Pre-test",
  post: "Post-test",
};

interface GradedState {
  score: number;
  total: number;
  graded: Map<string, GradedAnswer>;
}

export interface QuizPlayerProps {
  caseId: string;
  caseTitle: string;
  scope: QuizScope;
  quizId: string;
  questions: QuestionWithChoices[];
}

export function QuizPlayer({
  caseId,
  caseTitle,
  scope,
  quizId,
  questions,
}: QuizPlayerProps) {
  const router = useRouter();
  const [picks, setPicks] = useState<Map<string, string>>(new Map());
  const [graded, setGraded] = useState<GradedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  const allAnswered = picks.size === questions.length;

  const handleSubmit = () => {
    if (graded || !allAnswered) return;
    setError(null);
    startSubmit(async () => {
      const result = await submitQuizAttempt({
        caseId,
        scope,
        quizId,
        answers: questions.map((q) => ({
          questionId: q.question.id,
          choiceId: picks.get(q.question.id)!,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const map = new Map<string, GradedAnswer>();
      for (const g of result.graded) map.set(g.questionId, g);
      setGraded({ score: result.score, total: result.total, graded: map });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleRetake = () => {
    // Fresh random subset = fresh page load. router.refresh() re-runs the
    // server component which calls pickRandomQuestions() again.
    setPicks(new Map());
    setGraded(null);
    setError(null);
    router.refresh();
  };

  return (
    <main className="px-6 md:px-12 py-10 md:py-14 pb-20">
      <div className="max-w-case mx-auto">
        <StageLabel className="mb-5">
          {SCOPE_LABEL[scope]} · {caseTitle}
        </StageLabel>
        <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
          {graded
            ? "Here's how you did."
            : scope === "pre"
              ? "Before you start."
              : "Test what stuck."}
        </h1>
        <p className="font-serif italic text-[16px] text-ink-mute mb-12">
          {graded
            ? "Review the answers below. Retake any time for a fresh set."
            : `${questions.length} question${questions.length === 1 ? "" : "s"} · pick one answer each.`}
        </p>

        {/* Score banner — only post-submit */}
        {graded && (
          <section className="bg-paper-2 border border-rule-strong rounded-[2px] px-7 py-7 mb-14 flex items-baseline justify-between gap-6">
            <div>
              <div className="label-mono mb-2">Your score</div>
              <div className="font-serif text-[44px] leading-none font-normal tabular-nums">
                {graded.score}
                <span className="text-ink-mute text-[28px] ml-2">
                  / {graded.total}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
              >
                Retake →
              </button>
            </div>
          </section>
        )}

        {/* Questions */}
        {questions.map((q, i) => {
          const picked = picks.get(q.question.id);
          const g = graded?.graded.get(q.question.id);
          return (
            <section key={q.question.id} className="mb-12">
              <StageLabel className="mb-3">
                Question {i + 1} of {questions.length}
              </StageLabel>
              <h2 className="font-serif text-[22px] leading-[1.3] font-normal tracking-[-0.01em] mb-6">
                {q.question.prompt}
              </h2>

              <ul className="flex flex-col -mt-px">
                {q.choices.map((choice, j) => {
                  const isPicked = picked === choice.id;
                  const isCorrect =
                    g !== undefined &&
                    g.correctChoiceId === choice.id;
                  const isWrongPick =
                    g !== undefined &&
                    isPicked &&
                    !g.isCorrect;

                  return (
                    <li key={choice.id}>
                      <button
                        type="button"
                        disabled={Boolean(graded) || isSubmitting}
                        onClick={() => {
                          if (graded || isSubmitting) return;
                          setPicks((prev) => {
                            const next = new Map(prev);
                            next.set(q.question.id, choice.id);
                            return next;
                          });
                        }}
                        className={
                          "group relative w-full flex items-baseline gap-5 text-left px-4 pl-[14px] py-[14px] border-b border-rule first:border-t first:border-t-rule transition-colors " +
                          (graded
                            ? isCorrect
                              ? "bg-accent-soft"
                              : isWrongPick
                                ? "bg-[#F6E8DE]" // soft warning paper
                                : ""
                            : isPicked
                              ? "bg-accent-soft"
                              : "hover:bg-paper-2 cursor-pointer")
                        }
                      >
                        <span
                          aria-hidden
                          className={
                            "absolute left-0 top-0 bottom-0 w-[2px] transition-colors " +
                            (graded
                              ? isCorrect
                                ? "bg-accent"
                                : isWrongPick
                                  ? "bg-[var(--warning)]"
                                  : "bg-transparent"
                              : isPicked
                                ? "bg-accent"
                                : "bg-transparent group-hover:bg-accent")
                          }
                        />
                        <span
                          className={
                            "font-mono text-[11px] w-[14px] flex-shrink-0 " +
                            (graded
                              ? isCorrect
                                ? "text-accent font-medium"
                                : isWrongPick
                                  ? "text-[var(--warning)] font-medium"
                                  : "text-ink-fade"
                              : isPicked
                                ? "text-accent font-medium"
                                : "text-ink-fade")
                          }
                        >
                          {String.fromCharCode(65 + j)}
                        </span>
                        <span className="font-serif text-[17px] leading-[1.4] text-ink flex-1">
                          {choice.text}
                        </span>
                        {graded && (
                          <span
                            className={
                              "font-mono text-[10px] uppercase tracking-[0.05em] " +
                              (isCorrect
                                ? "text-accent"
                                : isWrongPick
                                  ? "text-[var(--warning)]"
                                  : "text-ink-fade")
                            }
                          >
                            {isCorrect
                              ? "Correct answer"
                              : isWrongPick
                                ? "Your answer"
                                : ""}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {/* Submit row */}
        {!graded && (
          <div className="flex justify-between items-center mt-10 pt-6 border-t border-rule">
            <div className="font-mono text-[11px] text-ink-mute tracking-[0.05em]">
              {picks.size} of {questions.length} answered
            </div>
            {error && (
              <p
                role="alert"
                className="font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
              >
                {error}
              </p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
            >
              {isSubmitting ? "Grading…" : "Submit answers →"}
            </Button>
          </div>
        )}

        {graded && (
          <div className="mt-12 pt-6 border-t border-rule flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            <Link
              href={`/student/case/${caseId}/feedback`}
              className="hover:text-ink transition-colors"
            >
              Case feedback
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="/student"
              className="hover:text-ink transition-colors"
            >
              All cases
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
