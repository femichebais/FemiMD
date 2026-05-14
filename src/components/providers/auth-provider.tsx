"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Role } from "@/lib/auth/current-user";

export interface AuthContextValue {
  user: User | null;
  role: Role | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readRole(user: User | null): Role | null {
  const role = (user?.app_metadata as Record<string, unknown> | undefined)
    ?.role;
  return role === "admin" || role === "teacher" || role === "student"
    ? role
    : null;
}

export interface AuthProviderProps {
  initialUser: User | null;
  children: React.ReactNode;
}

export function AuthProvider({ initialUser, children }: AuthProviderProps) {
  // Seed state from server-resolved user. Because this is set before the
  // first paint, there is no loading flicker and no hydration mismatch.
  const [user, setUser] = useState<User | null>(initialUser);
  const router = useRouter();

  // Track the last user id we *handled* — used to filter spurious events.
  // onAuthStateChange fires for TOKEN_REFRESHED, INITIAL_SESSION, etc.,
  // and we only want to react to real identity changes (sign-in / sign-out).
  const lastUserIdRef = useRef<string | null>(initialUser?.id ?? null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Never await inside this callback — Supabase warns it will deadlock
      // the SDK's internal lock. Anything async must be scheduled separately.
      const nextUser = session?.user ?? null;
      const nextId = nextUser?.id ?? null;

      // Update local state for any session change (so the JWT-derived role
      // reflects fresh app_metadata after refresh).
      setUser(nextUser);

      // Only force the server tree to re-render when the *identity* actually
      // changed. TOKEN_REFRESHED can fire every few minutes and refreshing
      // server components on each tick is wasteful and flicker-prone.
      if (nextId !== lastUserIdRef.current) {
        lastUserIdRef.current = nextId;
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
          router.refresh();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, role: readRole(user) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useUser(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useUser must be used inside <AuthProvider>");
  }
  return ctx;
}
