"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  classrooms,
  caseReleases,
  quizReleases,
  students,
} from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ToggleResult = { ok: true } | { ok: false; error: string };

// Admin-side case release toggle. Mirrors the teacher action but with an
// admin role check instead of a teacher-owns-classroom check, so platform
// admins can push cases to any classroom without going through that
// classroom's teacher.
export async function adminToggleCaseRelease(args: {
  classroomId: string;
  caseId: string;
  release: boolean;
}): Promise<ToggleResult> {
  await requireRole("admin");

  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(
      and(eq(classrooms.id, args.classroomId), isNull(classrooms.deletedAt))
    )
    .limit(1);
  if (!classroom) return { ok: false, error: "Classroom not found." };

  try {
    if (args.release) {
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
    console.error("[admin/adminToggleCaseRelease]", err);
    return { ok: false, error: "Could not update release." };
  }

  revalidatePath(`/admin/classrooms/${args.classroomId}`);
  revalidatePath("/admin/classrooms");
  // Teacher's dashboard + classroom views also read case_releases — keep
  // their cache fresh in case a teacher is mid-session.
  revalidatePath(`/teacher/classroom/${args.classroomId}`);
  revalidatePath("/teacher");
  return { ok: true };
}

// Admin-side quiz release toggle. Mirrors adminToggleCaseRelease but writes
// quiz_releases, so admins can release/unrelease quizzes to any classroom
// independently of case releases.
export async function adminToggleQuizRelease(args: {
  classroomId: string;
  quizId: string;
  release: boolean;
}): Promise<ToggleResult> {
  await requireRole("admin");

  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(
      and(eq(classrooms.id, args.classroomId), isNull(classrooms.deletedAt))
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
    console.error("[admin/adminToggleQuizRelease]", err);
    return { ok: false, error: "Could not update release." };
  }

  revalidatePath(`/admin/classrooms/${args.classroomId}`);
  revalidatePath("/admin/classrooms");
  revalidatePath(`/teacher/classroom/${args.classroomId}`);
  revalidatePath("/teacher");
  return { ok: true };
}

// =============================================================================
// deleteClassroom — admin soft-deletes any classroom
// =============================================================================
// Mirrors the teacher's deleteClassroom soft-delete (set deletedAt on the
// classroom + every enrolled student, then tombstone the students' auth
// emails so the addresses can be reused), but with an admin role check
// instead of a teacher-owns-classroom check. A hard delete would be blocked
// by the students.classroomId onDelete:restrict FK while students remain,
// which is why deletion was failing — there was no admin action at all.

export interface DeleteClassroomState {
  error?: string;
}

export async function deleteClassroom(
  _prevState: DeleteClassroomState,
  formData: FormData
): Promise<DeleteClassroomState> {
  await requireRole("admin");
  const classroomId = String(formData.get("classroomId") ?? "");
  if (!classroomId) return { error: "Missing classroom id." };

  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(and(eq(classrooms.id, classroomId), isNull(classrooms.deletedAt)))
    .limit(1);
  if (!classroom) return { error: "Classroom not found." };

  let studentIds: string[] = [];
  try {
    studentIds = await db.transaction(async (tx) => {
      await tx
        .update(classrooms)
        .set({ deletedAt: new Date() })
        .where(eq(classrooms.id, classroomId));

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
    console.error("[admin/deleteClassroom]", err);
    return { error: "Could not delete classroom." };
  }

  // Tombstone each student's auth email so it can be reused later. Non-fatal
  // per-student — the DB soft-delete already succeeded.
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
            "[admin/deleteClassroom] tombstone email failed for student",
            id,
            error.message
          );
        }
      })
    );
  }

  revalidatePath("/admin/classrooms");
  revalidatePath(`/admin/classrooms/${classroomId}`);
  revalidatePath("/teacher");
  redirect("/admin/classrooms");
}
