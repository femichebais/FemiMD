import type { Metadata } from "next";
import Link from "next/link";
import { CCard, CEyebrow } from "@/components/clinical/primitives";

export const metadata: Metadata = { title: "Check your email" };

type SearchParams = { email?: string | string[] };

export default async function CheckEmailPage({
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
          Almost done
        </CEyebrow>
        <h1 className="font-serif text-[36px] md:text-[40px] leading-[1.05] tracking-[-0.025em] text-clinical-fg font-medium mb-2">
          Check your inbox.
        </h1>
        <p className="text-[15.5px] text-clinical-muted-fg">
          We sent a confirmation link to{" "}
          {email ? (
            <span className="font-medium text-clinical-fg">{email}</span>
          ) : (
            "your email"
          )}
          . Click it to finish creating your account.
        </p>
      </div>

      <CCard className="p-6 md:p-7">
        <p className="text-[14px] leading-relaxed text-clinical-muted-fg">
          After you confirm, an admin will review your request and approve
          access. You&apos;ll get an email when you&apos;re in.
        </p>
        <p className="mt-4 text-[13px] text-clinical-muted-fg">
          Didn&apos;t get the email? Check your spam folder, or wait a minute
          before trying{" "}
          <Link
            href="/signup"
            className="font-medium text-clinical-primary hover:text-clinical-fg"
          >
            again
          </Link>
          .
        </p>
      </CCard>
    </>
  );
}
