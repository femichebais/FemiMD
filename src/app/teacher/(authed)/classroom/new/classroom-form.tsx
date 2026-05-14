"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, FieldLabel, Input } from "@/components/ui";
import {
  createClassroom,
  type ClassroomFormState,
  type Level,
} from "./actions";

const LEVELS: Array<{ value: Level; label: string }> = [
  { value: "middle", label: "Middle school" },
  { value: "high", label: "High school" },
  { value: "undergrad", label: "Undergraduate" },
];

export function ClassroomForm() {
  const [state, formAction, isPending] = useActionState<
    ClassroomFormState,
    FormData
  >(createClassroom, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div>
        <FieldLabel htmlFor="name">Classroom name</FieldLabel>
        <Input
          id="name"
          name="name"
          required
          defaultValue={state.values?.name ?? ""}
          placeholder="Period 3 · Biology"
        />
      </div>

      <div>
        <FieldLabel>Level</FieldLabel>
        <div className="flex flex-col gap-2">
          {LEVELS.map((l) => (
            <label
              key={l.value}
              className="flex items-center gap-[10px] text-[14px] cursor-pointer"
            >
              <input
                type="radio"
                name="level"
                value={l.value}
                defaultChecked={state.values?.level === l.value}
                required
                className="accent-accent"
              />
              {l.label}
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
        <Link
          href="/teacher"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← Back
        </Link>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create classroom"}
        </Button>
      </div>
    </form>
  );
}
