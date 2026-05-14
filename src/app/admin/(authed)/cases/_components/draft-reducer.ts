import type {
  DraftCase,
  DraftStage,
  DraftChoice,
  Level,
  StageType,
} from "../actions";

// Client-only draft model. tempId is for stable React keys and for the
// reducer's targeting; it's stripped before sending to the server action.

export interface ClientChoice extends DraftChoice {
  tempId: string;
}

export interface ClientStage extends Omit<DraftStage, "choices"> {
  tempId: string;
  choices: ClientChoice[];
}

export interface ClientCase extends Omit<DraftCase, "stages"> {
  stages: ClientStage[];
}

export type DraftAction =
  | { type: "SET_TITLE"; value: string }
  | { type: "SET_DESCRIPTION"; value: string }
  | { type: "SET_SCENARIO"; value: string }
  | { type: "SET_LINKED_SLUG"; value: string }
  | { type: "SET_QUIZ_COUNT"; value: number }
  | { type: "TOGGLE_LEVEL"; level: Level }
  | { type: "TOGGLE_TREATMENT"; level: Level }
  | { type: "ADD_STAGE"; stageType: StageType }
  | { type: "REMOVE_STAGE"; stageId: string }
  | { type: "SET_STAGE_TYPE"; stageId: string; stageType: StageType }
  | { type: "SET_STAGE_PROMPT"; stageId: string; value: string }
  | { type: "SET_STAGE_MAX_PICKS"; stageId: string; value: number }
  | { type: "ADD_CHOICE"; stageId: string }
  | { type: "REMOVE_CHOICE"; stageId: string; choiceId: string }
  | { type: "SET_CHOICE_TEXT"; stageId: string; choiceId: string; value: string }
  | { type: "SET_CHOICE_SCORE"; stageId: string; choiceId: string; value: number }
  | { type: "SET_CHOICE_CORRECT"; stageId: string; choiceId: string; value: boolean }
  | {
      type: "SET_CHOICE_RESPONSE";
      stageId: string;
      choiceId: string;
      value: string;
    };

