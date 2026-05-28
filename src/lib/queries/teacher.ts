import { eq, and, isNull, isNotNull, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  classrooms,
  students,
  cases,
  caseLevelConfig,
  caseReleases,
  caseAttempts,
  stageAttempts,
  stages,
  choices,
  quizAttempts,
  quizzes,
  quizQuestions,
  quizChoices,
  quizReleases,
  type Case,
  type Choice,
  type Stage,
} from "@/db/schema";
import type { StageBreakdown, AttemptPick } from "./feedback";

export interface TeacherClassroomRow {
  id: string;
  name: string;
  level: "middle" | "high" | "undergrad";
  inviteCode: string;
  studentCount: number;
  releasedCaseCount: number;
}

export async function listTeacherClassrooms(
  teacherId: string
): Promise<TeacherClassroomRow[]> {
  return await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      level: classrooms.level,
      inviteCode: classrooms.inviteCode,
      studentCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${students}
        WHERE ${students.classroomId} = ${classrooms.id}
          AND ${students.deletedAt} IS NULL
      )`,
      releasedCaseCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${caseReleases}
        WHERE ${caseReleases.classroomId} = ${classrooms.id}
      )`,
    })
    .from(classrooms)
    .where(
      and(
        eq(classrooms.teacherId, teacherId),
        isNull(classrooms.deletedAt)
      )
    )
    .orderBy(desc(classrooms.createdAt));
}

export interface ClassroomDetail {
  classroom: {
    id: string;
    name: string;
    level: "middle" | "high" | "undergrad";
    inviteCode: string;
  };
  // Roster — each student with their high-level stats. Counts are unfiltered
  // (every attempt the student has ever made); completed counts are filtered
  // to currently-released cases/quizzes so the "X / Y" denominator on the
  // teacher's screen matches.
  roster: Array<{
    id: string;
    name: string;
    email: string;
    caseAttemptCount: number;
    caseCompletedCount: number; // distinct released cases the student completed
    caseAvgPct: number | null; // avg of (score / max possible) percent across the student's completed case attempts
    quizAttemptCount: number;
    quizCompletedCount: number; // distinct released quizzes the student attempted
    quizAvgPct: number | null; // avg score/question_count percent across attempts
  }>;
  // All cases at this level — for the teacher to toggle release
  availableCases: Array<{
    id: string;
    title: string;
    isReleased: boolean;
    releasedAt: Date | null;
  }>;
  // All quizzes on the platform (case-attached + standalone) — for the
  // teacher to toggle quiz releases independently of case releases.
  availableQuizzes: Array<{
    id: string;
    title: string;
    topic: string | null;
    scope: "pre" | "post" | null;
    caseTitle: string | null;
    isReleased: boolean;
  }>;
  topline: {
    studentCount: number;
    releasedCaseCount: number;
    releasedQuizCount: number;
    totalCaseAttempts: number;
    totalQuizAttempts: number;
    // Fraction of students who completed at least one released case / quiz.
    caseCompletion: number; // 0..1
    quizCompletion: number; // 0..1
  };
}

