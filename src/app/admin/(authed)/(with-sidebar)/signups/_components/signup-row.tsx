"use client";

import { useState, useTransition } from "react";
import { formatDateTime } from "@/lib/format-date";
import {
  approveDirect,
  approveToClassroom,
  rejectSignup,
} from "../actions";
import type { ClassroomPickerRow } from "@/lib/queries/admin-signups";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle",
  high: "High",
  undergrad: "Undergrad",
};

export interface SignupRowProps {
  id: string;
  name: string;
  email: string;
  requestedAt: Date | string;
  classrooms: ClassroomPickerRow[];
}

type Mode = "idle" | "assigning";

export function SignupRow({
  id,
  name,
  email,
  requestedAt,
  classrooms,
}: SignupRowProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDirect = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveDirect({ signupId: id });
      if (!result.ok) setError(result.error);
    });
  };

  const handleAssign = () => {
    if (!selectedClassroom) {
      setError("Pick a classroom first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await approveToClassroom({
        signupId: id,
        classroomId: selectedClassroom,
      });
      if (!result.ok) setError(result.error);
    });
  };

  const handleReject = () => {
    if (
      !window.confirm(
        `Reject ${name}? Their account will be deleted. They can sign up again with the same email.`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await rejectSignup({ signupId: id });
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <li className="py-5 border-b border-rule">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
        <div>
          <div className="font-serif text-[18px] text-ink">{name}</div>
          <div className="font-mono text-[11px] text-ink-fade tracking-[0.02em] mt-1">
            {email}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-fade mt-2">
            Requested {formatDateTime(requestedAt)}
          </div>
        </div>

        {mode === "idle" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleDirect}
              className="font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-2 rounded-[2px] bg-ink text-paper hover:bg-accent disabled:opacity-50 transition-colors"
            >
              {isPending ? "Working…" : "Grant direct access"}
            </button>
            <button
              type="button"
              disabled={isPending || classrooms.length === 0}
              onClick={() => {
                setError(null);
                setMode("assigning");
              }}
              className="font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-2 rounded-[2px] border border-rule-strong text-ink-mute hover:text-ink hover:border-ink disabled:opacity-50 transition-colors"
              title={
                classrooms.length === 0
                  ? "No classrooms exist yet"
                  : undefined
              }
            >
              Assign to classroom
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleReject}
              className="font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-2 rounded-[2px] border border-transparent text-ink-fade hover:text-[var(--warning)] disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              disabled={isPending}
              className="font-mono text-[11px] px-3 py-2 rounded-[2px] border border-rule-strong bg-paper text-ink min-w-[240px]"
            >
              <option value="">Select classroom…</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.schoolName} · {c.teacherName} · {c.name} (
                  {LEVEL_LABEL[c.level] ?? c.level})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isPending || !selectedClassroom}
              onClick={handleAssign}
              className="font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-2 rounded-[2px] bg-ink text-paper hover:bg-accent disabled:opacity-50 transition-colors"
            >
              {isPending ? "Working…" : "Confirm"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setSelectedClassroom("");
                setMode("idle");
              }}
              className="font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-2 rounded-[2px] border border-transparent text-ink-fade hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-[12px] text-[var(--warning)]" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
