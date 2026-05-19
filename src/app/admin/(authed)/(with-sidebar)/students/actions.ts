"use server";

import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { students } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Soft-delete a student: drops them off classroom rosters + locks them out
// of the platform, but keeps their case/quiz attempts so teacher analytics
// stay consistent. Auth email is tombstoned so the address can be reused if
// the admin invites a fresh account later.

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
    await db
      .update(students)
      .set({ deletedAt: new Date() })
      .where(and(eq(students.id, id), isNull(students.deletedAt)));
  } catch (err) {
    console.error("[admin/students/deleteStudent]", err);
    return { error: "Could not delete student." };
  }

  // Rotate auth email to .invalid so the address can be reused. Non-fatal
  // if it errors — the DB delete already succeeded.
  const admin = createSupabaseAdminClient();
  const tombstone = `deleted-${Date.now()}-${id.slice(0, 8)}@deleted.invalid`;
  const { error: renameErr } = await admin.auth.admin.updateUserById(id, {
    email: tombstone,
    email_confirm: true,
  });
  if (renameErr) {
    console.warn(
      "[admin/students/deleteStudent] tombstone email failed:",
      renameErr.message
    );
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin");
  return {};
}
