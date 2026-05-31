import { eq, and, isNull, asc, sql, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  libraryPages,
  libraryPageLevels,
  libraryReleases,
  classroomLibraryAssignments,
  libraryPageSections,
  classrooms,
  students,
  type LibraryPage,
  type LibraryPageSection,
} from "@/db/schema";

// Fetch a page's ordered sections. Used by all three audiences.
async function getSectionsForPage(
  pageId: string
): Promise<LibraryPageSection[]> {
  return db
    .select()
    .from(libraryPageSections)
    .where(eq(libraryPageSections.libraryPageId, pageId))
    .orderBy(asc(libraryPageSections.position));
}

export type LibraryPageWithSections = {
  page: LibraryPage;
  sections: LibraryPageSection[];
};

export interface LibraryTocEntry {
  id: string;
  slug: string;
  title: string;
  eyebrow: string | null;
}

// Pages a student can see: not deleted and released to their classroom
// (library_releases). Reference content is now gated by teacher release, the
// same as cases/quizzes — no longer auto-visible by grade level.
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
      libraryReleases,
      eq(libraryReleases.libraryPageId, libraryPages.id)
    )
    .innerJoin(students, eq(students.id, studentId))
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.id, libraryReleases.classroomId)
      )
    )
    .where(
      and(isNull(libraryPages.deletedAt), isNull(classrooms.deletedAt))
    )
    .orderBy(asc(libraryPages.title));
}

// Single page lookup with the same release scoping. Returns null if the
// page isn't released to the student's classroom.
export async function getLibraryPageForStudent(
  studentId: string,
  slug: string
): Promise<LibraryPageWithSections | null> {
  const [row] = await db
    .select({ page: libraryPages })
    .from(libraryPages)
    .innerJoin(
      libraryReleases,
      eq(libraryReleases.libraryPageId, libraryPages.id)
    )
    .innerJoin(students, eq(students.id, studentId))
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, students.classroomId),
        eq(classrooms.id, libraryReleases.classroomId)
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

  if (!row?.page) return null;
  const sections = await getSectionsForPage(row.page.id);
  return { page: row.page, sections };
}

// =============================================================================
// Teacher queries — scoped to the pages an admin has assigned to one of the
// teacher's classrooms (classroom_library_assignments). A teacher running
// multiple classrooms sees the union of their assignments.
// =============================================================================

// Distinct library page ids assigned to any of this teacher's (non-deleted)
// classrooms. Shared by the list + single-page teacher queries.
async function assignedLibraryPageIds(teacherId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ pageId: classroomLibraryAssignments.libraryPageId })
    .from(classroomLibraryAssignments)
    .innerJoin(
      classrooms,
      and(
        eq(classrooms.id, classroomLibraryAssignments.classroomId),
        eq(classrooms.teacherId, teacherId),
        isNull(classrooms.deletedAt)
      )
    );
  return rows.map((r) => r.pageId);
}

export async function listLibraryForTeacher(
  teacherId: string
): Promise<LibraryTocEntry[]> {
  const ids = await assignedLibraryPageIds(teacherId);
  if (ids.length === 0) return [];

  return await db
    .select({
      id: libraryPages.id,
      slug: libraryPages.diagnosisSlug,
      title: libraryPages.title,
      eyebrow: libraryPages.eyebrow,
    })
    .from(libraryPages)
    .where(and(isNull(libraryPages.deletedAt), inArray(libraryPages.id, ids)))
    .orderBy(asc(libraryPages.title));
}

export async function getLibraryPageForTeacher(
  slug: string,
  teacherId: string
): Promise<LibraryPageWithSections | null> {
  const ids = await assignedLibraryPageIds(teacherId);
  if (ids.length === 0) return null;

  const [row] = await db
    .select({ page: libraryPages })
    .from(libraryPages)
    .where(
      and(
        eq(libraryPages.diagnosisSlug, slug),
        isNull(libraryPages.deletedAt),
        inArray(libraryPages.id, ids)
      )
    )
    .limit(1);
  if (!row?.page) return null;
  const sections = await getSectionsForPage(row.page.id);
  return { page: row.page, sections };
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
  sections: LibraryPageSection[];
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

  const [levels, sections] = await Promise.all([
    db
      .select({ level: libraryPageLevels.level })
      .from(libraryPageLevels)
      .where(eq(libraryPageLevels.libraryPageId, page.id)),
    getSectionsForPage(page.id),
  ]);

  return {
    page,
    levels: levels.map((l) => l.level as string),
    sections,
  };
}
