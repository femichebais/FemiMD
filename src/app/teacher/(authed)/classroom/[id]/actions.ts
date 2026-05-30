"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  classrooms,
  caseReleases,
  quizReleases,
  libraryReleases,
  resourceReleases,
  students,
  caseAttempts,
  quizAttempts,
} from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ToggleResult = { ok: true } | { ok: false; error: string };

// Adds or removes the case_releases row for (classroomId, caseId). Brief §4:
// "Presence = released. No record = not released."
export async function toggleCaseRelease(args: {
  classroomId: string;
  caseId: string;
  release: boolean;
}): Promise<ToggleResult> {
  const { user } = await requireRole("teacher");

  // Ownership — must be the teacher's classroom.
  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(
      and(
        eq(classrooms.id, args.classroomId),
        eq(classrooms.teacherId, user.id),
        isNull(classrooms.deletedAt)
      )
    )
    .limit(1);

  if (!classroom) return { ok: false, error: "Classroom not found." };

  try {
    if (args.release) {
      // ON CONFLICT no-op via try/catch on the unique index. If it's already
      // released, treat as success.
      try {
        await db
          .insert(caseReleases)
          .values({ classroomId: args.classroomId, caseId: args.caseId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/duplicate|unique/i.test(msg)) throw err;
      }
    } else {
      await db
        .delete(caseReleases)
        .where(
          and(
            eq(caseReleases.classroomId, args.classroomId),
            eq(caseReleases.caseId, args.caseId)
          )
        );
    }
  } catch (err) {
    console.error("[teacher/toggleCaseRelease]", err);
    return { ok: false, error: "Could not update release." };
  }

  revalidatePath(`/teacher/classroom/${args.classroomId}`);
  // Dashboard shows released case count per classroom — keep it fresh.
  revalidatePath("/teacher");
  return { ok: true };
}

// Quiz-release toggle — independent of case releases. Same shape as the
// case version: insert on release, delete on unrelease, ownership-checked.
export async function toggleQuizRelease(args: {
  classroomId: string;
  quizId: string;
  release: boolean;
}): Promise<ToggleResult> {
  const { user } = await requireRole("teacher");

  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(
      and(
        eq(classrooms.id, args.classroomId),
        eq(classrooms.teacherId, user.id),
        isNull(classrooms.deletedAt)
      )
    )
    .limit(1);

  if (!classroom) return { ok: false, error: "Classroom not found." };

  try {
    if (args.release) {
      try {
        await db
          .insert(quizReleases)
          .values({ classroomId: args.classroomId, quizId: args.quizId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/duplicate|unique/i.test(msg)) throw err;
      }
    } else {
      await db
        .delete(quizReleases)
        .where(
          and(
            eq(quizReleases.classroomId, args.classroomId),
            eq(quizReleases.quizId, args.quizId)
          )
        );
    }
  } catch (err) {
    console.error("[teacher/toggleQuizRelease]", err);
    return { ok: false, error: "Could not update release." };
  }

  revalidatePath(`/teacher/classroom/${args.classroomId}`);
  revalidatePath("/teacher");
  return { ok: true };
}

// Library-release toggle — teacher releases an assigned library page to their
// students. Same ownership-checked shape as the case/quiz versions; writes
// library_releases (tier 2). Students see only released pages.
export async function toggleLibraryRelease(args: {
  classroomId: string;
  libraryPageId: string;
  release: boolean;
}): Promise<ToggleResult> {
  const { user } = await requireRole("teacher");

  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(
      and(
        eq(classrooms.id, args.classroomId),
        eq(classrooms.teacherId, user.id),
        isNull(classrooms.deletedAt)
      )
    )
    .limit(1);

  if (!classroom) return { ok: false, error: "Classroom not found." };

  try {
    if (args.release) {
      try {
        await db.insert(libraryReleases).values({
          classroomId: args.classroomId,
          libraryPageId: args.libraryPageId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/duplicate|unique/i.test(msg)) throw err;
      }
    } else {
      await db
        .delete(libraryReleases)
        .where(
          and(
            eq(libraryReleases.classroomId, args.classroomId),
            eq(libraryReleases.libraryPageId, args.libraryPageId)
          )
        );
    }
  } catch (err) {
    console.error("[teacher/toggleLibraryRelease]", err);
    return { ok: false, error: "Could not update release." };
  }

  revalidatePath(`/teacher/classroom/${args.classroomId}`);
  // Students read library_releases — keep their library cache fresh.
  revalidatePath("/student/library");
  return { ok: true };
}

// Resource-release toggle — teacher releases an assigned resource to their
// students. Writes resource_releases (tier 2).
export async function toggleResourceRelease(args: {
  classroomId: string;
  resourceId: string;
  release: boolean;
}): Promise<ToggleResult> {
  const { user } = await requireRole("teacher");

  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(
      and(
        eq(classrooms.id, args.classroomId),
        eq(classrooms.teacherId, user.id),
        isNull(classrooms.deletedAt)
      )
    )
    .limit(1);

  if (!classroom) return { ok: false, error: "Classroom not found." };

  try {
    if (args.release) {
      try {
        await db.insert(resourceReleases).values({
          classroomId: args.classroomId,
          resourceId: args.resourceId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/duplicate|unique/i.test(msg)) throw err;
      }
    } else {
      await db
        .delete(resourceReleases)
        .where(
          and(
            eq(resourceReleases.classroomId, args.classroomId),
            eq(resourceReleases.resourceId, args.resourceId)
          )
        );
    }
  } catch (err) {
    console.error("[teacher/toggleResourceRelease]", err);
    return { ok: false, error: "Could not update release." };
  }

  revalidatePath(`/teacher/classroom/${args.classroomId}`);
  revalidatePath("/student/resources");
  return { ok: true };
}

// =============================================================================
// deleteClassroom — teacher soft-deletes their own classroom
// =============================================================================
// Soft-deletes the classroom row + tombstones every enrolled student so they
// can't sign in anymore. Existing case + quiz attempt history is kept so
// any admin-level analytics remain consistent. Auth emails are rotated to
// .invalid so the addresses can be reused if the admin re-invites later.

export interface DeleteClassroomState {
  error?: string;
}

export async function deleteClassroom(
  _prevState: DeleteClassroomState,
  formData: FormData
): Promise<DeleteClassroomState> {
  const { user } = await requireRole("teacher");
  const classroomId = String(formData.get("classroomId") ?? "");
  if (!classroomId) return { error: "Missing classroom id." };

  // Ownership check — must belong to this teacher and not be already deleted.
  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(
      and(
        eq(classrooms.id, classroomId),
        eq(classrooms.teacherId, user.id),
        isNull(classrooms.deletedAt)
      )
    )
    .limit(1);
  if (!classroom) return { error: "Classroom not found." };

  let studentIds: string[] = [];
  try {
    studentIds = await db.transaction(async (tx) => {
      // 1. Soft-delete the classroom itself.
      await tx
        .update(classrooms)
        .set({ deletedAt: new Date() })
        .where(eq(classrooms.id, classroomId));

      // 2. Soft-delete every enrolled student. Returning their ids so we can
      //    tombstone their auth emails outside the transaction.
      const tombstoned = await tx
        .update(students)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(students.classroomId, classroomId),
            isNull(students.deletedAt)
          )
        )
        .returning({ id: students.id });
      return tombstoned.map((s) => s.id);
    });
  } catch (err) {
    console.error("[teacher/deleteClassroom]", err);
    return { error: "Could not delete classroom." };
  }

  // 3. Tombstone each student's auth email so the address can be reused if
  //    the admin invites a fresh account at the same email later. Non-fatal
  //    per-student — DB soft-delete already succeeded.
  if (studentIds.length > 0) {
    const admin = createSupabaseAdminClient();
    await Promise.all(
      studentIds.map(async (id) => {
        const tombstone = `deleted-${Date.now()}-${id.slice(0, 8)}@deleted.invalid`;
        const { error } = await admin.auth.admin.updateUserById(id, {
          email: tombstone,
          email_confirm: true,
        });
        if (error) {
          console.warn(
            "[teacher/deleteClassroom] tombstone email failed for student",
            id,
            error.message
          );
        }
      })
    );
  }

  revalidatePath("/teacher");
  revalidatePath(`/teacher/classroom/${classroomId}`);
  redirect("/teacher");
}

// =============================================================================
// removeStudent — teacher hard-deletes a single student from their classroom
// =============================================================================
// Fully removes the student — auth user, profile, students row, attempt
// history, and grants. Mirrors the admin's deleteStudent teardown but
// ownership-checks the classroom against the requesting teacher first.

export interface RemoveStudentState {
  error?: string;
}

export async function removeStudent(
  _prevState: RemoveStudentState,
  formData: FormData
): Promise<RemoveStudentState> {
  const { user } = await requireRole("teacher");
  const studentId = String(formData.get("studentId") ?? "");
  const classroomId = String(formData.get("classroomId") ?? "");
  if (!studentId || !classroomId) {
    return { error: "Missing student or classroom id." };
  }

  // Ownership: the student must be enrolled in a classroom owned by this
  // teacher, and not already soft-deleted. The join verifies both in a single
  // query.
  const [row] = await db
    .select({ id: students.id })
    .from(students)
    .innerJoin(classrooms, eq(classrooms.id, students.classroomId))
    .where(
      and(
        eq(students.id, studentId),
        eq(students.classroomId, classroomId),
        eq(classrooms.teacherId, user.id),
        isNull(students.deletedAt),
        isNull(classrooms.deletedAt)
      )
    )
    .limit(1);
  if (!row) return { error: "Student not found in your classroom." };

  try {
    // Clear the restrict-FK blockers (attempt history) so the auth-user delete
    // can cascade through the students row. (case/quiz_attempts.student_id are
    // onDelete:restrict; stage_attempts cascade off case_attempts.)
    await db.transaction(async (tx) => {
      await tx.delete(caseAttempts).where(eq(caseAttempts.studentId, studentId));
      await tx.delete(quizAttempts).where(eq(quizAttempts.studentId, studentId));
    });
  } catch (err) {
    console.error("[teacher/removeStudent] clearing attempts", err);
    return { error: "Could not remove student." };
  }

  // Delete the auth user — cascades profiles -> students -> grants. Removes the
  // identity entirely and frees the email for reuse.
  const admin = createSupabaseAdminClient();
  const { error: delErr } = await admin.auth.admin.deleteUser(studentId);
  if (delErr) {
    console.error("[teacher/removeStudent] deleteUser", delErr.message);
    return { error: "Could not remove student." };
  }

  revalidatePath(`/teacher/classroom/${classroomId}`);
  revalidatePath("/teacher");
  return {};
}
