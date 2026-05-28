import type { Metadata } from "next";
import { LoginForm } from "@/app/(auth)/login-form";
import { adminSignIn } from "@/app/actions/auth";
import { StageLabel } from "@/components/ui";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin sign in" };

type SearchParams = { next?: string | string[] };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <main className="admin min-h-screen flex flex-col">
      <header className="px-6 md:px-12 py-5 border-b border-rule">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-serif text-[22px] font-medium tracking-[-0.01em]"
        >
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden />
          Femi
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <StageLabel className="mb-5">Sign in · Admin</StageLabel>
          <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
            Platform admin.
          </h1>
          <p className="font-serif italic text-[16px] text-ink-mute mb-10">
            Restricted access.
          </p>

          <LoginForm action={adminSignIn} next={next} />
        </div>
      </div>
    </main>
  );
}
