"use client";

import type { Dispatch } from "react";
import { useState } from "react";
import type { StageType } from "../actions";
import {
  type ClientStage,
  type DraftAction,
  BINARY_STAGES,
  SINGLE_CORRECT_STAGES,
  MULTI_CORRECT_STAGES,
  letterFor,
} from "./draft-reducer";

const STAGE_TYPES: Array<{ value: StageType; label: string }> = [
  { value: "history", label: "History" },
  { value: "exam", label: "Exam" },
  { value: "diagnosis", label: "Diagnosis" },
  { value: "disposition", label: "Disposition" },
  { value: "treatment", label: "Treatment" },
];

const TYPE_LABEL: Record<StageType, string> = {
  history: "History",
  exam: "Exam",
  diagnosis: "Diagnosis",
  disposition: "Disposition",
  treatment: "Treatment",
};

export interface StageCardProps {
  stage: ClientStage;
  index: number;
  dispatch: Dispatch<DraftAction>;
  defaultOpen?: boolean;
  // When locked (edit mode), structural fields are read-only. Text + response
  // text remain editable per brief §7.
  locked?: boolean;
}

export function StageCard({
  stage,
  index,
  dispatch,
  defaultOpen,
  locked,
}: StageCardProps) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const isBinary = BINARY_STAGES.has(stage.type);
  const isSingleCorrect = SINGLE_CORRECT_STAGES.has(stage.type);
  const isMultiCorrect = MULTI_CORRECT_STAGES.has(stage.type);

  return (
    <div
      className={`border rounded-[2px] bg-surface mb-2 transition-colors ${
        open ? "border-accent" : "border-rule-strong hover:border-ink-fade"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-[18px] px-[22px] py-4 text-left cursor-pointer ${
          open ? "border-b border-rule" : ""
        }`}
      >
        <span className="font-mono text-[11px] text-ink-fade w-6 tracking-[0.05em]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-accent px-[9px] py-1 bg-accent-soft rounded-[2px] font-medium">
          {TYPE_LABEL[stage.type]}
        </span>
        <span className="font-serif text-[16px] flex-1 text-ink truncate">
          {stage.prompt || (
            <span className="text-ink-fade italic">No prompt yet</span>
          )}
        </span>
        <span className="font-mono text-[10px] text-ink-fade tracking-[0.05em]">
          {stage.choices.length} choices · {stage.maxPicks} pick
          {stage.maxPicks === 1 ? "" : "s"}
        </span>
      </button>

      {open && (
        <div className="p-7 bg-paper">
          {!locked && (
            <FieldGroup label="Stage type">
              <select
                value={stage.type}
                onChange={(e) =>
                  dispatch({
                    type: "SET_STAGE_TYPE",
                    stageId: stage.tempId,
                    stageType: e.target.value as StageType,
                  })
                }
                className="border border-rule-strong bg-surface rounded-[2px] px-3 py-2 font-sans text-[14px] focus:outline-none focus:border-accent"
              >
                {STAGE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FieldGroup>
          )}

          <FieldGroup label="Prompt">
            <input
              type="text"
              value={stage.prompt}
              onChange={(e) =>
                dispatch({
                  type: "SET_STAGE_PROMPT",
                  stageId: stage.tempId,
                  value: e.target.value,
                })
              }
              placeholder="What do you want to ask next?"
              className="w-full border border-rule-strong bg-surface rounded-[2px] px-[14px] py-3 font-serif text-[16px] text-ink focus:outline-none focus:border-accent"
            />
          </FieldGroup>

          <FieldGroup
            label={
              <>
                Choices{" "}
                <span className="text-ink-fade ml-2">
                  {isSingleCorrect
                    ? "mark exactly one correct"
                    : isMultiCorrect
                      ? "mark any correct (student needs one)"
                      : "scores ≥ 0"}
                </span>
              </>
            }
          >
            <ChoicesEditor
              stage={stage}
              dispatch={dispatch}
              isSingleCorrect={isSingleCorrect}
              isMultiCorrect={isMultiCorrect}
              locked={locked}
            />
          </FieldGroup>

          <FieldGroup label="Response per choice">
            <ResponsesEditor stage={stage} dispatch={dispatch} />
          </FieldGroup>

          {!locked && (
            <FieldGroup label="Max picks">
              <input
                type="number"
                min={1}
                max={stage.choices.length}
                value={stage.maxPicks}
                onChange={(e) =>
                  dispatch({
                    type: "SET_STAGE_MAX_PICKS",
                    stageId: stage.tempId,
                    value: Number(e.target.value),
                  })
                }
                disabled={isBinary}
                className="w-20 border border-rule-strong bg-surface rounded-[2px] px-3 py-2 font-mono text-[12px] text-center focus:outline-none focus:border-accent disabled:opacity-50"
              />
              <span className="ml-3 font-mono text-[10px] text-ink-fade tracking-[0.05em] uppercase">
                {isBinary ? "binary stage — locked at 1" : "additive scoring"}
              </span>
            </FieldGroup>
          )}

          {!locked && (
            <div className="flex justify-end mt-4 pt-4 border-t border-rule">
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      `Remove stage ${index + 1}? Choices and response text will be lost.`
                    )
                  ) {
                    dispatch({ type: "REMOVE_STAGE", stageId: stage.tempId });
                  }
                }}
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade hover:text-[var(--warning)] transition-colors"
              >
                Remove stage
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute mb-[10px]">
        {label}
      </label>
      {children}
    </div>
  );
}

