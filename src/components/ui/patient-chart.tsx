import * as React from "react";
import { cn } from "@/lib/utils";

export interface Vital {
  label: string;
  value: React.ReactNode;
}

export interface PatientChartProps extends React.HTMLAttributes<HTMLElement> {
  summary: React.ReactNode;
  vitals?: Vital[];
  label?: string;
}

// Warm cream card with thin border. Mono "PATIENT" label, serif body,
// mono vitals row separated by a top border. Matches mockup exactly.
export function PatientChart({
  summary,
  vitals,
  label = "Patient",
  className,
  ...props
}: PatientChartProps) {
  return (
    <section
      className={cn(
        "bg-paper-2 border border-rule-strong rounded-[2px] px-[26px] py-[22px]",
        className
      )}
      {...props}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute mb-[10px]">
        {label}
      </div>

      <div className="font-serif text-[18px] leading-[1.5] font-normal mb-4">
        {summary}
      </div>

      {vitals && vitals.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-ink-fade tracking-[0.05em] pt-[14px] border-t border-rule">
          {vitals.map((v) => (
            <span key={v.label} className="whitespace-nowrap">
              {v.label}
              <strong className="text-ink font-medium text-[12px] ml-1">
                {v.value}
              </strong>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
