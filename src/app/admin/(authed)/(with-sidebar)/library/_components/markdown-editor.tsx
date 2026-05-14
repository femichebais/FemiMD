"use client";

import { useState } from "react";
import { ArticleBody } from "@/components/markdown/article";

export interface MarkdownEditorProps {
  name: string;
  defaultValue?: string;
  rows?: number;
}

// Write/Preview tab toggle around a monospace textarea. Preview reuses the
// same ArticleBody renderer that the student-facing view uses, so what the
// admin sees is what the student will see.
export function MarkdownEditor({
  name,
  defaultValue = "",
  rows = 22,
}: MarkdownEditorProps) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div>
      <div className="flex gap-6 mb-3 border-b border-rule">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`font-mono text-[10px] uppercase tracking-[0.2em] py-2 -mb-px border-b transition-colors ${
              tab === t
                ? "text-ink border-accent"
                : "text-ink-mute border-transparent hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "write" ? (
        <textarea
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={rows}
          spellCheck={false}
          className="w-full border border-rule-strong bg-surface rounded-[2px] px-[14px] py-3 font-mono text-[13px] leading-[1.6] text-ink focus:outline-none focus:border-accent resize-y"
        />
      ) : (
        <>
          {/* Hidden field keeps the value in the form when switching tabs. */}
          <input type="hidden" name={name} value={value} />
          <div className="border border-rule rounded-[2px] bg-paper-2 p-6 min-h-[280px]">
            {value.trim() ? (
              <ArticleBody markdown={value} />
            ) : (
              <p className="font-serif italic text-[15px] text-ink-mute">
                Nothing to preview yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
