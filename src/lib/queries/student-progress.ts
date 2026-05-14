import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { caseAttempts, cases, quizAttempts } from "@/db/schema";

export interface ProgressAttempt {
  id: string;
  caseId: string;
  caseTitle: string;
  startedAt: Date;
  completedAt: Date | null;
  totalScore: number | null;
}

export interface ProgressQuizAttempt {
  id: string;
  // Nullable since the quiz refactor — standalone quizzes have no case.
  caseId: string | null;
  caseTitle: string | null;
  scope: "pre" | "post" | null;
  score: number;
  questionCount: number;
  completedAt: Date;
}

export async function listStudentCaseAttempts(
  studentId: string
): Promise<ProgressAttempt[]> {
  return await db
    .select({
      id: caseAttempts.id,
      caseId: caseAttempts.caseId,
      caseTitle: cases.title,
      startedAt: caseAttempts.startedAt,
      completedAt: caseAttempts.completedAt,
      totalScore: caseAttempts.totalScore,
    })
    .from(caseAttempts)
    .innerJoin(cases, eq(cases.id, caseAttempts.caseId))
    .where(eq(caseAttempts.studentId, studentId))
    .orderBy(desc(caseAttempts.startedAt));
}

export async function listStudentQuizAttempts(
  studentId: string
): Promise<ProgressQuizAttempt[]> {
  return await db
    .select({
      id: quizAttempts.id,
      caseId: quizAttempts.caseId,
      caseTitle: cases.title,
      scope: quizAttempts.scope,
      score: quizAttempts.score,
      questionCount: quizAttempts.questionCount,
      completedAt: quizAttempts.completedAt,
    })
    .from(quizAttempts)
    .innerJoin(cases, eq(cases.id, quizAttempts.caseId))
    .where(eq(quizAttempts.studentId, studentId))
    .orderBy(desc(quizAttempts.completedAt));
}

void sql;
