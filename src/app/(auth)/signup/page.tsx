import type { Metadata } from "next";
import Link from "next/link";
import { CCard, CEyebrow } from "@/components/clinical/primitives";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <>
      <div className="text-center mb-8">
        <CEyebrow className="mb-3 justify-center inline-block">
          New student
        </CEyebrow>
        <h1 className="font-serif text-[36px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
          Request access.
        </h1>
        <p className="text-[15.5px] text-clinical-muted-fg">
          Create an account and we&apos;ll review it shortly. You&apos;ll get an
          email when you&apos;re approved.
        </p>
      </div>

      <CCard className="p-6 md:p-7">
        <SignupForm />
      </CCard>

      <p className="mt-6 text-center text-[13.5px] text-clinical-muted-fg">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-clinical-primary hover:text-clinical-fg transition-colors"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
