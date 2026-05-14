import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, and, eq, isNotNull } from "drizzle-orm";
import { StageLabel } from "@/components/ui";
import { db } from "@/db/client";
import { caseAttempts } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { getAttemptFeedback } from "@/lib/queries/feedback";
import { StageBreakdownItem } from "./_components/stage-breakdown";
import type { Stage } from "@/db/schema";

interface FeedbackPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string | string[] }>;
}

// If no ?attempt= is provided (e.g. someone bookmarked /feedback), fall
// back to the most recent completed attempt for this student+case so the
// page is still useful. If no completed attempt exists, 404.
async function resolveAttemptId(
  studentId: string,
  caseId: string,
  queryAttemptId: string | undefined
): Promise<string | null> {
  if (queryAttemptId) return queryAttemptId;
  const [row] = await db
    .select({ id: caseAttempts.id })
    .from(caseAttempts)
    .where(
      and(
        eq(caseAttempts.studentId, studentId),
        eq(caseAttempts.caseId, caseId),
        isNotNull(caseAttempts.completedAt)
      )
    )
    .orderBy(desc(caseAttempts.completedAt))
    .limit(1);
  return row?.id ?? null;
}

export default async function FeedbackPage({
  params,
  searchParams,
}: FeedbackPageProps) {
  const { id: caseId } = await params;
  const sp = await searchParams;
  const queryAttempt = typeof sp.attempt === "string" ? sp.attempt : undefined;

  const { user } = await requireRole("student");
  const attemptId = await resolveAttemptId(user.id, caseId, queryAttempt);
  if (!attemptId) notFound();

  const data = await getAttemptFeedback(user.id, attemptId);
  if (!data) notFound();

  const { case: caseData, attempt, breakdown } = data;

  // Compute the totals shown in the score banner.
  const earned =
    attempt.totalScore ??
    breakdown.reduce((sum, b) => sum + (b.attempt?.earnedScore ?? 0), 0);

  // Max-possible = sum of (top-maxPicks scores per stage) for scored stages,
  // 1 per binary stage. Mirrors the per-stage max in stage-breakdown.tsx.
  const maxPossible = breakdown.reduce((sum, b) => {
    const binary =
      b.stage.type === "diagnosis" || b.stage.type === "disposition";
    if (binary) return sum + 1;
    const topN = [...b.choices]
      .sort((x, y) => y.score - x.score)
      .slice(0, b.stage.maxPicks);
    return sum + topN.reduce((s, c) => s + c.score, 0);
  }, 0);

  // Group label index (e.g. "History · Question 2 of 4").
  const typeCounts = new Map<Stage["type"], number>();
  breakdown.forEach((b) =>
    typeCounts.set(b.stage.type, (typeCounts.get(b.stage.type) ?? 0) + 1)
  );
  const typeIndexer = new Map<Stage["type"], number>();

  return (
    <main className="px-6 md:px-12 py-10 md:py-14 pb-24">
      <div className="max-w-case mx-auto">
        <StageLabel className="mb-5">Case complete</StageLabel>
        <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
          Nice work.
        </h1>
        <p className="font-serif italic text-[18px] text-ink-mute mb-12">
          {caseData.title}
        </p>

        {/* Score banner */}
        <section className="bg-paper-2 border border-rule-strong rounded-[2px] px-7 py-7 mb-14 flex items-baseline justify-between gap-6">
          <div>
            <div className="label-mono mb-2">Total score</div>
            <div className="font-serif text-[44px] leading-none font-normal tabular-nums">
              {earned}
              <span className="text-ink-mute text-[28px] ml-2">
                / {maxPossible}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="label-mono mb-2">Completed</div>
            <div className="font-mono text-[12px] text-ink tracking-[0.02em]">
              {attempt.completedAt
                ? new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(attempt.completedAt)
                : "in progress"}
            </div>
          </div>
        </section>

        <StageLabel className="mb-7">Stage breakdown</StageLabel>

        {breakdown.map((item, i) => {
          const idx = (typeIndexer.get(item.stage.type) ?? 0) + 1;
          typeIndexer.set(item.stage.type, idx);
          const total = typeCounts.get(item.stage.type) ?? 1;
          return (
            <StageBreakdownItem
              key={item.stage.id}
              item={item}
              index={i}
              totalOfType={{ index: idx, total }}
            />
          );
        })}

        {/* Library + post-test CTAs */}
        <section className="mt-16 pt-10 border-t border-rule grid gap-3 md:grid-cols-2">
          {caseData.linkedDiagnosisSlug && (
            <Link
              href={`/student/library/${caseData.linkedDiagnosisSlug}`}
              className="group block p-6 border border-rule-strong rounded-[2px] hover:border-accent transition-colors"
            >
              <div className="label-mono mb-2 group-hover:text-accent transition-colors">
                Read more
              </div>
              <div className="font-serif text-[20px] text-ink leading-[1.3]">
                The clinical reference{" "}
                <span className="text-ink-mute italic">for this case</span>
              </div>
              <span className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade group-hover:text-accent transition-colors">
                Open library →
              </span>
            </Link>
          )}

          <Link
            href={`/student/case/${caseId}/quiz/post`}
            className="group block p-6 border border-rule-strong rounded-[2px] hover:border-accent transition-colors"
          >
            <div className="label-mono mb-2 group-hover:text-accent transition-colors">
              Post-test
            </div>
            <div className="font-serif text-[20px] text-ink leading-[1.3]">
              Test what stuck.
            </div>
            <span className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade group-hover:text-accent transition-colors">
              Take post-test →
            </span>
          </Link>
        </section>

        <div className="mt-12 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          <Link
            href={`/student/case/${caseId}`}
            className="hover:text-ink transition-colors"
          >
            Retry case
          </Link>
          <span aria-hidden>·</span>
          <Link href="/student" className="hover:text-ink transition-colors">
            All cases
          </Link>
        </div>
      </div>
    </main>
  );
}
