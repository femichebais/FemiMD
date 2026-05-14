import Link from "next/link";
import { StageLabel } from "@/components/ui";
import { requireRole } from "@/lib/auth/current-user";
import {
  listStudentCaseAttempts,
  listStudentQuizAttempts,
  type ProgressAttempt,
  type ProgressQuizAttempt,
} from "@/lib/queries/student-progress";

async function safeLoad(
  userId: string
): Promise<{ cases: ProgressAttempt[]; quizzes: ProgressQuizAttempt[] }> {
  try {
    const [c, q] = await Promise.all([
      listStudentCaseAttempts(userId),
      listStudentQuizAttempts(userId),
    ]);
    return { cases: c, quizzes: q };
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[student/progress]", err);
    }
    return { cases: [], quizzes: [] };
  }
}

export default async function ProgressPage() {
  const { user } = await requireRole("student");
  const { cases, quizzes } = await safeLoad(user.id);

  return (
    <main className="max-w-case mx-auto px-6 md:px-12 py-10 md:py-14">
      <StageLabel className="mb-5">Progress</StageLabel>
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em]">
          Your history.
        </h1>
        <Link
          href="/student"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← Dashboard
        </Link>
      </div>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Every attempt is kept. Retakes append — they don&apos;t overwrite.
      </p>

      <StageLabel className="mb-5">Case attempts</StageLabel>
      {cases.length === 0 ? (
        <p className="font-serif italic text-[15px] text-ink-mute mb-12">
          You haven&apos;t started a case yet.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0 mb-14">
        <ul>
          {cases.map((a) => (
            <li
              key={a.id}
              className="grid grid-cols-[1fr_100px_100px_160px] items-baseline gap-6 py-4 border-b border-rule min-w-[560px]"
            >
              <Link
                href={
                  a.completedAt
                    ? `/student/case/${a.caseId}/feedback?attempt=${a.id}`
                    : `/student/case/${a.caseId}`
                }
                className="font-serif text-[17px] text-ink hover:text-accent transition-colors truncate"
              >
                {a.caseTitle}
              </Link>
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
        </div>
      )}

      <StageLabel className="mb-5">Quiz attempts</StageLabel>
      {quizzes.length === 0 ? (
        <p className="font-serif italic text-[15px] text-ink-mute">
          No quizzes taken yet.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
        <ul>
          {quizzes.map((q) => (
            <li
              key={q.id}
              className="grid grid-cols-[1fr_80px_100px_140px] items-baseline gap-6 py-4 border-b border-rule min-w-[520px]"
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
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(q.completedAt))}
              </span>
            </li>
          ))}
        </ul>
        </div>
      )}
    </main>
  );
}
