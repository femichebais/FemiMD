import * as React from "react";
import { cn } from "@/lib/utils";

// Small uppercase eyebrow above section titles. Matches the clinical CEyebrow
// (blue, Inter, semibold) so admin + student surfaces share one eyebrow style.
export function StageLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary",
        className
      )}
      {...props}
    />
  );
}
