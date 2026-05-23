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
import { CCard, CBadge, CEyebrow } from "@/components/clinical/primitives";

const STAGE_LABEL: Record<StageType, string> = {
  history: "History",
  exam: "Exam",
  diagnosis: "Diagnosis",
  treatment: "Treatment",
  disposition: "Disposition",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

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

  return (
    <main className="max-w-5xl mx-auto px-5 md:px-8 py-10 md:py-14">
      <CEyebrow className="mb-3">Progress</CEyebrow>
      <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-4">
        Your history.
      </h1>
      <p className="text-[17px] leading-[1.55] text-clinical-muted-fg max-w-prose mb-10">
        Every attempt is kept. Retakes append — they don&apos;t overwrite.
      </p>

      <section className="mb-12">
        <h2 className="font-serif text-[22px] tracking-[-0.01em] text-clinical-fg font-medium mb-4">
          Completed cases
        </h2>
        {cases.length === 0 ? (
          <CCard className="px-6 py-10 text-center">
            <ClockClockwise
              weight="duotone"
              className="h-9 w-9 text-clinical-muted-fg mx-auto mb-3"
            />
            <p className="text-clinical-fg font-medium">
              You haven&apos;t completed a case yet.
            </p>
            <p className="text-[14px] text-clinical-muted-fg mt-1">
              Finish a case and take the post-test — it&apos;ll appear here.
            </p>
          </CCard>
        ) : (
          <ul className="flex flex-col gap-3">
            {cases.map((a) => (
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
                          {a.totalScore !== null
                            ? `${a.totalScore} pts`
                            : "—"}
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
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-clinical-muted px-2.5 py-0.5 text-[11px] tabular-nums">
                              <span className="text-clinical-muted-fg">
                                {STAGE_LABEL[s.stageType]}
                              </span>
                              <span className="text-clinical-fg font-semibold">
                                {s.earnedScore}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CCard>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-serif text-[22px] tracking-[-0.01em] text-clinical-fg font-medium mb-4">
          Quiz attempts
        </h2>
        {quizzes.length === 0 ? (
          <CCard className="px-6 py-10 text-center">
            <p className="text-clinical-muted-fg">No quizzes taken yet.</p>
          </CCard>
        ) : (
          <ul className="flex flex-col gap-2">
            {quizzes.map((q) => (
              <li key={q.id}>
                <CCard className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="font-serif text-[16px] text-clinical-fg truncate">
                      {q.caseTitle ?? "Standalone quiz"}
                    </span>
                    {q.scope && (
                      <CBadge tone="neutral">{q.scope}-test</CBadge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-[13px] tabular-nums font-medium text-clinical-fg">
                      {q.score} / {q.questionCount}
                    </span>
                    <span className="text-[11px] font-mono text-clinical-muted-fg">
                      {dateFmt.format(new Date(q.completedAt))}
                    </span>
                  </div>
                </CCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
