import { CEyebrow } from "@/components/clinical/primitives";
import type { StageBreakdown } from "@/lib/queries/feedback";
import type { Stage } from "@/db/schema";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<Stage["type"], string> = {
  history: "History",
  exam: "Physical exam",
  diagnosis: "Diagnosis",
  disposition: "Disposition",
  treatment: "Treatment",
};

export interface StageBreakdownItemProps {
  item: StageBreakdown;
  index: number;
  totalOfType?: { index: number; total: number };
}

export function StageBreakdownItem({
  item,
  index,
  totalOfType,
}: StageBreakdownItemProps) {
  const { stage, choices, attempt } = item;
  // Stages that author a "right answer" use is_correct (diagnosis, disposition,
  // treatment). We use it only to label the recap ("Correct answer" vs
  // "Best pick"); the scoring itself is always score-weighted.
  const hasCorrectMarker = choices.some((c) => c.isCorrect !== null);

  const pickedIds = attempt?.picks.map((p) => p.choice_id) ?? [];
  const pickedChoices = pickedIds
    .map((id) => choices.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const bestChoices = [...choices]
    .sort((a, b) => b.score - a.score)
    .slice(0, stage.maxPicks);
  const bestIds = new Set(bestChoices.map((c) => c.id));
  const pickedSet = new Set(pickedIds);
  const studentGotItOptimal =
    pickedIds.length === bestIds.size &&
    pickedIds.every((id) => bestIds.has(id));

  const earned = attempt?.earnedScore ?? 0;
  const maxPossible = bestChoices.reduce((sum, c) => sum + c.score, 0);

  const label =
    totalOfType && totalOfType.total > 1
      ? `${TYPE_LABEL[stage.type]} · Question ${totalOfType.index} of ${totalOfType.total}`
      : TYPE_LABEL[stage.type];

  return (
    <section className="mb-12">
      <CEyebrow className="mb-3">{label}</CEyebrow>
      <h2 className="font-serif text-[22px] md:text-[24px] leading-[1.25] tracking-[-0.01em] text-clinical-fg font-medium mb-6">
        {stage.prompt}
      </h2>

      {attempt === null ? (
        <p className="text-[15px] text-clinical-muted-fg">
          You didn&apos;t reach this stage on this attempt.
        </p>
      ) : (
        <>
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-muted-fg mb-2.5">
              Your pick{pickedChoices.length > 1 ? "s" : ""}
            </p>
            <ul className="flex flex-col gap-1.5">
              {pickedChoices.map((choice) => (
                <ChoiceLine
                  key={choice.id}
                  letter={choice.letter}
                  text={choice.text}
                  trailing={`+${choice.score} point${choice.score === 1 ? "" : "s"}`}
                  tone={choice.score > 0 ? "accent" : "warning"}
                />
              ))}
            </ul>
            {pickedChoices.length > 0 && (
              <p className="mt-3 text-[12.5px] text-clinical-muted-fg tabular-nums">
                Stage score:{" "}
                <strong className="text-clinical-primary font-semibold text-[14px]">
                  {earned} / {maxPossible}
                </strong>
              </p>
            )}
          </div>

          {!studentGotItOptimal && bestChoices.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-muted-fg mb-2.5">
                {hasCorrectMarker ? "Correct answer" : "Best pick"}
                {bestChoices.length > 1 ? "s" : ""}
              </p>
              <ul className="flex flex-col gap-1.5">
                {bestChoices
                  .filter((c) => !pickedSet.has(c.id))
                  .map((choice) => (
                    <ChoiceLine
                      key={choice.id}
                      letter={choice.letter}
                      text={choice.text}
                      trailing={`+${choice.score} point${choice.score === 1 ? "" : "s"}`}
                      tone="muted"
                    />
                  ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Index is informational for the page; not visible.
          (Keeps prop usage intentional for future use.) */}
      <span className="hidden" aria-hidden>
        {index}
      </span>
    </section>
  );
}

interface ChoiceLineProps {
  letter: string;
  text: string;
  trailing: React.ReactNode;
  tone: "accent" | "warning" | "muted";
}

function ChoiceLine({ letter, text, trailing, tone }: ChoiceLineProps) {
  const styles = {
    accent: {
      bg: "bg-clinical-primary-soft border-clinical-primary/20",
      letter: "bg-clinical-primary text-clinical-primary-fg",
      score: "text-clinical-primary",
    },
    warning: {
      bg: "bg-clinical-warn-bg border-clinical-warn-border",
      letter: "bg-clinical-warn-fg/15 text-clinical-warn-fg",
      score: "text-clinical-warn-fg",
    },
    muted: {
      bg: "bg-clinical-muted border-clinical-border",
      letter: "bg-clinical-card text-clinical-muted-fg",
      score: "text-clinical-muted-fg",
    },
  }[tone];

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-clinical border",
        styles.bg
      )}
    >
      <span
        className={cn(
          "grid place-items-center h-7 w-7 rounded-clinical flex-shrink-0 text-[12px] font-mono font-bold",
          styles.letter
        )}
      >
        {letter}
      </span>
      <span className="font-serif text-[16px] text-clinical-fg leading-[1.4] flex-1">
        {text}
      </span>
      <span
        className={cn(
          "text-[12px] font-mono font-semibold tabular-nums whitespace-nowrap",
          styles.score
        )}
      >
        {trailing}
      </span>
    </li>
  );
}