function ChoicesEditor({
  stage,
  dispatch,
  isSingleCorrect,
  isMultiCorrect,
  locked,
}: {
  stage: ClientStage;
  dispatch: Dispatch<DraftAction>;
  isSingleCorrect: boolean;
  isMultiCorrect: boolean;
  locked?: boolean;
}) {
  const isBinary = isSingleCorrect || isMultiCorrect;
  return (
    <div className="border border-rule-strong bg-surface rounded-[2px]">
      {stage.choices.map((choice, i) => (
        <div
          key={choice.tempId}
          className="grid items-center gap-[14px] px-4 py-3 border-b border-rule last:border-b-0"
          style={{
            gridTemplateColumns: isBinary
              ? "28px 1fr 88px 24px"
              : "28px 1fr 70px 24px",
          }}
        >
          <span className="font-mono text-[12px] text-ink-fade">
            {letterFor(i)}
          </span>
          <input
            type="text"
            value={choice.text}
            onChange={(e) =>
              dispatch({
                type: "SET_CHOICE_TEXT",
                stageId: stage.tempId,
                choiceId: choice.tempId,
                value: e.target.value,
              })
            }
            placeholder="Choice text"
            className="border-none bg-transparent font-serif text-[15px] text-ink focus:outline-none w-full"
          />
          {isSingleCorrect ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`correct-${stage.tempId}`}
                checked={choice.isCorrect === true}
                disabled={locked}
                onChange={() =>
                  dispatch({
                    type: "SET_CHOICE_CORRECT",
                    stageId: stage.tempId,
                    choiceId: choice.tempId,
                    value: true,
                  })
                }
                className="accent-accent"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-mute">
                Correct
              </span>
            </label>
          ) : isMultiCorrect ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={choice.isCorrect === true}
                disabled={locked}
                onChange={(e) =>
                  dispatch({
                    type: "SET_CHOICE_CORRECT",
                    stageId: stage.tempId,
                    choiceId: choice.tempId,
                    value: e.target.checked,
                  })
                }
                className="accent-accent w-[14px] h-[14px]"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-ink-mute">
                Correct
              </span>
            </label>
          ) : (
            <input
              type="number"
              min={0}
              max={100}
              value={choice.score}
              onChange={(e) =>
                dispatch({
                  type: "SET_CHOICE_SCORE",
                  stageId: stage.tempId,
                  choiceId: choice.tempId,
                  value: Number(e.target.value),
                })
              }
              disabled={locked}
              className="border border-rule rounded-[2px] px-2 py-1 font-mono text-[12px] text-center bg-paper focus:outline-none focus:border-accent disabled:opacity-50 w-[60px]"
            />
          )}
          {locked ? (
            <span aria-hidden className="text-ink-fade text-[14px] leading-none">
              ⋮⋮
            </span>
          ) : (
            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: "REMOVE_CHOICE",
                  stageId: stage.tempId,
                  choiceId: choice.tempId,
                })
              }
              disabled={stage.choices.length <= 2}
              title={
                stage.choices.length <= 2
                  ? "A stage needs at least 2 choices"
                  : "Remove this choice"
              }
              className="font-mono text-[14px] text-ink-fade hover:text-[var(--warning)] disabled:opacity-30 disabled:cursor-not-allowed leading-none"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {!locked && (
        <button
          type="button"
          onClick={() =>
            dispatch({ type: "ADD_CHOICE", stageId: stage.tempId })
          }
          className="w-full text-left px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent border-t border-rule transition-colors"
        >
          + Add choice
        </button>
      )}
    </div>
  );
}

function ResponsesEditor({
  stage,
  dispatch,
}: {
  stage: ClientStage;
  dispatch: Dispatch<DraftAction>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {stage.choices.map((choice, i) => (
        <div key={choice.tempId} className="flex items-start gap-3">
          <span className="font-mono text-[11px] text-ink-fade w-6 mt-3">
            {letterFor(i)}
          </span>
          <textarea
            value={choice.responseText}
            onChange={(e) =>
              dispatch({
                type: "SET_CHOICE_RESPONSE",
                stageId: stage.tempId,
                choiceId: choice.tempId,
                value: e.target.value,
              })
            }
            placeholder="Patient response after picking this choice…"
            rows={2}
            className="flex-1 border border-rule bg-paper-2 rounded-[2px] px-[14px] py-3 font-serif italic text-[15px] text-ink leading-[1.55] focus:outline-none focus:border-accent resize-y"
          />
        </div>
      ))}
    </div>
  );
}
