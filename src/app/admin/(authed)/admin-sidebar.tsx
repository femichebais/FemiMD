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

// Clinical sidebar — rounded pill highlight on the current item, matching the
// student/teacher nav. Text-only (no icons), which reads cleaner here.
export function AdminSidebar({ badges }: AdminSidebarProps = {}) {
  const pathname = usePathname();

  return (
    <nav className="text-[13px]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-[18px]">
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
                  "flex items-center justify-between gap-2 py-[7px] px-3 rounded-clinical text-[14px] transition-colors",
                  active
                    ? "bg-clinical-primary-soft text-clinical-primary font-medium"
                    : "text-clinical-muted-fg hover:text-clinical-fg hover:bg-clinical-muted"
                )}
              >
                <span>{section.label}</span>
                {count > 0 && (
                  <span
                    className="text-[10px] font-semibold leading-none px-1.5 py-1 rounded-full bg-clinical-primary text-clinical-primary-fg tabular-nums"
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
