"use client";

import { useActionState } from "react";
import { Button, FieldLabel, Input } from "@/components/ui";
import { MarkdownEditor } from "./markdown-editor";
import { CoverImageField } from "./cover-image-field";
import type { LibraryFormState, Level } from "../actions";

const LEVELS: Array<{ value: Level; label: string }> = [
  { value: "middle", label: "Middle school" },
  { value: "high", label: "High school" },
  { value: "undergrad", label: "Undergraduate" },
];

export interface LibraryPageFormProps {
  action: (
    state: LibraryFormState,
    formData: FormData
  ) => Promise<LibraryFormState>;
  initial?: {
    title?: string;
    eyebrow?: string;
    dek?: string;
    slug?: string;
    bodyMarkdown?: string;
    coverImageUrl?: string;
    levels?: Level[];
  };
  submitLabel: string;
}

export function LibraryPageForm({
  action,
  initial,
  submitLabel,
}: LibraryPageFormProps) {
  const [state, formAction, isPending] = useActionState<
    LibraryFormState,
    FormData
  >(action, {});

  // After a failed submit, the action echoes back the values; on success it
  // returns either values (for update) or redirects (for create). Use the
  // echoed values when present, otherwise fall back to initial.
  const values = state.values ?? initial ?? {};
  const checkedLevels = new Set<Level>(
    (values.levels ?? initial?.levels ?? []) as Level[]
  );

  return (
    <form action={formAction} className="flex flex-col gap-7">
      <div>
        <FieldLabel htmlFor="title">Title</FieldLabel>
        <Input
          id="title"
          name="title"
          required
          defaultValue={values.title ?? ""}
          placeholder="Myocardial infarction"
        />
      </div>

      <div className="grid grid-cols-2 gap-7">
        <div>
          <FieldLabel htmlFor="eyebrow">Eyebrow</FieldLabel>
          <Input
            id="eyebrow"
            name="eyebrow"
            defaultValue={values.eyebrow ?? ""}
            placeholder="Clinical reference · Cardiology"
          />
        </div>
        <div>
          <FieldLabel htmlFor="slug">Slug</FieldLabel>
          <input
            id="slug"
            name="slug"
            required
            defaultValue={values.slug ?? ""}
            placeholder="myocardial-infarction"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className="w-full border border-rule-strong bg-surface rounded-[2px] px-[14px] py-3 font-mono text-[14px] text-ink focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="dek">Dek (italic intro paragraph)</FieldLabel>
        <textarea
          id="dek"
          name="dek"
          rows={2}
          defaultValue={values.dek ?? ""}
          placeholder="A heart attack happens when blood flow to part of the heart muscle…"
          className="w-full border border-rule-strong bg-surface rounded-[2px] px-[14px] py-3 font-serif italic text-[16px] text-ink focus:outline-none focus:border-accent resize-y"
        />
      </div>

      <div>
        <FieldLabel>Body</FieldLabel>
        <MarkdownEditor
          name="body_markdown"
          defaultValue={values.bodyMarkdown ?? ""}
        />
      </div>

      <div>
        <FieldLabel>Cover image</FieldLabel>
        <CoverImageField
          name="cover_image_url"
          defaultValue={values.coverImageUrl ?? ""}
          slugHint={values.slug ?? initial?.slug ?? "untitled"}
        />
      </div>

      <div>
        <FieldLabel>Levels</FieldLabel>
        <div className="flex flex-col gap-2">
          {LEVELS.map((level) => (
            <label
              key={level.value}
              className="flex items-center gap-[10px] text-[14px] cursor-pointer"
            >
              <input
                type="checkbox"
                name="levels"
                value={level.value}
                defaultChecked={checkedLevels.has(level.value)}
                className="accent-accent w-[14px] h-[14px]"
              />
              {level.label}
            </label>
          ))}
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-rule pt-6">
        <a
          href="/admin/library"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← All pages
        </a>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
