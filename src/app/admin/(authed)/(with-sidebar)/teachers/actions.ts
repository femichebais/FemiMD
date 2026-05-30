"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, teachers, schools, classrooms, students } from "@/db/schema";
import { isNotNull } from "drizzle-orm";
import { requireRole } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { teacherInviteEmail } from "@/lib/email/templates";
import { getSiteUrl } from "@/lib/site-url";

// Returns the auth.users.id for a soft-deleted teacher whose email matches.
// Used to recover from the pre-tombstone state: previously, deleteTeacher
// left auth.users in place with the original email, so re-creating with
// that email failed forever. This finds those stuck rows.
async function findStaleAuthUserId(email: string): Promise<string | null> {
  const [row] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(and(eq(teachers.email, email), isNotNull(teachers.deletedAt)))
    .limit(1);
  return row?.id ?? null;
}

export interface TeacherFormState {
  error?: string;
  // Echoed back so the form preserves typed input on validation failure.
  name?: string;
  email?: string;
  schoolId?: string;
  // Present on success — shown to admin to share with the teacher until
  // Resend integration (step 15) sends it automatically.
  invite?: {
    name: string;
    email: string;
    recoveryUrl: string;
  };
}

export async function createTeacher(
  _prevState: TeacherFormState,
  formData: FormData
): Promise<TeacherFormState> {
  await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const schoolId = String(formData.get("school_id") ?? "");

  if (!name || !email || !schoolId) {
    return { name, email, schoolId, error: "All fields are required." };
  }
  if (!email.includes("@")) {
    return { name, email, schoolId, error: "Enter a valid email." };
  }

  // Confirm the school is real and active before we create an auth user
  // (avoids orphan auth.users entries if the schoolId is forged).
  const [school] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(and(eq(schools.id, schoolId), isNull(schools.deletedAt)))
    .limit(1);

  if (!school) {
    return { name, email, schoolId, error: "Selected school not found." };
  }

  const admin = createSupabaseAdminClient();

  // Step 1: create the auth user. No password — teacher sets it via recovery.
  // app_metadata.role is what middleware and RLS read, so set it here so the
  // teacher's first JWT already carries the right role.
  let createResult = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role: "teacher" },
    user_metadata: { name },
  });

  // If the email is already taken AND it belongs to a soft-deleted teacher
  // (or any record we recognize as previously-deleted), tombstone the
  // existing auth.users email and retry once. This recovers from the prior
  // state where deleteTeacher didn't tombstone — without it, the admin
  // would be permanently locked out of reusing that email.
  if (
    createResult.error &&
    /already (registered|exists)/i.test(createResult.error.message)
  ) {
    const existing = await findStaleAuthUserId(email);
    if (existing) {
      const tombstone = `deleted-${Date.now()}-${existing.slice(0, 8)}@deleted.invalid`;
      const { error: tombstoneErr } = await admin.auth.admin.updateUserById(
        existing,
        { email: tombstone, email_confirm: true }
      );
      if (!tombstoneErr) {
        createResult = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          app_metadata: { role: "teacher" },
          user_metadata: { name },
        });
      }
    }
  }

  const { data: created, error: createErr } = createResult;
  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "Could not create auth user.";
    const friendly = /already (registered|exists)/i.test(msg)
      ? "A user with that email already exists."
      : msg;
    return { name, email, schoolId, error: friendly };
  }

  const userId = created.user.id;

  // Step 2: insert profile + teacher in a single transaction.
  try {
    await db.transaction(async (tx) => {
      await tx.insert(profiles).values({ id: userId, role: "teacher" });
      await tx
        .insert(teachers)
        .values({ id: userId, schoolId, email, name });
    });
  } catch (err) {
    // Roll back the auth user so the next attempt isn't blocked by a
    // duplicate email belonging to a half-created teacher.
    console.error("[admin/teachers/createTeacher] DB insert failed:", err);
    await admin.auth.admin.deleteUser(userId);
    return {
      name,
      email,
      schoolId,
      error: "Failed to save teacher record. Auth user was rolled back.",
    };
  }

  // Step 3: generate a recovery link for the teacher to set their password.
  // The redirectTo points at our /reset-password page, which extracts the
  // tokens from the URL hash and lets them choose a password.
  const siteUrl = await getSiteUrl();
  // First-time teachers land on /accept-invitation (welcome copy + their
  // school context), not /reset-password (which is for password resets
  // on existing accounts). The token type is still "recovery" — that's
  // Supabase's only flavor for "set a password via emailed link."
  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/accept-invitation` },
    });
  const recoveryUrl = linkData?.properties?.action_link ?? "";

  if (linkErr || !recoveryUrl) {
    // Teacher exists but link generation failed — surface as warning;
    // admin can trigger a password reset from the auth dashboard.
    console.error(
      "[admin/teachers/createTeacher] generateLink failed:",
      linkErr
    );
  } else {
    // Send the invite email via Resend. We don't block on email — if it
    // fails (e.g. RESEND_API_KEY not configured), the admin still sees
    // the link inline and can share manually.
    const tpl = teacherInviteEmail({ name, recoveryUrl });
    const emailResult = await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
    });
    if (!emailResult.ok) {
      console.warn(
        "[admin/teachers/createTeacher] email send failed:",
        emailResult.error
      );
    }
  }

  revalidatePath("/admin/teachers");
  revalidatePath("/admin");

  return {
    invite: { name, email, recoveryUrl },
  };
}

export interface DeleteTeacherState {
  error?: string;
}

export async function deleteTeacher(
  _prevState: DeleteTeacherState,
  formData: FormData
): Promise<DeleteTeacherState> {
  await requireRole("admin");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing teacher id." };

  try {
    // Find the teacher's classrooms first — classrooms.teacher_id is
    // onDelete:restrict, so they must go before the teacher can be deleted.
    const owned = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(eq(classrooms.teacherId, id));
    const classroomIds = owned.map((c) => c.id);

    await db.transaction(async (tx) => {
      if (classroomIds.length > 0) {
        // Detach (don't delete) enrolled students — they're separate accounts,
        // not the teacher's data. students.classroom_id is restrict, so we
        // must null it before the classroom can be removed. Their attempt
        // history stays intact.
        await tx
          .update(students)
          .set({ classroomId: null })
          .where(inArray(students.classroomId, classroomIds));

        // Drop the classrooms — cascades all assignment + release rows
        // (case/quiz/library/resource) that hang off classroom_id.
        await tx
          .delete(classrooms)
          .where(inArray(classrooms.id, classroomIds));
      }
    });
  } catch (err) {
    console.error("[admin/teachers/deleteTeacher] clearing classrooms", err);
    return { error: "Could not delete teacher." };
  }

  // Delete the auth user — cascades profiles -> teachers. This removes the
  // identity entirely and frees the email for reuse.
  const admin = createSupabaseAdminClient();
  const { error: delErr } = await admin.auth.admin.deleteUser(id);
  if (delErr) {
    console.error("[admin/teachers/deleteTeacher] deleteUser", delErr.message);
    return { error: "Could not delete teacher." };
  }

  revalidatePath("/admin/teachers");
  revalidatePath("/admin");
  return {};
}
