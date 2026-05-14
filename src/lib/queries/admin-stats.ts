import { isNull, count } from "drizzle-orm";
import { db } from "@/db/client";
import {
  schools,
  teachers,
  cases,
  students,
  classrooms,
} from "@/db/schema";

export interface AdminStats {
  schoolCount: number;
  teacherCount: number;
  classroomCount: number;
  studentCount: number;
  caseCount: number;
}

// Counts of *active* (not soft-deleted) rows. Admin-only, so this runs
// through Drizzle (RLS bypassed) — the caller must have already gated
// on the admin role. Wrapped at the call site so a missing DATABASE_URL
// during local bring-up doesn't 500 the layout.
export async function getAdminStats(): Promise<AdminStats> {
  const [s, t, c, st, ca] = await Promise.all([
    db.select({ n: count() }).from(schools).where(isNull(schools.deletedAt)),
    db.select({ n: count() }).from(teachers).where(isNull(teachers.deletedAt)),
    db
      .select({ n: count() })
      .from(classrooms)
      .where(isNull(classrooms.deletedAt)),
    db.select({ n: count() }).from(students).where(isNull(students.deletedAt)),
    db.select({ n: count() }).from(cases).where(isNull(cases.deletedAt)),
  ]);

  return {
    schoolCount: Number(s[0]?.n ?? 0),
    teacherCount: Number(t[0]?.n ?? 0),
    classroomCount: Number(c[0]?.n ?? 0),
    studentCount: Number(st[0]?.n ?? 0),
    caseCount: Number(ca[0]?.n ?? 0),
  };
}
