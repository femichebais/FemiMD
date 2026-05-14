import Link from "next/link";
import { StageLabel } from "@/components/ui";
import { ForgotPasswordForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <StageLabel className="mb-5">Reset password</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        Forgot your password?
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-10">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <ForgotPasswordForm />

      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
        <Link href="/login" className="hover:text-ink transition-colors">
          ← Back to sign in
        </Link>
      </p>
    </>
  );
}
