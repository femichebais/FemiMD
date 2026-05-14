import { eq, and, isNull, desc, asc, sql, inArray, isNotNull } from "drizzle-orm";
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
  quizAttempts,
  type Stage,
} from "@/db/schema";

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
  // Roster — each student with their high-level stats
  roster: Array<{
    id: string;
    name: string;
    email: string;
    completedCount: number;
    attemptCount: number;
    avgScore: number | null;
  }>;
  // All cases at this level — for the teacher to toggle release
  availableCases: Array<{
    id: string;
    title: string;
    isReleased: boolean;
    releasedAt: Date | null;
  }>;
  topline: {
    studentCount: number;
    releasedCaseCount: number;
    totalAttempts: number;
    avgCompletion: number; // 0..1
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

  // Roster with aggregates
  const rosterRows = await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
      attemptCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${caseAttempts}
        WHERE ${caseAttempts.studentId} = ${students.id}
      )`,
      completedCount: sql<number>`(
        SELECT COUNT(DISTINCT ${caseAttempts.caseId})::int
        FROM ${caseAttempts}
        WHERE ${caseAttempts.studentId} = ${students.id}
          AND ${caseAttempts.completedAt} IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM ${quizAttempts}
            WHERE ${quizAttempts.studentId} = ${students.id}
              AND ${quizAttempts.caseId} = ${caseAttempts.caseId}
              AND ${quizAttempts.scope} = 'post'
          )
      )`,
      avgScore: sql<number | null>`(
        SELECT AVG(${caseAttempts.totalScore})::float
        FROM ${caseAttempts}
        WHERE ${caseAttempts.studentId} = ${students.id}
          AND ${caseAttempts.completedAt} IS NOT NULL
      )`,
    })
    .from(students)
    .where(
      and(
        eq(students.classroomId, classroomId),
        isNull(students.deletedAt)
      )
    )
    .orderBy(asc(students.name));

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
        isNull(cases.deletedAt)
      )
    )
    .orderBy(asc(cases.title));

  // Topline numbers
  const studentCount = rosterRows.length;
  const releasedCaseCount = availableCases.filter((c) => c.isReleased).length;
  const totalAttempts = rosterRows.reduce((s, r) => s + r.attemptCount, 0);
  const totalCompletable = studentCount * releasedCaseCount;
  const totalCompleted = rosterRows.reduce(
    (s, r) => s + r.completedCount,
    0
  );
  const avgCompletion =
    totalCompletable === 0 ? 0 : totalCompleted / totalCompletable;

  return {
    classroom: {
      id: classroom.id,
      name: classroom.name,
      level: classroom.level,
      inviteCode: classroom.inviteCode,
    },
    roster: rosterRows.map((r) => ({
      ...r,
      avgScore:
        r.avgScore === null || r.avgScore === undefined
          ? null
          : Number(r.avgScore),
    })),
    availableCases,
    topline: {
      studentCount,
      releasedCaseCount,
      totalAttempts,
      avgCompletion,
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
    caseId: string;
    caseTitle: string;
    scope: "pre" | "post";
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
