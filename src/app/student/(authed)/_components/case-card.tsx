import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import {
  CCard,
  CBadge,
  CLinkButton,
} from "@/components/clinical/primitives";
import type { StudentDashboardCase } from "@/lib/queries/student-cases";

export interface CaseCardProps {
  caseRow: StudentDashboardCase;
  // If true, an un-played card gets the primary gradient CTA; otherwise
  // all cards use the outline button (used on the dashboard's "completed"
  // group for visual de-emphasis).
  primaryCta?: boolean;
}

export function CaseCard({ caseRow: c, primaryCta }: CaseCardProps) {
  const state = c.state;
  const tone =
    state === "completed"
      ? "success"
      : state === "in_progress"
        ? "warning"
        : "primary";
  const stateLabel =
    state === "completed"
      ? "Completed"
      : state === "in_progress"
        ? "In progress"
        : "New";
  const bestPct =
    c.bestScore !== null && c.caseMaxPossible > 0
      ? Math.round((c.bestScore / c.caseMaxPossible) * 100)
      : null;

  return (
    <CCard hoverable className="p-5 sm:p-6 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2">
        <CBadge tone={tone}>{stateLabel}</CBadge>
        {bestPct !== null && (
          <span className="text-[11px] font-mono text-clinical-muted-fg tabular-nums">
            best {bestPct}%
          </span>
        )}
      </div>
      <h3 className="font-serif text-[20px] leading-[1.2] tracking-[-0.01em] text-clinical-fg font-medium mb-1.5">
        <Link
          href={`/student/case/${c.id}`}
          className="hover:text-clinical-primary"
        >
          {c.title}
        </Link>
      </h3>
      {c.description && (
        <p className="text-[14px] leading-[1.55] text-clinical-muted-fg mb-4 line-clamp-3">
          {c.description}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div className="flex items-center gap-3 text-[11.5px] font-medium text-clinical-muted-fg tabular-nums">
          <span>
            {c.stageCount} stage{c.stageCount === 1 ? "" : "s"}
          </span>
          <span aria-hidden>·</span>
          <span>
            {c.attemptCount} attempt{c.attemptCount === 1 ? "" : "s"}
          </span>
        </div>
        <CLinkButton
          href={`/student/case/${c.id}`}
          size="sm"
          variant={primaryCta && state !== "completed" ? "primary" : "outline"}
        >
          {state === "completed"
            ? "Review"
            : state === "in_progress"
              ? "Resume"
              : "Start case"}
          <ArrowRight weight="bold" className="h-3.5 w-3.5" />
        </CLinkButton>
      </div>
    </CCard>
  );
}
