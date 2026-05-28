import Link from "next/link";
import { ArrowRight, ClockClockwise } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/auth/current-user";
import {
  listStudentCaseAttempts,
  listStudentQuizAttempts,
  type ProgressAttempt,
  type ProgressQuizAttempt,
  type StageType,
} from "@/lib/queries/student-progress";
import { CCard, CEyebrow } from "@/components/clinical/primitives";
import { dateTimeFmt as dateFmt, shortDateFmt } from "@/lib/format-date";

const STAGE_LABEL: Record<StageType, string> = {
  history: "History",
  exam: "Exam",
  diagnosis: "Diagnosis",
  treatment: "Treatment",
  disposition: "Disposition",
};

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

function aggregateCaseAttempts(attempts: ProgressAttempt[]): CaseAggregate[] {
  const grouped = new Map<string, CaseAggregate>();
  for (const a of attempts) {
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

interface QuizAggregate {
  key: string;
  caseTitle: string;
  attemptCount: number;
  bestPct: number;
  latestPct: number;
  avgPct: number;
  latestAt: Date;
  _sumScore: number;
  _sumQuestions: number;
}

function aggregateQuizAttempts(
  attempts: ProgressQuizAttempt[]
): QuizAggregate[] {
  const grouped = new Map<string, QuizAggregate>();
  for (const q of attempts) {
    const key = `${q.caseId ?? "standalone"}-${q.scope ?? "quiz"}`;
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
        caseTitle: q.caseTitle ?? "Standalone quiz",
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
  const { cases: allCases, quizzes } = await safeLoad(user.id);
  const cases = allCases.filter((a) => a.completedAt !== null);
  const caseAnalytics = aggregateCaseAttempts(cases);
  const quizAnalytics = aggregateQuizAttempts(quizzes);

  return (
    <main className="max-w-5xl mx-auto px-5 md:px-8 py-10 md:py-14">
      <CEyebrow className="mb-3">Progress</CEyebrow>
      <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-4">
        Your history.
      </h1>
      <p className="text-[17px] leading-[1.55] text-clinical-muted-fg max-w-prose mb-10">
        Every attempt is kept. Retakes append — they don&apos;t overwrite.
      </p>

      <CEyebrow className="mb-3">Case analytics</CEyebrow>
      {caseAnalytics.length === 0 ? (
        <CCard className="px-6 py-10 text-center mb-14">
          <ClockClockwise
            weight="duotone"
            className="h-9 w-9 text-clinical-muted-fg mx-auto mb-3"
          />
          <p className="text-clinical-fg font-medium">
            You haven&apos;t completed a case yet.
          </p>
          <p className="text-[14px] text-clinical-muted-fg mt-1">
            Finish a case and take the quiz — it&apos;ll appear here.
          </p>
        </CCard>
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
            {caseAnalytics.map((g) => (
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
                  {shortDateFmt.format(g.latestAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CEyebrow className="mb-3">Quiz analytics</CEyebrow>
      {quizAnalytics.length === 0 ? (
        <CCard className="px-6 py-10 text-center mb-14">
          <p className="text-clinical-muted-fg">No quizzes taken yet.</p>
        </CCard>
      ) : (
        <div className="mb-14">
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
            {quizAnalytics.map((g) => (
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
                  {shortDateFmt.format(g.latestAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CEyebrow className="mb-3">Completed cases</CEyebrow>
      {cases.length === 0 ? (
        <CCard className="px-6 py-10 text-center">
          <p className="text-clinical-muted-fg">
            Individual attempts will show up here once you finish a case.
          </p>
        </CCard>
      ) : (
        <ul className="flex flex-col gap-3 mb-14">
          {cases.map((a) => {
            const pct =
              a.totalScore !== null && a.caseMaxPossible > 0
                ? Math.round((a.totalScore / a.caseMaxPossible) * 100)
                : null;
            return (
              <li key={a.id}>
                <Link
                  href={`/student/case/${a.caseId}/feedback?attempt=${a.id}`}
                  className="block group"
                >
                  <CCard hoverable className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-serif text-[18px] leading-tight text-clinical-fg font-medium group-hover:text-clinical-primary transition-colors truncate">
                          {a.caseTitle}
                        </h3>
                        <p className="text-[12px] text-clinical-muted-fg mt-0.5">
                          {dateFmt.format(new Date(a.startedAt))}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[14px] font-semibold tabular-nums text-clinical-fg">
                          {pct !== null ? `${pct}%` : "—"}
                        </span>
                        <ArrowRight
                          weight="bold"
                          className="h-4 w-4 text-clinical-muted-fg group-hover:text-clinical-primary transition-colors"
                        />
                      </div>
                    </div>
                    {a.stageBreakdown.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5">
                        {a.stageBreakdown.map((s) => (
                          <li key={`${a.id}-${s.position}`}>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-clinical-muted px-2.5 py-0.5 text-[11px]">
                              <span className="text-clinical-muted-fg">
                                {STAGE_LABEL[s.stageType]}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CCard>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <CEyebrow className="mb-3">Quiz attempts</CEyebrow>
      {quizzes.length === 0 ? (
        <CCard className="px-6 py-10 text-center">
          <p className="text-clinical-muted-fg">No quizzes taken yet.</p>
        </CCard>
      ) : (
        <ul className="flex flex-col gap-2">
          {quizzes.map((q) => {
            const pct =
              q.questionCount === 0
                ? 0
                : Math.round((q.score / q.questionCount) * 100);
            return (
              <li key={q.id}>
                <CCard className="p-4 flex items-center justify-between gap-4">
                  <span className="font-serif text-[16px] text-clinical-fg truncate min-w-0">
                    {q.caseTitle ?? "Standalone quiz"}
                  </span>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-[13px] tabular-nums font-semibold text-clinical-fg">
                      {pct}%
                    </span>
                    <span className="text-[11px] font-mono text-clinical-muted-fg">
                      {dateFmt.format(new Date(q.completedAt))}
                    </span>
                  </div>
                </CCard>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
