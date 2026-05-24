import { CCard, CEyebrow } from "@/components/clinical/primitives";
import { AcceptInvitationForm } from "./accept-form";

// Branded entry point for first-time-invited users (currently teachers —
// students use /invite/[code] which already shows classroom context).
// Same token-extraction-and-set-session flow as /reset-password but with
// welcome-y copy instead of "set a new password."
export default function AcceptInvitationPage() {
  return (
    <>
      <div className="text-center mb-8">
        <CEyebrow className="mb-3 inline-block">Welcome to Femi</CEyebrow>
        <h1 className="font-serif text-[36px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
          You&rsquo;ve been invited.
        </h1>
        <p className="text-[15.5px] text-clinical-muted-fg">
          Set a password to finish creating your account.
        </p>
      </div>

      <CCard className="p-6 md:p-7">
        <AcceptInvitationForm />
      </CCard>
    </>
  );
}
