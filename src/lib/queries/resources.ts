import { eq, and, isNull, asc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  resources,
  resourceLevels,
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

export interface StudentResourceRow {
  id: string;
  title: string;
  type: Resource["type"];
  url: string;
}

// Resources tagged for the student's classroom level.
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
      resourceLevels,
      eq(resourceLevels.resourceId, resources.id)
    )
    .innerJoin(students, eq(students.id, studentId))
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.level, resourceLevels.level)
      )
    )
    .where(and(isNull(resources.deletedAt), isNull(classrooms.deletedAt)))
    .orderBy(asc(resources.title));
}
