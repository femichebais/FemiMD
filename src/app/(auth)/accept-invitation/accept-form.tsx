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

interface InviteContext {
  name?: string;
  email?: string;
  role?: "admin" | "teacher" | "student";
  schoolName?: string | null;
}

const DASHBOARD_FOR: Record<string, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

export function AcceptInvitationForm() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>({
    kind: "loading",
  });
  const [context, setContext] = useState<InviteContext>({});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [done, setDone] = useState(false);

  // Establish session from URL hash tokens, then fetch the invitee's name
  // + school for the welcome message.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash || hash.length <= 1) {
      setSessionState({ kind: "no-token" });
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const errorDescription =
      params.get("error_description") ?? params.get("error");
    if (errorDescription) {
      setSessionState({
        kind: "error",
        message: decodeURIComponent(errorDescription.replace(/\+/g, " ")),
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
    (async () => {
      const { data: sessionData, error: setErr } =
        await supabase.auth.setSession({ access_token, refresh_token });

      if (setErr || !sessionData.user) {
        setSessionState({
          kind: "error",
          message: setErr?.message ?? "Couldn't establish session.",
        });
        return;
      }

      const user = sessionData.user;
      const role = (user.app_metadata as Record<string, unknown>)?.role as
        | "admin"
        | "teacher"
        | "student"
        | undefined;
      const ctx: InviteContext = {
        name:
          (user.user_metadata as Record<string, unknown> | undefined)?.name as
            | string
            | undefined,
        email: user.email ?? undefined,
        role,
      };

      // For teachers, pull the school name via the teacher row.
      // RLS lets teachers read teacher_read_self, schools read own school.
      if (role === "teacher") {
        try {
          const { data } = await supabase
            .from("teachers")
            .select("name, school_id")
            .eq("id", user.id)
            .single();
          if (data) {
            ctx.name = ctx.name ?? data.name;
            const { data: school } = await supabase
              .from("schools")
              .select("name")
              .eq("id", data.school_id)
              .single();
            ctx.schoolName = school?.name ?? null;
          }
        } catch {
          // soft-fail — welcome message just omits the school
        }
      }

      setContext(ctx);
      setSessionState({ kind: "ready" });
      window.history.replaceState({}, "", window.location.pathname);
    })();
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
        Verifying your invite link…
      </p>
    );
  }

  if (sessionState.kind === "no-token") {
    return (
      <div>
        <p className="font-serif text-[17px] text-clinical-fg mb-2">
          This page needs an invite link.
        </p>
        <p className="text-[13.5px] text-clinical-muted-fg">
          Ask your admin to resend the email, or{" "}
          <Link
            href="/login"
            className="text-clinical-primary hover:underline font-medium"
          >
            sign in
          </Link>{" "}
          if you already have an account.
        </p>
      </div>
    );
  }

  if (sessionState.kind === "error") {
    return (
      <div>
        <p className="font-serif text-[17px] text-clinical-fg mb-2">
          This invite link isn&rsquo;t valid.
        </p>
        <p className="text-[13px] text-clinical-destructive mb-3">
          {sessionState.message}
        </p>
        <p className="text-[13.5px] text-clinical-muted-fg">
          Ask your admin to send a new one.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <p className="font-serif text-[17px] text-clinical-fg">
        Password set. Redirecting you in…
      </p>
    );
  }

  const greetingName = context.name ?? context.email?.split("@")[0] ?? "there";
  const roleLabel =
    context.role === "teacher"
      ? "as a teacher"
      : context.role === "student"
        ? "as a student"
        : "";

  return (
    <>
      <div className="rounded-clinical border border-clinical-primary/20 bg-clinical-primary-soft px-4 py-3 mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-1">
          You&rsquo;ve been added
        </div>
        <p className="font-serif text-[15.5px] text-clinical-fg leading-[1.45]">
          Hi <strong className="font-semibold">{greetingName}</strong> — your
          admin added you to Femi {roleLabel}
          {context.schoolName ? (
            <>
              {" "}at{" "}
              <strong className="font-semibold">{context.schoolName}</strong>
            </>
          ) : null}
          .
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <CFieldLabel htmlFor="password">Choose a password</CFieldLabel>
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
          <CFieldLabel htmlFor="confirm">Confirm password</CFieldLabel>
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
          {isSubmitting ? "Saving…" : "Activate my account"}
          <ArrowRight weight="bold" className="h-4 w-4" />
        </CButton>
      </form>
    </>
  );
}
