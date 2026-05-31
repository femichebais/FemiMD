import type { Metadata } from "next";
import { LoginForm } from "@/app/(auth)/login-form";
import { adminSignIn } from "@/app/actions/auth";
import { CCard, CEyebrow } from "@/components/clinical/primitives";
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
    <main className="clinical min-h-screen flex flex-col bg-clinical-bg">
      <header className="border-b border-clinical-border bg-clinical-bg/85 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 px-5 md:px-8 h-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-semibold text-[17px] text-clinical-fg"
          >
            <span
              className="grid place-items-center h-7 w-7 rounded-clinical bg-clinical-primary text-clinical-primary-fg text-[13px] font-bold shadow-clinical-elegant"
              aria-hidden
            >
              F
            </span>
            Femi
          </Link>
        </div>
      </header>

      <div className="flex-1 grid place-items-center px-5 py-12 md:py-20 relative overflow-hidden">
        <div
          aria-hidden
          className="hidden md:block absolute -top-32 -right-32 h-96 w-96 rounded-full bg-clinical-primary-glow/15 blur-3xl pointer-events-none"
        />
        <div className="w-full max-w-[440px] relative">
          <div className="text-center mb-8">
            <CEyebrow className="mb-3 inline-block">Sign in · Admin</CEyebrow>
            <h1 className="font-serif text-[36px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
              Platform admin.
            </h1>
            <p className="text-[15.5px] text-clinical-muted-fg">
              Restricted access.
            </p>
          </div>

          <CCard className="p-6 md:p-7">
            <LoginForm action={adminSignIn} next={next} />
          </CCard>
        </div>
      </div>
    </main>
  );
}
