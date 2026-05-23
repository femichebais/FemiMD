"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import {
  CChoiceRow,
  CPatientChart,
  CResponseQuote,
} from "@/components/clinical/case";
import { CButton, CCard, CEyebrow } from "@/components/clinical/primitives";
import { ArticleBody } from "@/components/markdown/article";
import type { Case, Stage, Choice } from "@/db/schema";
import {
  startCaseAttempt,
  recordStageAttempt,
  completeCaseAttempt,
} from "../actions";
import { StageBreakdownItem } from "../feedback/_components/stage-breakdown";
import type { StageBreakdown } from "@/lib/queries/feedback";

const TYPE_LABEL: Record<Stage["type"], string> = {
  history: "History",
  exam: "Physical exam",
  diagnosis: "Diagnosis",
  disposition: "Disposition",
  treatment: "Treatment",
};

interface Pick {
  choiceId: string;
  score: number;
  isCorrect: boolean | null;
  responseText: string | null;
  letter: string;
}

export interface CasePlayerProps {
  caseId: string;
  caseData: Case;
  stages: Stage[];
  choices: Choice[];
  // When true (admin or teacher preview), all server actions are skipped.
  // The player works as a UI walkthrough — picks + responses + advance —
  // but never creates a case_attempts row or persists stage_attempts.
  // Final stage shows the in-memory scoring report.
  previewMode?: boolean;
  // Where the "Back" links inside the preview UI should go. Defaults to
  // the admin editor; teacher preview overrides this.
  previewReturnHref?: string;
}

