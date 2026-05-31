import type { Metadata } from "next";
import Link from "next/link";
import { CCard, CEyebrow } from "@/components/clinical/primitives";

export const metadata: Metadata = { title: "Pending approval" };

type SearchParams = { email?: string | string[] };

export default async function SignupPendingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : undefined;

  return (
    <>
      <div className="text-center mb-8">
        <CEyebrow className="mb-3 justify-center inline-block">
          Request received
        </CEyebrow>
        <h1 className="font-serif text-[36px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
          Pending approval.
        </h1>
        <p className="text-[15.5px] text-clinical-muted-fg">
          Your account{" "}
          {email ? (
            <span className="font-medium text-clinical-fg">({email})</span>
          ) : null}{" "}
          has been created and is now waiting for an admin to approve it.
        </p>
      </div>

      <CCard className="p-6 md:p-7">
        <p className="text-[14px] leading-relaxed text-clinical-muted-fg">
          You&apos;ll get an email as soon as you&apos;re approved — then you can
          sign in with the password you just chose. No need to do anything until
          then.
        </p>
        <p className="mt-4 text-[13px] text-clinical-muted-fg">
          Already approved?{" "}
          <Link
            href="/login"
            className="font-medium text-clinical-primary hover:text-clinical-fg"
          >
            Sign in
          </Link>
          .
        </p>
      </CCard>
    </>
  );
}
