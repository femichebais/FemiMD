import type { Metadata } from "next";
import { LoginForm } from "@/app/(auth)/login-form";
import { studentTeacherSignIn } from "@/app/actions/auth";
import { CCard, CEyebrow } from "@/components/clinical/primitives";

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
      <div className="text-center mb-8">
        <CEyebrow className="mb-3 justify-center inline-block">
          Student or teacher
        </CEyebrow>
        <h1 className="font-serif text-[36px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
          Welcome back.
        </h1>
        <p className="text-[15.5px] text-clinical-muted-fg">
          Use the email your school or teacher has on file.
        </p>
      </div>

      <CCard className="p-6 md:p-7">
        <LoginForm action={studentTeacherSignIn} next={next} />
      </CCard>
    </>
  );
}
