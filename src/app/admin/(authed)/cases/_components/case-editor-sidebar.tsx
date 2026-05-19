"use client";

import type { Dispatch } from "react";
import Link from "next/link";
import type { Level } from "../actions";
import type { ClientCase, DraftAction } from "./draft-reducer";

const LEVELS: Array<{ value: Level; label: string }> = [
  { value: "middle", label: "Middle school" },
  { value: "high", label: "High school" },
  { value: "undergrad", label: "Undergraduate" },
];

export interface CaseEditorSidebarProps {
  draft: ClientCase;
  dispatch: Dispatch<DraftAction>;
  meta?: {
    caseId?: string;
    stageCount?: number;
    attemptCount?: number;
    createdAt?: Date | null;
  };
}

export function CaseEditorSidebar({
  draft,
  dispatch,
  meta,
}: CaseEditorSidebarProps) {
  return (
    <aside className="text-[13px]">
      {meta && (
        <Section label="Case">
          <MetaRow label="ID" value={meta.caseId?.slice(0, 8) ?? "—"} />
          <MetaRow
            label="Stages"
            value={String(meta.stageCount ?? draft.stages.length)}
          />
          {meta.createdAt && (
            <MetaRow
              label="Created"
              value={new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
              }).format(meta.createdAt)}
            />
          )}
          {typeof meta.attemptCount === "number" && (
            <MetaRow label="Attempts" value={String(meta.attemptCount)} />
          )}
        </Section>
      )}

      <Section label="Levels">
        {LEVELS.map((level) => {
          const checked = draft.levels.some((l) => l.level === level.value);
          const treatmentEnabled =
            draft.levels.find((l) => l.level === level.value)
              ?.treatmentEnabled ?? false;
          return (
            <div key={level.value}>
              <label className="flex items-center gap-[10px] py-[7px] text-[14px] cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-accent w-[14px] h-[14px]"
                  checked={checked}
                  onChange={() =>
                    dispatch({ type: "TOGGLE_LEVEL", level: level.value })
                  }
                />
                {level.label}
              </label>
              {checked && (
                <label className="flex items-center gap-[10px] py-[4px] pl-6 text-[12px] text-ink-mute cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-accent w-[12px] h-[12px]"
                    checked={treatmentEnabled}
                    onChange={() =>
                      dispatch({
                        type: "TOGGLE_TREATMENT",
                        level: level.value,
                      })
                    }
                  />
                  Treatment stage enabled
                </label>
              )}
            </div>
          );
        })}
      </Section>

      <Section label="Linked diagnosis">
        <input
          type="text"
          value={draft.linkedDiagnosisSlug}
          onChange={(e) =>
            dispatch({ type: "SET_LINKED_SLUG", value: e.target.value })
          }
          placeholder="myocardial-infarction"
          className="w-full border border-rule-strong bg-surface rounded-[2px] px-[10px] py-2 font-mono text-[12px] focus:outline-none focus:border-accent"
        />
        <p className="mt-2 font-mono text-[10px] text-ink-fade tracking-[0.05em]">
          → links from feedback page
        </p>
      </Section>

      <Section label="Quiz question count">
        <input
          type="number"
          min={1}
          max={50}
          value={draft.quizQuestionCount}
          onChange={(e) =>
            dispatch({
              type: "SET_QUIZ_COUNT",
              value: Number(e.target.value),
            })
          }
          className="w-20 border border-rule-strong bg-surface rounded-[2px] px-[10px] py-2 font-mono text-[12px] text-center focus:outline-none focus:border-accent"
        />
      </Section>

      {/* Pivot to quiz bank — only available once the case exists. */}
      {meta?.caseId && (
        <Section label="Quiz bank">
          <Link
            href={`/admin/cases/${meta.caseId}/quiz`}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent transition-colors"
          >
            Manage pre + post test →
          </Link>
        </Section>
      )}
    </aside>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-9">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-fade mb-[14px]">
        {label}
      </div>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-[9px] border-b border-rule text-[13px]">
      <span className="text-ink-mute">{label}</span>
      <span className="font-mono text-[12px] font-medium text-ink">
        {value}
      </span>
    </div>
  );
}
