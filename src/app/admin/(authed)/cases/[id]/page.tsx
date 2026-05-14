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
    quizQuestionCount: data.case.quizQuestionCount,
    levels: data.levels.map((l) => ({
      level: l.level,
      treatmentEnabled: l.treatmentEnabled,
    })),
    stages: clientStages,
  };

  return (
    <>
      <div className="max-w-[1180px] mx-auto px-6 md:px-12 pt-8 flex justify-end items-center gap-6">
        <a
          href={`/admin/cases/${id}/preview`}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute hover:text-accent transition-colors"
        >
          Preview case →
        </a>
        <DeleteCaseButton id={id} title={data.case.title} />
      </div>
      <CaseEditor
        mode="edit"
        initialDraft={initialDraft}
        caseId={id}
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
