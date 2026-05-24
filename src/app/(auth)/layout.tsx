import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="clinical min-h-screen flex flex-col bg-clinical-bg">
      <header className="border-b border-clinical-border bg-clinical-bg/85 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 px-5 md:px-8 h-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-semibold text-[17px] text-clinical-fg"
          >
            <span
              className="grid place-items-center h-7 w-7 rounded-clinical bg-clinical-primary text-clinical-primary-fg text-[13px] font-bold shadow-clinical-elegant"
              aria-hidden
            >
              F
            </span>
            Femi
          </Link>
        </div>
      </header>

      <main className="flex-1 grid place-items-center px-5 py-12 md:py-20 relative overflow-hidden">
        <div
          aria-hidden
          className="hidden md:block absolute -top-32 -right-32 h-96 w-96 rounded-full bg-clinical-primary-glow/15 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden
          className="hidden md:block absolute -bottom-32 left-20 h-80 w-80 rounded-full bg-clinical-primary/10 blur-3xl pointer-events-none"
        />
        <div className="w-full max-w-[440px] relative">{children}</div>
      </main>
    </div>
  );
}
