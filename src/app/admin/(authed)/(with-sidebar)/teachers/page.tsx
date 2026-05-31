import Link from "next/link";
import { isNull, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teachers, schools } from "@/db/schema";
import { StageLabel } from "@/components/ui";
import { CLinkButton } from "@/components/clinical/primitives";
import { DeleteTeacherButton } from "./delete-teacher-button";

async function listTeachers() {
  try {
    return await db
      .select({
        id: teachers.id,
        name: teachers.name,
        email: teachers.email,
        createdAt: teachers.createdAt,
        schoolName: schools.name,
      })
      .from(teachers)
      .leftJoin(schools, eq(schools.id, teachers.schoolId))
      .where(isNull(teachers.deletedAt))
      .orderBy(desc(teachers.createdAt));
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/teachers] listTeachers failed:", err);
    }
    return [];
  }
}

export default async function TeachersPage() {
  const rows = await listTeachers();

  return (
    <>
      <StageLabel className="mb-5">Teachers</StageLabel>
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em]">
          Teachers on the platform.
        </h1>
        <CLinkButton href="/admin/teachers/new" size="sm">
          + Invite teacher
        </CLinkButton>
      </div>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Each teacher belongs to one school and can run many classrooms.
      </p>

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No teachers yet.
        </p>
      ) : (
        <ul>
          {rows.map((teacher) => (
            <li
              key={teacher.id}
              className="grid grid-cols-[1fr_180px_180px_80px] items-baseline gap-6 py-5 border-b border-rule"
            >
              <span>
                <span className="font-serif text-[18px] text-ink block">
                  {teacher.name}
                </span>
                <span className="font-mono text-[11px] text-ink-mute tracking-[0.02em]">
                  {teacher.email}
                </span>
              </span>
              <span className="font-serif text-[14px] text-ink-mute">
                {teacher.schoolName ?? "—"}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                Joined{" "}
                {new Date(teacher.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="justify-self-end">
                <DeleteTeacherButton id={teacher.id} name={teacher.name} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
