import * as React from "react";
import { cn } from "@/lib/utils";

export interface ResponseQuoteProps extends React.HTMLAttributes<HTMLElement> {
  label?: string;
  children: React.ReactNode;
}

// Patient response post-pick. Italic serif quote, 2px teal left-border,
// warm paper-2 bg, mono "PATIENT" label above. Fades in on mount.
export function ResponseQuote({
  label = "Patient",
  children,
  className,
  ...props
}: ResponseQuoteProps) {
  return (
    <aside
      className={cn(
        "mt-10 px-8 py-[26px] bg-paper-2 border-l-2 border-accent",
        "font-serif italic text-[19px] leading-[1.55] text-ink",
        "animate-[femi-fade-in_0.3s_ease]",
        className
      )}
      {...props}
    >
      <div className="font-mono not-italic text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-[10px]">
        {label}
      </div>
      <div>{children}</div>
    </aside>
  );
}
