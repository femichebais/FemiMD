"use server";

import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { classrooms, caseReleases, quizReleases } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";

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
