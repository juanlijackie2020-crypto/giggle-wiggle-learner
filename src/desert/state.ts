import rules from "../data/desert-math.json";
import {
  generateQuestions,
  fingerprint,
  randomSeed,
  validQuestionSet,
  type Difficulty,
  type QuestionSet,
} from "../game/questions";
import type { QuestionProgress } from "../game/state";
import { level } from "./maze";
export { rules };
export const GOLD_REWARD = level.reward.id;
export const desertTasks = [
  {
    id: "friends",
    name: "沙漠交朋友",
    badge: "沙漠友谊徽章",
    steps: ["camel", "fennec"],
    hint: "和骆驼、耳廓狐互相问好。",
  },
  {
    id: "discover",
    name: "遗迹发现家",
    badge: "遗迹发现徽章",
    steps: ["oasis", "sundial", "mural"],
    hint: "找到绿洲、日晷和神殿壁画，靠近按互动。",
  },
  {
    id: "tracks",
    name: "脚印小侦探",
    badge: "认路小能手",
    steps: ["track-1", "track-2", "track-3", "courtyard"],
    hint: "从迷宫东侧第一组脚印出发，依次找到三组脚印，再回中庭。",
  },
];
export type DesertProgress = {
  tablets: string[];
  broken: boolean;
  gate: boolean;
  checkpoint: number;
  visited: number[];
  explored: number[];
  questionSet: QuestionSet;
  difficulty: Difficulty;
  solved: string[];
  stats: Record<string, QuestionProgress>;
  history: { set: QuestionSet; stats: Record<string, QuestionProgress> }[];
  archived: { attempts: number; correct: number; hints: number };
  completed: boolean;
  claims: string[];
  mined: string[];
  scarf: boolean;
  task: string | null;
  steps: Record<string, string[]>;
  badges: string[];
};
const blank = (): QuestionProgress => ({
  attemptCount: 0,
  hintCount: 0,
  correctCount: 0,
  firstTryCorrect: null,
  completedAt: null,
  runErrors: 0,
});
export const initialDesert = (seed = randomSeed()): DesertProgress => ({
  tablets: [],
  broken: false,
  gate: false,
  checkpoint: 0,
  visited: [0],
  explored: [],
  questionSet: generateQuestions(seed, "standard", [], 0, rules),
  difficulty: "standard",
  solved: [],
  stats: {},
  history: [],
  archived: { attempts: 0, correct: 0, hints: 0 },
  completed: false,
  claims: [],
  mined: [],
  scarf: true,
  task: null,
  steps: { friends: [], discover: [], tracks: [] },
  badges: [],
});
export type DesertAction =
  | { type: "tablet"; id: string }
  | { type: "break" }
  | { type: "gate" }
  | { type: "mine"; id: string }
  | { type: "checkpoint"; index: number }
  | { type: "explore"; cell: number }
  | { type: "answer"; id: string; answer: number }
  | { type: "claim" }
  | { type: "restart"; seed?: number }
  | { type: "difficulty"; value: Difficulty }
  | { type: "scarf" }
  | { type: "task"; id: string }
  | { type: "abandon" }
  | { type: "step"; id: string };
