"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, FieldLabel, Input } from "@/components/ui";
import {
  createResource,
  type ResourceFormState,
  type ResourceType,
  type Level,
} from "../actions";

const LEVELS: Array<{ value: Level; label: string }> = [
  { value: "middle", label: "Middle" },
  { value: "high", label: "High" },
  { value: "undergrad", label: "Undergrad" },
];

export function CreateResourceForm() {
  const [state, formAction, isPending] = useActionState<
    ResourceFormState,
    FormData
  >(createResource, {});
  const [type, setType] = useState<ResourceType>(
    state.values?.type ?? "link"
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [filename, setFilename] = useState("");

  // Reset on successful submit (no error and no echoed values).
  useEffect(() => {
    if (!isPending && !state.error && !state.values) {
      formRef.current?.reset();
      setFilename("");
      setType("link");
    }
  }, [isPending, state.error, state.values]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border border-rule-strong bg-surface rounded-[2px] p-6 mb-12"
    >
      <div className="grid grid-cols-[1fr_140px] gap-4 mb-4">
        <div>
          <FieldLabel htmlFor="r-title">Title</FieldLabel>
          <Input
            id="r-title"
            name="title"
            required
            defaultValue={state.values?.title ?? ""}
            placeholder="Anatomy of the cardiac cycle"
          />
        </div>
        <div>
          <FieldLabel htmlFor="r-type">Type</FieldLabel>
          <select
            id="r-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as ResourceType)}
            className="w-full border border-rule-strong bg-surface rounded-[2px] px-[14px] py-3 font-sans text-[14px] focus:outline-none focus:border-accent"
          >
            <option value="link">External link</option>
            <option value="pdf">PDF file</option>
            <option value="slides">Slides file</option>
          </select>
        </div>
      </div>

      {type === "link" ? (
        <div className="mb-4">
          <FieldLabel htmlFor="r-url">URL</FieldLabel>
          <input
            id="r-url"
            name="url"
            type="url"
            placeholder="https://…"
            defaultValue={state.values?.url ?? ""}
            className="w-full border border-rule-strong bg-surface rounded-[2px] px-[14px] py-3 font-mono text-[13px] focus:outline-none focus:border-accent"
          />
        </div>
      ) : (
        <div className="mb-4">
          <FieldLabel htmlFor="r-file">File</FieldLabel>
          <input
            id="r-file"
            name="file"
            type="file"
            accept={type === "pdf" ? "application/pdf" : ".ppt,.pptx,.pdf"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFilename(f?.name ?? "");
            }}
            className="block font-mono text-[12px] text-ink-mute"
          />
          {filename && (
            <input
              type="hidden"
              name="filename"
              value={filename}
            />
          )}
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
            Stored in Supabase. Up to 25MB.
          </p>
        </div>
      )}

      <div className="mb-4">
        <FieldLabel>Levels</FieldLabel>
        <div className="flex gap-4">
          {LEVELS.map((l) => (
            <label
              key={l.value}
              className="flex items-center gap-2 text-[14px] cursor-pointer"
            >
              <input
                type="checkbox"
                name="levels"
                value={l.value}
                defaultChecked={
                  state.values?.levels?.includes(l.value) ?? false
                }
                className="accent-accent w-[14px] h-[14px]"
              />
              {l.label}
            </label>
          ))}
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="mb-4 font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
        >
          {state.error}
        </p>
      )}

      <div className="flex justify-end pt-4 border-t border-rule">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add resource"}
        </Button>
      </div>
    </form>
  );
}
