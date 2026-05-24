"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import {
  CButton,
  CFieldLabel,
  CInput,
} from "@/components/clinical/primitives";
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

      const role = (data.user.app_metadata as Record<string, unknown>)
        ?.role as string | undefined;
      const dest = (role && DASHBOARD_FOR[role]) || "/";
      router.refresh();
      router.push(dest);
    });
  };

  if (sessionState.kind === "loading") {
    return (
      <p className="text-[13.5px] text-clinical-muted-fg">
        Verifying your reset link…
      </p>
    );
  }

  if (sessionState.kind === "no-token") {
    return (
      <div>
        <p className="font-serif text-[17px] text-clinical-fg mb-2">
          This page needs a reset link.
        </p>
        <p className="text-[13.5px] text-clinical-muted-fg">
          Request one from{" "}
          <Link
            href="/forgot-password"
            className="text-clinical-primary hover:underline font-medium"
          >
            forgot password
          </Link>
          .
        </p>
      </div>
    );
  }

  if (sessionState.kind === "error") {
    return (
      <div>
        <p className="font-serif text-[17px] text-clinical-fg mb-2">
          That reset link is no longer valid.
        </p>
        <p className="text-[13px] text-clinical-destructive mb-4">
          {sessionState.message}
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-clinical-primary hover:text-clinical-fg transition-colors"
        >
          Request a fresh link
          <ArrowRight weight="bold" className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <p className="font-serif text-[17px] text-clinical-fg">
        Password updated. Redirecting you in…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <CFieldLabel htmlFor="password">New password</CFieldLabel>
        <CInput
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
        />
        <p className="mt-2 text-[12px] text-clinical-muted-fg">
          8 characters or more.
        </p>
      </div>

      <div>
        <CFieldLabel htmlFor="confirm">Confirm new password</CFieldLabel>
        <CInput
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </div>

      {formError && (
        <p role="alert" className="text-[13px] text-clinical-destructive">
          {formError}
        </p>
      )}

      <CButton type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Saving…" : "Set password"}
        <ArrowRight weight="bold" className="h-4 w-4" />
      </CButton>
    </form>
  );
}
