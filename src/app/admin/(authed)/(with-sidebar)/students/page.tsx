import Link from "next/link";
import type { Metadata } from "next";
import { StageLabel } from "@/components/ui";
import {
  listAllStudents,
  type AdminStudentRow,
} from "@/lib/queries/admin-students";

export const metadata: Metadata = { title: "Students" };

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle",
  high: "High",
  undergrad: "Undergrad",
};

async function safeList(): Promise<AdminStudentRow[]> {
  try {
    return await listAllStudents();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/students]", err);
    }
    return [];
  }
}

export default async function AdminStudentsPage() {
  const rows = await safeList();

  return (
    <>
      <StageLabel className="mb-5">Students</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        All students.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Across every classroom. Click a row to drill into their attempt
        history and manage their per-student access overrides.
      </p>

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No students yet. They&apos;ll show up here once they sign up via
          a classroom invite link.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-rule-strong">
                <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                  Name
                </th>
                <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                  Classroom
                </th>
                <th className="text-left py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                  School
                </th>
                <th className="text-right py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                  Attempts
                </th>
                <th className="text-right py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                  Completed
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-rule hover:bg-paper-2 transition-colors"
                >
                  <td className="py-4">
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="font-serif text-[16px] text-ink hover:text-accent"
                    >
                      {s.name}
                    </Link>
                    <span className="block font-mono text-[11px] text-ink-fade tracking-[0.02em]">
                      {s.email}
                    </span>
                  </td>
                  <td className="py-4 text-[14px] text-ink-mute">
                    {s.classroomName ?? "—"}
                    {s.classroomLevel && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
                        {LEVEL_LABEL[s.classroomLevel] ?? s.classroomLevel}
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-[14px] text-ink-mute">
                    {s.schoolName ?? "—"}
                  </td>
                  <td className="py-4 text-right font-mono text-[13px] tabular-nums">
                    {s.attemptCount}
                  </td>
                  <td className="py-4 text-right font-mono text-[13px] tabular-nums">
                    {s.completedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
