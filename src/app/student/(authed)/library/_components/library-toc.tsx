"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LibraryTocEntry } from "@/lib/queries/library";

export interface LibraryTocProps {
  entries: LibraryTocEntry[];
}

// Editorial sidebar — same pattern as the mockup's "Diagnoses" TOC.
// Current item gets the thin accent left-border + ink color.
export function LibraryToc({ entries }: LibraryTocProps) {
  const pathname = usePathname();

  return (
    <nav>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-fade mb-[18px]">
        Diagnoses
      </div>
      {entries.length === 0 ? (
        <p className="font-serif italic text-[14px] text-ink-mute">
          No pages tagged for your level yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-[2px]">
          {entries.map((entry) => {
            const href = `/student/library/${entry.slug}`;
            const active = pathname === href;
            return (
              <li key={entry.id}>
                <Link
                  href={href}
                  className={
                    "block py-[6px] pl-[14px] border-l text-[13px] transition-colors " +
                    (active
                      ? "border-accent text-ink font-medium"
                      : "border-transparent text-ink-mute hover:text-ink")
                  }
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