// Returns null if the classroom doesn't belong to this teacher, so callers
// can 404 without distinguishing "doesn't exist" from "you can't see it".
export async function getClassroomDetail(
  teacherId: string,
  classroomId: string
): Promise<ClassroomDetail | null> {
  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(
      and(
        eq(classrooms.id, classroomId),
        eq(classrooms.teacherId, teacherId),
        isNull(classrooms.deletedAt)
      )
    )
    .limit(1);

  if (!classroom) return null;

  // Base roster — student identity only. Per-student aggregates are pulled
  // separately and merged in JS because Drizzle's `sql` template doesn't
  // qualify outer-query column references when interpolated inside a
  // subquery, which historically broke the correlated counts here.
  const baseRoster = await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
    })
    .from(students)
    .where(
      and(eq(students.classroomId, classroomId), isNull(students.deletedAt))
    )
    .orderBy(asc(students.name));

  const studentIds = baseRoster.map((r) => r.id);

  // All quizzes — case-attached + standalone — with this classroom's
  // release state. Teachers release quizzes independently of case releases.
  const availableQuizzes = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      topic: quizzes.topic,
      scope: quizzes.scope,
      caseTitle: cases.title,
      isReleased: sql<boolean>`EXISTS (
        SELECT 1 FROM ${quizReleases}
        WHERE ${quizReleases.classroomId} = ${classroomId}
          AND ${quizReleases.quizId} = ${quizzes.id}
      )`,
    })
    .from(quizzes)
    .leftJoin(cases, eq(cases.id, quizzes.caseId))
    .where(isNull(quizzes.deletedAt))
    .orderBy(asc(quizzes.title));

  // Cases at this level + release status
  const availableCases = await db
    .select({
      id: cases.id,
      title: cases.title,
      isReleased: sql<boolean>`EXISTS (
        SELECT 1 FROM ${caseReleases}
        WHERE ${caseReleases.classroomId} = ${classroomId}
          AND ${caseReleases.caseId} = ${cases.id}
      )`,
      releasedAt: sql<Date | null>`(
        SELECT ${caseReleases.releasedAt} FROM ${caseReleases}
        WHERE ${caseReleases.classroomId} = ${classroomId}
          AND ${caseReleases.caseId} = ${cases.id}
        LIMIT 1
      )`,
    })
    .from(cases)
    .innerJoin(caseLevelConfig, eq(caseLevelConfig.caseId, cases.id))
    .where(
      and(
        eq(caseLevelConfig.level, classroom.level),
        isNull(cases.deletedAt),
        // Teachers only see published cases — drafts are admin-only.
        isNotNull(cases.publishedAt)
      )
    )
    .orderBy(asc(cases.title));

  const releasedCaseIds = availableCases
    .filter((c) => c.isReleased)
    .map((c) => c.id);
  const releasedQuizIds = availableQuizzes
    .filter((q) => q.isReleased)
    .map((q) => q.id);

  // Per-student case aggregates — unfiltered counts. Empty if no students.
  const caseAggRows =
    studentIds.length === 0
      ? []
      : await db
          .select({
            studentId: caseAttempts.studentId,
            attemptCount: sql<number>`COUNT(*)::int`,
          })
          .from(caseAttempts)
          .where(inArray(caseAttempts.studentId, studentIds))
          .groupBy(caseAttempts.studentId);

  // Per-attempt rows for completed case attempts — needed to compute avg %.
  // We need the case_id to divide by per-case max possible. Cheaper than a
  // SQL-side AVG since we already need the per-case max anyway.
  const completedAttemptRows =
    studentIds.length === 0
      ? []
      : await db
          .select({
            studentId: caseAttempts.studentId,
            caseId: caseAttempts.caseId,
            totalScore: caseAttempts.totalScore,
          })
          .from(caseAttempts)
          .where(
            and(
              inArray(caseAttempts.studentId, studentIds),
              isNotNull(caseAttempts.completedAt)
            )
          );

  // Max-possible per case for cases anyone in the classroom has attempted.
  const attemptedCaseIds = [
    ...new Set(completedAttemptRows.map((r) => r.caseId)),
  ];
  const caseMaxByCaseId = new Map<string, number>();
  if (attemptedCaseIds.length > 0) {
    const stageChoiceRows = await db
      .select({
        caseId: stages.caseId,
        stageId: stages.id,
        maxPicks: stages.maxPicks,
        score: choices.score,
      })
      .from(stages)
      .innerJoin(choices, eq(choices.stageId, stages.id))
      .where(inArray(stages.caseId, attemptedCaseIds));

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
    for (const b of stageBuckets.values()) {
      const top = [...b.scores].sort((x, y) => y - x).slice(0, b.maxPicks);
      const stageMax = top.reduce((s, n) => s + n, 0);
      caseMaxByCaseId.set(
        b.caseId,
        (caseMaxByCaseId.get(b.caseId) ?? 0) + stageMax
      );
    }
  }

  // Roll up per-student avg % from the per-attempt rows.
  const caseAvgPctByStudent = new Map<string, number>();
  const pctBuckets = new Map<string, number[]>();
  for (const r of completedAttemptRows) {
    const max = caseMaxByCaseId.get(r.caseId) ?? 0;
    if (max === 0) continue;
    const pct = ((r.totalScore ?? 0) / max) * 100;
    const list = pctBuckets.get(r.studentId) ?? [];
    list.push(pct);
    pctBuckets.set(r.studentId, list);
  }
  for (const [studentId, pcts] of pctBuckets) {
    const sum = pcts.reduce((s, n) => s + n, 0);
    caseAvgPctByStudent.set(studentId, sum / pcts.length);
  }

  // Per-student distinct released cases completed — filtered to the set
  // currently released so the X / Y denominator the UI shows is meaningful.
  const caseCompletedRows =
    studentIds.length === 0 || releasedCaseIds.length === 0
      ? []
      : await db
          .select({
            studentId: caseAttempts.studentId,
            count: sql<number>`COUNT(DISTINCT ${caseAttempts.caseId})::int`,
          })
          .from(caseAttempts)
          .where(
            and(
              inArray(caseAttempts.studentId, studentIds),
              inArray(caseAttempts.caseId, releasedCaseIds),
              isNotNull(caseAttempts.completedAt)
            )
          )
          .groupBy(caseAttempts.studentId);

  // Per-student quiz aggregates — unfiltered counts; avg as a percent.
  const quizAggRows =
    studentIds.length === 0
      ? []
      : await db
          .select({
            studentId: quizAttempts.studentId,
            attemptCount: sql<number>`COUNT(*)::int`,
            avgPct: sql<number | null>`AVG(${quizAttempts.score}::float * 100.0 / NULLIF(${quizAttempts.questionCount}, 0))`,
          })
          .from(quizAttempts)
          .where(inArray(quizAttempts.studentId, studentIds))
          .groupBy(quizAttempts.studentId);

  // Per-student distinct released quizzes attempted.
  const quizCompletedRows =
    studentIds.length === 0 || releasedQuizIds.length === 0
      ? []
      : await db
          .select({
            studentId: quizAttempts.studentId,
            count: sql<number>`COUNT(DISTINCT ${quizAttempts.quizId})::int`,
          })
          .from(quizAttempts)
          .where(
            and(
              inArray(quizAttempts.studentId, studentIds),
              inArray(quizAttempts.quizId, releasedQuizIds)
            )
          )
          .groupBy(quizAttempts.studentId);

  const caseAggByStudent = new Map(
    caseAggRows.map((r) => [r.studentId, r])
  );
  const caseCompletedByStudent = new Map(
    caseCompletedRows.map((r) => [r.studentId, r.count])
  );
  const quizAggByStudent = new Map(
    quizAggRows.map((r) => [r.studentId, r])
  );
  const quizCompletedByStudent = new Map(
    quizCompletedRows.map((r) => [r.studentId, r.count])
  );

  const roster = baseRoster.map((r) => {
    const c = caseAggByStudent.get(r.id);
    const q = quizAggByStudent.get(r.id);
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      caseAttemptCount: c?.attemptCount ?? 0,
      caseCompletedCount: caseCompletedByStudent.get(r.id) ?? 0,
      caseAvgPct: caseAvgPctByStudent.get(r.id) ?? null,
      quizAttemptCount: q?.attemptCount ?? 0,
      quizCompletedCount: quizCompletedByStudent.get(r.id) ?? 0,
      quizAvgPct:
        q?.avgPct === null || q?.avgPct === undefined
          ? null
          : Number(q.avgPct),
    };
  });

  // Topline — completion is the fraction of students who completed at least
  // one released case (or attempted at least one released quiz). This treats
  // each student as a unit, regardless of how many incomplete attempts they
  // also racked up.
  const studentCount = baseRoster.length;
  const releasedCaseCount = releasedCaseIds.length;
  const releasedQuizCount = releasedQuizIds.length;
  const totalCaseAttempts = roster.reduce(
    (s, r) => s + r.caseAttemptCount,
    0
  );
  const totalQuizAttempts = roster.reduce(
    (s, r) => s + r.quizAttemptCount,
    0
  );
  const studentsWithCompletedCase = roster.filter(
    (r) => r.caseCompletedCount > 0
  ).length;
  const studentsWithQuizAttempt = roster.filter(
    (r) => r.quizCompletedCount > 0
  ).length;
  const caseCompletion =
    studentCount === 0 || releasedCaseCount === 0
      ? 0
      : studentsWithCompletedCase / studentCount;
  const quizCompletion =
    studentCount === 0 || releasedQuizCount === 0
      ? 0
      : studentsWithQuizAttempt / studentCount;

  return {
    classroom: {
      id: classroom.id,
      name: classroom.name,
      level: classroom.level,
      inviteCode: classroom.inviteCode,
    },
    roster,
    availableCases,
    availableQuizzes,
    topline: {
      studentCount,
      releasedCaseCount,
      releasedQuizCount,
      totalCaseAttempts,
      totalQuizAttempts,
      caseCompletion,
      quizCompletion,
    },
  };
}

