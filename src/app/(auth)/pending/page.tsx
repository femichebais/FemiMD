import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CCard, CEyebrow } from "@/components/clinical/primitives";
import { currentUser } from "@/lib/auth/current-user";
import { db } from "@/db/client";
import { pendingSignups } from "@/db/schema";
import { signOutAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Awaiting approval" };

export default async function PendingPage() {
  const session = await currentUser();
  // Middleware already gates this — but defense in depth in case the
  // matcher changes later.
  if (!session) redirect("/login");
  if (session.role !== "pending") redirect("/");

  const [row] = await db
    .select({ name: pendingSignups.name, email: pendingSignups.email })
    .from(pendingSignups)
    .where(eq(pendingSignups.id, session.user.id))
    .limit(1);

  const name = row?.name ?? "there";

  return (
    <>
      <div className="text-center mb-8">
        <CEyebrow className="mb-3 justify-center inline-block">
          Approval pending
        </CEyebrow>
        <h1 className="font-serif text-[36px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
          Thanks, {name}.
        </h1>
        <p className="text-[15.5px] text-clinical-muted-fg">
          Your account is awaiting admin approval. We&apos;ll email{" "}
          {row?.email ? (
            <span className="font-medium text-clinical-fg">{row.email}</span>
          ) : (
            "you"
          )}{" "}
          when you&apos;re in.
        </p>
      </div>

      <CCard className="p-6 md:p-7">
        <p className="text-[14px] leading-relaxed text-clinical-muted-fg">
          This usually takes less than a day. You don&apos;t need to do
          anything else — once you&apos;re approved, sign in and you&apos;ll
          land on the case library.
        </p>

        <form action={signOutAction} className="mt-6">
          <button
            type="submit"
            className="text-[13px] font-medium text-clinical-primary hover:text-clinical-fg transition-colors"
          >
            Sign out
          </button>
        </form>
      </CCard>
    </>
  );
}
