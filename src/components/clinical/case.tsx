"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// CChoiceRow — clinical multiple-choice option. Card-shaped (rounded clinical),
// thin border, primary-soft hover, primary fill when selected. Used in the
// case player + quiz player.
// ============================================================================

export interface CChoiceRowProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  letter: string;
  text: React.ReactNode;
  selected?: boolean;
  // Visually fade unselected rows after a pick is locked in.
  locked?: boolean;
}

export const CChoiceRow = React.forwardRef<HTMLButtonElement, CChoiceRowProps>(
  function CChoiceRow(
    { letter, text, selected, locked, className, disabled, type, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        disabled={disabled || locked}
        aria-pressed={selected}
        className={cn(
          "group relative flex items-center gap-4 w-full text-left",
          "px-4 sm:px-5 py-4 rounded-clinical border transition-colors",
          "disabled:cursor-not-allowed",
          selected
            ? "border-clinical-primary bg-clinical-primary-soft"
            : "border-clinical-border bg-clinical-card hover:bg-clinical-muted hover:border-clinical-primary/40",
          locked && !selected ? "opacity-40 hover:bg-clinical-card hover:border-clinical-border" : "",
          className
        )}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            "grid place-items-center h-8 w-8 rounded-clinical flex-shrink-0 text-[13px] font-bold font-mono transition-colors",
            selected
              ? "bg-clinical-primary text-clinical-primary-fg"
              : "bg-clinical-muted text-clinical-muted-fg group-hover:bg-clinical-primary-soft group-hover:text-clinical-primary group-disabled:bg-clinical-muted group-disabled:text-clinical-muted-fg"
          )}
        >
          {letter}
        </span>
        <span className="font-serif text-[17px] leading-[1.4] text-clinical-fg">
          {text}
        </span>
      </button>
    );
  }
);

// ============================================================================
// CPatientChart — warm clinical card with primary-soft background and the
// "PATIENT" eyebrow. Used at the top of a case for the scenario intro.
// ============================================================================

export interface CPatientChartVital {
  label: string;
  value: React.ReactNode;
}

export interface CPatientChartProps
  extends React.HTMLAttributes<HTMLElement> {
  summary: React.ReactNode;
  vitals?: CPatientChartVital[];
  label?: string;
}

export function CPatientChart({
  summary,
  vitals,
  label = "Patient",
  className,
  ...props
}: CPatientChartProps) {
  return (
    <section
      className={cn(
        "rounded-clinical border border-clinical-border bg-clinical-primary-soft/40 px-6 py-5",
        className
      )}
      {...props}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-2.5">
        {label}
      </div>

      <div className="font-serif text-[18px] leading-[1.5] text-clinical-fg">
        {summary}
      </div>

      {vitals && vitals.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-clinical-muted-fg pt-4 mt-4 border-t border-clinical-border/70">
          {vitals.map((v) => (
            <span key={v.label} className="whitespace-nowrap">
              {v.label}
              <strong className="text-clinical-fg font-semibold text-[13px] ml-1.5 tabular-nums">
                {v.value}
              </strong>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// CResponseQuote — patient response post-pick. Serif italic body, primary
// left-border, primary-soft tint, "PATIENT" eyebrow above. Fades in on mount.
// ============================================================================

export interface CResponseQuoteProps
  extends React.HTMLAttributes<HTMLElement> {
  label?: string;
  children: React.ReactNode;
}

export function CResponseQuote({
  label = "Patient",
  children,
  className,
  ...props
}: CResponseQuoteProps) {
  return (
    <aside
      className={cn(
        "mt-8 px-6 py-5 rounded-clinical bg-clinical-primary-soft/60 border-l-2 border-clinical-primary",
        "font-serif italic text-[18px] leading-[1.55] text-clinical-fg",
        "animate-[femi-fade-in_0.3s_ease]",
        className
      )}
      {...props}
    >
      <div className="not-italic text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-2">
        {label}
      </div>
      <div>{children}</div>
    </aside>
  );
}
