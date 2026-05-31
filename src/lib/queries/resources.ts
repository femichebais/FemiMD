import { eq, and, isNull, asc, sql, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  resources,
  resourceLevels,
  resourceReleases,
  classroomResourceAssignments,
  classrooms,
  students,
  type Resource,
} from "@/db/schema";

export interface AdminResourceRow {
  id: string;
  title: string;
  type: Resource["type"];
  url: string;
  storagePath: string | null;
  createdAt: Date;
  levels: string[];
}

export async function listAllResources(): Promise<AdminResourceRow[]> {
  return await db
    .select({
      id: resources.id,
      title: resources.title,
      type: resources.type,
      url: resources.url,
      storagePath: resources.storagePath,
      createdAt: resources.createdAt,
      levels: sql<string[]>`(
        SELECT COALESCE(ARRAY_AGG(${resourceLevels.level}::text), '{}'::text[])
        FROM ${resourceLevels}
        WHERE ${resourceLevels.resourceId} = ${resources.id}
      )`,
    })
    .from(resources)
    .where(isNull(resources.deletedAt))
    .orderBy(asc(resources.title));
}

// Resources a teacher can see: assigned by an admin to one of the teacher's
// classrooms (classroom_resource_assignments). A teacher running multiple
// classrooms sees the union of their assignments.
export async function listResourcesForTeacher(
  teacherId: string
): Promise<AdminResourceRow[]> {
  const idRows = await db
    .selectDistinct({ resourceId: classroomResourceAssignments.resourceId })
    .from(classroomResourceAssignments)
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, classroomResourceAssignments.classroomId),
        eq(classrooms.teacherId, teacherId),
        isNull(classrooms.deletedAt)
      )
    );
  const ids = idRows.map((r) => r.resourceId);
  if (ids.length === 0) return [];

  return await db
    .select({
      id: resources.id,
      title: resources.title,
      type: resources.type,
      url: resources.url,
      storagePath: resources.storagePath,
      createdAt: resources.createdAt,
      levels: sql<string[]>`(
        SELECT COALESCE(ARRAY_AGG(${resourceLevels.level}::text), '{}'::text[])
        FROM ${resourceLevels}
        WHERE ${resourceLevels.resourceId} = ${resources.id}
      )`,
    })
    .from(resources)
    .where(and(isNull(resources.deletedAt), inArray(resources.id, ids)))
    .orderBy(asc(resources.title));
}

export interface StudentResourceRow {
  id: string;
  title: string;
  type: Resource["type"];
  url: string;
}

// Resources released to the student's classroom (resource_releases). Now
// gated by teacher release, the same as cases/quizzes — no longer auto-visible
// by grade level.
export async function listResourcesForStudent(
  studentId: string
): Promise<StudentResourceRow[]> {
  return await db
    .select({
      id: resources.id,
      title: resources.title,
      type: resources.type,
      url: resources.url,
    })
    .from(resources)
    .innerJoin(
      resourceReleases,
      eq(resourceReleases.resourceId, resources.id)
    )
    .innerJoin(students, eq(students.id, studentId))
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.id, resourceReleases.classroomId)
      )
    )
    .where(and(isNull(resources.deletedAt), isNull(classrooms.deletedAt)))
    .orderBy(asc(resources.title));
}
