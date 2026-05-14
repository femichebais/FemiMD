import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, isNull, asc, inArray } from "drizzle-orm";
import { StageLabel } from "@/components/ui";
import { db } from "@/db/client";
import { quizzes, quizQuestions, quizChoices, cases } from "@/db/schema";
import { QuizMetaEditor } from "./_components/quiz-meta-editor";
import { QuestionList } from "./_components/question-list";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [quizRow] = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      topic: quizzes.topic,
      caseId: quizzes.caseId,
      scope: quizzes.scope,
      caseTitle: cases.title,
    })
    .from(quizzes)
    .leftJoin(cases, eq(cases.id, quizzes.caseId))
    .where(and(eq(quizzes.id, id), isNull(quizzes.deletedAt)))
    .limit(1);

  if (!quizRow) notFound();

  const questionRows = await db
    .select()
    .from(quizQuestions)
    .where(
      and(eq(quizQuestions.quizId, id), isNull(quizQuestions.deletedAt))
    )
    .orderBy(asc(quizQuestions.createdAt));

  const choiceRows =
    questionRows.length === 0
      ? []
      : await db
          .select()
          .from(quizChoices)
          .where(
            inArray(
              quizChoices.questionId,
              questionRows.map((q) => q.id)
            )
          )
          .orderBy(asc(quizChoices.displayOrder));

  const questions = questionRows.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    choices: choiceRows
      .filter((c) => c.questionId === q.id)
      .map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })),
  }));

  return (
    <>
      <div className="flex items-baseline justify-between mb-3">
        <StageLabel>Quiz</StageLabel>
        <Link
          href="/admin/quizzes"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-ink"
        >
          ← All quizzes
        </Link>
      </div>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-2">
        {quizRow.title}
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        {quizRow.caseTitle ? (
          <>
            {quizRow.scope === "pre" ? "Pre-test" : "Post-test"} for{" "}
            <strong className="not-italic font-medium">
              {quizRow.caseTitle}
            </strong>
          </>
        ) : (
          <>Standalone quiz{quizRow.topic ? ` · ${quizRow.topic}` : ""}</>
        )}
      </p>

      <QuizMetaEditor
        quizId={id}
        initial={{ title: quizRow.title, topic: quizRow.topic ?? "" }}
      />

      <StageLabel className="mb-5">Questions</StageLabel>
      <QuestionList quizId={id} questions={questions} />
    </>
  );
}
