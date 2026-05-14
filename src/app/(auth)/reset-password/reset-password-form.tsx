"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, FieldLabel, Input } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SessionState =
  | { kind: "loading" }
  | { kind: "no-token" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

const DASHBOARD_FOR: Record<string, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

export function ResetPasswordForm() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>({
    kind: "loading",
  });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [done, setDone] = useState(false);

  // Extract tokens from the URL hash on mount. Supabase's implicit flow
  // puts access_token + refresh_token + type=recovery in the fragment.
  // Error case: the hash contains error=...&error_code=... (e.g. expired).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash || hash.length <= 1) {
      setSessionState({ kind: "no-token" });
      return;
    }

    const params = new URLSearchParams(hash.slice(1));

    const error = params.get("error_description") ?? params.get("error");
    if (error) {
      setSessionState({
        kind: "error",
        message: decodeURIComponent(error.replace(/\+/g, " ")),
      });
      // Strip the hash so a refresh doesn't replay the error.
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      setSessionState({ kind: "no-token" });
      return;
    }

    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          setSessionState({
            kind: "error",
            message: error.message,
          });
          return;
        }
        setSessionState({ kind: "ready" });
        // Clean the URL so the tokens don't sit in the address bar.
        window.history.replaceState({}, "", window.location.pathname);
      });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords don't match.");
      return;
    }

    startSubmit(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        setFormError(error.message);
        return;
      }
      setDone(true);

      // Send them to the dashboard appropriate for their role. The session
      // we established via setSession() carries the JWT with app_metadata.
      const role = (data.user.app_metadata as Record<string, unknown>)
        ?.role as string | undefined;
      const dest = (role && DASHBOARD_FOR[role]) || "/";
      // router.refresh first so server components see the new session,
      // then push so we navigate to the role's home.
      router.refresh();
      router.push(dest);
    });
  };

  if (sessionState.kind === "loading") {
    return (
      <p className="font-mono text-[11px] text-ink-mute tracking-[0.05em]">
        Verifying your reset link…
      </p>
    );
  }

  if (sessionState.kind === "no-token") {
    return (
      <div className="border border-rule-strong bg-paper-2 rounded-[2px] p-6">
        <p className="font-serif text-[16px] mb-3">
          This page needs a reset link.
        </p>
        <p className="font-mono text-[11px] text-ink-mute tracking-[0.05em] mb-3">
          Request one from{" "}
          <Link href="/forgot-password" className="underline">
            forgot password
          </Link>
          .
        </p>
      </div>
    );
  }

  if (sessionState.kind === "error") {
    return (
      <div className="border border-rule-strong bg-paper-2 rounded-[2px] p-6">
        <p className="font-serif text-[16px] mb-3">
          That reset link is no longer valid.
        </p>
        <p className="font-mono text-[11px] text-[var(--warning)] tracking-[0.05em] mb-4">
          {sessionState.message}
        </p>
        <Link
          href="/forgot-password"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          Request a fresh link →
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <p className="font-serif text-[16px]">
        Password updated. Redirecting you in…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <FieldLabel htmlFor="password">New password</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.05em] text-ink-fade">
          8 characters or more.
        </p>
      </div>

      <div>
        <FieldLabel htmlFor="confirm">Confirm new password</FieldLabel>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {formError && (
        <p
          role="alert"
          className="font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]"
        >
          {formError}
        </p>
      )}

      <div className="flex items-center justify-end pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Set password →"}
        </Button>
      </div>
    </form>
  );
}
