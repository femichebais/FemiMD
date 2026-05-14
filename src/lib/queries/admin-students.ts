import { eq, and, isNull, isNotNull, asc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  students,
  classrooms,
  schools,
  caseAttempts,
  quizAttempts,
} from "@/db/schema";

export interface AdminStudentRow {
  id: string;
  name: string;
  email: string;
  classroomId: string | null;
  classroomName: string | null;
  classroomLevel: string | null;
  schoolId: string | null;
  schoolName: string | null;
  attemptCount: number;
  completedCount: number;
  createdAt: Date;
}

// Admin-only — no role-scoping in the query because admin sees everything.
// The page calling this MUST requireRole('admin').
export async function listAllStudents(): Promise<AdminStudentRow[]> {
  return await db
    .select({
      id: students.id,
      name: students.name,
      email: students.email,
      classroomId: students.classroomId,
      classroomName: classrooms.name,
      classroomLevel: classrooms.level,
      schoolId: schools.id,
      schoolName: schools.name,
      createdAt: students.createdAt,
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
    })
    .from(students)
    .leftJoin(classrooms, eq(classrooms.id, students.classroomId))
    .leftJoin(schools, eq(schools.id, classrooms.schoolId))
    .where(isNull(students.deletedAt))
    .orderBy(asc(students.name));
}

void isNotNull;
