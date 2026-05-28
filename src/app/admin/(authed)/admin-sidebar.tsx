"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS: Array<{ label: string; href: string; match: RegExp }> = [
  { label: "Overview", href: "/admin", match: /^\/admin\/?$/ },
  { label: "Schools", href: "/admin/schools", match: /^\/admin\/schools/ },
  { label: "Teachers", href: "/admin/teachers", match: /^\/admin\/teachers/ },
  { label: "Classrooms", href: "/admin/classrooms", match: /^\/admin\/classrooms/ },
  { label: "Students", href: "/admin/students", match: /^\/admin\/students/ },
  { label: "Cases", href: "/admin/cases", match: /^\/admin\/cases/ },
  { label: "Quizzes", href: "/admin/quizzes", match: /^\/admin\/quizzes/ },
  { label: "Library", href: "/admin/library", match: /^\/admin\/library/ },
  { label: "Resources", href: "/admin/resources", match: /^\/admin\/resources/ },
];

// Editorial sidebar — same pattern as the library TOC in the mockup.
// Thin accent left-border on current item. No icons (Phosphor is available
// but the mockup keeps this nav text-only and that reads cleaner here).
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="text-[13px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-fade mb-[18px]">
        Admin
      </div>
      <ul className="flex flex-col gap-[2px]">
        {SECTIONS.map((section) => {
          const active = section.match.test(pathname);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                className={cn(
                  "block py-[6px] pl-[14px] border-l text-[13px] transition-colors",
                  active
                    ? "border-accent text-ink font-medium"
                    : "border-transparent text-ink-mute hover:text-ink"
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