let tempIdSeq = 0;
function nextTempId(prefix: string): string {
  tempIdSeq += 1;
  return `${prefix}_${tempIdSeq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeChoice(): ClientChoice {
  return {
    tempId: nextTempId("choice"),
    text: "",
    score: 0,
    isCorrect: null,
    responseText: "",
  };
}

export function makeStage(stageType: StageType): ClientStage {
  return {
    tempId: nextTempId("stage"),
    type: stageType,
    prompt: "",
    maxPicks: 1,
    imageUrl: null,
    // Brief: stages typically have 4–6 choices; seed with 2 so the editor
    // doesn't feel empty but doesn't force noisy defaults either.
    choices: [makeChoice(), makeChoice()],
  };
}

export function emptyCase(): ClientCase {
  return {
    title: "",
    description: "",
    scenarioIntro: "",
    linkedDiagnosisSlug: "",
    quizQuestionCount: 10,
    levels: [],
    stages: [],
  };
}

// Binary-correct stages always score 1 for the correct answer / 0 otherwise.
// The editor hides the score column for these types — score is derived.
const BINARY_STAGES = new Set<StageType>(["diagnosis", "disposition"]);

function mapStage(
  state: ClientCase,
  stageId: string,
  fn: (s: ClientStage) => ClientStage
): ClientCase {
  return {
    ...state,
    stages: state.stages.map((s) => (s.tempId === stageId ? fn(s) : s)),
  };
}

function mapChoice(
  state: ClientCase,
  stageId: string,
  choiceId: string,
  fn: (c: ClientChoice) => ClientChoice
): ClientCase {
  return mapStage(state, stageId, (s) => ({
    ...s,
    choices: s.choices.map((c) => (c.tempId === choiceId ? fn(c) : c)),
  }));
}

export function draftReducer(
  state: ClientCase,
  action: DraftAction
): ClientCase {
  switch (action.type) {
    case "SET_TITLE":
      return { ...state, title: action.value };
    case "SET_DESCRIPTION":
      return { ...state, description: action.value };
    case "SET_SCENARIO":
      return { ...state, scenarioIntro: action.value };
    case "SET_LINKED_SLUG":
      return { ...state, linkedDiagnosisSlug: action.value };
    case "SET_QUIZ_COUNT":
      return { ...state, quizQuestionCount: Math.max(1, action.value) };

    case "TOGGLE_LEVEL": {
      const exists = state.levels.find((l) => l.level === action.level);
      const next = exists
        ? state.levels.filter((l) => l.level !== action.level)
        : [
            ...state.levels,
            { level: action.level, treatmentEnabled: false },
          ];
      return { ...state, levels: next };
    }

    case "TOGGLE_TREATMENT":
      return {
        ...state,
        levels: state.levels.map((l) =>
          l.level === action.level
            ? { ...l, treatmentEnabled: !l.treatmentEnabled }
            : l
        ),
      };

    case "ADD_STAGE":
      return {
        ...state,
        stages: [...state.stages, makeStage(action.stageType)],
      };

    case "REMOVE_STAGE":
      return {
        ...state,
        stages: state.stages.filter((s) => s.tempId !== action.stageId),
      };

    case "SET_STAGE_TYPE":
      return mapStage(state, action.stageId, (s) => {
        // Changing to a binary type clears scores; clearing isCorrect when
        // switching away keeps the data sane.
        const goingBinary = BINARY_STAGES.has(action.stageType);
        const wasBinary = BINARY_STAGES.has(s.type);
        return {
          ...s,
          type: action.stageType,
          maxPicks: goingBinary ? 1 : s.maxPicks,
          choices: s.choices.map((c) => ({
            ...c,
            score: goingBinary ? 0 : c.score,
            isCorrect: goingBinary
              ? c.isCorrect ?? false
              : wasBinary
                ? null
                : c.isCorrect,
          })),
        };
      });

    case "SET_STAGE_PROMPT":
      return mapStage(state, action.stageId, (s) => ({
        ...s,
        prompt: action.value,
      }));

    case "SET_STAGE_MAX_PICKS":
      return mapStage(state, action.stageId, (s) => ({
        ...s,
        maxPicks: Math.max(1, action.value),
      }));

    case "ADD_CHOICE":
      return mapStage(state, action.stageId, (s) => ({
        ...s,
        choices: [...s.choices, makeChoice()],
      }));

    case "REMOVE_CHOICE":
      return mapStage(state, action.stageId, (s) => ({
        ...s,
        // Disallow going below 2 choices; reducer ignores the action.
        choices:
          s.choices.length <= 2
            ? s.choices
            : s.choices.filter((c) => c.tempId !== action.choiceId),
      }));

    case "SET_CHOICE_TEXT":
      return mapChoice(state, action.stageId, action.choiceId, (c) => ({
        ...c,
        text: action.value,
      }));

    case "SET_CHOICE_SCORE":
      return mapChoice(state, action.stageId, action.choiceId, (c) => ({
        ...c,
        score: Math.max(0, action.value),
      }));

    case "SET_CHOICE_CORRECT": {
      // For binary stages, marking a choice correct unmarks all others.
      // For scored stages, multiple choices CAN be marked correct (treatment).
      const stage = state.stages.find((s) => s.tempId === action.stageId);
      if (!stage) return state;
      const isBinary = BINARY_STAGES.has(stage.type);
      if (!isBinary) {
        return mapChoice(state, action.stageId, action.choiceId, (c) => ({
          ...c,
          isCorrect: action.value,
        }));
      }
      return mapStage(state, action.stageId, (s) => ({
        ...s,
        choices: s.choices.map((c) => ({
          ...c,
          isCorrect: c.tempId === action.choiceId ? action.value : false,
        })),
      }));
    }

    case "SET_CHOICE_RESPONSE":
      return mapChoice(state, action.stageId, action.choiceId, (c) => ({
        ...c,
        responseText: action.value,
      }));

    default:
      return state;
  }
}

export function letterFor(i: number): string {
  if (i < 26) return String.fromCharCode(65 + i);
  return (
    String.fromCharCode(65 + Math.floor(i / 26) - 1) +
    String.fromCharCode(65 + (i % 26))
  );
}

export function clientCaseToDraft(c: ClientCase): DraftCase {
  return {
    title: c.title,
    description: c.description,
    scenarioIntro: c.scenarioIntro,
    linkedDiagnosisSlug: c.linkedDiagnosisSlug,
    quizQuestionCount: c.quizQuestionCount,
    levels: c.levels,
    stages: c.stages.map((s) => ({
      type: s.type,
      prompt: s.prompt,
      maxPicks: s.maxPicks,
      imageUrl: s.imageUrl,
      choices: s.choices.map((c) => ({
        text: c.text,
        score: c.score,
        isCorrect: c.isCorrect,
        responseText: c.responseText,
      })),
    })),
  };
}

export { BINARY_STAGES };
