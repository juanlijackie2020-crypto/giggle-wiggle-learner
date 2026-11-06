import { oreDeposits } from "./expansion";
import level from "../data/level1.json";
import {
  generateQuestions,
  randomSeed,
  legacySet,
  validQuestionSet,
  fingerprint,
  difficulties,
  type Difficulty,
  type QuestionSet,
} from "./questions";
import { emptyTasks, progressTask, tasks, type TaskProgress } from "./tasks";
export const outfits = [
  "explorer",
  "hoodie",
  "ranger",
  "raincoat",
  "bunny",
  "overalls",
] as const;
export const outfitNames = [
  "小小探险家",
  "舒适卫衣",
  "森林游侠",
  "彩虹雨衣",
  "兔耳连帽装",
  "工匠背带装",
];
export const shirtNames = [
  "天空蓝",
  "森林绿",
  "琥珀黄",
  "珊瑚红",
  "葡萄紫",
  "湖水青",
  "樱花粉",
  "奶油白",
];
export const palettes = [
  { name: "蓝天探险", shirt: "#329ce8", pants: "#294578", accent: "#ffcd52" },
  { name: "森林守护", shirt: "#31894d", pants: "#314e3c", accent: "#ffe191" },
  { name: "琥珀阳光", shirt: "#ffc247", pants: "#654431", accent: "#ffffff" },
  { name: "珊瑚假日", shirt: "#ef6860", pants: "#325e78", accent: "#ffe4a0" },
  { name: "星光梦境", shirt: "#9857ce", pants: "#453b6a", accent: "#8be8e3" },
  { name: "湖畔微风", shirt: "#22b6ac", pants: "#265263", accent: "#fff1c6" },
];
export type Outfit = (typeof outfits)[number];
export type Appearance = {
  skin: string;
  shirt: string;
  outfit: Outfit;
  pants?: string;
  accent?: string;
};
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
  version: 2;
  equipment: { pickaxe: boolean; backpack: boolean };
  mined: string[];
  questionSet: QuestionSet;
  history: QuestionSet[];
  archivedTotals: { attempts: number; correct: number; hints: number };
  difficulty: Difficulty;
  tasks: TaskProgress;
  voiceVolume: number;
  effectsVolume: number;
  lowQuality: boolean;
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
export const shirts = [
  "#329ce8",
  "#31894d",
  "#ffc247",
  "#ef6860",
  "#9857ce",
  "#22b6ac",
  "#f59bc1",
  "#fff3d6",
];
const legacyShirts = ["#e49c49", "#528e95", "#b57eae", "#74945a", "#607cc2"];
export const initialSave = (seed = randomSeed()): Save => ({
  version: 2,
  equipment: { pickaxe: true, backpack: true },
  mined: [],
  questionSet: generateQuestions(seed),
  history: [],
  archivedTotals: { attempts: 0, correct: 0, hints: 0 },
  difficulty: "standard",
  tasks: emptyTasks(),
  voiceVolume: 0.8,
  effectsVolume: 0.65,
  lowQuality: false,
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
  | { type: "equip"; item: "pickaxe" | "backpack" }
  | { type: "mine"; id: string }
  | { type: "appearance"; value: Appearance }
  | { type: "collect"; kind: "wood" | "amber"; id: string }
  | { type: "answer"; id: string; answer: number }
  | { type: "open" }
  | { type: "checkpoint"; index: number }
  | { type: "mute" }
  | { type: "restart"; seed?: number }
  | { type: "difficulty"; value: Difficulty }
  | { type: "volume"; channel: "voiceVolume" | "effectsVolume"; value: number }
  | { type: "quality" }
  | { type: "task-select"; id: string }
  | { type: "task-abandon" }
  | { type: "task-step"; task: string; step: string }
  | { type: "parkour-reset" };
export function transition(s: Save, a: Action): Save {
  if (a.type === "equip")
    return {
      ...s,
      equipment: { ...s.equipment, [a.item]: !s.equipment[a.item] },
    };
  if (a.type === "mine")
    return !s.equipment.pickaxe ||
      s.mined.includes(a.id) ||
      !oreDeposits.some((o) => o.id === a.id)
      ? s
      : { ...s, mined: [...s.mined, a.id] };
  if (a.type === "mute") return { ...s, muted: !s.muted };
  if (a.type === "difficulty")
    return Object.hasOwn(difficulties, a.value)
      ? { ...s, difficulty: a.value }
      : s;
  if (a.type === "volume")
    return Number.isFinite(a.value)
      ? { ...s, [a.channel]: Math.max(0, Math.min(1, a.value)) }
      : s;
  if (a.type === "quality") return { ...s, lowQuality: !s.lowQuality };
  if (a.type === "task-select")
    return tasks.some((t) => t.id === a.id)
      ? { ...s, tasks: { ...s.tasks, active: a.id } }
      : s;
  if (a.type === "task-abandon")
    return {
      ...s,
      tasks: {
        ...s.tasks,
        active: null,
        steps: {
          ...s.tasks.steps,
          ...(s.tasks.active ? { [s.tasks.active]: [] } : {}),
        },
      },
    };
  if (a.type === "task-step") {
    const next = progressTask(s.tasks, a.task, a.step);
    return next === s.tasks ? s : { ...s, tasks: next };
  }
  if (a.type === "parkour-reset")
    return {
      ...s,
      tasks: { ...s.tasks, steps: { ...s.tasks.steps, parkour: [] } },
    };
  if (a.type === "restart") {
    const history = [...s.history, s.questionSet];
    const removed = history.slice(0, Math.max(0, history.length - 100));
    const stats = { ...s.questionStats },
      totals = { ...s.archivedTotals };
    for (const set of removed)
      for (const q of set.questions) {
        const r = stats[q.id];
        if (r) {
          totals.attempts += r.attemptCount;
          totals.correct += r.correctCount;
          totals.hints += r.hintCount;
          delete stats[q.id];
        }
      }
    return {
      ...s,
      wood: [],
      amber: [],
      solved: [],
      completed: false,
      checkpoint: 0,
      questionSet: generateQuestions(
        a.seed ?? randomSeed(),
        s.difficulty,
        s.questionSet.questions.map(fingerprint),
        s.questionSet.runId + 1,
      ),
      history: history.slice(-100),
      archivedTotals: totals,
      tasks: { ...emptyTasks(), badges: s.tasks.badges },
      questionStats: Object.fromEntries(
        Object.entries(stats).map(([id, r]) => [id, { ...r, runErrors: 0 }]),
      ),
    };
  }
  if (a.type === "appearance") return { ...s, appearance: a.value };
  if (a.type === "collect") {
    if (a.kind === "amber" && !s.equipment.pickaxe) return s;
    const max = a.kind === "wood" ? 3 : 5;
    if (
      !Array.from({ length: max }, (_, i) => `${a.kind}-${i}`).includes(a.id) ||
      s[a.kind].includes(a.id)
    )
      return s;
    return { ...s, [a.kind]: [...s[a.kind], a.id] };
  }
  if (a.type === "answer") {
    const q = s.questionSet.questions[s.solved.length];
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
      s.solved.length !== s.questionSet.questions.length
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
    if (!x || ![1, 2].includes(x.version)) return empty;
    const questionSet =
      x.version === 1
        ? legacySet()
        : validQuestionSet(x.questionSet)
          ? x.questionSet
          : empty.questionSet;
    const history: QuestionSet[] = Array.isArray(x.history)
      ? x.history.filter(validQuestionSet).slice(-100)
      : [];
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
      for (const q of questionSet.questions) {
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
    for (const q of [
      ...history.flatMap((set) => set.questions),
      ...questionSet.questions,
    ]) {
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
    const hex = (v: unknown) =>
      typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
    const appearance = {
      ...(hex(x.appearance?.pants) ? { pants: x.appearance.pants } : {}),
      ...(hex(x.appearance?.accent) ? { accent: x.appearance.accent } : {}),
      skin: skins.includes(x.appearance?.skin)
        ? x.appearance.skin
        : empty.appearance.skin,
      shirt: [...shirts, ...legacyShirts].includes(x.appearance?.shirt)
        ? x.appearance.shirt
        : empty.appearance.shirt,
      outfit: outfits.includes(x.appearance?.outfit)
        ? x.appearance.outfit
        : empty.appearance.outfit,
    };
    return {
      ...empty,
      equipment: {
        pickaxe: x.equipment?.pickaxe !== false,
        backpack: x.equipment?.backpack !== false,
      },
      mined: oreDeposits
        .filter((o) => Array.isArray(x.mined) && x.mined.includes(o.id))
        .map((o) => o.id),
      questionSet,
      history,
      archivedTotals: {
        attempts: count(x.archivedTotals?.attempts),
        correct: count(x.archivedTotals?.correct),
        hints: count(x.archivedTotals?.hints),
      },
      difficulty: Object.hasOwn(difficulties, x.difficulty)
        ? x.difficulty
        : "standard",
      voiceVolume:
        typeof x.voiceVolume === "number" && Number.isFinite(x.voiceVolume)
          ? Math.max(0, Math.min(1, x.voiceVolume))
          : 0.8,
      effectsVolume:
        typeof x.effectsVolume === "number" && Number.isFinite(x.effectsVolume)
          ? Math.max(0, Math.min(1, x.effectsVolume))
          : 0.65,
      lowQuality: x.lowQuality === true,
      tasks: {
        active: tasks.some((t) => t.id === x.tasks?.active)
          ? x.tasks.active
          : null,
        steps: Object.fromEntries(
          tasks
            .map((t) => [
              t.id,
              t.steps.filter(
                (step, i) =>
                  Array.isArray(x.tasks?.steps?.[t.id]) &&
                  x.tasks.steps[t.id].includes(step) &&
                  (t.id !== "parkour" ||
                    t.steps
                      .slice(0, i)
                      .every((prior) => x.tasks.steps[t.id].includes(prior))),
              ),
            ])
            .filter(([, steps]) => (steps as string[]).length),
        ),
        badges: tasks
          .filter(
            (t) =>
              Array.isArray(x.tasks?.badges) && x.tasks.badges.includes(t.id),
          )
          .map((t) => t.id),
      },
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
