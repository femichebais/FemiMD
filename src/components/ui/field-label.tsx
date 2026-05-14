import * as React from "react";
import { cn } from "@/lib/utils";

// Mono caps field label used in forms and admin editor.
export function FieldLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-[10px]",
        className
      )}
      {...props}
    />
  );
}
