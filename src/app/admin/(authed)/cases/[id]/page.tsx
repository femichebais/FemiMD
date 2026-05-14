import { notFound } from "next/navigation";
import { getEditorData } from "@/lib/queries/cases";
import { CaseEditor } from "../_components/case-editor";
import type { ClientCase, ClientStage } from "../_components/draft-reducer";
import { DeleteCaseButton } from "./delete-case-button";

interface EditCasePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCasePage({ params }: EditCasePageProps) {
  const { id } = await params;

  const data = await getEditorData(id);
  if (!data) notFound();

  // Map DB rows to ClientCase. We assign a deterministic tempId per server
  // id so the reducer's targeting (which uses tempIds) translates back to
  // real ids when the update action runs.
  const stageIdMap: Record<string, string> = {};
  const choiceIdMap: Record<string, string> = {};

  const clientStages: ClientStage[] = data.stages.map((s) => {
    const tempId = `s:${s.id}`;
    stageIdMap[tempId] = s.id;
    const stageChoices = data.choices.filter((c) => c.stageId === s.id);
    return {
      tempId,
      type: s.type,
      prompt: s.prompt,
      maxPicks: s.maxPicks,
      imageUrl: s.imageUrl,
      choices: stageChoices.map((c) => {
        const choiceTempId = `c:${c.id}`;
        choiceIdMap[choiceTempId] = c.id;
        return {
          tempId: choiceTempId,
          text: c.text,
          score: c.score,
          isCorrect: c.isCorrect,
          responseText: c.responseText ?? "",
        };
      }),
    };
  });

  const initialDraft: ClientCase = {
    title: data.case.title,
    description: data.case.description ?? "",
    scenarioIntro: data.case.scenarioIntro ?? "",
    linkedDiagnosisSlug: data.case.linkedDiagnosisSlug ?? "",
    clinicalTakeaway: data.case.clinicalTakeaway ?? "",
    quizQuestionCount: data.case.quizQuestionCount,
    levels: data.levels.map((l) => ({
      level: l.level,
      treatmentEnabled: l.treatmentEnabled,
    })),
    stages: clientStages,
  };

  return (
    <>
      <div className="max-w-[1180px] mx-auto px-6 md:px-12 pt-8 flex justify-end items-center gap-5">
        {/* Preview gets the visible-button treatment because it's an
            actually useful action admins reach for. Delete stays a quiet
            destructive link separated by a vertical rule. */}
        <a
          href={`/admin/cases/${id}/preview`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-rule-strong rounded-[2px] font-sans text-[13px] text-ink hover:border-accent hover:text-accent transition-colors"
        >
          <span
            aria-hidden
            className="inline-block w-0 h-0 border-y-[5px] border-y-transparent border-l-[7px] border-l-current"
          />
          Preview as student
        </a>
        <span aria-hidden className="h-5 w-px bg-rule" />
        <DeleteCaseButton id={id} title={data.case.title} />
      </div>
      <CaseEditor
        mode="edit"
        initialDraft={initialDraft}
        caseId={id}
        initialPublishedAt={data.case.publishedAt}
        meta={{
          stageCount: data.stages.length,
          attemptCount: data.attemptCount,
          createdAt: data.case.createdAt,
        }}
        serverIdMap={{ stages: stageIdMap, choices: choiceIdMap }}
      />
    </>
  );
}
