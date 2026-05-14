import { StageLabel } from "@/components/ui";
import { AcceptInvitationForm } from "./accept-form";

// Branded entry point for first-time-invited users (currently teachers —
// students use /invite/[code] which already shows classroom context).
// Same token-extraction-and-set-session flow as /reset-password but with
// welcome-y copy instead of "set a new password."
export default function AcceptInvitationPage() {
  return (
    <>
      <StageLabel className="mb-5">Welcome to Femi</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        You&apos;ve been invited.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-10">
        Set a password to finish creating your account.
      </p>

      <AcceptInvitationForm />
    </>
  );
}
