import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { students, classrooms } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { SignOutButton } from "./sign-out-button";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle school",
  high: "High school",
  undergrad: "Undergrad",
};

async function getStudentContext(userId: string) {
  try {
    const [row] = await db
      .select({
        name: students.name,
        classroomName: classrooms.name,
        classroomLevel: classrooms.level,
      })
      .from(students)
      .leftJoin(classrooms, eq(classrooms.id, students.classroomId))
      .where(eq(students.id, userId))
      .limit(1);
    return row ?? null;
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[student/layout] getStudentContext failed:", err);
    }
    return null;
  }
}

export default async function StudentAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole("student");
  const ctx = await getStudentContext(user.id);

  const displayName =
    ctx?.name ?? (user.user_metadata?.name as string | undefined) ?? "Student";
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
          href="/student"
          className="inline-flex items-center gap-2 font-serif text-[22px] font-medium tracking-[-0.01em]"
        >
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden />
          Femi
        </Link>
        <div className="hidden md:flex items-center gap-6 text-[13px] text-ink-mute">
          {ctx?.classroomName && ctx?.classroomLevel && (
            <span>
              {ctx.classroomName} ·{" "}
              {LEVEL_LABEL[ctx.classroomLevel] ?? ctx.classroomLevel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[13px]">
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
