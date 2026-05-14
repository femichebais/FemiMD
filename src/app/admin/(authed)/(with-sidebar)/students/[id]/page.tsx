import Link from "next/link";
import { notFound } from "next/navigation";
import { StageLabel } from "@/components/ui";
import { getAdminStudentDetail } from "@/lib/queries/admin-student-detail";
import { GrantToggle } from "./grant-toggle";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle school",
  high: "High school",
  undergrad: "Undergrad",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminStudentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminStudentDetail(id);
  if (!detail) notFound();
  const { student, cases, attempts } = detail;

  return (
    <>
      <div className="flex items-baseline justify-between mb-3">
        <StageLabel>Student</StageLabel>
        <Link
          href="/admin/students"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← All students
        </Link>
      </div>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-1">
        {student.name}
      </h1>
      <p className="font-mono text-[12px] text-ink-mute mb-2">
        {student.email}
      </p>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        {student.classroomName ?? "No classroom"}
        {student.classroomLevel
          ? ` · ${LEVEL_LABEL[student.classroomLevel] ?? student.classroomLevel}`
          : ""}
        {student.schoolName ? ` · ${student.schoolName}` : ""}
      </p>

      {/* Per-case grants (override) */}
      <StageLabel className="mb-5">Case access</StageLabel>
      <p className="font-serif italic text-[14px] text-ink-mute mb-6">
        Students see cases their teacher has released to their classroom.
        Grant individual access here to override that — useful for makeup
        work, special access, or trial runs.
      </p>
      {cases.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute mb-14">
          No cases authored yet.
        </p>
      ) : (
        <ul className="mb-14">
          {cases.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-[1fr_140px_140px] items-center gap-5 py-4 border-b border-rule"
            >
              <span className="font-serif text-[16px] text-ink truncate">
                {c.title}
                {!c.publishedAt && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
                    draft
                  </span>
                )}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
                {c.grantedAt
                  ? `Granted ${new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(c.grantedAt))}`
                  : ""}
              </span>
              <span className="justify-self-end">
                <GrantToggle
                  studentId={student.id}
                  caseId={c.id}
                  initialGranted={Boolean(c.grantedAt)}
                  classroomReleased={c.isClassroomReleased}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <StageLabel className="mb-5">Case attempts</StageLabel>
      {attempts.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No attempts yet.
        </p>
      ) : (
        <ul>
          {attempts.map((a) => (
            <li
              key={a.id}
              className="grid grid-cols-[1fr_120px_100px_140px] items-baseline gap-6 py-3 border-b border-rule"
            >
              <span className="font-serif text-[16px] text-ink truncate">
                {a.caseTitle}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                {a.completedAt ? "Completed" : "In progress"}
              </span>
              <span className="font-mono text-[12px] tabular-nums text-right">
                {a.totalScore !== null ? `${a.totalScore} pts` : "—"}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade justify-self-end">
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(a.startedAt))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
