"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { studentCaseGrants, students, cases } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";

export type ToggleGrantResult = { ok: true } | { ok: false; error: string };

// Admin override — grants a specific student access to a specific case
// outside the classroom-release model. Idempotent: regranting an existing
// pair is a no-op; revoking a non-existent pair is a no-op.
export async function toggleCaseGrant(args: {
  studentId: string;
  caseId: string;
  grant: boolean;
}): Promise<ToggleGrantResult> {
  const { user } = await requireRole("admin");

  // Validate both ends exist (and aren't soft-deleted) to avoid orphan rows.
  const [s] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, args.studentId))
    .limit(1);
  if (!s) return { ok: false, error: "Student not found." };

  const [c] = await db
    .select({ id: cases.id })
    .from(cases)
    .where(eq(cases.id, args.caseId))
    .limit(1);
  if (!c) return { ok: false, error: "Case not found." };

  try {
    if (args.grant) {
      // Insert ignoring unique-violation (already granted = no-op).
      try {
        await db.insert(studentCaseGrants).values({
          studentId: args.studentId,
          caseId: args.caseId,
          grantedBy: user.id,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/duplicate|unique/i.test(msg)) throw err;
      }
    } else {
      await db
        .delete(studentCaseGrants)
        .where(
          and(
            eq(studentCaseGrants.studentId, args.studentId),
            eq(studentCaseGrants.caseId, args.caseId)
          )
        );
    }
  } catch (err) {
    console.error("[admin/students/toggleCaseGrant]", err);
    return { ok: false, error: "Could not update grant." };
  }

  revalidatePath(`/admin/students/${args.studentId}`);
  return { ok: true };
}
