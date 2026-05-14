import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 md:px-12 py-5 border-b border-rule">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-serif text-[22px] font-medium tracking-[-0.01em]"
        >
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden />
          Femi
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </main>
  );
}
