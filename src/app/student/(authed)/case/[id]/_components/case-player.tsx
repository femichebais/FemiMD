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
import type { Case, Stage, Choice } from "@/db/schema";
import {
  startCaseAttempt,
  recordStageAttempt,
  completeCaseAttempt,
} from "../actions";

const TYPE_LABEL: Record<Stage["type"], string> = {
  history: "History",
  exam: "Physical exam",
  diagnosis: "Diagnosis",
  disposition: "Disposition",
  treatment: "Treatment",
};

const BINARY_STAGES = new Set<Stage["type"]>(["diagnosis", "disposition"]);

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
}

export function CasePlayer({
  caseId,
  caseData,
  stages,
  choices,
}: CasePlayerProps) {
  const router = useRouter();
  const [stageIndex, setStageIndex] = useState(0);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [isAdvancing, startAdvancing] = useTransition();

  // Start the attempt on mount. Doing this from useEffect (not the server
  // page render) means a hover-prefetch by Next won't create orphan rows;
  // only an actual visit triggers the insert.
  useEffect(() => {
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
  }, [caseId]);

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
  const isBinary = BINARY_STAGES.has(currentStage.type);
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

  return (
    <main className="px-6 md:px-12 py-10 md:py-14 pb-20">
      <div className="max-w-case mx-auto">
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
              {isBinary ? (
                picks[0]?.isCorrect ? (
                  <span>
                    <strong className="text-accent font-medium text-[13px]">
                      Correct
                    </strong>
                  </span>
                ) : (
                  <span>
                    <strong className="text-[var(--warning)] font-medium text-[13px]">
                      Incorrect
                    </strong>
                  </span>
                )
              ) : (
                <span>
                  <strong className="text-accent font-medium text-[13px]">
                    +{stageScore}
                  </strong>{" "}
                  point{stageScore === 1 ? "" : "s"} · stage score:{" "}
                  {stageScore} / {maxPossible}
                </span>
              )}
            </div>
            <Button
              onClick={handleContinue}
              disabled={interactionLocked}
            >
              {isAdvancing
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
