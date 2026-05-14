"use client";

import { useState } from "react";
import {
  Button,
  ChoiceRow,
  PatientChart,
  ResponseQuote,
  StageLabel,
} from "@/components/ui";

const CHOICES = [
  {
    letter: "A",
    text: "When did the pain start?",
    response:
      "The pain started suddenly, without warning, while I was sitting on the couch watching TV.",
    score: 2,
  },
  {
    letter: "B",
    text: "Where exactly do you feel the pain?",
    response:
      "It's centered right here in the middle of my chest. It's radiating down my left arm.",
    score: 3,
  },
  {
    letter: "C",
    text: "How long have you had this pain?",
    response: "It's been about thirty minutes. It hasn't let up at all.",
    score: 1,
  },
  {
    letter: "D",
    text: "Can you describe what the pain feels like?",
    response:
      "It feels like a heavy weight pressing down on my chest. Crushing.",
    score: 3,
  },
  {
    letter: "E",
    text: "Are you having any other symptoms — like nausea or sweating?",
    response:
      "Yes — I feel really nauseous, I'm sweating a lot, and I'm a bit short of breath.",
    score: 3,
  },
  {
    letter: "F",
    text: "Does anything make the pain better or worse?",
    response:
      "Nothing seems to change it. I tried sitting up, lying down, breathing differently. It just stays the same.",
    score: 2,
  },
];

export default function DesignSystemPage() {
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const picked = pickedIndex !== null ? CHOICES[pickedIndex] : null;

  return (
    <div>
      {/* Nav, ported from mockup so the showcase matches 1:1 */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-rule sticky top-0 z-10 bg-paper">
        <div className="flex items-center gap-2 font-serif text-[22px] font-medium tracking-[-0.01em]">
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden />
          Femi
        </div>
        <div className="hidden md:flex items-center gap-6 text-[13px] text-ink-mute">
          <span>Period 3 · Undergrad</span>
          <div className="flex gap-[6px]">
            {[true, true, false, false, false, false, false].map((done, i) => (
              <span
                key={i}
                aria-hidden
                className={`w-[7px] h-[7px] rounded-full border ${
                  done
                    ? "bg-ink border-ink"
                    : i === 2
                      ? "bg-accent border-accent"
                      : "border-ink-fade"
                }`}
              />
            ))}
          </div>
          <span>Case 3 of 12</span>
        </div>
        <div className="flex items-center gap-3 text-[13px]">
          <span>Design system</span>
          <span className="w-7 h-7 rounded-full bg-paper-3 flex items-center justify-center font-mono text-[11px] font-medium">
            DS
          </span>
        </div>
      </nav>

      <main className="px-6 md:px-12 py-10 md:py-14 pb-20">
        <div className="max-w-case mx-auto">
          <StageLabel className="mb-[18px]">
            Design system · Primitives
          </StageLabel>
          <h1 className="font-serif text-[34px] leading-[1.2] font-normal tracking-[-0.01em] mb-9">
            All design primitives in their natural habitat.
          </h1>

          {/* PatientChart */}
          <PatientChart
            summary="56-year-old man, presenting to the emergency department with sudden onset chest pain that began thirty minutes ago."
            vitals={[
              { label: "BP", value: "142/88" },
              { label: "HR", value: "96" },
              { label: "RR", value: "20" },
              { label: "T", value: "37.2°C" },
              { label: "SpO₂", value: "97%" },
            ]}
            className="mb-14"
          />

          {/* StageLabel + serif H1 */}
          <StageLabel className="mb-[18px]">
            History · Question 2 of 4
          </StageLabel>
          <h2 className="font-serif text-[34px] leading-[1.2] font-normal tracking-[-0.01em] mb-9">
            What do you want to ask next?
          </h2>

          {/* ChoiceRows */}
          <div className="flex flex-col -mt-px">
            {CHOICES.map((c, i) => (
              <ChoiceRow
                key={c.letter}
                letter={c.letter}
                text={c.text}
                selected={pickedIndex === i}
                locked={pickedIndex !== null}
                onClick={() => setPickedIndex(i)}
              />
            ))}
          </div>

          {/* ResponseQuote */}
          {picked && (
            <>
              <ResponseQuote>{picked.response}</ResponseQuote>

              <div className="flex justify-between items-center mt-8 animate-[femi-fade-in_0.3s_ease_0.1s_both]">
                <div className="font-mono text-[11px] text-ink-mute tracking-[0.05em]">
                  <strong className="text-accent font-medium text-[13px]">
                    +{picked.score}
                  </strong>{" "}
                  points · stage score so far: {picked.score} / 9
                </div>
                <Button onClick={() => setPickedIndex(null)}>
                  Continue →
                </Button>
              </div>
            </>
          )}

          {/* Section divider */}
          <hr className="border-rule my-20" />

          {/* Button variants */}
          <StageLabel className="mb-6">Buttons</StageLabel>
          <div className="flex flex-wrap items-center gap-4 mb-14">
            <Button>Continue →</Button>
            <Button size="sm">Save draft</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="dashed" className="px-4 py-[11px]">
              + Attach image
            </Button>
          </div>

          {/* Type scale spec sheet — helpful for cross-checking the mockup */}
          <StageLabel className="mb-6">Type scale</StageLabel>
          <div className="space-y-6 mb-14">
            <TypeRow label="Display · 52px serif">
              <span className="font-serif text-[52px] leading-[1.05] tracking-[-0.025em]">
                Myocardial infarction
              </span>
            </TypeRow>
            <TypeRow label="H1 · 34–38px serif">
              <span className="font-serif text-[34px] leading-[1.2] tracking-[-0.01em]">
                What do you want to ask next?
              </span>
            </TypeRow>
            <TypeRow label="H2 · 26px serif · 500">
              <span className="font-serif text-[26px] font-medium tracking-[-0.01em] leading-[1.25]">
                Initial workup
              </span>
            </TypeRow>
            <TypeRow label="Article body · 17px sans · 1.75">
              <p className="text-[17px] leading-[1.75] max-w-read">
                The classic picture is a middle-aged patient describing sudden,
                crushing chest pain in the center of the chest that may radiate
                down the left arm.
              </p>
            </TypeRow>
            <TypeRow label="Label · 10–11px mono caps">
              <StageLabel>Patient · Vitals</StageLabel>
            </TypeRow>
          </div>

          {/* Color tokens */}
          <StageLabel className="mb-6">Color tokens</StageLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(
              [
                ["paper", "var(--paper)"],
                ["paper-2", "var(--paper-2)"],
                ["paper-3", "var(--paper-3)"],
                ["surface", "var(--surface)"],
                ["ink", "var(--ink)"],
                ["ink-mute", "var(--ink-mute)"],
                ["ink-fade", "var(--ink-fade)"],
                ["accent", "var(--accent)"],
                ["accent-soft", "var(--accent-soft)"],
              ] as const
            ).map(([name, value]) => (
              <div
                key={name}
                className="border border-rule rounded-[2px] p-3 bg-surface"
              >
                <div
                  className="w-full h-12 border border-rule rounded-[2px] mb-3"
                  style={{ background: value }}
                />
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                  --{name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function TypeRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-baseline">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
