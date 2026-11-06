import rules from "../data/math.json";
import level from "../data/level1.json";
export type Difficulty = keyof typeof rules.difficulties;
export const difficulties = rules.difficulties;
export type Question = (typeof level.questions)[number];
export type QuestionSet = {
  setId: string;
  runId: number;
  seed: number;
  generatorVersion: number;
  difficulty: Difficulty | "legacy";
  questions: Question[];
  previous: string[];
};
export const fingerprint = (q: Question) =>
  q.operation === "+"
    ? `+:${[...q.dots].sort((a, b) => a - b).join(":")}`
    : `−:${q.dots.join(":")}`;
export function randomSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
export function generateQuestions(
  seed: number,
  difficulty: Difficulty = "standard",
  previous: string[] = [],
  runId = 0,
): QuestionSet {
  let n = seed >>> 0;
  const random = () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffle = <T>(items: T[]) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  };
  const { max, requireCrossTen } = difficulties[difficulty];
  const pool: Question[] = [];
  for (const operation of ["+", "−"])
    for (let a = 0; a <= max; a++)
      for (let b = 0; b <= max; b++) {
        const answer = operation === "+" ? a + b : a - b;
        if (answer < 0 || answer > max || (operation === "+" && a > b))
          continue;
        const q: Question = {
          id: "",
          text: `${a} ${operation} ${b} = ?`,
          operation,
          dots: [a, b],
          answer,
          options: [],
          hint: rules.hints[operation as "+" | "−"]
            .replace("{a}", String(a))
            .replace("{b}", String(b)),
          visualHint: rules.visualHint,
        };
        if (!previous.includes(fingerprint(q))) pool.push(q);
      }
  const selected: Question[] = [];
  const take = (predicate: (q: Question) => boolean) => {
    const options = pool.filter((q) => !selected.includes(q) && predicate(q));
    if (!options.length)
      throw new Error("题型配置没有足够的新题，请调整难度后重试。");
    selected.push(options[Math.floor(random() * options.length)]);
  };
  take(
    (q) =>
      q.operation === "+" &&
      (!requireCrossTen || (q.dots[0] % 10) + (q.dots[1] % 10) >= 10),
  );
  take((q) => q.operation === "−");
  take(() => true);
  const setId = `math-v1-${difficulty}-${seed}-run${runId}`;
  return {
    setId,
    runId,
    seed,
    generatorVersion: 1,
    difficulty,
    previous,
    questions: shuffle(selected).map((q, i) => {
      const wrong = shuffle(
        Array.from({ length: max + 1 }, (_, j) => j).filter(
          (j) => j !== q.answer && Math.abs(j - q.answer) <= 5,
        ),
      );
      return {
        ...q,
        id: `${setId}-${i}`,
        options: shuffle([q.answer, ...wrong.slice(0, 3)]),
      };
    }),
  };
}
export function validQuestionSet(value: unknown): value is QuestionSet {
  if (!value || typeof value !== "object") return false;
  const s = value as QuestionSet;
  if (
    typeof s.setId !== "string" ||
    !Number.isSafeInteger(s.runId) ||
    s.runId < 0 ||
    !Number.isInteger(s.seed) ||
    s.generatorVersion !== 1 ||
    !(s.difficulty === "legacy" || Object.hasOwn(difficulties, s.difficulty)) ||
    !Array.isArray(s.questions) ||
    s.questions.length !== 3 ||
    !Array.isArray(s.previous) ||
    !s.previous.every((x) => typeof x === "string")
  )
    return false;
  const max = s.difficulty === "legacy" ? 10 : difficulties[s.difficulty].max;
  if (!s.questions.every((q) => q && typeof q === "object")) return false;
  return (
    new Set(s.questions.map((q) => q.id)).size === 3 &&
    s.questions.every(
      (q) =>
        typeof q.id === "string" &&
        typeof q.text === "string" &&
        typeof q.hint === "string" &&
        typeof q.visualHint === "string" &&
        ["+", "−"].includes(q.operation) &&
        Array.isArray(q.dots) &&
        q.dots.length === 2 &&
        q.dots.every((n) => Number.isInteger(n) && n >= 0 && n <= max) &&
        q.text === `${q.dots[0]} ${q.operation} ${q.dots[1]} = ?` &&
        q.answer ===
          (q.operation === "+"
            ? q.dots[0] + q.dots[1]
            : q.dots[0] - q.dots[1]) &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        new Set(q.options).size === 4 &&
        q.options.includes(q.answer) &&
        q.options.every((n) => Number.isInteger(n) && n >= 0 && n <= max),
    )
  );
}
export const legacySet = (): QuestionSet => ({
  setId: "legacy-v3.0",
  runId: 0,
  seed: 0,
  generatorVersion: 1,
  difficulty: "legacy",
  questions: level.questions,
  previous: [],
});
