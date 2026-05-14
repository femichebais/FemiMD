import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, isNull, and } from "drizzle-orm";
import { StageLabel } from "@/components/ui";
import { db } from "@/db/client";
import { cases } from "@/db/schema";
import { listQuestionsForBank } from "@/lib/queries/quiz";
import { QuizBank } from "./_components/quiz-bank";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizBankPage({ params }: PageProps) {
  const { id } = await params;

  const [theCase] = await db
    .select({
      id: cases.id,
      title: cases.title,
      quizQuestionCount: cases.quizQuestionCount,
    })
    .from(cases)
    .where(and(eq(cases.id, id), isNull(cases.deletedAt)))
    .limit(1);

  if (!theCase) notFound();

  const [pre, post] = await Promise.all([
    listQuestionsForBank(id, "pre"),
    listQuestionsForBank(id, "post"),
  ]);

  return (
    <main className="max-w-[900px] mx-auto px-6 md:px-12 py-10 md:py-14">
      <div className="flex items-center justify-between mb-3">
        <StageLabel>Quiz bank</StageLabel>
        <Link
          href={`/admin/cases/${id}`}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← Case editor
        </Link>
      </div>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        {theCase.title}
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Each session draws{" "}
        <strong className="not-italic font-medium">
          {theCase.quizQuestionCount}
        </strong>{" "}
        random questions from the pool. Authoring more questions than that
        gives every attempt a different mix.
      </p>

      <QuizBank
        caseId={id}
        initial={{ pre, post }}
        defaultQuizQuestionCount={theCase.quizQuestionCount}
      />
    </main>
  );
}
