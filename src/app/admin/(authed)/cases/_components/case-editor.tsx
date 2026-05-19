"use client";

import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StageType } from "../actions";
import { createCase, updateCase, togglePublish } from "../actions";
import {
  draftReducer,
  emptyCase,
  clientCaseToDraft,
  type ClientCase,
} from "./draft-reducer";
import { CaseEditorSidebar } from "./case-editor-sidebar";
import { StageCard } from "./stage-card";

// Single localStorage key for the in-progress create draft. We only persist
// the create mode — edit mode already has DB state to fall back on.
const DRAFT_STORAGE_KEY = "femi:case-draft:new:v1";

export interface CaseEditorProps {
  mode: "create" | "edit";
  initialDraft?: ClientCase;
  // Only relevant in edit mode; passed through to sidebar + update action.
  caseId?: string;
  // Initial publish state. Used to render Publish/Unpublish toggle in edit
  // mode. Optimistically updated after togglePublish call.
  initialPublishedAt?: Date | null;
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
  initialPublishedAt = null,
  meta,
  serverIdMap,
}: CaseEditorProps) {
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    initialPublishedAt
  );
  const [isPublishing, startPublishTransition] = useTransition();
  const [draft, dispatch] = useReducer(
    draftReducer,
    initialDraft ?? emptyCase()
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [restoredAt, setRestoredAt] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  // Stage-type changes cascade through every choice's is_correct value and
  // would silently invalidate historical attempts — so we only allow them
  // before a case is published. Drafts (and brand-new cases in create mode)
  // have no attempts yet, so full edit is safe.
  const lockStageType = mode === "edit" && publishedAt !== null;

  // Tracks whether we've finished the initial restore so the auto-save
  // effect doesn't immediately overwrite a fresh draft with the empty
  // initial state on mount.
  const restoreSettled = useRef(false);

  // Restore-on-mount (create mode only). If a draft exists in localStorage,
  // load it into the reducer; show a small "restored" indicator so admin
  // knows their previous work is back.
  useEffect(() => {
    if (mode !== "create") {
      restoreSettled.current = true;
      return;
    }
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { draft: ClientCase; savedAt: string };
        if (parsed?.draft) {
          dispatch({ type: "REPLACE_DRAFT", draft: parsed.draft });
          setRestoredAt(new Date(parsed.savedAt));
        }
      }
    } catch (err) {
      // Bad shape in localStorage — just ignore and start fresh.
      console.warn("[case-editor] couldn't restore draft:", err);
    } finally {
      restoreSettled.current = true;
    }
  }, [mode]);

  // Auto-save the draft to localStorage on every change (debounced 500ms).
  // Only runs in create mode and only after the initial restore has
  // settled — otherwise mount-time would clobber the restored value.
  useEffect(() => {
    if (mode !== "create") return;
    if (!restoreSettled.current) return;
    const id = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ draft, savedAt: new Date().toISOString() })
        );
      } catch (err) {
        console.warn("[case-editor] couldn't save draft:", err);
      }
    }, 500);
    return () => window.clearTimeout(id);
  }, [draft, mode]);

  const discardDraft = () => {
    if (
      !confirm(
        "Discard the current draft and start over? Anything you've typed will be lost."
      )
    )
      return;
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore — non-critical
    }
    dispatch({ type: "REPLACE_DRAFT", draft: emptyCase() });
    setRestoredAt(null);
  };

  const handleTogglePublish = () => {
    if (!caseId || isPublishing) return;
    const nextState = publishedAt === null;
    startPublishTransition(async () => {
      const result = await togglePublish({ caseId, publish: nextState });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPublishedAt(result.publishedAt);
      router.refresh();
    });
  };

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
        // Successful publish — wipe the localStorage draft so the next
        // visit to /admin/cases/new starts fresh.
        try {
          window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
          // ignore
        }
        router.push(`/admin/cases/${result.caseId}`);
      });
    } else {
      // Edit mode: full reconciliation. Send the whole draft + a parallel
      // metadata array marking each stage/choice as existing (uuid via
      // serverIdMap) or new. The server diffs against serverIdMap to know
      // what to delete.
      if (!caseId || !serverIdMap) {
        setError("Missing case context — refresh and try again.");
        return;
      }
      startTransition(async () => {
        const stageTempIds = draft.stages.map((s) => ({
          tempId: s.tempId,
          isNew: !serverIdMap.stages[s.tempId],
          choiceTempIds: s.choices.map((c) => ({
            tempId: c.tempId,
            isNew: !serverIdMap.choices[c.tempId],
          })),
        }));

        const result = await updateCase({
          caseId,
          draft: clientCaseToDraft(draft),
          serverIdMap,
          stageTempIds,
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
              className={`w-[6px] h-[6px] rounded-full ${
                mode === "create"
                  ? "bg-ink-fade"
                  : publishedAt
                    ? "bg-accent"
                    : "bg-ink-fade"
              }`}
              aria-hidden
            />
            {mode === "create"
              ? "Drafting"
              : publishedAt
                ? "Published"
                : "Draft"}
          </span>
        </div>

        {/* Publish / unpublish toggle (edit mode only) */}
        {mode === "edit" && (
          <div className="flex items-center justify-end mb-3 -mt-2">
            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={isPublishing}
              className={`font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-2 rounded-[2px] transition-colors disabled:opacity-50 ${
                publishedAt
                  ? "border border-rule-strong text-ink-mute hover:text-[var(--warning)] hover:border-[var(--warning)]"
                  : "bg-ink text-paper hover:bg-accent"
              }`}
            >
              {isPublishing
                ? "Working…"
                : publishedAt
                  ? "Unpublish"
                  : "Publish case"}
            </button>
          </div>
        )}

        {/* Draft-state banner — only in create mode, shows the auto-save
            state and lets admin discard the in-progress draft. */}
        {mode === "create" && (
          <div className="flex items-center justify-between gap-3 mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade">
            <span>
              {restoredAt
                ? `Restored from draft saved ${restoredAt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : "Autosaves locally as you type"}
            </span>
            <button
              type="button"
              onClick={discardDraft}
              className="hover:text-[var(--warning)] transition-colors"
            >
              Discard draft
            </button>
          </div>
        )}

        {/* Subtitle / scenario intro */}
        <textarea
          value={draft.scenarioIntro}
          onChange={(e) =>
            dispatch({ type: "SET_SCENARIO", value: e.target.value })
          }
          placeholder="A 56-year-old man suddenly develops severe central chest pain at rest…"
          rows={2}
          className="w-full bg-transparent border-none font-serif italic text-[14px] text-ink-mute mb-6 focus:outline-none resize-y placeholder:text-ink-fade"
        />

        {/* Clinical takeaway — shown at end of case on the feedback page.
            Markdown supported. */}
        <div className="mb-11">
          <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-2">
            Clinical takeaway
            <span className="ml-2 normal-case tracking-normal text-ink-fade font-sans">
              shown on the feedback page after the case · markdown supported
            </span>
          </label>
          <textarea
            value={draft.clinicalTakeaway}
            onChange={(e) =>
              dispatch({
                type: "SET_CLINICAL_TAKEAWAY",
                value: e.target.value,
              })
            }
            placeholder={
              "Key teaching points the student should remember. Markdown is supported — use **bold**, lists, links."
            }
            rows={4}
            className="w-full border border-rule-strong bg-surface rounded-[2px] px-[14px] py-3 font-serif text-[15px] text-ink leading-[1.55] focus:outline-none focus:border-accent resize-y"
          />
        </div>

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
              lockStageType={lockStageType}
              canMoveUp={i > 0}
              canMoveDown={i < draft.stages.length - 1}
            />
          ))
        )}

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
                  ? "Create as draft →"
                  : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
