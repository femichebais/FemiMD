import { eq, and, isNull, isNotNull, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  cases,
  caseReleases,
  caseLevelConfig,
  caseAttempts,
  classrooms,
  students,
  stages,
  choices,
  studentCaseGrants,
  type Case,
  type Stage,
  type Choice,
} from "@/db/schema";

// Returns case ids this student can access via either path:
//   1. Classroom release (teacher toggled in case_releases)
//   2. Admin override grant (student_case_grants row)
// Both query strands return only ids; the caller hydrates the full case
// data afterward with a WHERE id IN ... filter.
async function accessibleCaseIds(studentId: string): Promise<Set<string>> {
  const [studentRow] = await db
    .select({ classroomId: students.classroomId })
    .from(students)
    .where(and(eq(students.id, studentId), isNull(students.deletedAt)))
    .limit(1);

  const ids = new Set<string>();

  if (studentRow?.classroomId) {
    const released = await db
      .select({ caseId: caseReleases.caseId })
      .from(caseReleases)
      .innerJoin(
        classrooms,
        and(
          eq(classrooms.id, caseReleases.classroomId),
          eq(classrooms.id, studentRow.classroomId),
          isNull(classrooms.deletedAt)
        )
      );
    for (const r of released) ids.add(r.caseId);
  }

  const granted = await db
    .select({ caseId: studentCaseGrants.caseId })
    .from(studentCaseGrants)
    .where(eq(studentCaseGrants.studentId, studentId));
  for (const g of granted) ids.add(g.caseId);

  return ids;
}

export interface StudentCaseRow {
  id: string;
  title: string;
  description: string | null;
  scenarioIntro: string | null;
  releasedAt: Date;
  stageCount: number;
}

// Cases the student can see — union of classroom-released cases and
// admin-granted cases. Both go through the same "published, not deleted"
// filter. Admin grants intentionally bypass level scoping (the override is
// admin authority, not a level rule).
export async function listStudentCases(
  studentId: string
): Promise<StudentCaseRow[]> {
  const ids = await accessibleCaseIds(studentId);
  if (ids.size === 0) return [];

  const rows = await db
    .select({
      id: cases.id,
      title: cases.title,
      description: cases.description,
      scenarioIntro: cases.scenarioIntro,
      // releasedAt is informational; for grant-only access we fall back
      // to the case's publishedAt as a stand-in for "available since".
      releasedAt: sql<Date>`
        COALESCE(
          (SELECT cr.released_at FROM case_releases cr
           WHERE cr.case_id = ${cases.id} LIMIT 1),
          ${cases.publishedAt}
        )`,
      stageCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${stages}
        WHERE ${stages.caseId} = ${cases.id}
      )`,
    })
    .from(cases)
    .where(
      and(
        inArray(cases.id, Array.from(ids)),
        isNull(cases.deletedAt),
        isNotNull(cases.publishedAt)
      )
    )
    .orderBy(desc(cases.createdAt));

  return rows;
}

// Single case lookup — same access rules.
export async function getCaseForStudent(
  studentId: string,
  caseId: string
): Promise<StudentCaseRow | null> {
  const ids = await accessibleCaseIds(studentId);
  if (!ids.has(caseId)) return null;

  const [row] = await db
    .select({
      id: cases.id,
      title: cases.title,
      description: cases.description,
      scenarioIntro: cases.scenarioIntro,
      releasedAt: sql<Date>`
        COALESCE(
          (SELECT cr.released_at FROM case_releases cr
           WHERE cr.case_id = ${cases.id} LIMIT 1),
          ${cases.publishedAt}
        )`,
      stageCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${stages}
        WHERE ${stages.caseId} = ${cases.id}
      )`,
    })
    .from(cases)
    .where(
      and(
        eq(cases.id, caseId),
        isNull(cases.deletedAt),
        isNotNull(cases.publishedAt)
      )
    )
    .limit(1);

  return row ?? null;
}

// =============================================================================
// Dashboard / progress: cases enriched with attempt state per the brief §4 rule
//   "completed" = case_attempts.completed_at set AND quiz_attempts (scope='post')
// =============================================================================

export type StudentCaseState = "not_started" | "in_progress" | "completed";

export interface StudentDashboardCase extends StudentCaseRow {
  state: StudentCaseState;
  bestScore: number | null;
  // Sum of top-N choice scores per stage. Used to render bestScore as a %.
  caseMaxPossible: number;
  attemptCount: number;
  latestAttemptAt: Date | null;
}

