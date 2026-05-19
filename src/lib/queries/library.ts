import { eq, and, isNull, asc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  libraryPages,
  libraryPageLevels,
  classrooms,
  students,
  type LibraryPage,
} from "@/db/schema";

export interface LibraryTocEntry {
  id: string;
  slug: string;
  title: string;
  eyebrow: string | null;
}

// Pages a student can see: not deleted, tagged for their classroom's level.
export async function listLibraryForStudent(
  studentId: string
): Promise<LibraryTocEntry[]> {
  return await db
    .select({
      id: libraryPages.id,
      slug: libraryPages.diagnosisSlug,
      title: libraryPages.title,
      eyebrow: libraryPages.eyebrow,
    })
    .from(libraryPages)
    .innerJoin(
      libraryPageLevels,
      eq(libraryPageLevels.libraryPageId, libraryPages.id)
    )
    .innerJoin(students, eq(students.id, studentId))
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.level, libraryPageLevels.level)
      )
    )
    .where(
      and(isNull(libraryPages.deletedAt), isNull(classrooms.deletedAt))
    )
    .orderBy(asc(libraryPages.title));
}

// Single page lookup with the same level scoping. Returns null if the
// student can't access it.
export async function getLibraryPageForStudent(
  studentId: string,
  slug: string
): Promise<LibraryPage | null> {
  const [row] = await db
    .select({ page: libraryPages })
    .from(libraryPages)
    .innerJoin(
      libraryPageLevels,
      eq(libraryPageLevels.libraryPageId, libraryPages.id)
    )
    .innerJoin(students, eq(students.id, studentId))
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.level, libraryPageLevels.level)
      )
    )
    .where(
      and(
        eq(libraryPages.diagnosisSlug, slug),
        isNull(libraryPages.deletedAt),
        isNull(classrooms.deletedAt)
      )
    )
    .limit(1);

  return row?.page ?? null;
}

// =============================================================================
// Teacher queries — teachers see every non-deleted library page regardless
// of level. They review across cohorts and benefit from full visibility.
// =============================================================================

export async function listLibraryForTeacher(): Promise<LibraryTocEntry[]> {
  return await db
    .select({
      id: libraryPages.id,
      slug: libraryPages.diagnosisSlug,
      title: libraryPages.title,
      eyebrow: libraryPages.eyebrow,
    })
    .from(libraryPages)
    .where(isNull(libraryPages.deletedAt))
    .orderBy(asc(libraryPages.title));
}

export async function getLibraryPageForTeacher(
  slug: string
): Promise<LibraryPage | null> {
  const [row] = await db
    .select()
    .from(libraryPages)
    .where(
      and(eq(libraryPages.diagnosisSlug, slug), isNull(libraryPages.deletedAt))
    )
    .limit(1);
  return row ?? null;
}

// =============================================================================
// Admin queries — RLS-bypassed via Drizzle. Callers must requireRole('admin').
// =============================================================================

export interface AdminLibraryRow {
  id: string;
  slug: string;
  title: string;
  eyebrow: string | null;
  levels: string[];
  createdAt: Date;
}

export async function listAllLibraryPages(): Promise<AdminLibraryRow[]> {
  return await db
    .select({
      id: libraryPages.id,
      slug: libraryPages.diagnosisSlug,
      title: libraryPages.title,
      eyebrow: libraryPages.eyebrow,
      createdAt: libraryPages.createdAt,
      levels: sql<string[]>`(
        SELECT COALESCE(ARRAY_AGG(${libraryPageLevels.level}::text), '{}'::text[])
        FROM ${libraryPageLevels}
        WHERE ${libraryPageLevels.libraryPageId} = ${libraryPages.id}
      )`,
    })
    .from(libraryPages)
    .where(isNull(libraryPages.deletedAt))
    .orderBy(asc(libraryPages.title));
}

export interface AdminLibraryDetail {
  page: LibraryPage;
  levels: string[];
}

export async function getLibraryPageBySlug(
  slug: string
): Promise<AdminLibraryDetail | null> {
  const [page] = await db
    .select()
    .from(libraryPages)
    .where(eq(libraryPages.diagnosisSlug, slug))
    .limit(1);

  if (!page || page.deletedAt) return null;

  const levels = await db
    .select({ level: libraryPageLevels.level })
    .from(libraryPageLevels)
    .where(eq(libraryPageLevels.libraryPageId, page.id));

  return { page, levels: levels.map((l) => l.level as string) };
}
