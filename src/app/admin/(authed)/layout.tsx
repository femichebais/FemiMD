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
    <div className="admin min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-clinical-border bg-clinical-bg/85 backdrop-blur">
        <div className="flex items-center justify-between px-6 md:px-12 h-16">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2.5 font-semibold text-[17px] text-clinical-fg"
          >
            <span
              className="grid place-items-center h-7 w-7 rounded-clinical bg-clinical-primary text-clinical-primary-fg text-[13px] font-bold shadow-clinical-elegant"
              aria-hidden
            >
              F
            </span>
            Femi
            <span className="ml-1 px-2 py-0.5 rounded-clinical bg-clinical-primary-soft text-clinical-primary text-[11px] font-semibold uppercase tracking-[0.1em]">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <SignOutButton />
            <span
              className="grid place-items-center h-9 w-9 rounded-full bg-clinical-primary-soft text-clinical-primary text-[12px] font-bold"
              title={user.email ?? ""}
            >
              {initials}
            </span>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
