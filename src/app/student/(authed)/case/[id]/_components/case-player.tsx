"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChoiceRow,
  PatientChart,
  ResponseQuote,
  StageLabel,
  Button,
} from "@/components/ui";
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
      <main className="max-w-case mx-auto px-6 md:px-12 py-10 md:py-14 text-center">
        <p className="font-serif italic text-[16px] text-ink-mute">
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

  return (
    <main className="px-6 md:px-12 py-10 md:py-14 pb-20">
      <div className="max-w-case mx-auto">
        {previewMode && (
          <div className="mb-8 -mt-2 flex items-center justify-between gap-4 px-4 py-3 bg-accent-soft border-l-2 border-accent rounded-[2px]">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                Preview mode
              </div>
              <div className="font-serif italic text-[14px] text-ink-mute mt-1">
                Picks aren&apos;t recorded. No attempt row is created.
              </div>
            </div>
            <a
              href={backHref}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
            >
              ← Back
            </a>
          </div>
        )}

        {caseData.scenarioIntro && (
          <PatientChart
            summary={caseData.scenarioIntro}
            className="mb-14"
          />
        )}

        <StageLabel className="mb-[18px]">
          {stageLabels[stageIndex]}
        </StageLabel>

        <h1
          key={currentStage.id}
          className="font-serif text-[34px] leading-[1.2] font-normal tracking-[-0.01em] mb-9"
        >
          {currentStage.prompt}
        </h1>

        {currentStage.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentStage.imageUrl}
            alt=""
            className="w-full mb-9 rounded-[2px] border border-rule"
          />
        )}

        <div className="flex flex-col -mt-px">
          {currentChoices.map((choice) => {
            const picked = picks.some((p) => p.choiceId === choice.id);
            return (
              <ChoiceRow
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
          <ResponseQuote key={pick.choiceId}>
            {pick.responseText ?? (
              <span className="text-ink-fade">
                (No patient response authored for this choice.)
              </span>
            )}
          </ResponseQuote>
        ))}

        {allPicksMade && (
          <div className="flex justify-between items-center mt-8 animate-[femi-fade-in_0.3s_ease_0.1s_both]">
            <div className="font-mono text-[11px] text-ink-mute tracking-[0.05em]">
              <span>
                <strong className="text-accent font-medium text-[13px]">
                  +{stageScore}
                </strong>{" "}
                point{stageScore === 1 ? "" : "s"} · stage score:{" "}
                {stageScore} / {maxPossible}
              </span>
            </div>
            <Button
              onClick={handleContinue}
              disabled={interactionLocked}
            >
              {previewMode
                ? isLast
                  ? "End preview →"
                  : "Continue →"
                : isAdvancing
                  ? isLast
                    ? "Finishing…"
                    : "Saving…"
                  : isLast
                    ? "Finish case →"
                    : "Continue →"}
            </Button>
          </div>
        )}

        {!allPicksMade && maxPicks > 1 && (
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-fade">
            Pick {remainingPicks} more · {picks.length} of {maxPicks} selected
          </p>
        )}

        {/* Error surfaces */}
        {startError && (
          <p
            role="alert"
            className="mt-8 font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
          >
            {startError}
          </p>
        )}
        {stageError && (
          <p
            role="alert"
            className="mt-4 font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
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

  return (
    <main className="px-6 md:px-12 py-10 md:py-14 pb-24">
      <div className="max-w-case mx-auto">
        <div className="mb-8 -mt-2 flex items-center justify-between gap-4 px-4 py-3 bg-accent-soft border-l-2 border-accent rounded-[2px]">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              Preview · scoring report
            </div>
            <div className="font-serif italic text-[14px] text-ink-mute mt-1">
              Computed from your preview picks. No attempt was recorded.
            </div>
          </div>
          <a
            href={backHref}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink whitespace-nowrap"
          >
            ← Back
          </a>
        </div>

        <StageLabel className="mb-5">Case complete</StageLabel>
        <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
          Nice work.
        </h1>
        <p className="font-serif italic text-[18px] text-ink-mute mb-12">
          {caseData.title}
        </p>

        <section className="bg-paper-2 border border-rule-strong rounded-[2px] px-7 py-7 mb-14 flex items-baseline justify-between gap-6">
          <div>
            <div className="label-mono mb-2">Total score</div>
            <div className="font-serif text-[44px] leading-none font-normal tabular-nums">
              {maxPossible === 0
                ? 0
                : Math.round((earned / maxPossible) * 100)}
              <span className="text-ink-mute text-[28px] ml-1">%</span>
            </div>
            <div className="mt-2 font-mono text-[12px] uppercase tracking-[0.05em] text-ink-mute tabular-nums">
              {earned} of {maxPossible} points
            </div>
          </div>
          <div className="text-right">
            <div className="label-mono mb-2">Preview</div>
            <button
              type="button"
              onClick={onRetry}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent"
            >
              Retry preview ↻
            </button>
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
      </div>
    </main>
  );
}
