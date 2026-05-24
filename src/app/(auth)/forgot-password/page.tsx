import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { CCard, CEyebrow } from "@/components/clinical/primitives";
import { ForgotPasswordForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="text-center mb-8">
        <CEyebrow className="mb-3 inline-block">Reset password</CEyebrow>
        <h1 className="font-serif text-[36px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
          Forgot your password?
        </h1>
        <p className="text-[15.5px] text-clinical-muted-fg">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <CCard className="p-6 md:p-7">
        <ForgotPasswordForm />
      </CCard>

      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors"
        >
          <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </p>
    </>
  );
}
