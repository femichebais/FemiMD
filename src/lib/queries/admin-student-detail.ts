import { eq, and, isNull, asc, desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  students,
  classrooms,
  schools,
  cases,
  caseAttempts,
  studentCaseGrants,
} from "@/db/schema";

export interface AdminStudentDetail {
  student: {
    id: string;
    name: string;
    email: string;
    classroomId: string | null;
    classroomName: string | null;
    classroomLevel: string | null;
    schoolName: string | null;
  };
  // All non-deleted cases — admin sees everything, can grant individual access.
  cases: Array<{
    id: string;
    title: string;
    publishedAt: Date | null;
    grantedAt: Date | null;
    isClassroomReleased: boolean;
  }>;
  attempts: Array<{
    id: string;
    caseId: string;
    caseTitle: string;
    startedAt: Date;
    completedAt: Date | null;
    totalScore: number | null;
  }>;
}

export async function getAdminStudentDetail(
  studentId: string
): Promise<AdminStudentDetail | null> {
  const [studentRow] = await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
      classroomId: students.classroomId,
      classroomName: classrooms.name,
      classroomLevel: classrooms.level,
      schoolName: schools.name,
    })
    .from(students)
    .leftJoin(classrooms, eq(classrooms.id, students.classroomId))
    .leftJoin(schools, eq(schools.id, classrooms.schoolId))
    .where(and(eq(students.id, studentId), isNull(students.deletedAt)))
    .limit(1);

  if (!studentRow) return null;

  // All cases with grant + classroom-release status for this student.
  const caseRows = await db
    .select({
      id: cases.id,
      title: cases.title,
      publishedAt: cases.publishedAt,
      grantedAt: sql<Date | null>`(
        SELECT ${studentCaseGrants.grantedAt} FROM ${studentCaseGrants}
        WHERE ${studentCaseGrants.studentId} = ${studentId}
          AND ${studentCaseGrants.caseId} = ${cases.id}
        LIMIT 1
      )`,
      isClassroomReleased: sql<boolean>`EXISTS (
        SELECT 1 FROM case_releases cr
        WHERE cr.classroom_id = ${studentRow.classroomId}
          AND cr.case_id = ${cases.id}
      )`,
    })
    .from(cases)
    .where(isNull(cases.deletedAt))
    .orderBy(asc(cases.title));

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

  return {
    student: studentRow,
    cases: caseRows,
    attempts: attemptRows,
  };
}
