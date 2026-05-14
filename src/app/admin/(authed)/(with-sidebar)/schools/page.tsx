import { isNull, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { schools } from "@/db/schema";
import { StageLabel } from "@/components/ui";
import { CreateSchoolForm } from "./create-school-form";
import { DeleteSchoolButton } from "./delete-school-button";

async function listSchools() {
  try {
    return await db
      .select()
      .from(schools)
      .where(isNull(schools.deletedAt))
      .orderBy(desc(schools.createdAt));
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/schools] listSchools failed:", err);
    }
    return [];
  }
}

const formatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function SchoolsPage() {
  const rows = await listSchools();

  return (
    <>
      <StageLabel className="mb-5">Schools</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        Schools on the platform.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Each school can have many teachers and classrooms.
      </p>

      <CreateSchoolForm />

      {rows.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No schools yet. Add one above.
        </p>
      ) : (
        <ul>
          {rows.map((school) => (
            <li
              key={school.id}
              className="grid grid-cols-[1fr_140px_80px] items-baseline gap-6 py-5 border-b border-rule"
            >
              <span className="font-serif text-[18px] text-ink">
                {school.name}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-fade">
                Added {formatter.format(new Date(school.createdAt))}
              </span>
              <span className="justify-self-end">
                <DeleteSchoolButton id={school.id} name={school.name} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
