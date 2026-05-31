"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  classrooms,
  classroomCaseAssignments,
  classroomQuizAssignments,
  classroomLibraryAssignments,
  classroomResourceAssignments,
  students,
} from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ToggleResult = { ok: true } | { ok: false; error: string };

// Verify the classroom exists (and isn't soft-deleted). Shared by every
// admin assignment toggle below.
async function classroomExists(classroomId: string): Promise<boolean> {
  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(and(eq(classrooms.id, classroomId), isNull(classrooms.deletedAt)))
    .limit(1);
  return Boolean(classroom);
}

// Revalidate every surface that reads an assignment: the admin classroom
// views plus the teacher's dashboard + classroom (teachers see only assigned
// content, so an assignment change must invalidate their cache too).
function revalidateAssignment(classroomId: string) {
  revalidatePath(`/admin/classrooms/${classroomId}`);
  revalidatePath("/admin/classrooms");
  revalidatePath(`/teacher/classroom/${classroomId}`);
  revalidatePath("/teacher");
  revalidatePath("/teacher/library");
  revalidatePath("/teacher/resources");
}

// =============================================================================
// Admin assignment toggles (admin → teacher, tier 1)
// =============================================================================
// Presence of an assignment row = the classroom's teacher can see this
// content. The teacher then decides what to release to students. Admins do NOT
// release to students directly — that's the teacher's call.

export async function adminToggleCaseAssignment(args: {
  classroomId: string;
  caseId: string;
  assign: boolean;
}): Promise<ToggleResult> {
  await requireRole("admin");
  if (!(await classroomExists(args.classroomId)))
    return { ok: false, error: "Classroom not found." };

  try {
    if (args.assign) {
      try {
        await db
          .insert(classroomCaseAssignments)
          .values({ classroomId: args.classroomId, caseId: args.caseId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/duplicate|unique/i.test(msg)) throw err;
      }
    } else {
      await db
        .delete(classroomCaseAssignments)
        .where(
          and(
            eq(classroomCaseAssignments.classroomId, args.classroomId),
            eq(classroomCaseAssignments.caseId, args.caseId)
          )
        );
    }
  } catch (err) {
    console.error("[admin/adminToggleCaseAssignment]", err);
    return { ok: false, error: "Could not update assignment." };
  }

  revalidateAssignment(args.classroomId);
  return { ok: true };
}

export async function adminToggleQuizAssignment(args: {
  classroomId: string;
  quizId: string;
  assign: boolean;
}): Promise<ToggleResult> {
  await requireRole("admin");
  if (!(await classroomExists(args.classroomId)))
    return { ok: false, error: "Classroom not found." };

  try {
    if (args.assign) {
      try {
        await db
          .insert(classroomQuizAssignments)
          .values({ classroomId: args.classroomId, quizId: args.quizId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/duplicate|unique/i.test(msg)) throw err;
      }
    } else {
      await db
        .delete(classroomQuizAssignments)
        .where(
          and(
            eq(classroomQuizAssignments.classroomId, args.classroomId),
            eq(classroomQuizAssignments.quizId, args.quizId)
          )
        );
    }
  } catch (err) {
    console.error("[admin/adminToggleQuizAssignment]", err);
    return { ok: false, error: "Could not update assignment." };
  }

  revalidateAssignment(args.classroomId);
  return { ok: true };
}

export async function adminToggleLibraryAssignment(args: {
  classroomId: string;
  libraryPageId: string;
  assign: boolean;
}): Promise<ToggleResult> {
  await requireRole("admin");
  if (!(await classroomExists(args.classroomId)))
    return { ok: false, error: "Classroom not found." };

  try {
    if (args.assign) {
      try {
        await db.insert(classroomLibraryAssignments).values({
          classroomId: args.classroomId,
          libraryPageId: args.libraryPageId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/duplicate|unique/i.test(msg)) throw err;
      }
    } else {
      await db
        .delete(classroomLibraryAssignments)
        .where(
          and(
            eq(classroomLibraryAssignments.classroomId, args.classroomId),
            eq(classroomLibraryAssignments.libraryPageId, args.libraryPageId)
          )
        );
    }
  } catch (err) {
    console.error("[admin/adminToggleLibraryAssignment]", err);
    return { ok: false, error: "Could not update assignment." };
  }

  revalidateAssignment(args.classroomId);
  return { ok: true };
}

export async function adminToggleResourceAssignment(args: {
  classroomId: string;
  resourceId: string;
  assign: boolean;
}): Promise<ToggleResult> {
  await requireRole("admin");
  if (!(await classroomExists(args.classroomId)))
    return { ok: false, error: "Classroom not found." };

  try {
    if (args.assign) {
      try {
        await db.insert(classroomResourceAssignments).values({
          classroomId: args.classroomId,
          resourceId: args.resourceId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/duplicate|unique/i.test(msg)) throw err;
      }
    } else {
      await db
        .delete(classroomResourceAssignments)
        .where(
          and(
            eq(classroomResourceAssignments.classroomId, args.classroomId),
            eq(classroomResourceAssignments.resourceId, args.resourceId)
          )
        );
    }
  } catch (err) {
    console.error("[admin/adminToggleResourceAssignment]", err);
    return { ok: false, error: "Could not update assignment." };
  }

  revalidateAssignment(args.classroomId);
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
