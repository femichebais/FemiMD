import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-[480px] w-full">
        <div className="flex items-center gap-2 mb-10">
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden />
          <span className="font-serif text-[22px] font-medium tracking-[-0.01em]">
            Femi
          </span>
        </div>
        <h1 className="font-serif text-[38px] leading-[1.1] tracking-[-0.015em] mb-6">
          Clinical education for the next generation of physicians.
        </h1>
        <p className="text-[16px] leading-[1.7] text-ink-mute mb-12 max-w-read">
          Femi is a patient-case platform for high school and undergraduate
          students. Work through the same kind of cases real clinicians see —
          one decision at a time.
        </p>
        <div className="flex gap-6 items-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-fade">
          <Link href="/login" className="hover:text-ink transition-colors">
            Log in
          </Link>
          <span aria-hidden>·</span>
          <Link href="/design" className="hover:text-ink transition-colors">
            Design system
          </Link>
        </div>
      </div>
    </main>
  );
}
