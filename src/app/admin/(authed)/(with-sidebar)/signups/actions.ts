"use server";

import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  pendingSignups,
  profiles,
  students,
  classrooms,
} from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { signupApprovedEmail } from "@/lib/email/templates";
import { getSiteUrl } from "@/lib/site-url";

export type SignupActionResult = { ok: true } | { ok: false; error: string };

async function loadPending(
  signupId: string
): Promise<{ id: string; email: string; name: string } | null> {
  const [row] = await db
    .select({
      id: pendingSignups.id,
      email: pendingSignups.email,
      name: pendingSignups.name,
    })
    .from(pendingSignups)
    .where(eq(pendingSignups.id, signupId))
    .limit(1);
  return row ?? null;
}

async function promoteAndNotify(args: {
  signupId: string;
  email: string;
  name: string;
  classroomId: string | null;
}): Promise<SignupActionResult> {
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({ role: "student" })
        .where(eq(profiles.id, args.signupId));
      await tx.insert(students).values({
        id: args.signupId,
        classroomId: args.classroomId,
        email: args.email,
        name: args.name,
      });
      await tx
        .delete(pendingSignups)
        .where(eq(pendingSignups.id, args.signupId));
    });
  } catch (err) {
    console.error("[admin/signups/promote] DB write failed:", err);
    return { ok: false, error: "Could not approve. Try again." };
  }

  const admin = createSupabaseAdminClient();
  const { error: metaErr } = await admin.auth.admin.updateUserById(
    args.signupId,
    { app_metadata: { role: "student" } }
  );
  if (metaErr) {
    // DB is already promoted — the JWT just needs to refresh. Log so we
    // notice if this happens regularly, but don't unwind the approval.
    console.error("[admin/signups/promote] updateUserById failed:", metaErr);
  }

  // Approval email — non-blocking. If Resend isn't configured (local dev),
  // the warning is logged and we still return ok.
  try {
    const siteUrl = await getSiteUrl();
    const tpl = signupApprovedEmail({
      name: args.name,
      loginUrl: `${siteUrl}/login`,
    });
    const result = await sendEmail({
      to: args.email,
      subject: tpl.subject,
      html: tpl.html,
    });
    if (!result.ok) {
      console.warn("[admin/signups/promote] approval email failed:", result.error);
    }
  } catch (err) {
    console.warn("[admin/signups/promote] approval email threw:", err);
  }

  revalidatePath("/admin/signups");
  revalidatePath("/admin");
  revalidatePath("/admin/students");
  return { ok: true };
}

export async function approveDirect(args: {
  signupId: string;
}): Promise<SignupActionResult> {
  await requireRole("admin");

  const pending = await loadPending(args.signupId);
  if (!pending) return { ok: false, error: "Signup not found." };

  return promoteAndNotify({
    signupId: pending.id,
    email: pending.email,
    name: pending.name,
    classroomId: null,
  });
}

export async function approveToClassroom(args: {
  signupId: string;
  classroomId: string;
}): Promise<SignupActionResult> {
  await requireRole("admin");

  const pending = await loadPending(args.signupId);
  if (!pending) return { ok: false, error: "Signup not found." };

  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(
      and(eq(classrooms.id, args.classroomId), isNull(classrooms.deletedAt))
    )
    .limit(1);
  if (!classroom) return { ok: false, error: "Classroom not found." };

  return promoteAndNotify({
    signupId: pending.id,
    email: pending.email,
    name: pending.name,
    classroomId: classroom.id,
  });
}

export async function rejectSignup(args: {
  signupId: string;
}): Promise<SignupActionResult> {
  await requireRole("admin");

  const pending = await loadPending(args.signupId);
  if (!pending) return { ok: false, error: "Signup not found." };

  // The auth.users → profiles → pending_signups chain cascades on delete,
  // so removing the auth user is sufficient to clear the whole row stack.
  // The same email can sign up again afterwards (client requested this).
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(pending.id);
  if (error) {
    console.error("[admin/signups/reject] deleteUser failed:", error);
    return { ok: false, error: "Could not reject signup." };
  }

  revalidatePath("/admin/signups");
  revalidatePath("/admin");
  return { ok: true };
}
