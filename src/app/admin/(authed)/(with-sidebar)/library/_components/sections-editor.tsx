"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  X,
} from "@phosphor-icons/react/dist/ssr";
import type { LibrarySectionType } from "@/db/schema";
import { SECTION_TYPE_LABELS } from "@/lib/library/section-types";

// A section is either a legacy preset (one of 8 enum types — gets a label
// from SECTION_TYPE_LABELS) or fully custom (free-form title). New sections
// only ever come in as custom now; presets are preserved on edit so historic
// content keeps rendering.
export interface SectionInput {
  type: LibrarySectionType | null;
  title: string | null;
  bodyMarkdown: string;
}

export interface SectionsEditorProps {
  name: string;
  defaultValue?: SectionInput[];
}

const CUSTOM_PLACEHOLDER = "Write the card body in markdown.";

function sectionLabel(s: SectionInput): string {
  if (s.type) return SECTION_TYPE_LABELS[s.type];
  return s.title ?? "Untitled";
}

function sectionKey(s: SectionInput, i: number): string {
  return s.type ? `t-${s.type}` : `c-${i}-${s.title ?? ""}`;
}

export function SectionsEditor({
  name,
  defaultValue = [],
}: SectionsEditorProps) {
  const [sections, setSections] = useState<SectionInput[]>(defaultValue);
  // "custom" = title input visible for adding a new section.
  const [addState, setAddState] = useState<"closed" | "custom">("closed");
  const [customTitle, setCustomTitle] = useState("");

  function addCustom() {
    const title = customTitle.trim();
    if (!title) return;
    setSections((prev) => [
      ...prev,
      { type: null, title, bodyMarkdown: "" },
    ]);
    setCustomTitle("");
    setAddState("closed");
  }

  function updateBody(index: number, body: string) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, bodyMarkdown: body } : s))
    );
  }

  function renameCustom(index: number, title: string) {
    setSections((prev) =>
      prev.map((s, i) =>
        i === index && s.type === null ? { ...s, title } : s
      )
    );
  }

  function removeAt(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, delta: -1 | 1) {
    setSections((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(sections)} />

      {sections.length === 0 && (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-fade mb-4">
          No sections yet. Add one below.
        </p>
      )}

      <ul className="flex flex-col gap-4 mb-4">
        {sections.map((section, i) => (
          <li
            key={sectionKey(section, i)}
            className="border border-rule-strong rounded-[2px] bg-surface"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-rule">
              {section.type ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
                  {sectionLabel(section)}
                </span>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-fade flex-shrink-0">
                    Custom
                  </span>
                  <input
                    type="text"
                    value={section.title ?? ""}
                    onChange={(e) => renameCustom(i, e.target.value)}
                    placeholder="Card title"
                    className="flex-1 min-w-0 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink bg-paper-2 border border-rule rounded-[2px] focus:outline-none focus:border-accent"
                  />
                </div>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                <SectionIconButton
                  label="Move up"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </SectionIconButton>
                <SectionIconButton
                  label="Move down"
                  onClick={() => move(i, 1)}
                  disabled={i === sections.length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </SectionIconButton>
                <SectionIconButton
                  label="Remove section"
                  onClick={() => removeAt(i)}
                >
                  <X className="h-3.5 w-3.5" />
                </SectionIconButton>
              </div>
            </div>
            <textarea
              value={section.bodyMarkdown}
              onChange={(e) => updateBody(i, e.target.value)}
              rows={4}
              placeholder={CUSTOM_PLACEHOLDER}
              className="w-full px-4 py-3 font-mono text-[13px] leading-[1.6] text-ink bg-surface border-0 focus:outline-none resize-y"
            />
          </li>
        ))}
      </ul>

      <div className="relative">
        {addState === "custom" ? (
          <div className="border border-rule-strong bg-surface rounded-[2px] p-3 flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                } else if (e.key === "Escape") {
                  setAddState("closed");
                }
              }}
              placeholder="e.g. Differential diagnosis"
              className="flex-1 px-3 py-2 text-[14px] text-ink bg-surface border border-rule-strong rounded-[2px] focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!customTitle.trim()}
              className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent border border-accent rounded-[2px] hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAddState("closed")}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink px-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAddState("custom");
              setCustomTitle("");
            }}
            className="inline-flex items-center gap-2 px-3 py-2 border border-rule-strong rounded-[2px] font-mono text-[10px] uppercase tracking-[0.18em] text-ink hover:bg-paper-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Add section
          </button>
        )}
      </div>
    </div>
  );
}

function SectionIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="h-7 w-7 inline-flex items-center justify-center rounded-[2px] text-ink-mute hover:text-ink hover:bg-paper-2 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
