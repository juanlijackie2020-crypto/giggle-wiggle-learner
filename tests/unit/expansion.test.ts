import { describe, it, expect } from "vitest";
import {
  initialSave,
  parseSave,
  transition,
  REWARD_ID,
} from "../../src/game/state";
import { WORLD, mapPoint, oreDeposits } from "../../src/game/expansion";
import { monsterVoxels, MONSTER_PARTS } from "../../src/game/monsterModel";
import { animalVoxels } from "../../src/game/AnimalModel";
describe("forest equipment and expansion", () => {
  it("upgrades existing saves without losing progression, including unequipped settings", () => {
    const old = {
      ...initialSave(4),
      wood: ["wood-0"],
      rewardClaims: [REWARD_ID],
      woodBlocks: 10,
      equipment: undefined,
      mined: undefined,
    };
    const s = parseSave(JSON.stringify(old));
    expect(s.equipment).toEqual({ pickaxe: true, backpack: true });
    expect(s.wood).toEqual(["wood-0"]);
    expect(s.woodBlocks).toBe(10);
    const off = transition(transition(s, { type: "equip", item: "pickaxe" }), {
      type: "equip",
      item: "backpack",
    });
    const reloaded = parseSave(JSON.stringify(off));
    expect(reloaded.equipment).toEqual({ pickaxe: false, backpack: false });
    expect(reloaded.woodBlocks).toBe(10);
  });
  it("requires an equipped pickaxe, rejects fake ore, never duplicates quartz across replay", () => {
    let s = initialSave(3);
    s = transition(s, { type: "equip", item: "pickaxe" });
    expect(transition(s, { type: "mine", id: oreDeposits[0].id })).toBe(s);
    expect(
      transition(s, { type: "collect", kind: "amber", id: "amber-0" }),
    ).toBe(s);
    s = transition(s, { type: "equip", item: "pickaxe" });
    expect(transition(s, { type: "mine", id: "fake" })).toBe(s);
    for (const ore of oreDeposits) {
      s = transition(s, { type: "mine", id: ore.id });
      expect(transition(s, { type: "mine", id: ore.id })).toBe(s);
    }
    expect(s.mined).toHaveLength(4);
    s = transition(s, { type: "restart", seed: 9 });
    expect(s.mined).toHaveLength(4);
    expect(
      parseSave(
        JSON.stringify({ ...s, mined: [...s.mined, s.mined[0], "fake"] }),
      ).mined,
    ).toEqual(s.mined);
  });
  it("maps the enlarged playable bounds and all deposits inside the minimap", () => {
    expect(
      ((WORLD.maxX - WORLD.minX) * (WORLD.maxZ - WORLD.minZ)) / (44 * 52),
    ).toBeGreaterThan(2.9);
    expect(mapPoint(WORLD.minX, WORLD.minZ)).toEqual([8, 8]);
    expect(mapPoint(WORLD.maxX, WORLD.maxZ)).toEqual([132, 142]);
    for (const ore of oreDeposits) {
      const [x, y] = mapPoint(ore.position[0], ore.position[2]);
      expect(x).toBeGreaterThan(8);
      expect(x).toBeLessThan(132);
      expect(y).toBeGreaterThan(8);
      expect(y).toBeLessThan(142);
    }
  });
  it("uses a fixed monster draw pool and six distinct finite animal silhouettes", () => {
    for (let k = 0; k < 3; k++)
      expect(monsterVoxels(k)).toHaveLength(MONSTER_PARTS);
    const colors = monsterVoxels(2).map((p) => p.c);
    expect(colors).toContain("#65b52e");
    expect(colors).not.toContain("#7ba7a1");
    const models = Array.from({ length: 6 }, (_, k) => animalVoxels(k));
    expect(new Set(models.map((m) => JSON.stringify(m))).size).toBe(6);
    for (const model of models)
      for (const part of model) {
        expect(part.p.every(Number.isFinite)).toBe(true);
        expect(part.s.every((n) => n > 0)).toBe(true);
      }
  });
});
