"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { students, caseAttempts, quizAttempts } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Hard-delete a student: remove the auth user and EVERY trace of them —
// profile, students row, case/quiz attempt history, and any admin grants.
// Nothing survives, so the email is immediately free to reuse.
//
// Order matters because of the FKs in schema.ts:
//   - case_attempts.student_id / quiz_attempts.student_id are onDelete:restrict,
//     so they'd block the cascade. We delete them first (stage_attempts cascade
//     off case_attempts).
//   - Deleting the auth.users row then cascades profiles -> students ->
//     student_case_grants / student_quiz_grants (all onDelete:cascade).

export interface DeleteStudentState {
  error?: string;
}

export async function deleteStudent(
  _prevState: DeleteStudentState,
  formData: FormData
): Promise<DeleteStudentState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing student id." };

  try {
    // 1. Clear the restrict-FK blockers (attempt history) so the auth-user
    //    delete can cascade through the students row.
    await db.transaction(async (tx) => {
      await tx.delete(caseAttempts).where(eq(caseAttempts.studentId, id));
      await tx.delete(quizAttempts).where(eq(quizAttempts.studentId, id));
    });
  } catch (err) {
    console.error("[admin/students/deleteStudent] clearing attempts", err);
    return { error: "Could not delete student." };
  }

  // 2. Delete the auth user — cascades profiles -> students -> grants. This is
  //    the step that actually removes the identity and frees the email.
  const admin = createSupabaseAdminClient();
  const { error: delErr } = await admin.auth.admin.deleteUser(id);
  if (delErr) {
    console.error("[admin/students/deleteStudent] deleteUser", delErr.message);
    return { error: "Could not delete student." };
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin");
  return {};
}
