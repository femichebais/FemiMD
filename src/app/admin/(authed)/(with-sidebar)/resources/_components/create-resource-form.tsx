"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  CButton,
  CFieldLabel,
  CInput,
} from "@/components/clinical/primitives";
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
      className="border border-clinical-border bg-clinical-card rounded-clinical shadow-clinical-card p-6 mb-12"
    >
      <div className="grid grid-cols-[1fr_140px] gap-4 mb-4">
        <div>
          <CFieldLabel htmlFor="r-title">Title</CFieldLabel>
          <CInput
            id="r-title"
            name="title"
            required
            defaultValue={state.values?.title ?? ""}
            placeholder="Anatomy of the cardiac cycle"
          />
        </div>
        <div>
          <CFieldLabel htmlFor="r-type">Type</CFieldLabel>
          <select
            id="r-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as ResourceType)}
            className="w-full h-11 rounded-clinical border border-clinical-border bg-clinical-card px-3.5 text-[15px] text-clinical-fg focus:outline-none focus:border-clinical-primary focus:ring-2 focus:ring-clinical-primary/15 transition-colors"
          >
            <option value="link">External link</option>
            <option value="pdf">PDF file</option>
            <option value="slides">Slides file</option>
          </select>
        </div>
      </div>

      {type === "link" ? (
        <div className="mb-4">
          <CFieldLabel htmlFor="r-url">URL</CFieldLabel>
          <CInput
            id="r-url"
            name="url"
            type="url"
            placeholder="https://…"
            defaultValue={state.values?.url ?? ""}
            className="font-mono text-[13px]"
          />
        </div>
      ) : (
        <div className="mb-4">
          <CFieldLabel htmlFor="r-file">File</CFieldLabel>
          <input
            id="r-file"
            name="file"
            type="file"
            accept={type === "pdf" ? "application/pdf" : ".ppt,.pptx,.pdf"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFilename(f?.name ?? "");
            }}
            className="block text-[13px] text-clinical-muted-fg"
          />
          {filename && (
            <input
              type="hidden"
              name="filename"
              value={filename}
            />
          )}
          <p className="mt-2 text-[12px] text-clinical-muted-fg">
            Stored in Supabase. Up to 25MB.
          </p>
        </div>
      )}

      <div className="mb-4">
        <CFieldLabel>Levels</CFieldLabel>
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
                className="accent-clinical-primary w-[14px] h-[14px]"
              />
              {l.label}
            </label>
          ))}
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="mb-4 text-[13px] text-clinical-destructive"
        >
          {state.error}
        </p>
      )}

      <div className="flex justify-end pt-4 border-t border-clinical-border">
        <CButton type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add resource"}
        </CButton>
      </div>
    </form>
  );
}