// =============================================================================
// Per-student drill-down (teacher view of one student's history)
// =============================================================================

export interface StudentDetail {
  student: { id: string; name: string; email: string };
  classroom: {
    id: string;
    name: string;
    level: "middle" | "high" | "undergrad";
  };
  attempts: Array<{
    id: string;
    caseId: string;
    caseTitle: string;
    startedAt: Date;
    completedAt: Date | null;
    totalScore: number | null;
    // Sum of top-maxPicks choice scores per stage, summed across stages.
    // Same for every attempt of the same case, but we attach it per-attempt
    // so the renderer doesn't need a separate map lookup.
    caseMaxPossible: number;
    // Per-stage breakdown for the most recent completed attempt
    stages: Array<{
      stageId: string;
      position: number;
      type: Stage["type"];
      prompt: string;
      earnedScore: number;
    }>;
  }>;
  quizAttempts: Array<{
    id: string;
    // Nullable since the quiz refactor — standalone quizzes have no case.
    caseId: string | null;
    caseTitle: string | null;
    scope: "pre" | "post" | null;
    score: number;
    questionCount: number;
    completedAt: Date;
  }>;
}

export async function getStudentDetailForTeacher(
  teacherId: string,
  classroomId: string,
  studentId: string
): Promise<StudentDetail | null> {
  // Ownership check rolled into the join
  const [studentRow] = await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
      classroomId: students.classroomId,
      classroomName: classrooms.name,
      classroomLevel: classrooms.level,
    })
    .from(students)
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.id, classroomId),
        eq(classrooms.teacherId, teacherId)
      )
    )
    .where(
      and(
        eq(students.id, studentId),
        isNull(students.deletedAt),
        isNull(classrooms.deletedAt)
      )
    )
    .limit(1);

  if (!studentRow) return null;

  const attemptRows = await db
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

  const attemptIds = attemptRows.map((a) => a.id);
  const stageRows =
    attemptIds.length === 0
      ? []
      : await db
          .select({
            attemptId: stageAttempts.caseAttemptId,
            stageId: stageAttempts.stageId,
            position: stages.position,
            type: stages.type,
            prompt: stages.prompt,
            earnedScore: stageAttempts.earnedScore,
          })
          .from(stageAttempts)
          .innerJoin(stages, eq(stages.id, stageAttempts.stageId))
          .where(inArray(stageAttempts.caseAttemptId, attemptIds))
          .orderBy(asc(stages.position));

  const stagesByAttempt = new Map<string, typeof stageRows>();
  for (const s of stageRows) {
    const arr = stagesByAttempt.get(s.attemptId) ?? [];
    arr.push(s);
    stagesByAttempt.set(s.attemptId, arr);
  }

  // Max-possible per case = sum over stages of (top-maxPicks choice scores).
  // Only compute for cases the student actually attempted.
  const attemptedCaseIds = [...new Set(attemptRows.map((a) => a.caseId))];
  const stageChoiceRows =
    attemptedCaseIds.length === 0
      ? []
      : await db
          .select({
            caseId: stages.caseId,
            stageId: stages.id,
            maxPicks: stages.maxPicks,
            score: choices.score,
          })
          .from(stages)
          .innerJoin(choices, eq(choices.stageId, stages.id))
          .where(inArray(stages.caseId, attemptedCaseIds));

  // Bucket by stageId so we can compute per-stage max independently.
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

  const quizRows = await db
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

  return {
    student: {
      id: studentRow.id,
      name: studentRow.name,
      email: studentRow.email,
    },
    classroom: {
      id: studentRow.classroomId,
      name: studentRow.classroomName ?? "",
      level: studentRow.classroomLevel ?? "undergrad",
    },
    attempts: attemptRows.map((a) => ({
      ...a,
      caseMaxPossible: caseMaxByCaseId.get(a.caseId) ?? 0,
      stages:
        stagesByAttempt.get(a.id)?.map((s) => ({
          stageId: s.stageId,
          position: s.position,
          type: s.type,
          prompt: s.prompt,
          earnedScore: s.earnedScore,
        })) ?? [],
    })),
    quizAttempts: quizRows,
  };
}

