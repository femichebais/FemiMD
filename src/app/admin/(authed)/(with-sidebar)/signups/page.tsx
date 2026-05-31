import type { Metadata } from "next";
import { StageLabel } from "@/components/ui";
import {
  listPendingSignups,
  listClassroomsForPicker,
} from "@/lib/queries/admin-signups";
import { SignupRow } from "./_components/signup-row";

export const metadata: Metadata = { title: "Signups" };

async function safeList() {
  try {
    const [signups, classrooms] = await Promise.all([
      listPendingSignups(),
      listClassroomsForPicker(),
    ]);
    return { signups, classrooms };
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[admin/signups/list]", err);
    }
    return { signups: [], classrooms: [] };
  }
}

export default async function AdminSignupsPage() {
  const { signups, classrooms } = await safeList();

  return (
    <>
      <StageLabel className="mb-5">Signups</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        Pending approval.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        New self-signups land here after they confirm their email. Grant
        direct access for one-off users, or assign them under a teacher&apos;s
        classroom. Rejected accounts can sign up again later.
      </p>

      {signups.length === 0 ? (
        <p className="font-serif italic text-[16px] text-ink-mute">
          No one is waiting. New requests will show up here.
        </p>
      ) : (
        <ul>
          {signups.map((s) => (
            <SignupRow
              key={s.id}
              id={s.id}
              name={s.name}
              email={s.email}
              requestedAt={s.requestedAt}
              classrooms={classrooms}
            />
          ))}
        </ul>
      )}
    </>
  );
}
