export type Vec3 = [number, number, number];
export const checkpoints: Vec3[] = [
  [0, 1.2, 14],
  [0, 1.2, 0],
  [0, 1.2, -11],
];
export const chestPosition: Vec3 = [0, 0.5, -21];
export const collectibles: {
  id: string;
  kind: "wood" | "amber";
  position: Vec3;
}[] = [
  { id: "wood-0", kind: "wood", position: [-3, 0.7, 11] },
  { id: "wood-1", kind: "wood", position: [3, 0.7, 7] },
  { id: "wood-2", kind: "wood", position: [-2, 0.7, 3] },
  { id: "amber-0", kind: "amber", position: [2, 0.8, 1] },
  { id: "amber-1", kind: "amber", position: [-2, 0.8, -1] },
  { id: "amber-2", kind: "amber", position: [1.6, 0.8, -9] },
  { id: "amber-3", kind: "amber", position: [4, 0.8, -13] },
  { id: "amber-4", kind: "amber", position: [-3, 0.8, -17] },
];
export const trees: Vec3[] = Array.from({ length: 64 }, (_, i) => {
  const side = i % 2 ? 1 : -1;
  return [side * (6 + ((i * 7) % 12)), 0, 18 - ((i * 11) % 45)] as Vec3;
});
export const rocks: Vec3[] = [
  [-3, 0.4, 5],
  [3, 0.45, 2],
  [-3, 0.4, -10],
  [3, 0.4, -16],
  [-5, 0.45, -19],
];
export const monsterStarts: Vec3[] = Array.from({ length: 24 }, (_, i) => [
  (i % 2 ? 1 : -1) * (6 + (i % 4) * 1.5),
  0.8,
  14 - Math.floor(i / 2) * 3.1,
]);
export function distance(a: { x: number; z: number }, b: Vec3) {
  return Math.hypot(a.x - b[0], a.z - b[2]);
}