// Suppress unused-import warning when we don't reference isNotNull elsewhere
void isNotNull;

// =============================================================================
// Per-attempt detail (teacher viewing a single case attempt by a student)
// =============================================================================

export interface CaseAttemptDetail {
  student: { id: string; name: string; email: string };
  classroom: { id: string; name: string };
  case: Case;
  attempt: {
    id: string;
    startedAt: Date;
    completedAt: Date | null;
    totalScore: number | null;
  };
  // Same shape the student feedback renderer expects.
  breakdown: StageBreakdown[];
}

function parsePicks(value: unknown): AttemptPick[] {
  if (!Array.isArray(value)) return [];
  const out: AttemptPick[] = [];
  for (const v of value) {
    if (typeof v !== "object" || v === null) continue;
    const r = v as Record<string, unknown>;
    if (
      typeof r.choice_id === "string" &&
      typeof r.pick_order === "number" &&
      typeof r.score === "number"
    ) {
      out.push({
        choice_id: r.choice_id,
        pick_order: r.pick_order,
        score: r.score,
      });
    }
  }
  return out;
}

// Loads a single case_attempt with all the data needed to render the same
// breakdown the student sees. Ownership: classroom must belong to the
// teacher, student must be in that classroom, attempt must belong to that
// student. Returns null on any mismatch.
export async function getCaseAttemptForTeacher(
  teacherId: string,
  classroomId: string,
  studentId: string,
  attemptId: string
): Promise<CaseAttemptDetail | null> {
  const [studentRow] = await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
      classroomId: students.classroomId,
      classroomName: classrooms.name,
    })
    .from(students)
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.id, classroomId),
        eq(classrooms.teacherId, teacherId),
        isNull(classrooms.deletedAt)
      )
    )
    .where(and(eq(students.id, studentId), isNull(students.deletedAt)))
    .limit(1);
  if (!studentRow) return null;

  const [attemptRow] = await db
    .select({
      attempt: caseAttempts,
      case: cases,
    })
    .from(caseAttempts)
    .innerJoin(cases, eq(cases.id, caseAttempts.caseId))
    .where(
      and(
        eq(caseAttempts.id, attemptId),
        eq(caseAttempts.studentId, studentId)
      )
    )
    .limit(1);
  if (!attemptRow) return null;
  if (attemptRow.case.deletedAt) return null;

  const caseId = attemptRow.attempt.caseId;
  const [stageRows, stageAttemptRows] = await Promise.all([
    db
      .select()
      .from(stages)
      .where(eq(stages.caseId, caseId))
      .orderBy(asc(stages.position)),
    db
      .select()
      .from(stageAttempts)
      .where(eq(stageAttempts.caseAttemptId, attemptId)),
  ]);

  const stageIds = stageRows.map((s) => s.id);
  const choiceRows: Choice[] =
    stageIds.length === 0
      ? []
      : await db
          .select()
          .from(choices)
          .where(inArray(choices.stageId, stageIds))
          .orderBy(asc(choices.displayOrder));

  const attemptByStage = new Map<string, (typeof stageAttemptRows)[number]>();
  for (const sa of stageAttemptRows) attemptByStage.set(sa.stageId, sa);

  const breakdown: StageBreakdown[] = stageRows.map((stage) => {
    const stageChoices = choiceRows.filter((c) => c.stageId === stage.id);
    const sa = attemptByStage.get(stage.id) ?? null;
    let attempt: StageBreakdown["attempt"] = null;
    if (sa) {
      attempt = {
        earnedScore: sa.earnedScore,
        picks: parsePicks(sa.picks),
      };
    }
    return { stage, choices: stageChoices, attempt };
  });

  return {
    student: {
      id: studentRow.id,
      name: studentRow.name,
      email: studentRow.email,
    },
    classroom: {
      id: studentRow.classroomId,
      name: studentRow.classroomName ?? "",
    },
    case: attemptRow.case,
    attempt: {
      id: attemptRow.attempt.id,
      startedAt: attemptRow.attempt.startedAt,
      completedAt: attemptRow.attempt.completedAt,
      totalScore: attemptRow.attempt.totalScore,
    },
    breakdown,
  };
}

