import { ClassroomForm } from "./classroom-form";
import { StageLabel } from "@/components/ui";

export default function NewClassroomPage() {
  return (
    <main className="max-w-[480px] mx-auto px-6 md:px-12 py-10 md:py-14">
      <StageLabel className="mb-5">New classroom</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        Create a classroom.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-10">
        You&apos;ll get an invite link to share with your students.
      </p>
      <ClassroomForm />
    </main>
  );
}
