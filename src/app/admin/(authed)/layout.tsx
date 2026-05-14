import Link from "next/link";
import { requireRole } from "@/lib/auth/current-user";
import { SignOutButton } from "./sign-out-button";

// Outer authed layout: auth gate + top nav. NO section sidebar — that lives
// in (with-sidebar) so the case editor can use the same horizontal slot for
// its own metadata sidebar.
export default async function AdminAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole("admin");

  const initials = (user.email ?? "??")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-rule sticky top-0 z-10 bg-paper">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 font-serif text-[22px] font-medium tracking-[-0.01em]"
        >
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden />
          Femi
        </Link>
        <div className="hidden md:flex items-center gap-6 text-[13px] text-ink-mute">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4 text-[13px]">
          <SignOutButton />
          <span
            className="w-7 h-7 rounded-full bg-paper-3 flex items-center justify-center font-mono text-[11px] font-medium"
            title={user.email ?? ""}
          >
            {initials}
          </span>
        </div>
      </nav>
      {children}
    </div>
  );
}