// =============================================================================
// Quiz attempt detail (teacher viewing one quiz attempt by a student)
// =============================================================================

export interface QuizAttemptDetail {
  student: { id: string; name: string; email: string };
  classroom: { id: string; name: string };
  quiz: {
    id: string;
    title: string;
    scope: "pre" | "post" | null;
    caseTitle: string | null;
  };
  attempt: {
    id: string;
    score: number;
    questionCount: number;
    completedAt: Date;
  };
  // One entry per question in the attempt, in the same order the student saw.
  questions: Array<{
    id: string;
    prompt: string;
    choices: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
    pickedChoiceId: string | null;
    isCorrect: boolean;
  }>;
}

interface QuizAnswer {
  question_id: string;
  choice_id: string;
  is_correct: boolean;
}

function parseQuizAnswers(value: unknown): QuizAnswer[] {
  if (!Array.isArray(value)) return [];
  const out: QuizAnswer[] = [];
  for (const v of value) {
    if (typeof v !== "object" || v === null) continue;
    const r = v as Record<string, unknown>;
    if (
      typeof r.question_id === "string" &&
      typeof r.choice_id === "string" &&
      typeof r.is_correct === "boolean"
    ) {
      out.push({
        question_id: r.question_id,
        choice_id: r.choice_id,
        is_correct: r.is_correct,
      });
    }
  }
  return out;
}

