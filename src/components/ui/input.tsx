import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

// Editorial input. Serif text on white surface, 2px corners, accent border
// on focus. Matches the .field-input pattern from the mockup.
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "w-full border border-rule-strong bg-surface rounded-[2px]",
          "px-[14px] py-3 font-serif text-[16px] text-ink",
          "focus:outline-none focus:border-accent",
          "placeholder:text-ink-fade",
          className
        )}
        {...props}
      />
    );
  }
);
