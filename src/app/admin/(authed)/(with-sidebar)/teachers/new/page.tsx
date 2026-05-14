import { isNull, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { schools } from "@/db/schema";
import { StageLabel } from "@/components/ui";
import { TeacherForm } from "./teacher-form";

async function activeSchools() {
  try {
    return await db
      .select({ id: schools.id, name: schools.name })
      .from(schools)
      .where(isNull(schools.deletedAt))
      .orderBy(asc(schools.name));
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/teachers/new] schools query failed:", err);
    }
    return [];
  }
}

export default async function NewTeacherPage() {
  const rows = await activeSchools();

  return (
    <>
      <StageLabel className="mb-5">Invite teacher</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        New teacher.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        They&apos;ll get a one-time link to set their password.
      </p>

      <TeacherForm schools={rows} />
    </>
  );
}
