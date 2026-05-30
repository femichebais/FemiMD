import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { students, classrooms } from "@/db/schema";
import { requireRole } from "@/lib/auth/current-user";
import { ClinicalNav } from "@/components/clinical/nav";
import { SignOutButton } from "./sign-out-button";

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

  return (
    <div className="clinical min-h-screen flex flex-col">
      <ClinicalNav
        brandHref="/student"
        links={[
          { label: "Cases", href: "/student/cases" },
          { label: "Quizzes", href: "/student/quizzes" },
          { label: "Clinical Library", href: "/student/library" },
          { label: "Progress", href: "/student/progress" },
        ]}
        userName={displayName}
        userEmail={user.email}
        trailing={<SignOutButton />}
      />
      {children}
    </div>
  );
}
