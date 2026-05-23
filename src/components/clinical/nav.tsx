"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface ClinicalNavLink {
  label: string;
  href: string;
  // Match prefix if you want sub-routes to keep the link highlighted.
  matchPrefix?: boolean;
}

export interface ClinicalNavProps {
  brandHref: string;
  links: ClinicalNavLink[];
  userName: string;
  userEmail?: string | null;
  trailing?: React.ReactNode;
}

export function ClinicalNav({
  brandHref,
  links,
  userName,
  userEmail,
  trailing,
}: ClinicalNavProps) {
  const pathname = usePathname();
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  // Pick the longest matching link so a sub-route like /student/library/foo
  // highlights "Library" rather than "Cases" (which would match /student).
  const activeHref = (() => {
    const candidates = links.filter((l) => {
      if (l.matchPrefix === false) return l.href === pathname;
      return pathname === l.href || pathname.startsWith(`${l.href}/`);
    });
    if (candidates.length === 0) return null;
    return candidates.reduce((a, b) => (a.href.length >= b.href.length ? a : b))
      .href;
  })();

  return (
    <header className="sticky top-0 z-20 border-b border-clinical-border bg-clinical-bg/85 backdrop-blur">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 px-5 md:px-8 h-16">
        <Link
          href={brandHref}
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

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = l.href === activeHref;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "px-3 py-1.5 rounded-clinical text-[14px] font-medium transition-colors",
                  active
                    ? "bg-clinical-primary-soft text-clinical-primary"
                    : "text-clinical-muted-fg hover:text-clinical-fg hover:bg-clinical-muted"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {trailing}
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-[13px] font-medium text-clinical-fg">
              {userName}
            </span>
            {userEmail && (
              <span className="text-[11px] text-clinical-muted-fg">
                {userEmail}
              </span>
            )}
          </div>
          <span
            className="grid place-items-center h-9 w-9 rounded-full bg-clinical-primary-soft text-clinical-primary text-[12px] font-bold"
            title={userEmail ?? userName}
            aria-hidden
          >
            {initials || "??"}
          </span>
        </div>
      </div>
    </header>
  );
}
