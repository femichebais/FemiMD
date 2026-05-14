import Link from "next/link";
import { notFound } from "next/navigation";
import { StageLabel } from "@/components/ui";
import { requireRole } from "@/lib/auth/current-user";
import { getStudentDetailForTeacher } from "@/lib/queries/teacher";

const TYPE_LABEL: Record<string, string> = {
  history: "History",
  exam: "Exam",
  diagnosis: "Diagnosis",
  disposition: "Disposition",
  treatment: "Treatment",
};

interface PageProps {
  params: Promise<{ id: string; studentId: string }>;
}

export default async function StudentDrillDownPage({ params }: PageProps) {
  const { id: classroomId, studentId } = await params;

  const { user } = await requireRole("teacher");
  const detail = await getStudentDetailForTeacher(
    user.id,
    classroomId,
    studentId
  );
  if (!detail) notFound();

  const { student, classroom, attempts, quizAttempts } = detail;

  return (
    <main className="max-w-[900px] mx-auto px-6 md:px-12 py-10 md:py-14">
      <div className="flex items-baseline justify-between mb-3">
        <StageLabel>{classroom.name}</StageLabel>
        <Link
          href={`/teacher/classroom/${classroomId}`}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← Back to classroom
        </Link>
      </div>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-1">
        {student.name}
      </h1>
      <p className="font-mono text-[12px] text-ink-mute mb-12">
        {student.email}
      </p>

      <StageLabel className="mb-5">Case attempts</StageLabel>
      {attempts.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute mb-14">
          No case attempts yet.
        </p>
      ) : (
        <ul className="mb-14">
          {attempts.map((a) => (
            <li
              key={a.id}
              className="border border-rule-strong rounded-[2px] p-5 mb-3 bg-surface"
            >
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-serif text-[18px] text-ink">
                  {a.caseTitle}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(a.startedAt))}
                </span>
              </div>
              <div className="flex items-center gap-6 font-mono text-[11px] text-ink-mute mb-3">
                <span>
                  {a.completedAt ? "Completed" : "In progress"}
                </span>
                {a.totalScore !== null && (
                  <span>
                    Score{" "}
                    <strong className="text-accent text-[13px]">
                      {a.totalScore}
                    </strong>
                  </span>
                )}
              </div>
              {a.stages.length > 0 && (
                <ul className="border-t border-rule pt-3">
                  {a.stages.map((s) => (
                    <li
                      key={s.stageId}
                      className="grid grid-cols-[1fr_60px] items-baseline gap-4 py-2 text-[14px]"
                    >
                      <span className="font-serif text-ink truncate">
                        <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade mr-2">
                          {TYPE_LABEL[s.type] ?? s.type}
                        </span>
                        {s.prompt}
                      </span>
                      <span className="font-mono text-[12px] text-ink-mute justify-self-end">
                        +{s.earnedScore}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <StageLabel className="mb-5">Quiz attempts</StageLabel>
      {quizAttempts.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No quizzes taken yet.
        </p>
      ) : (
        <ul>
          {quizAttempts.map((q) => (
            <li
              key={q.id}
              className="grid grid-cols-[1fr_80px_80px_120px] items-baseline gap-6 py-3 border-b border-rule"
            >
              <span className="font-serif text-[16px] text-ink truncate">
                {q.caseTitle}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                {q.scope}-test
              </span>
              <span className="font-mono text-[12px] tabular-nums text-right">
                {q.score} / {q.questionCount}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade justify-self-end">
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                }).format(new Date(q.completedAt))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
