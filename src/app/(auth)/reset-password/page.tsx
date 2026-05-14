import { StageLabel } from "@/components/ui";
import { ResetPasswordForm } from "./reset-password-form";

// Supabase recovery flow lands here with tokens in the URL hash:
//   /reset-password#access_token=...&refresh_token=...&type=recovery
// The form is a client component that extracts those, establishes a
// session, and lets the user set a new password.
export default function ResetPasswordPage() {
  return (
    <>
      <StageLabel className="mb-5">Reset password</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        Set a new password.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-10">
        Choose something you&apos;ll remember.
      </p>

      <ResetPasswordForm />
    </>
  );
}
