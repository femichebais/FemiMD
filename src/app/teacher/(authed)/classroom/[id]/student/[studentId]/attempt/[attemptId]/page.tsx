import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { ArticleBody } from "@/components/markdown/article";
import { requireRole } from "@/lib/auth/current-user";
import { getCaseAttemptForTeacher } from "@/lib/queries/teacher";
import { StageBreakdownItem } from "@/app/student/(authed)/case/[id]/feedback/_components/stage-breakdown";
import { CCard, CEyebrow } from "@/components/clinical/primitives";
import { formatDateTime } from "@/lib/format-date";
import type { Stage } from "@/db/schema";

interface PageProps {
  params: Promise<{ id: string; studentId: string; attemptId: string }>;
}

export default async function TeacherCaseAttemptPage({ params }: PageProps) {
  const { id: classroomId, studentId, attemptId } = await params;

  const { user } = await requireRole("teacher");
  const detail = await getCaseAttemptForTeacher(
    user.id,
    classroomId,
    studentId,
    attemptId
  );
  if (!detail) notFound();

  const { student, classroom, case: caseData, attempt, breakdown } = detail;

  const earned =
    attempt.totalScore ??
    breakdown.reduce((sum, b) => sum + (b.attempt?.earnedScore ?? 0), 0);
  const maxPossible = breakdown.reduce((sum, b) => {
    const topN = [...b.choices]
      .sort((x, y) => y.score - x.score)
      .slice(0, b.stage.maxPicks);
    return sum + topN.reduce((s, c) => s + c.score, 0);
  }, 0);
  const scorePct =
    maxPossible === 0 ? 0 : Math.round((earned / maxPossible) * 100);
  const completedAt = attempt.completedAt
    ? formatDateTime(attempt.completedAt)
    : "in progress";

  const typeCounts = new Map<Stage["type"], number>();
  breakdown.forEach((b) =>
    typeCounts.set(b.stage.type, (typeCounts.get(b.stage.type) ?? 0) + 1)
  );
  const typeIndexer = new Map<Stage["type"], number>();

  return (
    <main className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14 pb-24">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <CEyebrow className="mb-3">{classroom.name}</CEyebrow>
          <h1 className="font-serif text-[34px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-1">
            {student.name}&rsquo;s attempt
          </h1>
          <p className="text-[16px] text-clinical-muted-fg">
            {caseData.title}
          </p>
        </div>
        <Link
          href={`/teacher/classroom/${classroomId}/student/${studentId}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors"
        >
          <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
          Back to {student.name}
        </Link>
      </div>

      <CCard className="bg-clinical-hero px-6 md:px-8 py-7 mb-12 flex items-baseline justify-between gap-6 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-2">
            Total score
          </p>
          <div className="font-serif text-[44px] leading-none tabular-nums text-clinical-fg font-medium">
            {scorePct}
            <span className="text-clinical-muted-fg text-[26px] ml-1">%</span>
          </div>
          <p className="mt-2 text-[12.5px] text-clinical-muted-fg tabular-nums">
            {earned} of {maxPossible} points
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-2">
            Completed
          </p>
          <p className="text-[13px] font-mono text-clinical-fg">{completedAt}</p>
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

      <CEyebrow className="mb-5">Picks per stage</CEyebrow>

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
    </main>
  );
}
