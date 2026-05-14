import { eq, and, isNull, asc, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  quizQuestions,
  quizChoices,
  type QuizQuestion,
  type QuizChoice,
} from "@/db/schema";

export type QuizScope = "pre" | "post";

export interface QuestionWithChoices {
  question: QuizQuestion;
  choices: QuizChoice[];
}

// Full question bank for the admin manager — every active question for
// (caseId, scope), with its choices, ordered for stable display.
export async function listQuestionsForBank(
  caseId: string,
  scope: QuizScope
): Promise<QuestionWithChoices[]> {
  const questions = await db
    .select()
    .from(quizQuestions)
    .where(
      and(
        eq(quizQuestions.caseId, caseId),
        eq(quizQuestions.scope, scope),
        isNull(quizQuestions.deletedAt)
      )
    )
    .orderBy(asc(quizQuestions.createdAt));

  if (questions.length === 0) return [];

  const allChoices = await db
    .select()
    .from(quizChoices)
    .where(
      inArray(
        quizChoices.questionId,
        questions.map((q) => q.id)
      )
    )
    .orderBy(asc(quizChoices.displayOrder));

  return questions.map((q) => ({
    question: q,
    choices: allChoices.filter((c) => c.questionId === q.id),
  }));
}

// For the student quiz session: pull N random questions from the pool.
// ORDER BY RANDOM() is fine at our scale (pools of ~30 max). If N exceeds
// the pool size, returns all available — the brief doesn't define behavior,
// so this is the friendliest fallback.
export async function pickRandomQuestions(
  caseId: string,
  scope: QuizScope,
  n: number
): Promise<QuestionWithChoices[]> {
  const questions = await db
    .select()
    .from(quizQuestions)
    .where(
      and(
        eq(quizQuestions.caseId, caseId),
        eq(quizQuestions.scope, scope),
        isNull(quizQuestions.deletedAt)
      )
    )
    .orderBy(sql`RANDOM()`)
    .limit(n);

  if (questions.length === 0) return [];

  const allChoices = await db
    .select()
    .from(quizChoices)
    .where(
      inArray(
        quizChoices.questionId,
        questions.map((q) => q.id)
      )
    )
    .orderBy(asc(quizChoices.displayOrder));

  return questions.map((q) => ({
    question: q,
    choices: allChoices.filter((c) => c.questionId === q.id),
  }));
}

// For submit-side scoring: load choices for a set of question IDs so we
// can verify the student's picks server-side. Never trust client-supplied
// "is_correct" — we look it up here.
export async function getChoicesForGrading(
  questionIds: string[]
): Promise<QuizChoice[]> {
  if (questionIds.length === 0) return [];
  return await db
    .select()
    .from(quizChoices)
    .where(inArray(quizChoices.questionId, questionIds));
}
