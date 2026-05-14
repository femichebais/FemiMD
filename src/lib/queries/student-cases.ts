import { eq, and, isNull, desc, asc, sql, inArray } from "drizzle-orm";
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
  type Case,
  type Stage,
  type Choice,
} from "@/db/schema";

export interface StudentCaseRow {
  id: string;
  title: string;
  description: string | null;
  scenarioIntro: string | null;
  releasedAt: Date;
  stageCount: number;
}

// Released cases the student can see: case is not deleted, released to
// their classroom, and tagged for their classroom's level.
//
// This duplicates RLS scoping at the app layer — defense in depth, also
// because we want to JOIN release/level/stage-count in one trip which RLS
// would do but with less control over the columns we select.
export async function listStudentCases(
  studentId: string
): Promise<StudentCaseRow[]> {
  const rows = await db
    .select({
      id: cases.id,
      title: cases.title,
      description: cases.description,
      scenarioIntro: cases.scenarioIntro,
      releasedAt: caseReleases.releasedAt,
      stageCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${stages}
        WHERE ${stages.caseId} = ${cases.id}
      )`,
    })
    .from(cases)
    .innerJoin(caseReleases, eq(caseReleases.caseId, cases.id))
    .innerJoin(students, eq(students.id, studentId))
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.id, caseReleases.classroomId)
      )
    )
    .innerJoin(
      caseLevelConfig,
      and(
        eq(caseLevelConfig.caseId, cases.id),
        eq(caseLevelConfig.level, classrooms.level)
      )
    )
    .where(and(isNull(cases.deletedAt), isNull(classrooms.deletedAt)))
    .orderBy(desc(caseReleases.releasedAt));

  return rows;
}

// Same scoping rules but for a single case lookup — used by the player.
export async function getCaseForStudent(
  studentId: string,
  caseId: string
): Promise<StudentCaseRow | null> {
  const [row] = await db
    .select({
      id: cases.id,
      title: cases.title,
      description: cases.description,
      scenarioIntro: cases.scenarioIntro,
      releasedAt: caseReleases.releasedAt,
      stageCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${stages}
        WHERE ${stages.caseId} = ${cases.id}
      )`,
    })
    .from(cases)
    .innerJoin(caseReleases, eq(caseReleases.caseId, cases.id))
    .innerJoin(students, eq(students.id, studentId))
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.id, caseReleases.classroomId)
      )
    )
    .innerJoin(
      caseLevelConfig,
      and(
        eq(caseLevelConfig.caseId, cases.id),
        eq(caseLevelConfig.level, classrooms.level)
      )
    )
    .where(
      and(
        eq(cases.id, caseId),
        isNull(cases.deletedAt),
        isNull(classrooms.deletedAt)
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

  // Has the student taken the post-quiz for each case?
  const postQuizzes = await db
    .select({
      caseId: cases.id,
      hasPost: sql<boolean>`EXISTS (
        SELECT 1 FROM ${cases} c2
        WHERE c2.id = ${cases.id}
        AND EXISTS (
          SELECT 1 FROM ${caseAttempts} ca
          WHERE ca.case_id = c2.id
        )
      )`,
    })
    .from(cases)
    .where(inArray(cases.id, caseIds));
  void postQuizzes; // not used; left for clarity if we need it

  // Direct post-quiz lookup
  const postAttempts = caseIds.length === 0 ? [] : await db.execute(sql`
    SELECT DISTINCT case_id FROM quiz_attempts
    WHERE student_id = ${studentId}
      AND scope = 'post'
      AND case_id = ANY(${caseIds})
  `);
  const postCaseIds = new Set(
    (postAttempts as unknown as Array<{ case_id: string }>).map(
      (r) => r.case_id
    )
  );

  const statsByCase = new Map(stats.map((s) => [s.caseId, s]));

  return released.map((c) => {
    const s = statsByCase.get(c.id);
    const hasCompleted = s?.anyCompleted ?? false;
    const hasOpen = s?.anyOpen ?? false;
    const hasPost = postCaseIds.has(c.id);
    let state: StudentCaseState = "not_started";
    if (hasCompleted && hasPost) state = "completed";
    else if (hasOpen || hasCompleted) state = "in_progress";

    return {
      ...c,
      state,
      bestScore:
        s?.bestScore !== null && s?.bestScore !== undefined
          ? Number(s.bestScore)
          : null,
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

// Full payload for the player. Validates access via the same join pattern,
// then loads stages (ordered) and choices (ordered within stage). If the
// access check fails (case not released, wrong level, soft-deleted),
// returns null and the page can 404 / forbid.
export async function getCasePlayData(
  studentId: string,
  caseId: string
): Promise<CasePlayData | null> {
  // Access check: join through release + level + classroom. Returns the
  // case row only if everything matches.
  const [caseRow] = await db
    .select({ case: cases })
    .from(cases)
    .innerJoin(caseReleases, eq(caseReleases.caseId, cases.id))
    .innerJoin(students, eq(students.id, studentId))
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.id, caseReleases.classroomId)
      )
    )
    .innerJoin(
      caseLevelConfig,
      and(
        eq(caseLevelConfig.caseId, cases.id),
        eq(caseLevelConfig.level, classrooms.level)
      )
    )
    .where(
      and(
        eq(cases.id, caseId),
        isNull(cases.deletedAt),
        isNull(classrooms.deletedAt)
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
