import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost" | "dashed";
type ButtonSize = "md" | "sm";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Editorial CTA — solid ink, paper text, accent on hover. NOT a pill.
  primary:
    "bg-ink text-paper hover:bg-accent transition-colors duration-150 rounded-[2px]",
  ghost:
    "bg-transparent text-ink-mute hover:text-ink transition-colors duration-150 rounded-[2px]",
  // Used in mockup for "Attach image" / "Add stage"
  dashed:
    "bg-transparent border border-dashed border-rule-strong text-ink-mute hover:border-accent hover:text-accent transition-colors duration-150 rounded-[2px]",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "px-6 py-[13px] text-[14px]",
  sm: "px-4 py-2 text-[13px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className, type, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(
          "font-sans font-normal tracking-[0.01em] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