export async function listStudentDashboard(
  studentId: string
): Promise<StudentDashboardCase[]> {
  // Reuse the released-case list, then enrich with per-case attempt stats.
  const released = await listStudentCases(studentId);
  if (released.length === 0) return [];

  const caseIds = released.map((c) => c.id);

  const stats = await db
    .select({
      caseId: caseAttempts.caseId,
      anyCompleted: sql<boolean>`bool_or(${caseAttempts.completedAt} IS NOT NULL)`,
      anyOpen: sql<boolean>`bool_or(${caseAttempts.completedAt} IS NULL)`,
      attemptCount: sql<number>`COUNT(*)::int`,
      bestScore: sql<number | null>`MAX(${caseAttempts.totalScore})`,
      latestAttemptAt: sql<Date | null>`MAX(${caseAttempts.startedAt})`,
    })
    .from(caseAttempts)
    .where(
      and(
        eq(caseAttempts.studentId, studentId),
        inArray(caseAttempts.caseId, caseIds)
      )
    )
    .groupBy(caseAttempts.caseId);

  // Per-case max-possible = sum over stages of (top-maxPicks choice scores).
  // Cheaper to compute for every released case here so the card can render
  // bestScore as a percentage without an extra round-trip.
  const stageChoiceRows = await db
    .select({
      caseId: stages.caseId,
      stageId: stages.id,
      maxPicks: stages.maxPicks,
      score: choices.score,
    })
    .from(stages)
    .innerJoin(choices, eq(choices.stageId, stages.id))
    .where(inArray(stages.caseId, caseIds));

  const stageBuckets = new Map<
    string,
    { caseId: string; maxPicks: number; scores: number[] }
  >();
  for (const r of stageChoiceRows) {
    const b = stageBuckets.get(r.stageId);
    if (b) {
      b.scores.push(r.score);
    } else {
      stageBuckets.set(r.stageId, {
        caseId: r.caseId,
        maxPicks: r.maxPicks,
        scores: [r.score],
      });
    }
  }
  const caseMaxByCaseId = new Map<string, number>();
  for (const b of stageBuckets.values()) {
    const top = [...b.scores].sort((x, y) => y - x).slice(0, b.maxPicks);
    const stageMax = top.reduce((s, n) => s + n, 0);
    caseMaxByCaseId.set(
      b.caseId,
      (caseMaxByCaseId.get(b.caseId) ?? 0) + stageMax
    );
  }

  const statsByCase = new Map(stats.map((s) => [s.caseId, s]));

  return released.map((c) => {
    const s = statsByCase.get(c.id);
    const hasCompleted = s?.anyCompleted ?? false;
    const hasOpen = s?.anyOpen ?? false;
    // A case is "completed" the moment a case_attempts row has completed_at
    // set. We no longer gate completion on a post-test quiz attempt — quizzes
    // are independent of case completion now that pre/post is gone.
    let state: StudentCaseState = "not_started";
    if (hasCompleted) state = "completed";
    else if (hasOpen) state = "in_progress";

    return {
      ...c,
      state,
      bestScore:
        s?.bestScore !== null && s?.bestScore !== undefined
          ? Number(s.bestScore)
          : null,
      caseMaxPossible: caseMaxByCaseId.get(c.id) ?? 0,
      attemptCount: s?.attemptCount ?? 0,
      latestAttemptAt: s?.latestAttemptAt ?? null,
    };
  });
}

export interface CasePlayData {
  case: Case;
  stages: Stage[];
  choices: Choice[];
}

// Full payload for the player. Access check uses accessibleCaseIds() —
// classroom release + admin grant. Returns null on no access; the page
// 404s in that case (doesn't distinguish "doesn't exist" from "can't see").
export async function getCasePlayData(
  studentId: string,
  caseId: string
): Promise<CasePlayData | null> {
  const ids = await accessibleCaseIds(studentId);
  if (!ids.has(caseId)) return null;

  const [caseRow] = await db
    .select({ case: cases })
    .from(cases)
    .where(
      and(
        eq(cases.id, caseId),
        isNull(cases.deletedAt),
        isNotNull(cases.publishedAt)
      )
    )
    .limit(1);

  if (!caseRow) return null;

  const stageRows = await db
    .select()
    .from(stages)
    .where(eq(stages.caseId, caseId))
    .orderBy(asc(stages.position));

  const stageIds = stageRows.map((s) => s.id);
  const choiceRows =
    stageIds.length === 0
      ? []
      : await db
          .select()
          .from(choices)
          .where(inArray(choices.stageId, stageIds))
          .orderBy(asc(choices.displayOrder));

  return { case: caseRow.case, stages: stageRows, choices: choiceRows };
}
