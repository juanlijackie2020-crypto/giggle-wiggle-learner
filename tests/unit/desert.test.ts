import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  initialSave,
  parseSave,
  transition,
  mergePermanent,
  REWARD_ID,
} from "../../src/game/state";
import {
  initialDesert,
  desertTransition,
  parseDesert,
  GOLD_REWARD,
  rules,
} from "../../src/desert/state";
import {
  level,
  neighbors,
  route,
  mazeWalls,
  templeWalls,
  gateWall,
  looseWall,
  clearLine,
  cellPosition,
  cellAt,
} from "../../src/desert/maze";
import {
  generateQuestions,
  fingerprint,
  validQuestionSet,
} from "../../src/game/questions";
import dialogue from "../../src/data/desert-dialogue.json";
const collected = () => {
  let s = desertTransition(initialDesert(9), { type: "break" });
  for (const t of level.tablets)
    s = desertTransition(s, { type: "tablet", id: t.id });
  return desertTransition(s, { type: "gate" });
};
const complete = () => {
  let s = collected();
  for (const q of s.questionSet.questions)
    s = desertTransition(s, { type: "answer", id: q.id, answer: q.answer });
  return desertTransition(s, { type: "claim" });
};
describe("Desert maze and physical contract", () => {
  it("all 49 cells reachable, ≥6 junctions, ≥3 dead ends, ≥2 independent cycles", () => {
    for (let i = 0; i < 49; i++) expect(route(3, i).at(-1)).toBe(i);
    expect(
      Array.from({ length: 49 }, (_, i) => neighbors(i).length).filter(
        (n) => n >= 3,
      ).length,
    ).toBeGreaterThanOrEqual(6);
    expect(
      Array.from({ length: 49 }, (_, i) => neighbors(i).length).filter(
        (n) => n === 1,
      ).length,
    ).toBeGreaterThanOrEqual(3);
    expect(level.maze.edges.length - 49 + 1).toBeGreaterThanOrEqual(2);
    for (let c = 0; c < 49; c++)
      if (
        neighbors(c).length === 1 &&
        c !== level.maze.entrance &&
        c !== level.maze.exit
      )
        expect(
          [...level.tablets, ...level.deadEndClues].some((t) => t.cell === c),
        ).toBe(true);
  });
  it("tablets occupy distinct terminal branches and every open edge has an unobstructed passage", () => {
    for (const t of level.tablets) {
      expect(neighbors(t.cell)).toHaveLength(1);
      expect(
        cellAt(
          ...([cellPosition(t.cell)[0], cellPosition(t.cell)[2]] as [
            number,
            number,
          ]),
        ),
      ).toBe(t.cell);
    }
    for (const [a, b] of level.maze.edges)
      expect(clearLine(cellPosition(a), cellPosition(b), mazeWalls)).toBe(true);
    for (const a of level.tablets)
      for (const b of level.tablets)
        if (a.id !== b.id) expect(route(3, a.cell)).not.toContain(b.cell);
  });
  it("loose sandstone blocks its branch; gate and all temple sides physically enclose chest", () => {
    expect(
      clearLine(
        cellPosition(level.looseEdge[0]),
        cellPosition(level.looseEdge[1]),
        [looseWall],
      ),
    ).toBe(false);
    expect(clearLine([0, 0, -23], [0, 0, -29], [gateWall])).toBe(false);
    expect(clearLine([0, 0, -23], [0, 0, -29], templeWalls)).toBe(true);
    expect(clearLine([13, 0, -36], [0, 0, -36], templeWalls)).toBe(false);
  });
});
describe("Desert questions, migration and rewards", () => {
  for (const difficulty of ["warmup", "standard", "challenge"] as const)
    it(`${difficulty}: 50 seeded rounds respect range, operations, carry and adjacent exclusion`, () => {
      let previous: string[] = [];
      for (let seed = 0; seed < 50; seed++) {
        const set = generateQuestions(seed, difficulty, previous, seed, rules);
        expect(validQuestionSet(set, rules)).toBe(true);
        expect(new Set(set.questions.map(fingerprint)).size).toBe(3);
        expect(set.questions.some((q) => q.operation === "+")).toBe(true);
        expect(set.questions.some((q) => q.operation === "−")).toBe(true);
        for (const q of set.questions) {
          expect(previous).not.toContain(fingerprint(q));
          expect(q.answer).toBeLessThanOrEqual(
            rules.difficulties[difficulty].max,
          );
          if (difficulty !== "warmup")
            expect(q.dots.every((n) => n >= 10)).toBe(true);
        }
        if (difficulty !== "warmup")
          expect(
            set.questions.some(
              (q) =>
                q.operation === "+" &&
                (q.dots[0] % 10) + (q.dots[1] % 10) >= 10,
            ),
          ).toBe(true);
        previous = set.questions.map(fingerprint);
      }
    });
  it("tool, stone, gate, question and reward prerequisites cannot be bypassed", () => {
    let s = initialDesert(3);
    expect(desertTransition(s, { type: "claim" })).toBe(s);
    expect(desertTransition(s, { type: "gate" })).toBe(s);
    expect(desertTransition(s, { type: "break" }, false)).toBe(s);
    expect(desertTransition(s, { type: "tablet", id: "tablet-1" })).toBe(s);
    expect(desertTransition(s, { type: "tablet", id: "invented" })).toBe(s);
    const q = s.questionSet.questions[0];
    expect(
      desertTransition(s, { type: "answer", id: q.id, answer: q.answer }),
    ).toBe(s);
    s = collected();
    expect(s.gate).toBe(true);
    expect(s.tablets).toHaveLength(3);
    expect(desertTransition(s, { type: "tablet", id: s.tablets[0] })).toBe(s);
  });
  it("wrong attempts and exact question order survive reload; difficulty waits for next run", () => {
    let s = collected();
    const q = s.questionSet.questions[0];
    s = desertTransition(s, {
      type: "answer",
      id: q.id,
      answer: q.options.find((n) => n !== q.answer)!,
    });
    s = desertTransition(s, { type: "difficulty", value: "challenge" });
    expect(parseDesert(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(s.questionSet.difficulty).toBe("standard");
    expect(s.stats[q.id].hintCount).toBe(1);
    s = desertTransition(s, { type: "answer", id: q.id, answer: q.answer });
    expect(s.stats[q.id]).toMatchObject({
      firstTryCorrect: false,
      attemptCount: 2,
      correctCount: 1,
    });
    expect(s.stats[q.id].completedAt).toBeTruthy();
    const next = desertTransition(s, { type: "restart", seed: 10 });
    expect(next.questionSet.difficulty).toBe("challenge");
    expect(next.history[0].stats).toEqual(s.stats);
  });
  it("reward is committed atomically before animation; 3 replays cannot mint a second key", () => {
    let s = complete();
    for (let i = 0; i < 3; i++) {
      expect(parseDesert(JSON.parse(JSON.stringify(s)))).toEqual(s);
      s = desertTransition(s, { type: "restart", seed: i });
      s = desertTransition(s, { type: "break" });
      for (const t of level.tablets)
        s = desertTransition(s, { type: "tablet", id: t.id });
      s = desertTransition(s, { type: "gate" });
      for (const q of s.questionSet.questions)
        s = desertTransition(s, { type: "answer", id: q.id, answer: q.answer });
      s = desertTransition(s, { type: "claim" });
      expect(s.claims).toEqual([GOLD_REWARD]);
    }
  });
  it("version 2 migration preserves forest data; UAT entry never marks forest completed", () => {
    const old = {
      ...initialSave(31),
      version: 2,
      wood: ["wood-0"],
      equipment: { pickaxe: false, backpack: true },
      appearance: { skin: "#dca477", shirt: "#f59bc1", outfit: "bunny" },
      desert: undefined,
      activeLevel: undefined,
    };
    let s = parseSave(JSON.stringify(old));
    expect(s.version).toBe(3);
    expect(s.wood).toEqual(["wood-0"]);
    expect(s.appearance).toEqual(old.appearance);
    expect(s.equipment.pickaxe).toBe(false);
    expect(transition(s, { type: "level", level: 2 })).toBe(s);
    s = transition(s, { type: "level", level: 2, parentUAT: true });
    expect(s.activeLevel).toBe(2);
    expect(s.everCompleted).toBe(false);
    expect(s.woodBlocks).toBe(0);
    expect(parseSave(JSON.stringify(s))).toEqual(s);
  });
  it("restarting either level preserves the other and shared equipment; checkpoints may move backward", () => {
    let s = { ...initialSave(1), wood: ["wood-0"], desert: complete() };
    const forest = s.questionSet;
    s = transition(s, { type: "desert", action: { type: "restart", seed: 6 } });
    expect(s.questionSet).toEqual(forest);
    expect(s.wood).toEqual(["wood-0"]);
    expect(s.desert.claims).toEqual([GOLD_REWARD]);
    const desert = s.desert;
    s = transition(s, { type: "restart", seed: 7 });
    expect(s.desert).toEqual(desert);
    let d = desertTransition(desert, { type: "checkpoint", index: 2 });
    d = desertTransition(d, { type: "checkpoint", index: 1 });
    expect(d.checkpoint).toBe(1);
    expect(d.visited).toContain(2);
  });
  it("permanent merges keep claims, mines and badges from stale tabs without summing rewards", () => {
    const a = {
        ...initialSave(1),
        rewardClaims: [REWARD_ID],
        woodBlocks: 10,
        everCompleted: true,
      },
      b = { ...initialSave(2), desert: complete() };
    b.desert.mined = ["desert-quartz-0"];
    a.mined = ["quartz-0"];
    const merged = mergePermanent(a, b);
    expect(merged.woodBlocks).toBe(10);
    expect(merged.desert.claims).toEqual([GOLD_REWARD]);
    expect(merged.desert.mined).toEqual(b.desert.mined);
    expect(mergePermanent(merged, merged)).toEqual(merged);
  });
  it("recovers malformed desert data while keeping valid permanent rewards", () => {
    const d = parseDesert({
      claims: [GOLD_REWARD, GOLD_REWARD, "fake"],
      questionSet: null,
      tablets: ["fake"],
      completed: true,
      checkpoint: 100,
      visited: [-1, 100],
      mined: ["desert-quartz-0", "fake"],
      stats: null,
    });
    expect(d.claims).toEqual([GOLD_REWARD]);
    expect(d.completed).toBe(false);
    expect(d.tablets).toEqual([]);
    expect(d.checkpoint).toBe(0);
    expect(d.mined).toEqual(["desert-quartz-0"]);
  });
});
describe("Desert side quests and local voice", () => {
  it("three independent optional quests retain switches, enforce track order, award unique badges", () => {
    let d = initialDesert(4);
    d = desertTransition(d, { type: "task", id: "friends" });
    d = desertTransition(d, { type: "step", id: "camel" });
    d = desertTransition(d, { type: "task", id: "tracks" });
    expect(desertTransition(d, { type: "step", id: "track-2" })).toBe(d);
    d = desertTransition(d, { type: "task", id: "friends" });
    d = desertTransition(d, { type: "step", id: "fennec" });
    expect(d.badges).toEqual(["friends"]);
    d = desertTransition(d, { type: "abandon" });
    expect(d.steps.friends).toEqual([]);
    expect(d.badges).toEqual(["friends"]);
    expect(parseDesert(d)).toEqual(d);
  });
  it("every dialogue line is bundled MP3 data; includes hero, all animals and 3 tablet clues", () => {
    for (const id of [
      "hero-hello",
      "hero-clue",
      "camel-hello",
      "fennec-hello",
      "lizard-hello",
      "tablet-0-clue",
      "tablet-1-clue",
      "tablet-2-clue",
      "camel-guide",
    ])
      expect(dialogue.some((l) => l.id === id)).toBe(true);
    for (const line of dialogue) {
      const path = `public/${line.path}`;
      expect(existsSync(path)).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.length).toBeGreaterThan(2000);
      expect(bytes.subarray(0, 3).toString()).toBe("ID3");
      expect(line.text.length).toBeGreaterThan(3);
    }
  });
});