export function desertTransition(
  s: DesertProgress,
  a: DesertAction,
  pickaxe = true,
): DesertProgress {
  switch (a.type) {
    case "tablet":
      return !level.tablets.some((t) => t.id === a.id) ||
        s.tablets.includes(a.id) ||
        (a.id === "tablet-1" && !s.broken)
        ? s
        : { ...s, tablets: [...s.tablets, a.id] };
    case "break":
      return pickaxe ? { ...s, broken: true } : s;
    case "gate":
      return s.tablets.length === 3 ? { ...s, gate: true } : s;
    case "mine":
      return pickaxe &&
        level.ores.some((o) => o.id === a.id) &&
        !s.mined.includes(a.id)
        ? { ...s, mined: [...s.mined, a.id] }
        : s;
    case "checkpoint":
      return [0, 1, 2].includes(a.index)
        ? {
            ...s,
            checkpoint: a.index,
            visited: [...new Set([...s.visited, a.index])],
          }
        : s;
    case "explore":
      return Number.isInteger(a.cell) &&
        a.cell >= 0 &&
        a.cell < 49 &&
        !s.explored.includes(a.cell)
        ? { ...s, explored: [...s.explored, a.cell] }
        : s;
    case "difficulty":
      return Object.hasOwn(rules.difficulties, a.value)
        ? { ...s, difficulty: a.value }
        : s;
    case "scarf":
      return { ...s, scarf: !s.scarf };
    case "task":
      return desertTasks.some((t) => t.id === a.id) ? { ...s, task: a.id } : s;
    case "abandon":
      return {
        ...s,
        task: null,
        steps: { ...s.steps, ...(s.task ? { [s.task]: [] } : {}) },
      };
    case "step": {
      const task = desertTasks.find((t) => t.id === s.task),
        steps = s.steps[s.task ?? ""] ?? [];
      if (
        !task ||
        !task.steps.includes(a.id) ||
        steps.includes(a.id) ||
        (task.id === "tracks" && task.steps[steps.length] !== a.id)
      )
        return s;
      const next = [...steps, a.id];
      return {
        ...s,
        steps: { ...s.steps, [task.id]: next },
        badges:
          next.length === task.steps.length
            ? [...new Set([...s.badges, task.id])]
            : s.badges,
      };
    }
    case "answer": {
      const q = s.questionSet.questions[s.solved.length];
      if (
        !s.gate ||
        s.tablets.length !== 3 ||
        !q ||
        q.id !== a.id ||
        !q.options.includes(a.answer)
      )
        return s;
      const r = s.stats[q.id] ?? blank(),
        correct = q.answer === a.answer;
      return {
        ...s,
        solved: correct ? [...s.solved, q.id] : s.solved,
        stats: {
          ...s.stats,
          [q.id]: {
            ...r,
            attemptCount: r.attemptCount + 1,
            hintCount: r.hintCount + (correct ? 0 : 1),
            correctCount: r.correctCount + (correct ? 1 : 0),
            firstTryCorrect: r.firstTryCorrect ?? correct,
            completedAt: correct ? new Date().toISOString() : r.completedAt,
            runErrors: r.runErrors + (correct ? 0 : 1),
          },
        },
      };
    }
    case "claim":
      return s.gate && s.tablets.length === 3 && s.solved.length === 3
        ? {
            ...s,
            completed: true,
            claims: [...new Set([...s.claims, GOLD_REWARD])],
          }
        : s;
    case "restart": {
      const history = [...s.history, { set: s.questionSet, stats: s.stats }],
        archived = { ...s.archived };
      for (const h of history.slice(0, -50))
        for (const r of Object.values(h.stats)) {
          archived.attempts += r.attemptCount;
          archived.correct += r.correctCount;
          archived.hints += r.hintCount;
        }
      return {
        ...initialDesert(a.seed),
        difficulty: s.difficulty,
        scarf: s.scarf,
        claims: s.claims,
        mined: s.mined,
        badges: s.badges,
        history: history.slice(-50),
        archived,
        questionSet: generateQuestions(
          a.seed ?? randomSeed(),
          s.difficulty,
          s.questionSet.questions.map(fingerprint),
          s.questionSet.runId + 1,
          rules,
        ),
      };
    }
  }
}
export function parseDesert(value: unknown): DesertProgress {
  const e = initialDesert();
  if (!value || typeof value !== "object") return e;
  const x = value as Partial<DesertProgress>;
  const ids = (v: unknown, valid: string[]) =>
    Array.isArray(v) ? valid.filter((id) => v.includes(id)) : [];
  const ints = (v: unknown, max: number) =>
    Array.isArray(v)
      ? [
          ...new Set(
            v.filter(
              (n): n is number => Number.isInteger(n) && n >= 0 && n < max,
            ),
          ),
        ]
      : [];
  const set =
    validQuestionSet(x.questionSet, rules) &&
    x.questionSet.difficulty !== "legacy"
      ? x.questionSet
      : e.questionSet;
  const tablets = ids(
    x.tablets,
    level.tablets
      .filter((t) => t.id !== "tablet-1" || x.broken === true)
      .map((t) => t.id),
  );
  const gate = tablets.length === 3 && x.gate === true,
    solved: string[] = [];
  if (gate)
    for (const q of set.questions) {
      if (!x.solved?.includes(q.id)) break;
      solved.push(q.id);
    }
  const num = (n: unknown) =>
    typeof n === "number" && Number.isSafeInteger(n) && n >= 0
      ? Math.min(n, 1000000)
      : 0;
  function stats(v: unknown, q: QuestionSet): Record<string, QuestionProgress> {
    const out: Record<string, QuestionProgress> = {};
    if (!v || typeof v !== "object") return out;
    for (const question of q.questions) {
      const r = (v as Record<string, QuestionProgress>)[question.id];
      if (!r || typeof r !== "object") continue;
      const attempts = num(r.attemptCount);
      out[question.id] = {
        attemptCount: attempts,
        hintCount: Math.min(attempts, num(r.hintCount)),
        correctCount: Math.min(attempts, num(r.correctCount)),
        runErrors: Math.min(attempts, num(r.runErrors)),
        firstTryCorrect:
          typeof r.firstTryCorrect === "boolean" ? r.firstTryCorrect : null,
        completedAt:
          typeof r.completedAt === "string" &&
          Number.isFinite(Date.parse(r.completedAt))
            ? r.completedAt
            : null,
      };
    }
    return out;
  }
  const steps: Record<string, string[]> = {};
  for (const t of desertTasks) {
    const saved = ids(x.steps?.[t.id], t.steps);
    steps[t.id] =
      t.id === "tracks"
        ? t.steps.slice(
            0,
            t.steps.findIndex((s) => !saved.includes(s)) < 0
              ? t.steps.length
              : t.steps.findIndex((s) => !saved.includes(s)),
          )
        : saved;
  }
  const visited = ints(x.visited, 3);
  if (!visited.includes(0)) visited.unshift(0);
  return {
    ...e,
    tablets,
    broken: x.broken === true,
    gate,
    solved,
    completed: solved.length === 3 && x.completed === true,
    claims:
      solved.length === 3 && x.completed === true
        ? [GOLD_REWARD]
        : ids(x.claims, [GOLD_REWARD]),
    mined: ids(
      x.mined,
      level.ores.map((o) => o.id),
    ),
    scarf: x.scarf !== false,
    questionSet: set,
    stats: stats(x.stats, set),
    difficulty:
      x.difficulty && Object.hasOwn(rules.difficulties, x.difficulty)
        ? x.difficulty
        : "standard",
    history: Array.isArray(x.history)
      ? x.history
          .filter(
            (h) =>
              h &&
              validQuestionSet(h.set, rules) &&
              h.set.difficulty !== "legacy",
          )
          .slice(-50)
          .map((h) => ({ set: h.set, stats: stats(h.stats, h.set) }))
      : [],
    archived: {
      attempts: num(x.archived?.attempts),
      correct: num(x.archived?.correct),
      hints: num(x.archived?.hints),
    },
    checkpoint: visited.includes(x.checkpoint ?? -1) ? x.checkpoint! : 0,
    visited,
    explored: ints(x.explored, 49),
    task: desertTasks.some((t) => t.id === x.task) ? x.task! : null,
    steps,
    badges: ids(
      x.badges,
      desertTasks.map((t) => t.id),
    ),
  };
}
