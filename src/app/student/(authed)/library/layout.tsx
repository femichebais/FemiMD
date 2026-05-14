import { requireRole } from "@/lib/auth/current-user";
import { listLibraryForStudent } from "@/lib/queries/library";
import { LibraryToc } from "./_components/library-toc";

async function safeList(studentId: string) {
  try {
    return await listLibraryForStudent(studentId);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[student/library/list]", err);
    }
    return [];
  }
}

export default async function StudentLibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole("student");
  const entries = await safeList(user.id);

  return (
    <div className="max-w-[1100px] mx-auto px-6 md:px-12 py-10 md:py-14 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 md:gap-20">
      <aside className="md:sticky md:top-[110px] md:self-start">
        <LibraryToc entries={entries} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
