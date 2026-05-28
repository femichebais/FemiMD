"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavSection {
  label: string;
  href: string;
  match: RegExp;
  // Optional badge — used for the pending-signups count next to "Signups".
  badgeKey?: "pendingSignups";
}

const SECTIONS: NavSection[] = [
  { label: "Overview", href: "/admin", match: /^\/admin\/?$/ },
  { label: "Schools", href: "/admin/schools", match: /^\/admin\/schools/ },
  { label: "Teachers", href: "/admin/teachers", match: /^\/admin\/teachers/ },
  { label: "Classrooms", href: "/admin/classrooms", match: /^\/admin\/classrooms/ },
  {
    label: "Signups",
    href: "/admin/signups",
    match: /^\/admin\/signups/,
    badgeKey: "pendingSignups",
  },
  { label: "Students", href: "/admin/students", match: /^\/admin\/students/ },
  { label: "Cases", href: "/admin/cases", match: /^\/admin\/cases/ },
  { label: "Quizzes", href: "/admin/quizzes", match: /^\/admin\/quizzes/ },
  { label: "Library", href: "/admin/library", match: /^\/admin\/library/ },
  { label: "Resources", href: "/admin/resources", match: /^\/admin\/resources/ },
];

export interface AdminSidebarProps {
  // Server-fetched counts the sidebar surfaces as badges. Keyed so adding
  // new badges later doesn't change this component's signature.
  badges?: { pendingSignups?: number };
}

// Editorial sidebar — same pattern as the library TOC in the mockup.
// Thin accent left-border on current item. No icons (Phosphor is available
// but the mockup keeps this nav text-only and that reads cleaner here).
export function AdminSidebar({ badges }: AdminSidebarProps = {}) {
  const pathname = usePathname();

  return (
    <nav className="text-[13px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-fade mb-[18px]">
        Admin
      </div>
      <ul className="flex flex-col gap-[2px]">
        {SECTIONS.map((section) => {
          const active = section.match.test(pathname);
          const count = section.badgeKey
            ? badges?.[section.badgeKey] ?? 0
            : 0;
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                className={cn(
                  "flex items-center justify-between gap-2 py-[6px] pl-[14px] pr-2 border-l text-[13px] transition-colors",
                  active
                    ? "border-accent text-ink font-medium"
                    : "border-transparent text-ink-mute hover:text-ink"
                )}
              >
                <span>{section.label}</span>
                {count > 0 && (
                  <span
                    className="font-mono text-[10px] leading-none px-1.5 py-1 rounded-[2px] bg-accent text-paper tabular-nums"
                    aria-label={`${count} pending`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
