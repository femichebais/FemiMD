import { isNull, desc, asc, sql, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  cases,
  stages,
  choices,
  caseAttempts,
  caseLevelConfig,
  type Case,
  type Stage,
  type Choice,
  type CaseLevelConfig,
} from "@/db/schema";

export interface CaseListRow {
  id: string;
  title: string;
  linkedDiagnosisSlug: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  stageCount: number;
  attemptCount: number;
  levels: string[];
}

// One pass with correlated subqueries — way cheaper than joining everything
// and aggregating in JS once cases > a few hundred. We're far below that
// scale, but the shape is the right pattern.
export async function listCases(): Promise<CaseListRow[]> {
  const rows = await db
    .select({
      id: cases.id,
      title: cases.title,
      linkedDiagnosisSlug: cases.linkedDiagnosisSlug,
      createdAt: cases.createdAt,
      publishedAt: cases.publishedAt,
      stageCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${stages} WHERE ${stages.caseId} = ${cases.id}
      )`,
      attemptCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${caseAttempts} WHERE ${caseAttempts.caseId} = ${cases.id}
      )`,
      levels: sql<string[]>`(
        SELECT COALESCE(ARRAY_AGG(${caseLevelConfig.level}::text), '{}'::text[])
        FROM ${caseLevelConfig} WHERE ${caseLevelConfig.caseId} = ${cases.id}
      )`,
    })
    .from(cases)
    .where(isNull(cases.deletedAt))
    .orderBy(desc(cases.createdAt));

  return rows;
}

export interface EditorData {
  case: Case;
  levels: CaseLevelConfig[];
  stages: Stage[];
  choices: Choice[];
  attemptCount: number;
}

// Full editor payload — case + every level + every stage + every choice.
// Used by /admin/cases/[id]. Three queries; choices fetched in one batch.
export async function getEditorData(
  caseId: string
): Promise<EditorData | null> {
  const [theCase] = await db
    .select()
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);

  if (!theCase || theCase.deletedAt) return null;

  const [levelRows, stageRows, attempts] = await Promise.all([
    db
      .select()
      .from(caseLevelConfig)
      .where(eq(caseLevelConfig.caseId, caseId)),
    db
      .select()
      .from(stages)
      .where(eq(stages.caseId, caseId))
      .orderBy(asc(stages.position)),
    db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(caseAttempts)
      .where(eq(caseAttempts.caseId, caseId)),
  ]);

  const stageIds = stageRows.map((s) => s.id);
  const choiceRows =
    stageIds.length === 0
      ? []
      : await db
          .select()
          .from(choices)
          .where(inArray(choices.stageId, stageIds))
          .orderBy(asc(choices.displayOrder));

  return {
    case: theCase,
    levels: levelRows,
    stages: stageRows,
    choices: choiceRows,
    attemptCount: Number(attempts[0]?.n ?? 0),
  };
}
