import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ============================================================================
// Button — three variants matching the reference (mcoo1.lovable.app).
// `primary` is the gradient CTA, `secondary` is a soft fill, `ghost` is text.
// All buttons share a 0.75rem (clinical) corner and Inter type.
// ============================================================================

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-clinical-primary text-clinical-primary-fg shadow-clinical-elegant hover:brightness-110",
  secondary:
    "bg-clinical-secondary text-clinical-fg hover:bg-clinical-muted",
  ghost:
    "text-clinical-fg hover:bg-clinical-muted",
  outline:
    "border border-clinical-border text-clinical-fg bg-clinical-bg hover:bg-clinical-muted",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-10 px-4 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-clinical font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

export interface CButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
}
export function CButton({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: CButtonProps) {
  return (
    <button
      {...rest}
      className={cn(BASE, VARIANT[variant], SIZE[size], className)}
    />
  );
}

export interface CLinkButtonProps
  extends Omit<ComponentProps<typeof Link>, "className"> {
  variant?: Variant;
  size?: Size;
  className?: string;
}
export function CLinkButton({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: CLinkButtonProps) {
  return (
    <Link
      {...rest}
      className={cn(BASE, VARIANT[variant], SIZE[size], className)}
    />
  );
}

// ============================================================================
// Card — white surface, thin border, subtle blue-tinted shadow. The hoverable
// variant lifts on hover; static cards stay flat.
// ============================================================================

export interface CCardProps extends ComponentProps<"div"> {
  hoverable?: boolean;
}
export function CCard({ hoverable, className, ...rest }: CCardProps) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-clinical border border-clinical-border bg-clinical-card shadow-clinical-card",
        hoverable &&
          "transition-shadow hover:shadow-clinical-elegant hover:-translate-y-0.5 will-change-transform",
        className
      )}
    />
  );
}

// ============================================================================
// Badge / chip — small pill used for status, difficulty, level tags.
// ============================================================================

type BadgeTone = "primary" | "neutral" | "success" | "warning" | "destructive";
const BADGE_TONE: Record<BadgeTone, string> = {
  primary: "bg-clinical-primary-soft text-clinical-primary",
  neutral: "bg-clinical-muted text-clinical-muted-fg",
  success: "bg-clinical-success/15 text-clinical-success",
  warning: "bg-clinical-warn-bg text-clinical-warn-fg",
  destructive: "bg-clinical-destructive/12 text-clinical-destructive",
};

export interface CBadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}
export function CBadge({ tone = "primary", className, children }: CBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        BADGE_TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// ============================================================================
// EyebrowLabel — small uppercase label, used above section titles.
// ============================================================================

export function CEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary",
        className
      )}
    >
      {children}
    </p>
  );
}

// ============================================================================
// Form primitives — CFieldLabel + CInput. Plain styled wrappers, no schema
// or React-Hook-Form coupling. Pair with native <form> + server actions.
// ============================================================================

export function CFieldLabel({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "block text-[12.5px] font-semibold text-clinical-fg mb-2",
        className
      )}
    >
      {children}
    </label>
  );
}

export function CInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "w-full h-11 px-3.5 rounded-clinical border border-clinical-border bg-clinical-card",
        "text-[15px] text-clinical-fg placeholder:text-clinical-muted-fg",
        "focus:outline-none focus:border-clinical-primary focus:ring-2 focus:ring-clinical-primary/15",
        "transition-colors",
        className
      )}
    />
  );
}
