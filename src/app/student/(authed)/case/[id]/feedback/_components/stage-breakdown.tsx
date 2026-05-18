import { StageLabel } from "@/components/ui";
import type { StageBreakdown } from "@/lib/queries/feedback";
import type { Stage } from "@/db/schema";

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

  // Picked choices in pick order. Look up the full choice object.
  const pickedIds = attempt?.picks.map((p) => p.choice_id) ?? [];
  const pickedChoices = pickedIds
    .map((id) => choices.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  // Best picks = top maxPicks by score for every stage type.
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
    <section className="mb-14">
      <StageLabel className="mb-3">{label}</StageLabel>
      <h2 className="font-serif text-[22px] leading-[1.3] font-normal tracking-[-0.01em] mb-7">
        {stage.prompt}
      </h2>

      {attempt === null ? (
        <p className="font-serif italic text-[15px] text-ink-mute">
          You didn&apos;t reach this stage on this attempt.
        </p>
      ) : (
        <>
          <div className="mb-6">
            <p className="label-mono mb-3">
              Your pick{pickedChoices.length > 1 ? "s" : ""}
            </p>
            <ul>
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
              <p className="mt-3 font-mono text-[11px] text-ink-mute tracking-[0.05em]">
                Stage score:{" "}
                <strong className="text-accent font-medium text-[13px]">
                  {earned} / {maxPossible}
                </strong>
              </p>
            )}
          </div>

          {!studentGotItOptimal && bestChoices.length > 0 && (
            <div>
              <p className="label-mono mb-3">
                {hasCorrectMarker ? "Correct answer" : "Best pick"}
                {bestChoices.length > 1 ? "s" : ""}
              </p>
              <ul>
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
  const bg =
    tone === "accent"
      ? "bg-accent-soft"
      : tone === "warning"
        ? "bg-paper-2"
        : "bg-paper-2";
  const ruler =
    tone === "accent"
      ? "before:bg-accent"
      : tone === "warning"
        ? "before:bg-[var(--warning)]"
        : "before:bg-ink-fade";

  return (
    <li
      className={`relative flex items-baseline gap-5 px-4 pl-[14px] py-[14px] mb-1 last:mb-0 rounded-[2px] ${bg} before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] ${ruler}`}
    >
      <span className="font-mono text-[11px] w-[14px] flex-shrink-0 text-ink-mute">
        {letter}
      </span>
      <span className="font-serif text-[17px] text-ink leading-[1.4] flex-1">
        {text}
      </span>
      <span className="font-mono text-[11px] tracking-[0.05em] text-ink-mute whitespace-nowrap">
        {trailing}
      </span>
    </li>
  );
}
