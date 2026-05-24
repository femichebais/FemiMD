import type { Metadata } from "next";
import { Stethoscope } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/lib/auth/current-user";
import {
  listStudentDashboard,
  type StudentDashboardCase,
} from "@/lib/queries/student-cases";
import { CCard, CEyebrow } from "@/components/clinical/primitives";
import { CaseCard } from "../_components/case-card";

export const metadata: Metadata = { title: "Cases" };

async function safeList(userId: string): Promise<StudentDashboardCase[]> {
  try {
    return await listStudentDashboard(userId);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[student/cases]", err);
    }
    return [];
  }
}

export default async function StudentCasesListPage() {
  const { user } = await requireRole("student");
  const all = await safeList(user.id);
  const available = all.filter((c) => c.state !== "completed");
  const completed = all.filter((c) => c.state === "completed");

  return (
    <main className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
      <CEyebrow className="mb-3">Cases</CEyebrow>
      <h1 className="font-serif text-[40px] md:text-[48px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-4">
        Pick a patient.
      </h1>
      <p className="text-[17px] leading-[1.55] text-clinical-muted-fg max-w-prose mb-10">
        Every case is a few short stages. Ask focused questions, run a
        targeted exam, then make the call. Retakes append — they don&rsquo;t
        overwrite.
      </p>

      {all.length === 0 ? (
        <CCard className="px-6 py-12 text-center">
          <Stethoscope
            weight="duotone"
            className="h-10 w-10 text-clinical-muted-fg mx-auto mb-3"
          />
          <p className="text-clinical-fg font-medium mb-1">
            No cases released yet.
          </p>
          <p className="text-[14px] text-clinical-muted-fg">
            Your teacher hasn&rsquo;t shared any patients with you yet.
          </p>
        </CCard>
      ) : (
        <>
          {available.length > 0 && (
            <section className="mb-12">
              <div className="mb-5">
                <CEyebrow className="mb-1.5">Waiting room</CEyebrow>
                <h2 className="font-serif text-[24px] md:text-[26px] tracking-[-0.01em] text-clinical-fg font-medium">
                  Patients to see
                </h2>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {available.map((c) => (
                  <li key={c.id}>
                    <CaseCard caseRow={c} primaryCta />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <div className="mb-5">
                <CEyebrow className="mb-1.5">Records</CEyebrow>
                <h2 className="font-serif text-[24px] md:text-[26px] tracking-[-0.01em] text-clinical-fg font-medium">
                  Cases you&rsquo;ve closed
                </h2>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((c) => (
                  <li key={c.id}>
                    <CaseCard caseRow={c} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
