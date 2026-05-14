"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { classrooms, teachers } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { generateInviteCode } from "@/lib/invite-code";

export type Level = "middle" | "high" | "undergrad";

export interface ClassroomFormState {
  error?: string;
  values?: { name: string; level: Level };
}

export async function createClassroom(
  _prevState: ClassroomFormState,
  formData: FormData
): Promise<ClassroomFormState> {
  const { user } = await requireRole("teacher");

  const name = String(formData.get("name") ?? "").trim();
  const level = String(formData.get("level") ?? "") as Level;

  if (!name) return { error: "Name is required.", values: { name, level } };
  if (level !== "middle" && level !== "high" && level !== "undergrad") {
    return { error: "Pick a level.", values: { name, level } };
  }

  // Look up the teacher's school. We must have a row in teachers — admin
  // creates it during the teacher provisioning flow.
  const [teacherRow] = await db
    .select({ schoolId: teachers.schoolId })
    .from(teachers)
    .where(and(eq(teachers.id, user.id), isNull(teachers.deletedAt)))
    .limit(1);

  if (!teacherRow) {
    return {
      error: "Teacher record not found. Ask your admin to re-provision.",
      values: { name, level },
    };
  }

  // Retry on the (very rare) invite code collision. The unique index on
  // classrooms.invite_code makes this safe.
  let newId: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    try {
      const [row] = await db
        .insert(classrooms)
        .values({
          schoolId: teacherRow.schoolId,
          teacherId: user.id,
          name,
          level,
          inviteCode,
        })
        .returning({ id: classrooms.id });
      newId = row.id;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/duplicate|unique/i.test(msg)) {
        console.error("[teacher/createClassroom]", err);
        return {
          error: "Could not create classroom.",
          values: { name, level },
        };
      }
      // Otherwise loop and try a fresh code.
    }
  }

  if (!newId) {
    return {
      error: "Could not generate a unique invite code. Try again.",
      values: { name, level },
    };
  }

  revalidatePath("/teacher");
  redirect(`/teacher/classroom/${newId}`);
}
