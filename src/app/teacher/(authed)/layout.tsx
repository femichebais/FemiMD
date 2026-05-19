import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teachers, schools } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { SignOutButton } from "./sign-out-button";

async function getTeacherCtx(userId: string) {
  try {
    const [row] = await db
      .select({
        name: teachers.name,
        schoolName: schools.name,
      })
      .from(teachers)
      .leftJoin(schools, eq(schools.id, teachers.schoolId))
      .where(eq(teachers.id, userId))
      .limit(1);
    return row ?? null;
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[teacher/layout]", err);
    }
    return null;
  }
}

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole("teacher");
  const ctx = await getTeacherCtx(user.id);

  const displayName = ctx?.name ?? user.email ?? "Teacher";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-rule sticky top-0 z-10 bg-paper">
        <Link
          href="/teacher"
          className="inline-flex items-center gap-2 font-serif text-[22px] font-medium tracking-[-0.01em]"
        >
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden />
          Femi
        </Link>
        <div className="hidden md:flex items-center gap-6 text-[13px] text-ink-mute">
          {ctx?.schoolName && <span>{ctx.schoolName}</span>}
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
            Teacher
          </span>
        </div>
        <div className="flex items-center gap-4 text-[13px]">
          <Link
            href="/teacher/library"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink transition-colors"
          >
            Library
          </Link>
          <SignOutButton />
          <span className="text-ink-mute">{displayName}</span>
          <span
            className="w-7 h-7 rounded-full bg-paper-3 flex items-center justify-center font-mono text-[11px] font-medium"
            title={user.email ?? ""}
          >
            {initials || "??"}
          </span>
        </div>
      </nav>
      {children}
    </div>
  );
}
