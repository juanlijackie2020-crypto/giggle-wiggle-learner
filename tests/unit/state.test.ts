import { describe, it, expect } from "vitest";
import {
  initialSave,
  transition,
  parseSave,
  readyForChest,
} from "../../src/game/state";
import level from "../../src/data/level1.json";
function collected() {
  let s = initialSave();
  for (let i = 0; i < 3; i++)
    s = transition(s, { type: "collect", kind: "wood", id: `wood-${i}` });
  for (let i = 0; i < 5; i++)
    s = transition(s, { type: "collect", kind: "amber", id: `amber-${i}` });
  return s;
}
describe("Forest Amber progression", () => {
  it("deduplicates valid collectibles and rejects unknown IDs", () => {
    let s = initialSave();
    s = transition(s, { type: "collect", kind: "wood", id: "wood-0" });
    expect(transition(s, { type: "collect", kind: "wood", id: "wood-0" })).toBe(
      s,
    );
    expect(
      transition(s, { type: "collect", kind: "wood", id: "wood-99" }),
    ).toBe(s);
    expect(s.wood).toHaveLength(1);
    expect(readyForChest(s)).toBe(false);
  });
  it("cannot answer or claim before collecting both sets", () => {
    const s = initialSave();
    expect(
      transition(s, { type: "answer", id: level.questions[0].id, answer: 7 }),
    ).toBe(s);
    expect(transition(s, { type: "open" })).toBe(s);
  });
  it("grades all fixed questions, supports retry, requires all answers", () => {
    let s = collected();
    expect(
      transition(s, { type: "answer", id: level.questions[1].id, answer: 4 }),
    ).toBe(s);
    for (const q of level.questions) {
      expect(transition(s, { type: "open" })).toBe(s);
      expect(transition(s, { type: "answer", id: q.id, answer: 99 })).toBe(s);
      s = transition(s, { type: "answer", id: q.id, answer: q.answer });
    }
    expect(s.solved).toHaveLength(3);
    expect(s.woodBlocks).toBe(0);
    s = transition(s, { type: "open" });
    expect(s.completed).toBe(true);
    expect(s.woodBlocks).toBe(10);
    expect(transition(s, { type: "open" })).toBe(s);
    expect(
      transition(parseSave(JSON.stringify(s)), { type: "open" }).woodBlocks,
    ).toBe(10);
  });
  it("round-trips appearance, checkpoint, materials, partial math and final reward", () => {
    let s = collected();
    s = transition(s, {
      type: "appearance",
      value: { skin: "#714e3c", shirt: "#607cc2", outfit: "ranger" },
    });
    s = transition(s, { type: "checkpoint", index: 2 });
    s = transition(s, { type: "answer", id: level.questions[0].id, answer: 7 });
    expect(parseSave(JSON.stringify(s))).toEqual(s);
    expect(transition(s, { type: "checkpoint", index: 0 }).checkpoint).toBe(2);
  });
  it("recovers corrupted, incomplete and duplicate saves without fabricated rewards", () => {
    expect(parseSave("{broken")).toEqual(initialSave());
    expect(parseSave("null")).toEqual(initialSave());
    expect(
      parseSave(
        JSON.stringify({
          version: 1,
          wood: ["wood-0", "wood-0", "evil"],
          amber: [],
          solved: level.questions.map((q) => q.id),
          completed: true,
          woodBlocks: 999,
        }),
      ),
    ).toMatchObject({
      wood: ["wood-0"],
      completed: false,
      woodBlocks: 0,
      solved: [],
    });
  });
  it("all questions have four distinct options, a valid answer and a hint", () => {
    expect(level.questions.map((q) => q.answer)).toEqual([7, 4, 8]);
    for (const q of level.questions) {
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
      expect(q.hint.length).toBeGreaterThan(5);
    }
  });
});
