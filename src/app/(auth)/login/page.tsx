import type { Metadata } from "next";
import { LoginForm } from "@/app/(auth)/login-form";
import { studentTeacherSignIn } from "@/app/actions/auth";
import { StageLabel } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };

type SearchParams = { next?: string | string[] };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <>
      <StageLabel className="mb-5">Sign in · Student or teacher</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        Welcome back.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-10">
        Use the email your school or teacher has on file.
      </p>

      <LoginForm action={studentTeacherSignIn} next={next} />
    </>
  );
}
