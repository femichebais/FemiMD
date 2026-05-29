import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { CEyebrow } from "@/components/clinical/primitives";
import { requireRole } from "@/lib/auth/current-user";
import {
  getStudentDetailForTeacher,
  type StudentDetail,
} from "@/lib/queries/teacher";
import { formatDateTime, formatShortDate } from "@/lib/format-date";

interface QuizAggregate {
  key: string;
  caseTitle: string;
  scope: string;
  attemptCount: number;
  bestPct: number;
  latestPct: number;
  avgPct: number;
  latestAt: Date;
  // Running totals so we can recompute avg as we add more attempts.
  _sumScore: number;
  _sumQuestions: number;
}

function aggregateQuizAttempts(
  attempts: StudentDetail["quizAttempts"]
): QuizAggregate[] {
  const grouped = new Map<string, QuizAggregate>();
  for (const q of attempts) {
    const key = `${q.caseId}-${q.scope}`;
    const pct =
      q.questionCount === 0
        ? 0
        : Math.round((q.score / q.questionCount) * 100);
    const completedAt = new Date(q.completedAt);
    const existing = grouped.get(key);
    if (existing) {
      existing.attemptCount += 1;
      existing.bestPct = Math.max(existing.bestPct, pct);
      existing._sumScore += q.score;
      existing._sumQuestions += q.questionCount;
      existing.avgPct =
        existing._sumQuestions === 0
          ? 0
          : Math.round((existing._sumScore / existing._sumQuestions) * 100);
      if (completedAt > existing.latestAt) {
        existing.latestAt = completedAt;
        existing.latestPct = pct;
      }
    } else {
      grouped.set(key, {
        key,
        caseTitle: q.caseTitle ?? "Quiz",
        scope: q.scope ?? "",
        attemptCount: 1,
        bestPct: pct,
        latestPct: pct,
        avgPct: pct,
        latestAt: completedAt,
        _sumScore: q.score,
        _sumQuestions: q.questionCount,
      });
    }
  }
  return [...grouped.values()].sort(
    (a, b) => b.latestAt.getTime() - a.latestAt.getTime()
  );
}

interface CaseAggregate {
  caseId: string;
  caseTitle: string;
  attemptCount: number;
  bestPct: number;
  latestPct: number;
  avgPct: number;
  latestAt: Date;
  _sumScore: number;
  _sumMax: number;
}

