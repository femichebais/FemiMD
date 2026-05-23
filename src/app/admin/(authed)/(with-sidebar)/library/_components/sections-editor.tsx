"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "@phosphor-icons/react/dist/ssr";
import type { LibrarySectionType } from "@/db/schema";
import {
  SECTION_TYPE_LABELS,
  SECTION_TYPE_ORDER,
} from "@/lib/library/section-types";

export interface SectionInput {
  type: LibrarySectionType;
  bodyMarkdown: string;
}

export interface SectionsEditorProps {
  name: string;
  defaultValue?: SectionInput[];
}

const PLACEHOLDER: Record<LibrarySectionType, string> = {
  definition: "A condition where stomach acid flows back up into the chest.",
  description: "A common cause of burning chest pain, especially after eating.",
  what_happens_in_body:
    "The valve between the stomach and esophagus isn't closing properly.",
  symptoms: "- Burning chest pain\n- Worse after meals\n- Sour or bitter taste",
  physical_exam: "- Usually normal",
  management: "- Avoid trigger foods\n- Medications to reduce acid",
  treatment: "First-line: proton-pump inhibitor.",
  what_to_do: "- Schedule outpatient clinic follow-up",
};

// Controlled editor — sections live in React state and are serialized to a
// hidden `<input name={name}>` as JSON on every change so a plain server
// action receives them as one form field.
export function SectionsEditor({
  name,
  defaultValue = [],
}: SectionsEditorProps) {
  const [sections, setSections] = useState<SectionInput[]>(defaultValue);
  const [addOpen, setAddOpen] = useState(false);

  const usedTypes = new Set(sections.map((s) => s.type));
  const available = SECTION_TYPE_ORDER.filter((t) => !usedTypes.has(t));

  function addSection(type: LibrarySectionType) {
    setSections((prev) => [...prev, { type, bodyMarkdown: "" }]);
    setAddOpen(false);
  }

  function updateBody(index: number, body: string) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, bodyMarkdown: body } : s))
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
            key={section.type}
            className="border border-rule-strong rounded-[2px] bg-surface"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
                {SECTION_TYPE_LABELS[section.type]}
              </span>
              <div className="flex items-center gap-1">
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
              placeholder={PLACEHOLDER[section.type]}
              className="w-full px-4 py-3 font-mono text-[13px] leading-[1.6] text-ink bg-surface border-0 focus:outline-none resize-y"
            />
          </li>
        ))}
      </ul>

      <div className="relative">
        {addOpen ? (
          <div className="border border-rule-strong bg-surface rounded-[2px] p-3 flex flex-col gap-1">
            {available.length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-fade px-2 py-1">
                All sections added.
              </p>
            ) : (
              available.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addSection(type)}
                  className="text-left px-3 py-2 text-[14px] hover:bg-paper-2 rounded-[2px]"
                >
                  {SECTION_TYPE_LABELS[type]}
                </button>
              ))
            )}
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="mt-1 text-left px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            disabled={available.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 border border-rule-strong rounded-[2px] font-mono text-[10px] uppercase tracking-[0.18em] text-ink hover:bg-paper-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
