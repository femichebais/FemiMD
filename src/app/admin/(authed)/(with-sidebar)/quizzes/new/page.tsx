import { isNull, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { cases } from "@/db/schema";
import { StageLabel } from "@/components/ui";
import { CreateQuizForm } from "./create-quiz-form";

async function safeCases() {
  try {
    return await db
      .select({ id: cases.id, title: cases.title })
      .from(cases)
      .where(isNull(cases.deletedAt))
      .orderBy(asc(cases.title));
  } catch {
    return [];
  }
}

export default async function NewQuizPage() {
  const casesList = await safeCases();
  return (
    <>
      <StageLabel className="mb-5">New quiz</StageLabel>
      <h1 className="font-serif text-[34px] leading-[1.15] tracking-[-0.01em] mb-3">
        Create a quiz.
      </h1>
      <p className="font-serif italic text-[16px] text-ink-mute mb-12">
        Standalone quizzes can be released to classrooms or used as
        building blocks for student-built quizzes by topic. Optionally
        attach to a case as its pre or post test.
      </p>
      <CreateQuizForm cases={casesList} />
    </>
  );
}