function aggregateCaseAttempts(
  attempts: StudentDetail["attempts"]
): CaseAggregate[] {
  const grouped = new Map<string, CaseAggregate>();
  for (const a of attempts) {
    // Caller filters to completed; defensive guard anyway.
    if (a.completedAt === null) continue;
    const score = a.totalScore ?? 0;
    const max = a.caseMaxPossible;
    const pct = max === 0 ? 0 : Math.round((score / max) * 100);
    const completedAt = new Date(a.completedAt);
    const existing = grouped.get(a.caseId);
    if (existing) {
      existing.attemptCount += 1;
      existing.bestPct = Math.max(existing.bestPct, pct);
      existing._sumScore += score;
      existing._sumMax += max;
      existing.avgPct =
        existing._sumMax === 0
          ? 0
          : Math.round((existing._sumScore / existing._sumMax) * 100);
      if (completedAt > existing.latestAt) {
        existing.latestAt = completedAt;
        existing.latestPct = pct;
      }
    } else {
      grouped.set(a.caseId, {
        caseId: a.caseId,
        caseTitle: a.caseTitle,
        attemptCount: 1,
        bestPct: pct,
        latestPct: pct,
        avgPct: pct,
        latestAt: completedAt,
        _sumScore: score,
        _sumMax: max,
      });
    }
  }
  return [...grouped.values()].sort(
    (a, b) => b.latestAt.getTime() - a.latestAt.getTime()
  );
}

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

  const { student, classroom, attempts: allAttempts, quizAttempts } = detail;
  // Hide in-progress case runs from the teacher's view — only completed
  // attempts contribute to performance review.
  const attempts = allAttempts.filter((a) => a.completedAt !== null);

  return (
    <main className="max-w-5xl mx-auto px-5 md:px-8 py-10 md:py-14">
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <CEyebrow className="mb-3">{classroom.name}</CEyebrow>
          <h1 className="font-serif text-[36px] md:text-[44px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-1">
            {student.name}
          </h1>
          <p className="text-[13px] font-mono text-clinical-muted-fg">
            {student.email}
          </p>
        </div>
        <Link
          href={`/teacher/classroom/${classroomId}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors"
        >
          <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
          Back to classroom
        </Link>
      </div>

      <CEyebrow className="mb-3 mt-10">Completed cases</CEyebrow>
      {attempts.length === 0 ? (
        <p className="text-[15px] text-clinical-muted-fg mb-14">
          No completed cases yet.
        </p>
      ) : (
        <ul className="mb-14">
          {attempts.map((a) => (
            <li
              key={a.id}
              className="border border-clinical-border rounded-clinical p-5 mb-3 bg-clinical-card"
            >
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-serif text-[18px] text-clinical-fg">
                  {a.caseTitle}
                </h2>
                <span className="text-[11px] font-mono text-clinical-muted-fg">
                  {formatDateTime(a.startedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6 font-mono text-[11px] text-clinical-muted-fg mb-3">
                <div className="flex items-center gap-6">
                  {a.totalScore !== null && (
                    <span>
                      Score{" "}
                      <strong className="text-clinical-primary text-[13px]">
                        {a.caseMaxPossible > 0
                          ? Math.round((a.totalScore / a.caseMaxPossible) * 100)
                          : 0}
                        %
                      </strong>
                    </span>
                  )}
                </div>
                <Link
                  href={`/teacher/classroom/${classroomId}/student/${studentId}/attempt/${a.id}`}
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg hover:text-clinical-primary"
                >
                  View picks →
                </Link>
              </div>
              {a.stages.length > 0 && (
                <ul className="border-t border-clinical-border/60 pt-3">
                  {a.stages.map((s) => (
                    <li
                      key={s.stageId}
                      className="grid grid-cols-[1fr_60px] items-baseline gap-4 py-2 text-[14px]"
                    >
                      <span className="font-serif text-clinical-fg truncate">
                        <span className="text-[11px] font-mono text-clinical-muted-fg mr-2">
                          {TYPE_LABEL[s.type] ?? s.type}
                        </span>
                        {s.prompt}
                      </span>
                      <span className="font-mono text-[12px] text-clinical-muted-fg justify-self-end">
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

      <CEyebrow className="mb-3 mt-10">Case analytics</CEyebrow>
      {attempts.length === 0 ? (
        <p className="text-[15px] text-clinical-muted-fg mb-14">
          No completed cases to summarize.
        </p>
      ) : (
        <div className="mb-14">
          <div className="grid grid-cols-[1fr_90px_80px_80px_80px_110px] items-baseline gap-6 pb-3 border-b border-clinical-border">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg">
              Case
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Attempts
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Best
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Avg
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Latest
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Last taken
            </span>
          </div>
          <ul>
            {aggregateCaseAttempts(attempts).map((g) => (
              <li
                key={g.caseId}
                className="grid grid-cols-[1fr_90px_80px_80px_80px_110px] items-baseline gap-6 py-3 border-b border-clinical-border/60"
              >
                <span className="font-serif text-[16px] text-clinical-fg truncate">
                  {g.caseTitle}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-right justify-self-end">
                  {g.attemptCount}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-right justify-self-end">
                  {g.bestPct}%
                </span>
                <span className="font-mono text-[12px] tabular-nums text-right justify-self-end text-clinical-muted-fg">
                  {g.avgPct}%
                </span>
                <span className="font-mono text-[12px] tabular-nums text-right justify-self-end text-clinical-muted-fg">
                  {g.latestPct}%
                </span>
                <span className="text-[11px] font-mono text-clinical-muted-fg justify-self-end">
                  {formatShortDate(g.latestAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CEyebrow className="mb-3 mt-10">Quiz attempts</CEyebrow>
      {quizAttempts.length === 0 ? (
        <p className="text-[15px] text-clinical-muted-fg mb-14">
          No quizzes taken yet.
        </p>
      ) : (
        <div className="mb-14">
          <div className="grid grid-cols-[1fr_90px_80px_140px_80px] items-baseline gap-6 pb-3 border-b border-clinical-border">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg">
              Quiz
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Score
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              %
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Taken
            </span>
            <span />
          </div>
          <ul>
            {quizAttempts.map((q) => {
              const pct =
                q.questionCount === 0
                  ? 0
                  : Math.round((q.score / q.questionCount) * 100);
              return (
                <li
                  key={q.id}
                  className="grid grid-cols-[1fr_90px_80px_140px_80px] items-baseline gap-6 py-3 border-b border-clinical-border/60"
                >
                  <span className="font-serif text-[16px] text-clinical-fg truncate">
                    {q.caseTitle ?? "Quiz"}
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-right justify-self-end">
                    {q.score} / {q.questionCount}
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-right justify-self-end">
                    {pct}%
                  </span>
                  <span className="text-[11px] font-mono text-clinical-muted-fg justify-self-end">
                    {formatDateTime(q.completedAt)}
                  </span>
                  <Link
                    href={`/teacher/classroom/${classroomId}/student/${studentId}/quiz/${q.id}`}
                    className="justify-self-end text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg hover:text-clinical-primary"
                  >
                    View →
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <CEyebrow className="mb-3 mt-10">Quiz analytics</CEyebrow>
      {quizAttempts.length === 0 ? (
        <p className="text-[15px] text-clinical-muted-fg">
          No quizzes taken yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_90px_80px_80px_80px_110px] items-baseline gap-6 pb-3 border-b border-clinical-border">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg">
              Quiz
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Attempts
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Best
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Avg
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Latest
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-muted-fg justify-self-end">
              Last taken
            </span>
          </div>
          <ul>
            {aggregateQuizAttempts(quizAttempts).map((g) => (
              <li
                key={g.key}
                className="grid grid-cols-[1fr_90px_80px_80px_80px_110px] items-baseline gap-6 py-3 border-b border-clinical-border/60"
              >
                <span className="font-serif text-[16px] text-clinical-fg truncate">
                  {g.caseTitle}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-right justify-self-end">
                  {g.attemptCount}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-right justify-self-end">
                  {g.bestPct}%
                </span>
                <span className="font-mono text-[12px] tabular-nums text-right justify-self-end text-clinical-muted-fg">
                  {g.avgPct}%
                </span>
                <span className="font-mono text-[12px] tabular-nums text-right justify-self-end text-clinical-muted-fg">
                  {g.latestPct}%
                </span>
                <span className="text-[11px] font-mono text-clinical-muted-fg justify-self-end">
                  {formatShortDate(g.latestAt)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
