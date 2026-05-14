import Link from "next/link";
import { StageLabel } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-[420px] w-full text-center">
        <StageLabel className="mb-5">404</StageLabel>
        <h1 className="font-serif text-[44px] leading-[1.05] tracking-[-0.025em] font-normal mb-5">
          Not found.
        </h1>
        <p className="font-serif italic text-[18px] text-ink-mute mb-10">
          This page doesn&apos;t exist, was removed, or isn&apos;t something
          you can see from where you&apos;re signed in.
        </p>
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink transition-colors"
        >
          ← Home
        </Link>
      </div>
    </main>
  );
}
