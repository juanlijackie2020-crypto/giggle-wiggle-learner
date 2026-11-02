import level from "../data/level1.json";
export type Outfit = "explorer" | "hoodie" | "ranger";
export type Appearance = { skin: string; shirt: string; outfit: Outfit };
export type QuestionProgress = {
  attemptCount: number;
  hintCount: number;
  correctCount: number;
  firstTryCorrect: boolean | null;
  completedAt: string | null;
  runErrors: number;
};
export const emptyProgress = (): QuestionProgress => ({
  attemptCount: 0,
  hintCount: 0,
  correctCount: 0,
  firstTryCorrect: null,
  completedAt: null,
  runErrors: 0,
});
export const REWARD_ID = level.reward.id;
export type Save = {
  version: 1;
  appearance: Appearance;
  wood: string[];
  amber: string[];
  solved: string[];
  completed: boolean;
  woodBlocks: number;
  checkpoint: number;
  rewardClaims: string[];
  everCompleted: boolean;
  questionStats: Record<string, QuestionProgress>;
  muted: boolean;
};
export const SAVE_KEY = "qianqian-forest-v1";
export const skins = ["#f4c99f", "#dca477", "#ac754f", "#714e3c"];
export const shirts = ["#e49c49", "#528e95", "#b57eae", "#74945a", "#607cc2"];
export const initialSave = (): Save => ({
  version: 1,
  appearance: { skin: skins[0], shirt: shirts[0], outfit: "explorer" },
  wood: [],
  amber: [],
  solved: [],
  completed: false,
  woodBlocks: 0,
  checkpoint: 0,
  rewardClaims: [],
  everCompleted: false,
  questionStats: {},
  muted: false,
});
export const readyForChest = (s: Save) =>
  s.wood.length === 3 && s.amber.length === 5;
export type Action =
  | { type: "appearance"; value: Appearance }
  | { type: "collect"; kind: "wood" | "amber"; id: string }
  | { type: "answer"; id: string; answer: number }
  | { type: "open" }
  | { type: "checkpoint"; index: number }
  | { type: "mute" }
  | { type: "restart" };
export function transition(s: Save, a: Action): Save {
  if (a.type === "mute") return { ...s, muted: !s.muted };
  if (a.type === "restart")
    return {
      ...initialSave(),
      appearance: s.appearance,
      muted: s.muted,
      rewardClaims: s.rewardClaims,
      everCompleted: s.everCompleted,
      woodBlocks: s.woodBlocks,
      questionStats: Object.fromEntries(
        Object.entries(s.questionStats).map(([id, record]) => [
          id,
          { ...record, runErrors: 0 },
        ]),
      ),
    };
  if (a.type === "appearance") return { ...s, appearance: a.value };
  if (a.type === "collect") {
    const max = a.kind === "wood" ? 3 : 5;
    if (
      !Array.from({ length: max }, (_, i) => `${a.kind}-${i}`).includes(a.id) ||
      s[a.kind].includes(a.id)
    )
      return s;
    return { ...s, [a.kind]: [...s[a.kind], a.id] };
  }
  if (a.type === "answer") {
    const q = level.questions[s.solved.length];
    if (
      !readyForChest(s) ||
      !q ||
      q.id !== a.id ||
      !q.options.includes(a.answer)
    )
      return s;
    const prior = s.questionStats[q.id] ?? emptyProgress(),
      correct = a.answer === q.answer;
    const record = {
      ...prior,
      attemptCount: prior.attemptCount + 1,
      hintCount: prior.hintCount + (correct ? 0 : 1),
      correctCount: prior.correctCount + (correct ? 1 : 0),
      firstTryCorrect: prior.firstTryCorrect ?? correct,
      completedAt: correct
        ? (prior.completedAt ?? new Date().toISOString())
        : prior.completedAt,
      runErrors: prior.runErrors + (correct ? 0 : 1),
    };
    return {
      ...s,
      solved: correct ? [...s.solved, q.id] : s.solved,
      questionStats: { ...s.questionStats, [q.id]: record },
    };
  }
  if (a.type === "open") {
    if (
      s.completed ||
      !readyForChest(s) ||
      s.solved.length !== level.questions.length
    )
      return s;
    return {
      ...s,
      completed: true,
      everCompleted: true,
      rewardClaims: s.rewardClaims.includes(REWARD_ID)
        ? s.rewardClaims
        : [...s.rewardClaims, REWARD_ID],
      woodBlocks: level.reward.quantity,
    };
  }
  if (
    a.type === "checkpoint" &&
    a.index >= 0 &&
    a.index <= 2 &&
    Number.isInteger(a.index)
  )
    return { ...s, checkpoint: Math.max(s.checkpoint, a.index) };
  return s;
}
export function parseSave(raw: string | null): Save {
  const empty = initialSave();
  if (!raw) return empty;
  try {
    const x = JSON.parse(raw);
    if (x.version !== 1) return empty;
    const clean = (kind: "wood" | "amber", count: number): string[] =>
      Array.isArray(x[kind])
        ? Array.from(
            new Set<string>(
              x[kind].filter(
                (id: unknown) =>
                  typeof id === "string" &&
                  Array.from(
                    { length: count },
                    (_, i) => `${kind}-${i}`,
                  ).includes(id),
              ),
            ),
          )
        : [];
    const wood = clean("wood", 3),
      amber = clean("amber", 5);
    const solved: string[] = [];
    if (wood.length === 3 && amber.length === 5)
      for (const q of level.questions) {
        if (!Array.isArray(x.solved) || !x.solved.includes(q.id)) break;
        solved.push(q.id);
      }
    const completed = x.completed === true && solved.length === 3;
    const claimed =
      (Array.isArray(x.rewardClaims) && x.rewardClaims.includes(REWARD_ID)) ||
      completed;
    const questionStats: Record<string, QuestionProgress> = {};
    const count = (n: unknown) =>
      typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 1000000
        ? n
        : 0;
    for (const q of level.questions) {
      const r = x.questionStats?.[q.id];
      if (!r || typeof r !== "object") continue;
      const attemptCount = count(r.attemptCount);
      questionStats[q.id] = {
        attemptCount,
        hintCount: Math.min(count(r.hintCount), attemptCount),
        correctCount: Math.min(count(r.correctCount), attemptCount),
        firstTryCorrect:
          typeof r.firstTryCorrect === "boolean" ? r.firstTryCorrect : null,
        completedAt:
          typeof r.completedAt === "string" &&
          Number.isFinite(Date.parse(r.completedAt))
            ? r.completedAt
            : null,
        runErrors: Math.min(count(r.runErrors), attemptCount),
      };
    }
    const appearance = {
      skin: skins.includes(x.appearance?.skin)
        ? x.appearance.skin
        : empty.appearance.skin,
      shirt: shirts.includes(x.appearance?.shirt)
        ? x.appearance.shirt
        : empty.appearance.shirt,
      outfit: ["explorer", "hoodie", "ranger"].includes(x.appearance?.outfit)
        ? x.appearance.outfit
        : empty.appearance.outfit,
    };
    return {
      ...empty,
      appearance,
      wood,
      amber,
      solved,
      completed,
      woodBlocks: claimed ? level.reward.quantity : 0,
      rewardClaims: claimed ? [REWARD_ID] : [],
      everCompleted: claimed,
      questionStats,
      muted: x.muted === true,
      checkpoint: [0, 1, 2].includes(x.checkpoint) ? x.checkpoint : 0,
    };
  } catch {
    return empty;
  }
}
