import { eq, and, isNull, asc, desc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  pendingSignups,
  classrooms,
  schools,
  teachers,
} from "@/db/schema";

export interface PendingSignupRow {
  id: string;
  email: string;
  name: string;
  requestedAt: Date;
}

export async function listPendingSignups(): Promise<PendingSignupRow[]> {
  return db
    .select({
      id: pendingSignups.id,
      email: pendingSignups.email,
      name: pendingSignups.name,
      requestedAt: pendingSignups.requestedAt,
    })
    .from(pendingSignups)
    .orderBy(desc(pendingSignups.requestedAt));
}

// Just the count — used in the sidebar badge. Cheaper than fetching rows.
export async function countPendingSignups(): Promise<number> {
  const rows = await db
    .select({ id: pendingSignups.id })
    .from(pendingSignups);
  return rows.length;
}

export interface ClassroomPickerRow {
  id: string;
  name: string;
  level: "middle" | "high" | "undergrad";
  teacherName: string;
  schoolName: string;
}

// Used to populate the "Assign to classroom" dropdown. Soft-deleted classrooms
// are excluded so admin can't approve someone into a dead classroom.
export async function listClassroomsForPicker(): Promise<ClassroomPickerRow[]> {
  return db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      level: classrooms.level,
      teacherName: teachers.name,
      schoolName: schools.name,
    })
    .from(classrooms)
    .innerJoin(teachers, eq(teachers.id, classrooms.teacherId))
    .innerJoin(schools, eq(schools.id, classrooms.schoolId))
    .where(isNull(classrooms.deletedAt))
    .orderBy(asc(schools.name), asc(teachers.name), asc(classrooms.name));
}
