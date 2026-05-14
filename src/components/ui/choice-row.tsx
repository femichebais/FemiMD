"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChoiceRowProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  letter: string;
  text: React.ReactNode;
  selected?: boolean;
  // Visual locked state after a pick has been recorded — used to fade
  // unselected rows once the response is revealed.
  locked?: boolean;
}

// Multiple-choice row, NOT a card. Letter on the left in mono, serif text,
// hover state slides a 2px teal bar in from the left and tints the bg.
// Selected = warm accent bg + accent letter color.
export const ChoiceRow = React.forwardRef<HTMLButtonElement, ChoiceRowProps>(
  function ChoiceRow(
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
          "group relative flex items-baseline gap-5 w-full text-left",
          "px-4 pl-[14px] py-[18px] border-b border-rule",
          "first:border-t first:border-t-rule",
          "transition-colors duration-150 cursor-pointer",
          "disabled:cursor-not-allowed",
          selected ? "bg-accent-soft" : "hover:bg-paper-2",
          locked && !selected ? "opacity-40 hover:bg-transparent" : "",
          className
        )}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[2px] transition-colors duration-150",
            selected
              ? "bg-accent"
              : "bg-transparent group-hover:bg-accent group-disabled:group-hover:bg-transparent"
          )}
        />
        <span
          className={cn(
            "font-mono text-[11px] w-[14px] flex-shrink-0",
            selected ? "text-accent font-medium" : "text-ink-fade"
          )}
        >
          {letter}
        </span>
        <span className="font-serif text-[18px] leading-[1.4] text-ink">
          {text}
        </span>
      </button>
    );
  }
);
