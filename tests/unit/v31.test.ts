import { describe, it, expect } from "vitest";
import {
  generateQuestions,
  fingerprint,
  validQuestionSet,
  difficulties,
  type Difficulty,
} from "../../src/game/questions";
import {
  initialSave,
  transition,
  parseSave,
  REWARD_ID,
  palettes,
  outfits,
  shirts,
} from "../../src/game/state";
import { tasks, progressTask, emptyTasks } from "../../src/game/tasks";
import dialogue from "../../src/data/dialogue.json";
import { readFileSync, existsSync } from "node:fs";
function collect(s = initialSave(42)) {
  for (let i = 0; i < 3; i++)
    s = transition(s, { type: "collect", kind: "wood", id: `wood-${i}` });
  for (let i = 0; i < 5; i++)
    s = transition(s, { type: "collect", kind: "amber", id: `amber-${i}` });
  return s;
}
describe("V3.1 random maths", () => {
  for (const difficulty of Object.keys(difficulties) as Difficulty[])
    it(`${difficulty}: 100 rounds have valid maths, four unique options and no adjacent repeats`, () => {
      let prior: string[] = [];
      for (let seed = 0; seed < 100; seed++) {
        const set = generateQuestions(seed, difficulty, prior);
        expect(validQuestionSet(set)).toBe(true);
        expect(set.questions).toHaveLength(3);
        const fingerprints = set.questions.map(fingerprint);
        expect(new Set(fingerprints).size).toBe(3);
        expect(fingerprints.some((f) => prior.includes(f))).toBe(false);
        expect(new Set(set.questions.map((q) => q.operation)).size).toBe(2);
        if (difficulty !== "warmup")
          expect(
            set.questions.some(
              (q) =>
                q.operation === "+" &&
                (q.dots[0] % 10) + (q.dots[1] % 10) >= 10,
            ),
          ).toBe(true);
        for (const q of set.questions) {
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThanOrEqual(difficulties[difficulty].max);
          expect(q.hint).toContain(String(q.dots[0]));
          expect(q.hint).toContain(String(q.dots[1]));
        }
        expect(generateQuestions(seed, difficulty, prior)).toEqual(set);
        prior = fingerprints;
      }
    });
  it("canonical addition is order independent and exhausted pools fail without hanging", () => {
    const q = generateQuestions(9).questions.find((q) => q.operation === "+")!;
    expect(fingerprint({ ...q, dots: [...q.dots].reverse() })).toBe(
      fingerprint(q),
    );
    const excluded = [];
    for (let a = 0; a <= 10; a++)
      for (let b = 0; b <= 10; b++) {
        excluded.push(`+:${a}:${b}`, `−:${a}:${b}`);
      }
    expect(() => generateQuestions(1, "warmup", excluded)).toThrow("没有足够");
  });
  it("wrong answers, checkpoint and reload preserve exact snapshots; difficulty only applies next run", () => {
    let s = collect();
    const q = s.questionSet.questions[0],
      wrong = q.options.find((n) => n !== q.answer)!;
    s = transition(s, { type: "answer", id: q.id, answer: wrong });
    s = transition(s, { type: "checkpoint", index: 1 });
    const set = s.questionSet;
    s = transition(s, { type: "difficulty", value: "challenge" });
    expect(parseSave(JSON.stringify(s))).toEqual(s);
    expect(s.questionSet).toEqual(set);
    expect(s.solved).toHaveLength(0);
    s = transition(s, { type: "answer", id: q.id, answer: q.answer });
    expect(s.questionStats[q.id]).toMatchObject({
      attemptCount: 2,
      hintCount: 1,
      firstTryCorrect: false,
    });
    s = transition(s, { type: "restart", seed: 17 });
    expect(s.questionSet.difficulty).toBe("challenge");
    expect(
      s.questionSet.questions.every(
        (q) => !set.questions.map(fingerprint).includes(fingerprint(q)),
      ),
    ).toBe(true);
    expect(s.questionStats[q.id].attemptCount).toBe(2);
    expect(s.history[0]).toEqual(set);
  });
  it("new random sets never mint another chest reward", () => {
    let s = collect();
    for (let run = 0; run < 4; run++) {
      s = collect(s);
      expect(transition(s, { type: "open" }).completed).toBe(false);
      for (const q of s.questionSet.questions)
        s = transition(s, { type: "answer", id: q.id, answer: q.answer });
      s = transition(s, { type: "open" });
      expect(s.woodBlocks).toBe(10);
      expect(s.rewardClaims).toEqual([REWARD_ID]);
      s = transition(s, { type: "restart", seed: run + 400 });
      expect(parseSave(JSON.stringify(s))).toEqual(s);
    }
  });
  it("keeps at most 100 history sets and rolls expired learning records into totals", () => {
    let s = collect();
    for (let run = 0; run < 103; run++) {
      s = collect(s);
      const q = s.questionSet.questions[0];
      s = transition(s, { type: "answer", id: q.id, answer: q.answer });
      s = transition(s, { type: "restart", seed: run + 600 });
    }
    expect(s.history).toHaveLength(100);
    expect(s.archivedTotals.attempts).toBe(3);
    expect(Object.keys(s.questionStats)).toHaveLength(100);
    expect(parseSave(JSON.stringify(s))).toEqual(s);
  });
  it("uses a fresh instance ID even when a seed repeats", () => {
    let s = initialSave(1);
    const id = s.questionSet.questions[0].id;
    s = transition(s, { type: "restart", seed: 1 });
    expect(s.questionSet.questions.some((q) => q.id === id)).toBe(false);
    expect(s.questionSet.runId).toBe(1);
  });
  it("handles null question objects without losing an existing reward", () => {
    const s = initialSave(10);
    s.rewardClaims = [REWARD_ID];
    const broken = JSON.parse(JSON.stringify(s));
    broken.questionSet.questions[0] = null;
    const recovered = parseSave(JSON.stringify(broken));
    expect(recovered.woodBlocks).toBe(10);
    expect(validQuestionSet(recovered.questionSet)).toBe(true);
  });
  it("rejects damaged question snapshots and retains permanent inventory", () => {
    const s = initialSave(42);
    s.rewardClaims = [REWARD_ID];
    s.questionSet.questions[0].options = [1, 1, 1, 1];
    const restored = parseSave(JSON.stringify(s));
    expect(validQuestionSet(restored.questionSet)).toBe(true);
    expect(restored.woodBlocks).toBe(10);
  });
});
describe("V3.1 tasks, clothing and audio", () => {
  it("accepts only selected task steps, remembers switches and awards one badge", () => {
    let s = initialSave(5);
    expect(
      transition(s, { type: "task-step", task: "friends", step: "rabbit" }),
    ).toBe(s);
    s = transition(s, { type: "task-select", id: "friends" });
    s = transition(s, { type: "task-step", task: "friends", step: "rabbit" });
    s = transition(s, { type: "task-select", id: "explore" });
    s = transition(s, { type: "task-select", id: "friends" });
    s = transition(s, { type: "task-step", task: "friends", step: "squirrel" });
    s = transition(s, { type: "task-step", task: "friends", step: "squirrel" });
    expect(s.tasks.steps.friends).toEqual(["rabbit", "squirrel"]);
    expect(s.tasks.badges).toEqual(["friends"]);
    expect(s.woodBlocks).toBe(0);
    s = transition(s, { type: "task-abandon" });
    expect(s.tasks.steps.friends).toEqual([]);
    expect(s.tasks.badges).toEqual(["friends"]);
    expect(parseSave(JSON.stringify(s)).tasks.badges).toEqual(["friends"]);
  });
  it("parkour requires ordered steps and ignores invented objectives", () => {
    let p = { ...emptyTasks(), active: "parkour" };
    expect(progressTask(p, "parkour", "finish")).toBe(p);
    expect(progressTask(p, "parkour", "evil")).toBe(p);
    for (const step of tasks.find((t) => t.id === "parkour")!.steps)
      p = progressTask(p, "parkour", step);
    expect(p.badges).toEqual(["parkour"]);
    expect(progressTask(p, "parkour", "finish")).toBe(p);
  });
  it("expanded styles, palettes, volume and quality persist through refresh and restart", () => {
    expect(outfits).toHaveLength(6);
    expect(shirts).toHaveLength(8);
    expect(palettes).toHaveLength(6);
    let s = initialSave(33);
    s = transition(s, {
      type: "appearance",
      value: { skin: "#714e3c", outfit: "bunny", ...palettes[4] },
    });
    s = transition(s, { type: "volume", channel: "voiceVolume", value: 0.35 });
    s = transition(s, { type: "quality" });
    s = transition(s, { type: "restart", seed: 9 });
    const restored = parseSave(JSON.stringify(s));
    expect(restored.appearance.outfit).toBe("bunny");
    expect(restored.appearance.pants).toBe(palettes[4].pants);
    expect(restored.voiceVolume).toBe(0.35);
    expect(restored.lowQuality).toBe(true);
  });
  it("each species and protagonist have actual bundled MP3 speech with matching captions", () => {
    expect(dialogue).toHaveLength(15);
    for (const clip of dialogue) {
      expect(clip.text.length).toBeGreaterThan(5);
      expect(clip.language).toBe("zh-CN");
      expect(clip.duration).toBeGreaterThan(1);
      expect(existsSync(`public/${clip.path}`)).toBe(true);
      expect(readFileSync(`public/${clip.path}`).length).toBeGreaterThan(1000);
    }
    for (let i = 0; i < 6; i++) {
      expect(dialogue.find((l) => l.id === `animal-${i}-hello`)).toBeTruthy();
      expect(dialogue.find((l) => l.id === `animal-${i}-clue`)).toBeTruthy();
    }
  });
});
