import { CCard, CEyebrow } from "@/components/clinical/primitives";
import { ResetPasswordForm } from "./reset-password-form";

// Supabase recovery flow lands here with tokens in the URL hash:
//   /reset-password#access_token=...&refresh_token=...&type=recovery
// The form is a client component that extracts those, establishes a
// session, and lets the user set a new password.
export default function ResetPasswordPage() {
  return (
    <>
      <div className="text-center mb-8">
        <CEyebrow className="mb-3 inline-block">Reset password</CEyebrow>
        <h1 className="font-serif text-[36px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
          Set a new password.
        </h1>
        <p className="text-[15.5px] text-clinical-muted-fg">
          Choose something you&apos;ll remember.
        </p>
      </div>

      <CCard className="p-6 md:p-7">
        <ResetPasswordForm />
      </CCard>
    </>
  );
}
