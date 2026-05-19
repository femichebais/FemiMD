import Link from "next/link";
import type { Metadata } from "next";
import { Button, StageLabel } from "@/components/ui";
import { requireRole } from "@/lib/auth/current-user";
import {
  listTeacherClassrooms,
  type TeacherClassroomRow,
} from "@/lib/queries/teacher";

export const metadata: Metadata = { title: "Classrooms" };

// Counts (students, released cases) change on student signup + release
// toggles; opt out of the full-route cache so this dashboard always
// reflects live DB state.
export const dynamic = "force-dynamic";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle school",
  high: "High school",
  undergrad: "Undergrad",
};

async function safeList(teacherId: string): Promise<TeacherClassroomRow[]> {
  try {
    return await listTeacherClassrooms(teacherId);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[teacher/list]", err);
    }
    return [];
  }
}

export default async function TeacherOverviewPage() {
  const { user } = await requireRole("teacher");
  const rows = await safeList(user.id);

  return (
    <main className="max-w-case mx-auto px-6 md:px-12 py-10 md:py-14">
      <StageLabel className="mb-5">Classrooms</StageLabel>
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em]">
          Your classrooms.
        </h1>
        <Link href="/teacher/classroom/new">
          <Button>+ New classroom</Button>
        </Link>
      </div>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Each classroom has its own level, roster, and the cases you&apos;ve
        chosen to release to them.
      </p>

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          You don&apos;t have a classroom yet. Create one above.
        </p>
      ) : (
        <ul>
          {rows.map((c) => (
            <li
              key={c.id}
              className="border-b border-rule last:border-b-0 py-6"
            >
              <Link
                href={`/teacher/classroom/${c.id}`}
                className="block group"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-serif text-[22px] text-ink group-hover:text-accent transition-colors">
                    {c.name}
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-fade">
                    {LEVEL_LABEL[c.level] ?? c.level}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-fade">
                  <span>
                    {c.studentCount} student
                    {c.studentCount === 1 ? "" : "s"}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {c.releasedCaseCount} case
                    {c.releasedCaseCount === 1 ? "" : "s"} released
                  </span>
                  <span aria-hidden>·</span>
                  <span>invite {c.inviteCode}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
