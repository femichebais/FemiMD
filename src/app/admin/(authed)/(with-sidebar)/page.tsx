import Link from "next/link";
import type { Metadata } from "next";
import { StageLabel } from "@/components/ui";
import { getAdminStats, type AdminStats } from "@/lib/queries/admin-stats";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  // Empty stats are fine if the DB isn't reachable yet — the page still
  // renders so the admin can navigate to other tools.
  let stats: AdminStats | null = null;
  try {
    stats = await getAdminStats();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/overview] stats query failed:", err);
    }
  }

  const items = stats
    ? [
        { label: "Schools", value: stats.schoolCount, href: "/admin/schools" },
        { label: "Teachers", value: stats.teacherCount, href: "/admin/teachers" },
        {
          label: "Classrooms",
          value: stats.classroomCount,
          href: "/admin/classrooms",
        },
        { label: "Students", value: stats.studentCount, href: "/admin/students" },
        { label: "Cases", value: stats.caseCount, href: "/admin/cases" },
      ]
    : [];

  return (
    <>
      <StageLabel className="mb-5">Overview</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-2">
        Welcome back.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        The current state of the platform.
      </p>

      {/* Inline stats — restrained, no 4-column metric grid (AI-tell per brief) */}
      {stats ? (
        <div className="border-y border-rule py-6 mb-14">
          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            {items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-baseline gap-3 transition-colors"
              >
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute group-hover:text-ink">
                  {item.label}
                </dt>
                <dd className="font-serif text-[26px] font-medium tabular-nums">
                  {item.value}
                </dd>
              </Link>
            ))}
          </dl>
        </div>
      ) : (
        <div className="border-y border-rule py-6 mb-14">
          <p className="font-mono text-[11px] text-ink-mute tracking-[0.05em]">
            Stats unavailable — check your DATABASE_URL.
          </p>
        </div>
      )}

      {/* Quick actions — text-only so we don't lean on icons or cards */}
      <StageLabel className="mb-4">Quick actions</StageLabel>
      <ul className="flex flex-col">
        {[
          { label: "Add a school", href: "/admin/schools" },
          { label: "Invite a teacher", href: "/admin/teachers" },
          { label: "Author a new case", href: "/admin/cases" },
        ].map((action) => (
          <li
            key={action.href}
            className="border-b border-rule last:border-b-0"
          >
            <Link
              href={action.href}
              className="block py-4 font-serif text-[18px] hover:pl-2 transition-[padding] duration-150"
            >
              {action.label}
              <span
                className="ml-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-fade"
                aria-hidden
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
