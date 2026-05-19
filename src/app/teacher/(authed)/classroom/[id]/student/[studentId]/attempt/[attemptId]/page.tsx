import Link from "next/link";
import { notFound } from "next/navigation";
import { StageLabel } from "@/components/ui";
import { ArticleBody } from "@/components/markdown/article";
import { requireRole } from "@/lib/auth/current-user";
import { getCaseAttemptForTeacher } from "@/lib/queries/teacher";
import { StageBreakdownItem } from "@/app/student/(authed)/case/[id]/feedback/_components/stage-breakdown";
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

  const typeCounts = new Map<Stage["type"], number>();
  breakdown.forEach((b) =>
    typeCounts.set(b.stage.type, (typeCounts.get(b.stage.type) ?? 0) + 1)
  );
  const typeIndexer = new Map<Stage["type"], number>();

  return (
    <main className="max-w-case mx-auto px-6 md:px-12 py-10 md:py-14 pb-24">
      <div className="flex items-baseline justify-between mb-3">
        <StageLabel>{classroom.name}</StageLabel>
        <Link
          href={`/teacher/classroom/${classroomId}/student/${studentId}`}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← Back to {student.name}
        </Link>
      </div>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-1">
        {student.name}&apos;s attempt
      </h1>
      <p className="font-serif italic text-[18px] text-ink-mute mb-12">
        {caseData.title}
      </p>

      <section className="bg-paper-2 border border-rule-strong rounded-[2px] px-7 py-7 mb-14 flex items-baseline justify-between gap-6">
        <div>
          <div className="label-mono mb-2">Total score</div>
          <div className="font-serif text-[44px] leading-none font-normal tabular-nums">
            {maxPossible === 0 ? 0 : Math.round((earned / maxPossible) * 100)}
            <span className="text-ink-mute text-[28px] ml-1">%</span>
          </div>
          <div className="mt-2 font-mono text-[12px] uppercase tracking-[0.05em] text-ink-mute tabular-nums">
            {earned} of {maxPossible} points
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

      {caseData.clinicalTakeaway && (
        <section className="mb-14">
          <StageLabel className="mb-5">Clinical takeaway</StageLabel>
          <div className="border-l-2 border-accent pl-6 max-w-read">
            <ArticleBody markdown={caseData.clinicalTakeaway} />
          </div>
        </section>
      )}

      <StageLabel className="mb-7">Picks per stage</StageLabel>

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
