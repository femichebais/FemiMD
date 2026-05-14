"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { quizAttempts } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { getChoicesForGrading } from "@/lib/queries/quiz";
import { accessibleQuizIds } from "@/lib/queries/student-quizzes";

export type QuizScope = "pre" | "post";

export interface QuizAnswerInput {
  questionId: string;
  choiceId: string;
}

export interface GradedAnswer {
  questionId: string;
  pickedChoiceId: string;
  isCorrect: boolean;
  correctChoiceId: string | null;
}

export type SubmitQuizResult =
  | {
      ok: true;
      attemptId: string;
      score: number;
      total: number;
      graded: GradedAnswer[];
    }
  | { ok: false; error: string };

export async function submitQuizAttempt(args: {
  // Primary access key — required.
  quizId: string;
  // Only set for case-attached pre/post tests. We still record them on
  // quiz_attempts so the "is the case completed?" check (which queries
  // case_id+scope) keeps working.
  caseId?: string;
  scope?: QuizScope;
  answers: QuizAnswerInput[];
}): Promise<SubmitQuizResult> {
  const { user } = await requireRole("student");

  if (args.answers.length === 0) {
    return { ok: false, error: "No answers submitted." };
  }

  // Unified access check via the quiz-id-set union (classroom release +
  // admin grant + inherited from case access). Same logic the list view
  // uses, so the take page and submit can't disagree.
  const accessible = await accessibleQuizIds(user.id);
  if (!accessible.has(args.quizId)) {
    return { ok: false, error: "Quiz not available." };
  }

  // Grade server-side using the DB's is_correct values. Don't trust the
  // client to compute correctness or send a score.
  const questionIds = args.answers.map((a) => a.questionId);
  const choices = await getChoicesForGrading(questionIds);
  const choicesByQuestion = new Map<string, typeof choices>();
  for (const c of choices) {
    const arr = choicesByQuestion.get(c.questionId) ?? [];
    arr.push(c);
    choicesByQuestion.set(c.questionId, arr);
  }

  const graded: GradedAnswer[] = [];
  for (const ans of args.answers) {
    const pool = choicesByQuestion.get(ans.questionId);
    if (!pool || pool.length === 0) {
      return { ok: false, error: "Unknown question in submission." };
    }
    const picked = pool.find((c) => c.id === ans.choiceId);
    if (!picked) {
      return { ok: false, error: "Choice does not belong to its question." };
    }
    const correct = pool.find((c) => c.isCorrect);
    graded.push({
      questionId: ans.questionId,
      pickedChoiceId: ans.choiceId,
      isCorrect: picked.isCorrect === true,
      correctChoiceId: correct?.id ?? null,
    });
  }

  const score = graded.filter((g) => g.isCorrect).length;
  const total = graded.length;

  let attemptId = "";
  try {
    const [row] = await db
      .insert(quizAttempts)
      .values({
        studentId: user.id,
        quizId: args.quizId,
        caseId: args.caseId ?? null,
        scope: args.scope ?? null,
        questionCount: total,
        score,
        answers: graded.map((g) => ({
          question_id: g.questionId,
          choice_id: g.pickedChoiceId,
          is_correct: g.isCorrect,
        })),
      })
      .returning({ id: quizAttempts.id });
    attemptId = row.id;
  } catch (err) {
    console.error("[student/submitQuizAttempt]", err);
    return { ok: false, error: "Could not save your attempt." };
  }

  // Post-test completion may flip "case is officially completed" on the
  // dashboard — invalidate so the next visit reflects that.
  revalidatePath("/student");
  revalidatePath("/student/quizzes");

  return { ok: true, attemptId, score, total, graded };
}
