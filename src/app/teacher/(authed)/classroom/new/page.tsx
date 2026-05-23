import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { ClassroomForm } from "./classroom-form";
import { CCard, CEyebrow } from "@/components/clinical/primitives";

export default function NewClassroomPage() {
  return (
    <main className="max-w-xl mx-auto px-5 md:px-8 py-10 md:py-14">
      <div className="flex items-center justify-between gap-4 mb-6">
        <CEyebrow>New classroom</CEyebrow>
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors"
        >
          <ArrowLeft weight="bold" className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>
      <h1 className="font-serif text-[36px] md:text-[44px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
        Create a classroom.
      </h1>
      <p className="text-[17px] leading-[1.55] text-clinical-muted-fg mb-10">
        You&rsquo;ll get an invite link to share with your students once
        it&rsquo;s created.
      </p>
      <CCard className="p-6">
        <ClassroomForm />
      </CCard>
    </main>
  );
}
