"use server";

import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { classrooms, caseReleases } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";

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
  return { ok: true };
}
