"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { quizAttempts } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { getCaseForStudent } from "@/lib/queries/student-cases";
import { getChoicesForGrading } from "@/lib/queries/quiz";

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
  caseId: string;
  scope: QuizScope;
  answers: QuizAnswerInput[];
}): Promise<SubmitQuizResult> {
  const { user } = await requireRole("student");

  if (args.scope !== "pre" && args.scope !== "post") {
    return { ok: false, error: "Invalid scope." };
  }
  if (args.answers.length === 0) {
    return { ok: false, error: "No answers submitted." };
  }

  // Access check — student must own this case via classroom + release + level.
  const access = await getCaseForStudent(user.id, args.caseId);
  if (!access) return { ok: false, error: "Case not available." };

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

  // Record. The answers jsonb captures the picked choice id per question
  // so a teacher drilling down can replay the session — even if a question
  // is later edited or deleted.
  let attemptId = "";
  try {
    const [row] = await db
      .insert(quizAttempts)
      .values({
        studentId: user.id,
        caseId: args.caseId,
        scope: args.scope,
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
  // student dashboard — invalidate it so the next visit reflects that.
  revalidatePath("/student");

  return { ok: true, attemptId, score, total, graded };
}
