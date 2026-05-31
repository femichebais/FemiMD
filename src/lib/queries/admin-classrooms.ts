import { eq, and, isNull, asc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  classrooms,
  schools,
  teachers,
  students,
  cases,
  caseLevelConfig,
  quizzes,
  libraryPages,
  libraryPageLevels,
  resources,
  resourceLevels,
  classroomCaseAssignments,
  classroomQuizAssignments,
  classroomLibraryAssignments,
  classroomResourceAssignments,
} from "@/db/schema";

export interface AdminClassroomRow {
  id: string;
  name: string;
  level: "middle" | "high" | "undergrad";
  teacherName: string;
  schoolName: string;
  studentCount: number;
  assignedCaseCount: number;
}

export async function listAllClassrooms(): Promise<AdminClassroomRow[]> {
  const rows = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      level: classrooms.level,
      teacherName: teachers.name,
      schoolName: schools.name,
      studentCount: sql<number>`COUNT(DISTINCT ${students.id})::int`,
      assignedCaseCount: sql<number>`COUNT(DISTINCT ${classroomCaseAssignments.caseId})::int`,
    })
    .from(classrooms)
    .innerJoin(teachers, eq(teachers.id, classrooms.teacherId))
    .innerJoin(schools, eq(schools.id, classrooms.schoolId))
    .leftJoin(
      students,
      and(eq(students.classroomId, classrooms.id), isNull(students.deletedAt))
    )
    .leftJoin(
      classroomCaseAssignments,
      eq(classroomCaseAssignments.classroomId, classrooms.id)
    )
    .where(isNull(classrooms.deletedAt))
    .groupBy(classrooms.id, teachers.name, schools.name)
    .orderBy(asc(schools.name), asc(teachers.name), asc(classrooms.name));

  return rows;
}

export interface AdminClassroomDetail {
  classroom: {
    id: string;
    name: string;
    level: "middle" | "high" | "undergrad";
    teacherName: string;
    teacherEmail: string;
    schoolName: string;
  };
  // Cases at the classroom's level. Assigned = a classroom_case_assignments
  // row exists (admin → teacher). Includes draft cases (no publishedAt) so
  // admins can assign pre-publish if they want — admin's discretion.
  availableCases: Array<{
    id: string;
    title: string;
    isPublished: boolean;
    isAssigned: boolean;
  }>;
  // All quizzes (case-attached + standalone) with this classroom's assignment
  // state. Assigned independently of cases.
  availableQuizzes: Array<{
    id: string;
    title: string;
    scope: "pre" | "post" | null;
    caseTitle: string | null;
    isAssigned: boolean;
  }>;
  // Library pages at the classroom's level with this classroom's assignment
  // state.
  availableLibrary: Array<{
    id: string;
    title: string;
    isAssigned: boolean;
  }>;
  // Resources at the classroom's level with this classroom's assignment state.
  availableResources: Array<{
    id: string;
    title: string;
    isAssigned: boolean;
  }>;
}

export async function getClassroomDetailForAdmin(
  classroomId: string
): Promise<AdminClassroomDetail | null> {
  const [row] = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      level: classrooms.level,
      teacherName: teachers.name,
      teacherEmail: teachers.email,
      schoolName: schools.name,
    })
    .from(classrooms)
    .innerJoin(teachers, eq(teachers.id, classrooms.teacherId))
    .innerJoin(schools, eq(schools.id, classrooms.schoolId))
    .where(and(eq(classrooms.id, classroomId), isNull(classrooms.deletedAt)))
    .limit(1);

  if (!row) return null;

  // All quizzes with this classroom's assignment state — not level-filtered,
  // matching the teacher classroom view. Assigned independently of cases.
  const availableQuizzes = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      scope: quizzes.scope,
      caseTitle: cases.title,
      isAssigned: sql<boolean>`EXISTS (
        SELECT 1 FROM ${classroomQuizAssignments}
        WHERE ${classroomQuizAssignments.classroomId} = ${classroomId}
          AND ${classroomQuizAssignments.quizId} = ${quizzes.id}
      )`,
    })
    .from(quizzes)
    .leftJoin(cases, eq(cases.id, quizzes.caseId))
    .where(isNull(quizzes.deletedAt))
    .orderBy(asc(quizzes.title));

  // Cases tagged for this level + assignment state.
  const caseRows = await db
    .select({
      id: cases.id,
      title: cases.title,
      publishedAt: cases.publishedAt,
      isAssigned: sql<boolean>`EXISTS (
        SELECT 1 FROM ${classroomCaseAssignments}
        WHERE ${classroomCaseAssignments.classroomId} = ${classroomId}
          AND ${classroomCaseAssignments.caseId} = ${cases.id}
      )`,
    })
    .from(cases)
    .innerJoin(
      caseLevelConfig,
      and(
        eq(caseLevelConfig.caseId, cases.id),
        eq(caseLevelConfig.level, row.level)
      )
    )
    .where(isNull(cases.deletedAt))
    .orderBy(asc(cases.title));

  // Library pages tagged for this level + assignment state.
  const availableLibrary = await db
    .select({
      id: libraryPages.id,
      title: libraryPages.title,
      isAssigned: sql<boolean>`EXISTS (
        SELECT 1 FROM ${classroomLibraryAssignments}
        WHERE ${classroomLibraryAssignments.classroomId} = ${classroomId}
          AND ${classroomLibraryAssignments.libraryPageId} = ${libraryPages.id}
      )`,
    })
    .from(libraryPages)
    .innerJoin(
      libraryPageLevels,
      and(
        eq(libraryPageLevels.libraryPageId, libraryPages.id),
        eq(libraryPageLevels.level, row.level)
      )
    )
    .where(isNull(libraryPages.deletedAt))
    .orderBy(asc(libraryPages.title));

  // Resources tagged for this level + assignment state.
  const availableResources = await db
    .select({
      id: resources.id,
      title: resources.title,
      isAssigned: sql<boolean>`EXISTS (
        SELECT 1 FROM ${classroomResourceAssignments}
        WHERE ${classroomResourceAssignments.classroomId} = ${classroomId}
          AND ${classroomResourceAssignments.resourceId} = ${resources.id}
      )`,
    })
    .from(resources)
    .innerJoin(
      resourceLevels,
      and(
        eq(resourceLevels.resourceId, resources.id),
        eq(resourceLevels.level, row.level)
      )
    )
    .where(isNull(resources.deletedAt))
    .orderBy(asc(resources.title));

  return {
    classroom: {
      id: row.id,
      name: row.name,
      level: row.level,
      teacherName: row.teacherName,
      teacherEmail: row.teacherEmail,
      schoolName: row.schoolName,
    },
    availableCases: caseRows.map((c) => ({
      id: c.id,
      title: c.title,
      isPublished: c.publishedAt !== null,
      isAssigned: c.isAssigned,
    })),
    availableQuizzes,
    availableLibrary,
    availableResources,
  };
}
