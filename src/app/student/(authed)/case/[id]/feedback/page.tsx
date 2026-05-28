import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, and, eq, isNotNull } from "drizzle-orm";
import {
  ArrowRight,
  BookOpen,
  ClipboardText,
} from "@phosphor-icons/react/dist/ssr";
import { db } from "@/db/client";
import { caseAttempts } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { getAttemptFeedback } from "@/lib/queries/feedback";
import { StageBreakdownItem } from "./_components/stage-breakdown";
import { ArticleBody } from "@/components/markdown/article";
import {
  CCard,
  CEyebrow,
  CLinkButton,
} from "@/components/clinical/primitives";
import { formatDateTime } from "@/lib/format-date";
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

  // Max-possible = sum of (top-maxPicks scores per stage) across every stage.
  // Mirrors the per-stage max in stage-breakdown.tsx.
  const maxPossible = breakdown.reduce((sum, b) => {
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

  const scorePct =
    maxPossible === 0 ? 0 : Math.round((earned / maxPossible) * 100);
  const completedAt = attempt.completedAt
    ? formatDateTime(attempt.completedAt)
    : "in progress";

  return (
    <main className="px-5 md:px-8 py-10 md:py-14 pb-24">
      <div className="max-w-3xl mx-auto">
        <CEyebrow className="mb-3">Case complete</CEyebrow>
        <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
          Nice work.
        </h1>
        <p className="text-[18px] text-clinical-muted-fg mb-10">
          {caseData.title}
        </p>

        {/* Score banner — clinical card with the gradient hero treatment. */}
        <CCard className="bg-clinical-hero px-6 md:px-8 py-8 mb-12 flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-2">
              Total score
            </p>
            <div className="font-serif text-[48px] leading-none tabular-nums text-clinical-fg font-medium">
              {scorePct}
              <span className="text-clinical-muted-fg text-[28px] ml-1">
                %
              </span>
            </div>
            <p className="mt-2 text-[12.5px] text-clinical-muted-fg tabular-nums">
              {earned} of {maxPossible} points
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-2">
              Completed
            </p>
            <p className="text-[13px] font-mono text-clinical-fg">
              {completedAt}
            </p>
          </div>
        </CCard>

        {caseData.clinicalTakeaway && (
          <section className="mb-14">
            <CEyebrow className="mb-3">Clinical takeaway</CEyebrow>
            <CCard className="px-6 py-5">
              <div className="border-l-2 border-clinical-primary pl-5">
                <ArticleBody markdown={caseData.clinicalTakeaway} />
              </div>
            </CCard>
          </section>
        )}

        <CEyebrow className="mb-5">Stage breakdown</CEyebrow>

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

        <section className="mt-16 pt-10 border-t border-clinical-border grid gap-3 md:grid-cols-2">
          {caseData.linkedDiagnosisSlug && (
            <Link
              href={`/student/library/${caseData.linkedDiagnosisSlug}`}
              className="block group"
            >
              <CCard hoverable className="p-6 h-full">
                <BookOpen
                  weight="duotone"
                  className="h-7 w-7 text-clinical-primary mb-3"
                />
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-2">
                  Read more
                </p>
                <p className="font-serif text-[20px] leading-tight text-clinical-fg font-medium mb-1">
                  The clinical reference
                </p>
                <p className="text-[14px] text-clinical-muted-fg mb-4">
                  Definitions, symptoms, and management for this case.
                </p>
                <span className="inline-flex items-center text-[13px] font-medium text-clinical-primary">
                  Open library
                  <ArrowRight weight="bold" className="ml-1.5 h-3.5 w-3.5" />
                </span>
              </CCard>
            </Link>
          )}

          <Link
            href={`/student/case/${caseId}/quiz/post`}
            className="block group"
          >
            <CCard hoverable className="p-6 h-full">
              <ClipboardText
                weight="duotone"
                className="h-7 w-7 text-clinical-primary mb-3"
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-2">
                Quiz
              </p>
              <p className="font-serif text-[20px] leading-tight text-clinical-fg font-medium mb-1">
                Test what stuck.
              </p>
              <p className="text-[14px] text-clinical-muted-fg mb-4">
                A short quiz to confirm you&rsquo;ve closed the loop.
              </p>
              <span className="inline-flex items-center text-[13px] font-medium text-clinical-primary">
                Take the quiz
                <ArrowRight weight="bold" className="ml-1.5 h-3.5 w-3.5" />
              </span>
            </CCard>
          </Link>
        </section>

        <div className="mt-10 flex items-center gap-3">
          <CLinkButton
            href={`/student/case/${caseId}`}
            variant="outline"
            size="sm"
          >
            Retry case
          </CLinkButton>
          <CLinkButton href="/student" variant="ghost" size="sm">
            All cases
          </CLinkButton>
        </div>
      </div>
    </main>
  );
}
