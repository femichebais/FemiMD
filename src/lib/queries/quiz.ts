import { eq, and, isNull, asc, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  quizzes,
  quizQuestions,
  quizChoices,
  cases,
  type QuizQuestion,
  type QuizChoice,
  type Quiz,
} from "@/db/schema";

export type QuizScope = "pre" | "post";

export interface QuestionWithChoices {
  question: QuizQuestion;
  choices: QuizChoice[];
}

// =============================================================================
// Case-attached quizzes — every case has a "pre" and a "post" quiz auto-
// provisioned the first time the admin opens its bank.
// =============================================================================

// Find or create the quiz row for (case, scope). Used by the case-attached
// admin quiz bank — keeps the legacy UX (pre/post tabs per case) while
// fitting the new schema where quizzes are first-class.
export async function ensureCaseQuiz(
  caseId: string,
  scope: QuizScope
): Promise<string> {
  const [existing] = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(
      and(
        eq(quizzes.caseId, caseId),
        eq(quizzes.scope, scope),
        isNull(quizzes.deletedAt)
      )
    )
    .limit(1);
  if (existing) return existing.id;

  // Look up the case title so we can give the new quiz a sensible default.
  const [theCase] = await db
    .select({ title: cases.title })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);

  const title = theCase
    ? `${theCase.title} · ${scope === "pre" ? "Pre-test" : "Post-test"}`
    : scope === "pre"
      ? "Pre-test"
      : "Post-test";

  const [inserted] = await db
    .insert(quizzes)
    .values({ caseId, scope, title })
    .returning({ id: quizzes.id });
  return inserted.id;
}

// =============================================================================
// Question bank queries
// =============================================================================

export async function listQuestionsForBank(
  caseId: string,
  scope: QuizScope
): Promise<QuestionWithChoices[]> {
  const quizId = await ensureCaseQuiz(caseId, scope);

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(
      and(eq(quizQuestions.quizId, quizId), isNull(quizQuestions.deletedAt))
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

export async function pickRandomQuestions(
  quizId: string,
  n: number
): Promise<QuestionWithChoices[]> {
  const questions = await db
    .select()
    .from(quizQuestions)
    .where(
      and(eq(quizQuestions.quizId, quizId), isNull(quizQuestions.deletedAt))
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

export async function getChoicesForGrading(
  questionIds: string[]
): Promise<QuizChoice[]> {
  if (questionIds.length === 0) return [];
  return await db
    .select()
    .from(quizChoices)
    .where(inArray(quizChoices.questionId, questionIds));
}

// =============================================================================
// Standalone quiz helpers (for admin /admin/quizzes UI)
// =============================================================================

export interface AdminQuizRow {
  id: string;
  title: string;
  topic: string | null;
  caseId: string | null;
  scope: QuizScope | null;
  caseTitle: string | null;
  questionCount: number;
  createdAt: Date;
}

export async function listAllQuizzes(): Promise<AdminQuizRow[]> {
  const rows = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      topic: quizzes.topic,
      caseId: quizzes.caseId,
      scope: quizzes.scope,
      createdAt: quizzes.createdAt,
      caseTitle: cases.title,
      questionCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${quizQuestions}
        WHERE ${quizQuestions.quizId} = ${quizzes.id}
          AND ${quizQuestions.deletedAt} IS NULL
      )`,
    })
    .from(quizzes)
    .leftJoin(cases, eq(cases.id, quizzes.caseId))
    .where(isNull(quizzes.deletedAt))
    .orderBy(asc(quizzes.title));

  return rows;
}

export async function getQuizById(quizId: string): Promise<Quiz | null> {
  const [row] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), isNull(quizzes.deletedAt)))
    .limit(1);
  return row ?? null;
}
