import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Plus,
  GraduationCap,
} from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/auth/current-user";
import {
  listTeacherClassrooms,
  type TeacherClassroomRow,
} from "@/lib/queries/teacher";
import {
  CCard,
  CBadge,
  CEyebrow,
  CLinkButton,
} from "@/components/clinical/primitives";

export const metadata: Metadata = { title: "Classrooms" };

// Counts (students, released cases) change on student signup + release
// toggles; opt out of the full-route cache so this dashboard always
// reflects live DB state.
export const dynamic = "force-dynamic";

const LEVEL_LABEL: Record<string, string> = {
  middle: "Middle school",
  high: "High school",
  undergrad: "Undergrad",
};

async function safeList(teacherId: string): Promise<TeacherClassroomRow[]> {
  try {
    return await listTeacherClassrooms(teacherId);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[teacher/list]", err);
    }
    return [];
  }
}

export default async function TeacherOverviewPage() {
  const { user } = await requireRole("teacher");
  const rows = await safeList(user.id);

  return (
    <main className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
      <div className="flex items-end justify-between gap-4 mb-2">
        <div>
          <CEyebrow className="mb-3">Classrooms</CEyebrow>
          <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium">
            Your classrooms.
          </h1>
        </div>
        <CLinkButton href="/teacher/classroom/new" size="md" variant="primary">
          <Plus weight="bold" className="h-4 w-4" />
          New classroom
        </CLinkButton>
      </div>
      <p className="text-[17px] leading-[1.55] text-clinical-muted-fg max-w-prose mb-10">
        Each classroom has its own level, roster, and the cases you&rsquo;ve
        chosen to release to them.
      </p>

      {rows.length === 0 ? (
        <CCard className="px-6 py-12 text-center">
          <GraduationCap
            weight="duotone"
            className="h-10 w-10 text-clinical-muted-fg mx-auto mb-3"
          />
          <p className="text-clinical-fg font-medium mb-1">
            No classrooms yet.
          </p>
          <p className="text-[14px] text-clinical-muted-fg">
            Spin up your first classroom to invite students.
          </p>
        </CCard>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/teacher/classroom/${c.id}`}
                className="block group"
              >
                <CCard hoverable className="p-5 sm:p-6 h-full">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <CBadge tone="neutral">
                      {LEVEL_LABEL[c.level] ?? c.level}
                    </CBadge>
                    <span className="text-[11px] font-mono text-clinical-muted-fg">
                      invite · {c.inviteCode}
                    </span>
                  </div>
                  <h2 className="font-serif text-[22px] leading-tight tracking-[-0.01em] text-clinical-fg font-medium mb-3 group-hover:text-clinical-primary transition-colors">
                    {c.name}
                  </h2>
                  <div className="flex items-center justify-end text-clinical-primary text-[13px] font-medium">
                    Open classroom
                    <ArrowRight weight="bold" className="ml-1.5 h-3.5 w-3.5" />
                  </div>
                </CCard>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
