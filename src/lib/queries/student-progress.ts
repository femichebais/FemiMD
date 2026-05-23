import { eq, desc, inArray, asc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  caseAttempts,
  cases,
  quizAttempts,
  stages,
  stageAttempts,
  stageTypeEnum,
} from "@/db/schema";

export type StageType = (typeof stageTypeEnum.enumValues)[number];

export interface StageBreakdownEntry {
  stageType: StageType;
  position: number;
  earnedScore: number;
}

export interface ProgressAttempt {
  id: string;
  caseId: string;
  caseTitle: string;
  startedAt: Date;
  completedAt: Date | null;
  totalScore: number | null;
  stageBreakdown: StageBreakdownEntry[];
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
  const attempts = await db
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

  if (attempts.length === 0) return [];

  // Fetch per-stage scores for every attempt in one round trip, then bucket
  // by attempt id. Cheaper than N+1 and the per-attempt rows are tiny.
  const attemptIds = attempts.map((a) => a.id);
  const stageRows = await db
    .select({
      attemptId: stageAttempts.caseAttemptId,
      stageType: stages.type,
      position: stages.position,
      earnedScore: stageAttempts.earnedScore,
    })
    .from(stageAttempts)
    .innerJoin(stages, eq(stages.id, stageAttempts.stageId))
    .where(inArray(stageAttempts.caseAttemptId, attemptIds))
    .orderBy(asc(stages.position));

  const breakdownByAttempt = new Map<string, StageBreakdownEntry[]>();
  for (const r of stageRows) {
    const list = breakdownByAttempt.get(r.attemptId) ?? [];
    list.push({
      stageType: r.stageType,
      position: r.position,
      earnedScore: r.earnedScore,
    });
    breakdownByAttempt.set(r.attemptId, list);
  }

  return attempts.map((a) => ({
    ...a,
    stageBreakdown: breakdownByAttempt.get(a.id) ?? [],
  }));
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