export async function getQuizAttemptForTeacher(
  teacherId: string,
  classroomId: string,
  studentId: string,
  quizAttemptId: string
): Promise<QuizAttemptDetail | null> {
  const [studentRow] = await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
      classroomId: students.classroomId,
      classroomName: classrooms.name,
    })
    .from(students)
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.id, classroomId),
        eq(classrooms.teacherId, teacherId),
        isNull(classrooms.deletedAt)
      )
    )
    .where(and(eq(students.id, studentId), isNull(students.deletedAt)))
    .limit(1);
  if (!studentRow) return null;

  const [attemptRow] = await db
    .select({
      attempt: quizAttempts,
      quiz: quizzes,
      caseTitle: cases.title,
    })
    .from(quizAttempts)
    .leftJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .leftJoin(cases, eq(cases.id, quizAttempts.caseId))
    .where(
      and(
        eq(quizAttempts.id, quizAttemptId),
        eq(quizAttempts.studentId, studentId)
      )
    )
    .limit(1);
  if (!attemptRow) return null;

  const answers = parseQuizAnswers(attemptRow.attempt.answers);
  const questionIds = [...new Set(answers.map((a) => a.question_id))];
  const questionRows =
    questionIds.length === 0
      ? []
      : await db
          .select()
          .from(quizQuestions)
          .where(inArray(quizQuestions.id, questionIds));
  const choiceRows =
    questionIds.length === 0
      ? []
      : await db
          .select()
          .from(quizChoices)
          .where(inArray(quizChoices.questionId, questionIds))
          .orderBy(asc(quizChoices.displayOrder));

  const questionById = new Map(questionRows.map((q) => [q.id, q]));
  const choicesByQuestion = new Map<string, typeof choiceRows>();
  for (const c of choiceRows) {
    const arr = choicesByQuestion.get(c.questionId) ?? [];
    arr.push(c);
    choicesByQuestion.set(c.questionId, arr);
  }

  // Preserve the student's answer order (= the order they saw the quiz).
  const questions: QuizAttemptDetail["questions"] = answers.map((a) => {
    const q = questionById.get(a.question_id);
    const qChoices = choicesByQuestion.get(a.question_id) ?? [];
    return {
      id: a.question_id,
      prompt: q?.prompt ?? "(question removed)",
      choices: qChoices.map((c) => ({
        id: c.id,
        text: c.text,
        isCorrect: c.isCorrect,
      })),
      pickedChoiceId: a.choice_id,
      isCorrect: a.is_correct,
    };
  });

  // The quiz row may be null for very old standalone-quiz attempts predating
  // the refactor; fall back to a stub so the page still renders.
  const quizMeta = attemptRow.quiz;

  return {
    student: {
      id: studentRow.id,
      name: studentRow.name,
      email: studentRow.email,
    },
    classroom: {
      id: studentRow.classroomId,
      name: studentRow.classroomName ?? "",
    },
    quiz: {
      id: quizMeta?.id ?? "",
      title: quizMeta?.title ?? attemptRow.caseTitle ?? "Quiz",
      scope: attemptRow.attempt.scope,
      caseTitle: attemptRow.caseTitle,
    },
    attempt: {
      id: attemptRow.attempt.id,
      score: attemptRow.attempt.score,
      questionCount: attemptRow.attempt.questionCount,
      completedAt: attemptRow.attempt.completedAt,
    },
    questions,
  };
}
