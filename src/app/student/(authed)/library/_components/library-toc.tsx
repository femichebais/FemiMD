"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LibraryTocEntry } from "@/lib/queries/library";
import { cn } from "@/lib/utils";

export interface LibraryTocProps {
  entries: LibraryTocEntry[];
  // Path prefix the slug is appended to. Defaults to the student tree;
  // /teacher/library passes its own prefix.
  basePath?: string;
  emptyMessage?: string;
}

export function LibraryToc({
  entries,
  basePath = "/student/library",
  emptyMessage = "No pages tagged for your level yet.",
}: LibraryTocProps) {
  const pathname = usePathname();

  return (
    <nav>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-primary mb-3">
        Diagnoses
      </div>
      {entries.length === 0 ? (
        <p className="text-[13.5px] text-clinical-muted-fg">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {entries.map((entry) => {
            const href = `${basePath}/${entry.slug}`;
            const active = pathname === href;
            return (
              <li key={entry.id}>
                <Link
                  href={href}
                  className={cn(
                    "block px-3 py-1.5 rounded-clinical text-[13.5px] transition-colors",
                    active
                      ? "bg-clinical-primary-soft text-clinical-primary font-medium"
                      : "text-clinical-muted-fg hover:text-clinical-fg hover:bg-clinical-muted"
                  )}
                >
                  {entry.title}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
