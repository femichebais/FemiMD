import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teachers, schools } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { ClinicalNav } from "@/components/clinical/nav";
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

  return (
    <div className="clinical min-h-screen flex flex-col">
      <ClinicalNav
        brandHref="/teacher"
        links={[
          { label: "Classrooms", href: "/teacher" },
          { label: "Clinical Library", href: "/teacher/library" },
          { label: "Resources", href: "/teacher/resources" },
        ]}
        userName={displayName}
        userEmail={user.email}
        trailing={<SignOutButton />}
      />
      {children}
    </div>
  );
}
