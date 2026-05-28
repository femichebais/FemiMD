"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, X } from "@phosphor-icons/react/dist/ssr";
import {
  CButton,
  CCard,
  CEyebrow,
} from "@/components/clinical/primitives";
import { cn } from "@/lib/utils";
import type { QuestionWithChoices } from "@/lib/queries/quiz";
import {
  submitQuizAttempt,
  type GradedAnswer,
  type QuizScope,
} from "../actions";

interface GradedState {
  score: number;
  total: number;
  graded: Map<string, GradedAnswer>;
}

export interface QuizPlayerProps {
  quizId: string;
  quizTitle: string;
  caseId?: string;
  caseTitle?: string;
  scope?: QuizScope;
  questions: QuestionWithChoices[];
}

export function QuizPlayer({
  caseId,
  caseTitle,
  scope,
  quizId,
  quizTitle,
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
        quizId,
        caseId,
        scope,
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

  const scorePct = !graded
    ? 0
    : graded.total === 0
      ? 0
      : Math.round((graded.score / graded.total) * 100);

  return (
    <main className="px-5 md:px-8 py-10 md:py-14 pb-20">
      <div className="max-w-3xl mx-auto">
        <CEyebrow className="mb-3">
          {caseTitle ? `Quiz · ${caseTitle}` : quizTitle}
        </CEyebrow>
        <h1 className="font-serif text-[36px] md:text-[44px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-3">
          {graded ? "Here's how you did." : "Take the quiz."}
        </h1>
        <p className="text-[17px] text-clinical-muted-fg mb-10">
          {graded
            ? "Review the answers below. Retake any time for a fresh set."
            : `${questions.length} question${questions.length === 1 ? "" : "s"} · pick one answer each.`}
        </p>

        {/* Score banner — only post-submit */}
        {graded && (
          <CCard className="bg-clinical-hero px-6 md:px-8 py-7 mb-12 flex items-baseline justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-2">
                Your score
              </p>
              <div className="font-serif text-[44px] leading-none tabular-nums text-clinical-fg font-medium">
                {scorePct}
                <span className="text-clinical-muted-fg text-[26px] ml-1">
                  %
                </span>
              </div>
              <p className="mt-2 text-[12.5px] text-clinical-muted-fg tabular-nums">
                {graded.score} of {graded.total} correct
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex items-center text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-primary"
            >
              Retake
              <ArrowRight weight="bold" className="ml-1.5 h-3.5 w-3.5" />
            </button>
          </CCard>
        )}

        {/* Questions */}
        {questions.map((q, i) => {
          const picked = picks.get(q.question.id);
          const g = graded?.graded.get(q.question.id);
          return (
            <section key={q.question.id} className="mb-10">
              <CEyebrow className="mb-3">
                Question {i + 1} of {questions.length}
              </CEyebrow>
              <h2 className="font-serif text-[22px] md:text-[24px] leading-[1.25] tracking-[-0.01em] text-clinical-fg font-medium mb-5">
                {q.question.prompt}
              </h2>

              <ul className="flex flex-col gap-2">
                {q.choices.map((choice, j) => {
                  const isPicked = picked === choice.id;
                  const isCorrect =
                    g !== undefined && g.correctChoiceId === choice.id;
                  const isWrongPick =
                    g !== undefined && isPicked && !g.isCorrect;

                  const variant = graded
                    ? isCorrect
                      ? "correct"
                      : isWrongPick
                        ? "wrong"
                        : "default"
                    : isPicked
                      ? "picked"
                      : "default";

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
                        className={cn(
                          "group w-full flex items-center gap-3 text-left px-4 py-3 rounded-clinical border transition-colors",
                          !graded && !isSubmitting && "cursor-pointer",
                          variant === "default" &&
                            "border-clinical-border bg-clinical-card hover:bg-clinical-muted hover:border-clinical-primary/40",
                          variant === "picked" &&
                            "border-clinical-primary bg-clinical-primary-soft",
                          variant === "correct" &&
                            "border-clinical-success/40 bg-clinical-success/10",
                          variant === "wrong" &&
                            "border-clinical-destructive/40 bg-clinical-destructive/10"
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "grid place-items-center h-8 w-8 rounded-clinical flex-shrink-0 text-[13px] font-bold font-mono",
                            variant === "default" &&
                              "bg-clinical-muted text-clinical-muted-fg group-hover:bg-clinical-primary-soft group-hover:text-clinical-primary",
                            variant === "picked" &&
                              "bg-clinical-primary text-clinical-primary-fg",
                            variant === "correct" &&
                              "bg-clinical-success text-white",
                            variant === "wrong" &&
                              "bg-clinical-destructive text-white"
                          )}
                        >
                          {String.fromCharCode(65 + j)}
                        </span>
                        <span className="font-serif text-[17px] leading-[1.4] text-clinical-fg flex-1">
                          {choice.text}
                        </span>
                        {graded && (variant === "correct" || variant === "wrong") && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap",
                              variant === "correct"
                                ? "text-clinical-success"
                                : "text-clinical-destructive"
                            )}
                          >
                            {variant === "correct" ? (
                              <>
                                <Check weight="bold" className="h-3.5 w-3.5" />
                                Correct answer
                              </>
                            ) : (
                              <>
                                <X weight="bold" className="h-3.5 w-3.5" />
                                Your answer
                              </>
                            )}
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
          <div className="flex flex-wrap justify-between items-center gap-3 mt-10 pt-6 border-t border-clinical-border">
            <div className="text-[13px] text-clinical-muted-fg tabular-nums">
              {picks.size} of {questions.length} answered
            </div>
            {error && (
              <p role="alert" className="text-[13px] text-clinical-destructive">
                {error}
              </p>
            )}
            <CButton
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
            >
              {isSubmitting ? "Grading…" : "Submit answers"}
              <ArrowRight weight="bold" className="h-4 w-4" />
            </CButton>
          </div>
        )}

        {graded && (
          <div className="mt-12 pt-6 border-t border-clinical-border flex items-center gap-4">
            {caseId && (
              <Link
                href={`/student/case/${caseId}/feedback`}
                className="text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors"
              >
                Case feedback
              </Link>
            )}
            <Link
              href="/student"
              className="text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors"
            >
              All cases
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
