import { eq, and, isNull, asc, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  classrooms,
  schools,
  teachers,
  students,
  cases,
  caseReleases,
  caseLevelConfig,
} from "@/db/schema";

export interface AdminClassroomRow {
  id: string;
  name: string;
  level: "middle" | "high" | "undergrad";
  teacherName: string;
  schoolName: string;
  studentCount: number;
  releasedCaseCount: number;
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
      releasedCaseCount: sql<number>`COUNT(DISTINCT ${caseReleases.caseId})::int`,
    })
    .from(classrooms)
    .innerJoin(teachers, eq(teachers.id, classrooms.teacherId))
    .innerJoin(schools, eq(schools.id, classrooms.schoolId))
    .leftJoin(
      students,
      and(eq(students.classroomId, classrooms.id), isNull(students.deletedAt))
    )
    .leftJoin(caseReleases, eq(caseReleases.classroomId, classrooms.id))
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
  // Cases at the classroom's level. Released = a case_releases row exists.
  // Includes draft cases (no publishedAt) so admins can release pre-publish
  // if they want — admin's discretion. Most will only release published.
  availableCases: Array<{
    id: string;
    title: string;
    isPublished: boolean;
    isReleased: boolean;
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

  // Cases tagged for this level.
  const levelTaggedCaseIds = (
    await db
      .select({ caseId: caseLevelConfig.caseId })
      .from(caseLevelConfig)
      .where(eq(caseLevelConfig.level, row.level))
  ).map((r) => r.caseId);

  if (levelTaggedCaseIds.length === 0) {
    return {
      classroom: {
        id: row.id,
        name: row.name,
        level: row.level,
        teacherName: row.teacherName,
        teacherEmail: row.teacherEmail,
        schoolName: row.schoolName,
      },
      availableCases: [],
    };
  }

  const caseRows = await db
    .select({
      id: cases.id,
      title: cases.title,
      publishedAt: cases.publishedAt,
    })
    .from(cases)
    .where(
      and(inArray(cases.id, levelTaggedCaseIds), isNull(cases.deletedAt))
    )
    .orderBy(asc(cases.title));

  const releasedSet = new Set(
    (
      await db
        .select({ caseId: caseReleases.caseId })
        .from(caseReleases)
        .where(eq(caseReleases.classroomId, classroomId))
    ).map((r) => r.caseId)
  );

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
      isReleased: releasedSet.has(c.id),
    })),
  };
}
