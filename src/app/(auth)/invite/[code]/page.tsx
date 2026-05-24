import { notFound } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { classrooms, teachers, schools } from "@/db/schema";
import {
  CBadge,
  CCard,
  CEyebrow,
} from "@/components/clinical/primitives";
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
      <div className="text-center mb-8">
        <CEyebrow className="mb-3 inline-block">Join classroom</CEyebrow>
        <h1 className="font-serif text-[34px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-3">
          {row.name}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <CBadge tone="neutral">
            {LEVEL_LABEL[row.level] ?? row.level}
          </CBadge>
          {row.teacherName && (
            <CBadge tone="primary">{row.teacherName}</CBadge>
          )}
        </div>
        {row.schoolName && (
          <p className="mt-3 text-[12.5px] font-mono text-clinical-muted-fg">
            {row.schoolName}
          </p>
        )}
      </div>

      <CCard className="p-6 md:p-7">
        {session ? (
          <div>
            <p className="font-serif text-[17px] text-clinical-fg mb-2">
              You&rsquo;re already signed in.
            </p>
            <p className="text-[13.5px] text-clinical-muted-fg">
              Sign out first if you want to register a new student account
              with this invite.
            </p>
          </div>
        ) : (
          <InviteSignupForm code={row.inviteCode} />
        )}
      </CCard>
    </>
  );
}
