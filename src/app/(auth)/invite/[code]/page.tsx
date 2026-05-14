import { notFound } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { classrooms, teachers, schools } from "@/db/schema";
import { StageLabel } from "@/components/ui";
import { currentUser } from "@/lib/auth/current-user";
import { InviteSignupForm } from "./invite-form";

interface PageProps {
  params: Promise<{ code: string }>;
}

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle school",
  high: "High school",
  undergrad: "Undergraduate",
};

export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;

  // Look up the classroom + teacher + school to show context.
  let row;
  try {
    [row] = await db
      .select({
        id: classrooms.id,
        name: classrooms.name,
        level: classrooms.level,
        inviteCode: classrooms.inviteCode,
        teacherName: teachers.name,
        schoolName: schools.name,
      })
      .from(classrooms)
      .leftJoin(teachers, eq(teachers.id, classrooms.teacherId))
      .leftJoin(schools, eq(schools.id, classrooms.schoolId))
      .where(
        and(eq(classrooms.inviteCode, code), isNull(classrooms.deletedAt))
      )
      .limit(1);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[invite/page] DB lookup failed:", err);
    }
    notFound();
  }

  if (!row) notFound();

  // If someone visits an invite link while signed in, suggest signing out
  // instead of forcing a new account on top of their session.
  const session = await currentUser().catch(() => null);

  return (
    <>
      <StageLabel className="mb-5">Join classroom</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        {row.name}
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-2">
        {LEVEL_LABEL[row.level] ?? row.level}
        {row.teacherName ? ` · ${row.teacherName}` : ""}
      </p>
      {row.schoolName && (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-fade mb-10">
          {row.schoolName}
        </p>
      )}

      {session ? (
        <div className="border border-rule-strong rounded-[2px] p-6 bg-paper-2">
          <p className="font-serif text-[15px] mb-3">
            You&apos;re already signed in.
          </p>
          <p className="font-mono text-[11px] text-ink-mute tracking-[0.05em]">
            Sign out first if you want to register a new student account
            with this invite.
          </p>
        </div>
      ) : (
        <InviteSignupForm code={row.inviteCode} />
      )}
    </>
  );
}
