import * as React from "react";
import { cn } from "@/lib/utils";

// Textbook-caption metadata — mono, uppercase, letter-spaced.
// Default sits above case questions and section dividers.
export function StageLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] uppercase text-ink-fade",
        // tracking-[0.2em] = letter-spacing 0.2em from the mockup
        "tracking-[0.2em]",
        className
      )}
      {...props}
    />
  );
}