export function CasePlayer({
  caseId,
  caseData,
  stages,
  choices,
  previewMode = false,
  previewReturnHref,
}: CasePlayerProps) {
  const backHref = previewReturnHref ?? `/admin/cases/${caseId}`;
  const router = useRouter();
  const [stageIndex, setStageIndex] = useState(0);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [isAdvancing, startAdvancing] = useTransition();
  // Preview-mode only: accumulate picks across every stage so we can render
  // the scoring report inline when the admin finishes walking through.
  const [picksByStageId, setPicksByStageId] = useState<Record<string, Pick[]>>(
    {}
  );
  const [showPreviewFeedback, setShowPreviewFeedback] = useState(false);

  // Start the attempt on mount. Doing this from useEffect (not the server
  // page render) means a hover-prefetch by Next won't create orphan rows;
  // only an actual visit triggers the insert.
  // In preview mode we skip this entirely — no real attempt is created.
  useEffect(() => {
    if (previewMode) {
      // Use a sentinel value so interactionLocked logic doesn't gate clicks.
      setAttemptId("preview");
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await startCaseAttempt(caseId);
      if (cancelled) return;
      if (result.ok && result.attemptId) {
        setAttemptId(result.attemptId);
      } else {
        setStartError(result.error ?? "Could not start the case.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, previewMode]);

  const stageLabels = useMemo(() => {
    const counts = new Map<Stage["type"], number>();
    stages.forEach((s) => counts.set(s.type, (counts.get(s.type) ?? 0) + 1));
    const seen = new Map<Stage["type"], number>();
    return stages.map((s) => {
      const next = (seen.get(s.type) ?? 0) + 1;
      seen.set(s.type, next);
      const total = counts.get(s.type) ?? 1;
      return total === 1
        ? TYPE_LABEL[s.type]
        : `${TYPE_LABEL[s.type]} · Question ${next} of ${total}`;
    });
  }, [stages]);

  if (stages.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14 text-center">
        <p className="text-[16px] text-clinical-muted-fg">
          This case has no stages yet.
        </p>
      </main>
    );
  }

  const currentStage = stages[stageIndex];
  const currentChoices = choices.filter((c) => c.stageId === currentStage.id);
  const maxPicks = currentStage.maxPicks;
  const remainingPicks = maxPicks - picks.length;
  const allPicksMade = remainingPicks <= 0;
  const isLast = stageIndex === stages.length - 1;
  // Interaction is locked until the attempt is registered server-side OR
  // while we're recording/completing. This eliminates the double-fire race.
  const interactionLocked = !attemptId || isAdvancing;

  const handlePick = (choice: Choice) => {
    if (interactionLocked) return;
    if (allPicksMade) return;
    if (picks.some((p) => p.choiceId === choice.id)) return;
    setPicks((prev) => [
      ...prev,
      {
        choiceId: choice.id,
        score: choice.score,
        isCorrect: choice.isCorrect,
        responseText: choice.responseText,
        letter: choice.letter,
      },
    ]);
  };

  const handleContinue = () => {
    if (!attemptId || isAdvancing) return;
    setStageError(null);

    // Preview mode: advance through stages locally, never persist anything.
    // Final Continue swaps to the in-memory scoring report so admin can
    // verify how points + clinical takeaway will read for students.
    if (previewMode) {
      setPicksByStageId((prev) => ({ ...prev, [currentStage.id]: picks }));
      if (isLast) {
        setShowPreviewFeedback(true);
        return;
      }
      setStageIndex((i) => i + 1);
      setPicks([]);
      return;
    }

    const stageIdSnapshot = currentStage.id;
    const picksSnapshot = picks.map((p, i) => ({
      choiceId: p.choiceId,
      pickOrder: i + 1,
    }));

    startAdvancing(async () => {
      // Always record the stage attempt first — it's the authoritative log.
      const stageResult = await recordStageAttempt({
        caseAttemptId: attemptId,
        stageId: stageIdSnapshot,
        picks: picksSnapshot,
      });

      if (!stageResult.ok) {
        setStageError(stageResult.error ?? "Could not save your picks.");
        return;
      }

      if (isLast) {
        const finish = await completeCaseAttempt({ caseAttemptId: attemptId });
        if (!finish.ok) {
          setStageError(finish.error ?? "Could not finalize the case.");
          return;
        }
        router.push(
          `/student/case/${caseId}/feedback?attempt=${attemptId}`
        );
        return;
      }

      // Advance to the next stage and reset picks.
      setStageIndex((i) => i + 1);
      setPicks([]);
    });
  };

  const stageScore = picks.reduce((sum, p) => sum + p.score, 0);
  const maxPossible = useMemo(() => {
    const sorted = [...currentChoices]
      .map((c) => c.score)
      .sort((a, b) => b - a);
    return sorted.slice(0, maxPicks).reduce((a, b) => a + b, 0);
  }, [currentChoices, maxPicks]);

  if (showPreviewFeedback) {
    return (
      <PreviewFeedback
        backHref={backHref}
        caseData={caseData}
        stages={stages}
        choices={choices}
        picksByStageId={picksByStageId}
        onRetry={() => {
          setShowPreviewFeedback(false);
          setStageIndex(0);
          setPicks([]);
          setPicksByStageId({});
        }}
      />
    );
  }

  const continueLabel = previewMode
    ? isLast
      ? "End preview"
      : "Continue"
    : isAdvancing
      ? isLast
        ? "Finishing…"
        : "Saving…"
      : isLast
        ? "Finish case"
        : "Continue";

  return (
    <main className="px-5 md:px-8 py-10 md:py-14 pb-20">
      <div className="max-w-3xl mx-auto">
        {previewMode && (
          <div className="mb-8 flex items-center justify-between gap-4 px-4 py-3 rounded-clinical border border-clinical-primary/30 bg-clinical-primary-soft">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary">
                Preview mode
              </div>
              <div className="text-[13px] text-clinical-muted-fg mt-0.5">
                Picks aren&apos;t recorded. No attempt row is created.
              </div>
            </div>
            <a
              href={backHref}
              className="text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg"
            >
              ← Back
            </a>
          </div>
        )}

        {caseData.scenarioIntro && (
          <CPatientChart
            summary={caseData.scenarioIntro}
            className="mb-12"
          />
        )}

        <CEyebrow className="mb-3">{stageLabels[stageIndex]}</CEyebrow>

        <h1
          key={currentStage.id}
          className="font-serif text-[32px] md:text-[38px] leading-[1.15] tracking-[-0.02em] text-clinical-fg font-medium mb-8"
        >
          {currentStage.prompt}
        </h1>

        {currentStage.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentStage.imageUrl}
            alt=""
            className="w-full mb-8 rounded-clinical border border-clinical-border"
          />
        )}

        <div className="flex flex-col gap-2.5">
          {currentChoices.map((choice) => {
            const picked = picks.some((p) => p.choiceId === choice.id);
            return (
              <CChoiceRow
                key={choice.id}
                letter={choice.letter}
                text={choice.text}
                selected={picked}
                locked={interactionLocked || (allPicksMade && !picked)}
                onClick={() => handlePick(choice)}
              />
            );
          })}
        </div>

        {picks.map((pick) => (
          <CResponseQuote key={pick.choiceId}>
            {pick.responseText ?? (
              <span className="text-clinical-muted-fg">
                (No patient response authored for this choice.)
              </span>
            )}
          </CResponseQuote>
        ))}

        {allPicksMade && (
          <div className="flex flex-wrap justify-between items-center gap-3 mt-8 animate-[femi-fade-in_0.3s_ease_0.1s_both]">
            <div className="text-[13px] text-clinical-muted-fg tabular-nums">
              <strong className="text-clinical-primary font-semibold text-[15px]">
                +{stageScore}
              </strong>{" "}
              point{stageScore === 1 ? "" : "s"} · stage score:{" "}
              {stageScore} / {maxPossible}
            </div>
            <CButton onClick={handleContinue} disabled={interactionLocked}>
              {continueLabel}
              <ArrowRight weight="bold" className="h-4 w-4" />
            </CButton>
          </div>
        )}

        {!allPicksMade && maxPicks > 1 && (
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-muted-fg">
            Pick {remainingPicks} more · {picks.length} of {maxPicks} selected
          </p>
        )}

        {/* Error surfaces */}
        {startError && (
          <p
            role="alert"
            className="mt-8 text-[13px] text-clinical-destructive"
          >
            {startError}
          </p>
        )}
        {stageError && (
          <p
            role="alert"
            className="mt-4 text-[13px] text-clinical-destructive"
          >
            {stageError}
          </p>
        )}
      </div>
    </main>
  );
}

// In-memory scoring report for admin preview mode. Mirrors the student
// feedback page (src/app/student/(authed)/case/[id]/feedback/page.tsx) but
// builds the breakdown from local picks instead of a real attempt row.
function PreviewFeedback({
  backHref,
  caseData,
  stages,
  choices,
  picksByStageId,
  onRetry,
}: {
  backHref: string;
  caseData: Case;
  stages: Stage[];
  choices: Choice[];
  picksByStageId: Record<string, Pick[]>;
  onRetry: () => void;
}) {
  const breakdown: StageBreakdown[] = stages.map((stage) => {
    const stageChoices = choices.filter((c) => c.stageId === stage.id);
    const stagePicks = picksByStageId[stage.id];
    const attempt = stagePicks
      ? {
          earnedScore: stagePicks.reduce((s, p) => s + p.score, 0),
          picks: stagePicks.map((p, i) => ({
            choice_id: p.choiceId,
            pick_order: i + 1,
            score: p.score,
          })),
        }
      : null;
    return { stage, choices: stageChoices, attempt };
  });

  const earned = breakdown.reduce(
    (sum, b) => sum + (b.attempt?.earnedScore ?? 0),
    0
  );
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

  const scorePct =
    maxPossible === 0 ? 0 : Math.round((earned / maxPossible) * 100);

  return (
    <main className="px-5 md:px-8 py-10 md:py-14 pb-24">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between gap-4 px-4 py-3 rounded-clinical border border-clinical-primary/30 bg-clinical-primary-soft">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary">
              Preview · scoring report
            </div>
            <div className="text-[13px] text-clinical-muted-fg mt-0.5">
              Computed from your preview picks. No attempt was recorded.
            </div>
          </div>
          <a
            href={backHref}
            className="text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg whitespace-nowrap"
          >
            ← Back
          </a>
        </div>

        <CEyebrow className="mb-3">Case complete</CEyebrow>
        <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
          Nice work.
        </h1>
        <p className="text-[17px] text-clinical-muted-fg mb-10">
          {caseData.title}
        </p>

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
              Preview
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-primary"
            >
              Retry preview ↻
            </button>
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
      </div>
    </main>
  );
}
