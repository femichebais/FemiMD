"use client";

import { useReducer, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StageType } from "../actions";
import { createCase, updateCaseText } from "../actions";
import {
  draftReducer,
  emptyCase,
  clientCaseToDraft,
  type ClientCase,
} from "./draft-reducer";
import { CaseEditorSidebar } from "./case-editor-sidebar";
import { StageCard } from "./stage-card";

export interface CaseEditorProps {
  mode: "create" | "edit";
  initialDraft?: ClientCase;
  // Only relevant in edit mode; passed through to sidebar + update action.
  caseId?: string;
  meta?: {
    stageCount?: number;
    attemptCount?: number;
    createdAt?: Date | null;
  };
  // Pre-resolved choice IDs in edit mode so we can target updates correctly.
  // Map from tempId -> server id for stages and choices.
  serverIdMap?: {
    stages: Record<string, string>;
    choices: Record<string, string>;
  };
}

const ADDABLE_STAGE_TYPES: Array<{ value: StageType; label: string }> = [
  { value: "history", label: "+ History" },
  { value: "exam", label: "+ Exam" },
  { value: "diagnosis", label: "+ Diagnosis" },
  { value: "disposition", label: "+ Disposition" },
  { value: "treatment", label: "+ Treatment" },
];

export function CaseEditor({
  mode,
  initialDraft,
  caseId,
  meta,
  serverIdMap,
}: CaseEditorProps) {
  const [draft, dispatch] = useReducer(
    draftReducer,
    initialDraft ?? emptyCase()
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const locked = mode === "edit";

  const handleSubmit = () => {
    setError(null);
    setSuccess(null);

    if (mode === "create") {
      startTransition(async () => {
        const result = await createCase(clientCaseToDraft(draft));
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/admin/cases/${result.caseId}`);
      });
    } else {
      // Edit mode: only send text edits, with server ids for stages/choices.
      if (!caseId || !serverIdMap) {
        setError("Missing case context — refresh and try again.");
        return;
      }
      startTransition(async () => {
        const stageEdits = draft.stages
          .map((s) => {
            const stageId = serverIdMap.stages[s.tempId];
            if (!stageId) return null;
            return {
              stageId,
              prompt: s.prompt,
              choices: s.choices
                .map((c) => {
                  const choiceId = serverIdMap.choices[c.tempId];
                  if (!choiceId) return null;
                  return {
                    choiceId,
                    text: c.text,
                    responseText: c.responseText,
                  };
                })
                .filter(<T,>(v: T | null): v is T => v !== null),
            };
          })
          .filter(<T,>(v: T | null): v is T => v !== null);

        const result = await updateCaseText({
          caseId,
          title: draft.title,
          description: draft.description,
          scenarioIntro: draft.scenarioIntro,
          linkedDiagnosisSlug: draft.linkedDiagnosisSlug,
          stageEdits,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSuccess("Saved.");
        router.refresh();
      });
    }
  };

  return (
    <div className="max-w-[1180px] w-full mx-auto px-6 md:px-12 py-10 md:py-14 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 md:gap-14">
      <div className="md:sticky md:top-[110px] md:self-start">
        <CaseEditorSidebar
          draft={draft}
          dispatch={dispatch}
          locked={locked}
          meta={mode === "edit" ? { caseId, ...meta } : undefined}
        />
      </div>

      <div className="min-w-0">
        {/* Title + status row */}
        <div className="flex items-baseline justify-between mb-[10px]">
          <input
            type="text"
            value={draft.title}
            onChange={(e) =>
              dispatch({ type: "SET_TITLE", value: e.target.value })
            }
            placeholder="Untitled case"
            className="font-serif text-[38px] font-normal tracking-[-0.015em] bg-transparent border-none focus:outline-none w-full text-ink placeholder:text-ink-fade"
          />
          <span className="font-mono text-[10px] text-ink-mute uppercase tracking-[0.2em] flex items-center gap-2 ml-4 whitespace-nowrap">
            <span
              className="w-[6px] h-[6px] rounded-full bg-accent"
              aria-hidden
            />
            {mode === "create" ? "Drafting" : "Published"}
          </span>
        </div>

        {/* Subtitle / scenario intro */}
        <textarea
          value={draft.scenarioIntro}
          onChange={(e) =>
            dispatch({ type: "SET_SCENARIO", value: e.target.value })
          }
          placeholder="A 56-year-old man suddenly develops severe central chest pain at rest…"
          rows={2}
          className="w-full bg-transparent border-none font-serif italic text-[14px] text-ink-mute mb-11 focus:outline-none resize-y placeholder:text-ink-fade"
        />

        {/* Stages */}
        {draft.stages.length === 0 ? (
          <div className="border border-dashed border-rule-strong rounded-[2px] p-10 text-center mb-4">
            <p className="font-serif italic text-[16px] text-ink-mute mb-4">
              No stages yet. Add one below to begin.
            </p>
          </div>
        ) : (
          draft.stages.map((stage, i) => (
            <StageCard
              key={stage.tempId}
              stage={stage}
              index={i}
              dispatch={dispatch}
              defaultOpen={
                mode === "create" && i === draft.stages.length - 1
              }
              locked={locked}
            />
          ))
        )}

        {!locked && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-3">
            {ADDABLE_STAGE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() =>
                  dispatch({ type: "ADD_STAGE", stageType: t.value })
                }
                className="px-4 py-3 border border-dashed border-rule-strong rounded-[2px] font-sans text-[12px] text-ink-mute hover:border-accent hover:text-accent transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Bottom action bar */}
        <div className="mt-12 pt-6 border-t border-rule flex items-center justify-between gap-4">
          <div>
            {error && (
              <p
                role="alert"
                className="font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
              >
                {error}
              </p>
            )}
            {success && (
              <p className="font-mono text-[11px] tracking-[0.05em] text-accent">
                {success}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/cases"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
            >
              ← All cases
            </a>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-ink text-paper px-6 py-[13px] font-sans text-[14px] tracking-[0.01em] rounded-[2px] hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isPending
                ? mode === "create"
                  ? "Creating…"
                  : "Saving…"
                : mode === "create"
                  ? "Publish case"
                  : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
