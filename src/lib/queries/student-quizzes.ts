import { eq, and, isNull, asc, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  quizzes,
  quizQuestions,
  quizChoices,
  quizReleases,
  studentQuizGrants,
  caseReleases,
  studentCaseGrants,
  classrooms,
  students,
  cases,
  type Quiz,
  type QuizQuestion,
  type QuizChoice,
} from "@/db/schema";

// Accessible quiz IDs — union of three paths:
//   1. Direct quiz release to student's classroom (quiz_releases)
//   2. Admin override grant (student_quiz_grants)
//   3. Inherited from case access — if the student can see a case, they can
//      take its pre/post quizzes too. Keeps the original release-a-case-and-
//      its-tests-come-with-it UX so teachers don't have to remember to
//      release each pre/post separately.
async function accessibleQuizIds(studentId: string): Promise<Set<string>> {
  const [studentRow] = await db
    .select({ classroomId: students.classroomId })
    .from(students)
    .where(and(eq(students.id, studentId), isNull(students.deletedAt)))
    .limit(1);

  const ids = new Set<string>();

  if (studentRow?.classroomId) {
    // Path 1: direct quiz releases
    const released = await db
      .select({ quizId: quizReleases.quizId })
      .from(quizReleases)
      .where(eq(quizReleases.classroomId, studentRow.classroomId));
    for (const r of released) ids.add(r.quizId);

    // Path 3: quizzes attached to released cases — JOIN through caseReleases
    const caseAttached = await db
      .select({ quizId: quizzes.id })
      .from(quizzes)
      .innerJoin(caseReleases, eq(caseReleases.caseId, quizzes.caseId))
      .where(
        and(
          eq(caseReleases.classroomId, studentRow.classroomId),
          isNull(quizzes.deletedAt)
        )
      );
    for (const r of caseAttached) ids.add(r.quizId);
  }

  // Path 2: admin override grants
  const granted = await db
    .select({ quizId: studentQuizGrants.quizId })
    .from(studentQuizGrants)
    .where(eq(studentQuizGrants.studentId, studentId));
  for (const g of granted) ids.add(g.quizId);

  // Also: quizzes attached to cases granted via student_case_grants
  const caseGranted = await db
    .select({ quizId: quizzes.id })
    .from(quizzes)
    .innerJoin(studentCaseGrants, eq(studentCaseGrants.caseId, quizzes.caseId))
    .where(
      and(
        eq(studentCaseGrants.studentId, studentId),
        isNull(quizzes.deletedAt)
      )
    );
  for (const r of caseGranted) ids.add(r.quizId);

  return ids;
}

// Re-export for the submit action's access check.
export { accessibleQuizIds };

export interface StudentQuizRow {
  id: string;
  title: string;
  topic: string | null;
  scope: "pre" | "post" | null;
  caseId: string | null;
  caseTitle: string | null;
  questionCount: number;
}

export async function listStudentQuizzes(
  studentId: string
): Promise<StudentQuizRow[]> {
  const ids = await accessibleQuizIds(studentId);
  if (ids.size === 0) return [];

  const rows = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      topic: quizzes.topic,
      scope: quizzes.scope,
      caseId: quizzes.caseId,
      caseTitle: cases.title,
      questionCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${quizQuestions}
        WHERE ${quizQuestions.quizId} = ${quizzes.id}
          AND ${quizQuestions.deletedAt} IS NULL
      )`,
    })
    .from(quizzes)
    .leftJoin(cases, eq(cases.id, quizzes.caseId))
    .where(and(inArray(quizzes.id, Array.from(ids)), isNull(quizzes.deletedAt)))
    .orderBy(asc(quizzes.title));

  return rows;
}

export interface QuizPlayData {
  quiz: Quiz;
  caseTitle: string | null;
  questions: Array<{ question: QuizQuestion; choices: QuizChoice[] }>;
}

// For the take page: validates access, pulls a random subset of questions.
// N comes from the case's quiz_question_count if case-attached, otherwise 10.
export async function getStudentQuizPlay(
  studentId: string,
  quizId: string
): Promise<QuizPlayData | null> {
  const ids = await accessibleQuizIds(studentId);
  if (!ids.has(quizId)) return null;

  const [quizRow] = await db
    .select({
      quiz: quizzes,
      caseTitle: cases.title,
      caseQuizCount: cases.quizQuestionCount,
    })
    .from(quizzes)
    .leftJoin(cases, eq(cases.id, quizzes.caseId))
    .where(and(eq(quizzes.id, quizId), isNull(quizzes.deletedAt)))
    .limit(1);

  if (!quizRow) return null;

  // N: case-attached uses the case's quiz_question_count; standalone
  // defaults to 10. Could be made configurable later.
  const n = quizRow.caseQuizCount ?? 10;

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(
      and(eq(quizQuestions.quizId, quizId), isNull(quizQuestions.deletedAt))
    )
    .orderBy(sql`RANDOM()`)
    .limit(n);

  if (questions.length === 0) {
    return { quiz: quizRow.quiz, caseTitle: quizRow.caseTitle, questions: [] };
  }

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

  return {
    quiz: quizRow.quiz,
    caseTitle: quizRow.caseTitle,
    questions: questions.map((q) => ({
      question: q,
      choices: allChoices.filter((c) => c.questionId === q.id),
    })),
  };
}
