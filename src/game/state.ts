import level from "../data/level1.json";
export type Outfit = "explorer" | "hoodie" | "ranger";
export type Appearance = { skin: string; shirt: string; outfit: Outfit };
export type Save = {
  version: 1;
  appearance: Appearance;
  wood: string[];
  amber: string[];
  solved: string[];
  completed: boolean;
  woodBlocks: number;
  checkpoint: number;
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
});
export const readyForChest = (s: Save) =>
  s.wood.length === 3 && s.amber.length === 5;
export type Action =
  | { type: "appearance"; value: Appearance }
  | { type: "collect"; kind: "wood" | "amber"; id: string }
  | { type: "answer"; id: string; answer: number }
  | { type: "open" }
  | { type: "checkpoint"; index: number };
export function transition(s: Save, a: Action): Save {
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
    if (!readyForChest(s) || !q || q.id !== a.id || q.answer !== a.answer)
      return s;
    return { ...s, solved: [...s.solved, q.id] };
  }
  if (a.type === "open") {
    if (
      s.completed ||
      !readyForChest(s) ||
      s.solved.length !== level.questions.length
    )
      return s;
    return { ...s, completed: true, woodBlocks: level.reward.woodBlocks };
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
      woodBlocks: completed ? level.reward.woodBlocks : 0,
      checkpoint: [0, 1, 2].includes(x.checkpoint) ? x.checkpoint : 0,
    };
  } catch {
    return empty;
  }
}
