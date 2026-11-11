import level from "../data/level2.json";
export { level };
export type Point = [number, number, number];
export const cellPosition = (cell: number): Point => [
  (cell % 7) * 6 - 18,
  0,
  18 - Math.floor(cell / 7) * 6,
];
export const cellAt = (x: number, z: number) => {
  const c = Math.floor((x + 21) / 6),
    r = Math.floor((21 - z) / 6);
  return c >= 0 && c < 7 && r >= 0 && r < 7 ? r * 7 + c : -1;
};
export const neighbors = (cell: number) =>
  level.maze.edges
    .filter((e) => e.includes(cell))
    .map((e) => (e[0] === cell ? e[1] : e[0]));
export function route(from: number, to: number): number[] {
  const queue = [[from]],
    visited = new Set([from]);
  while (queue.length) {
    const path = queue.shift()!,
      last = path.at(-1)!;
    if (last === to) return path;
    for (const n of neighbors(last))
      if (!visited.has(n)) {
        visited.add(n);
        queue.push([...path, n]);
      }
  }
  return [];
}
export type Wall = { p: Point; s: Point };
export const edgeWall = (a: number, b: number): Wall => {
  const p = cellPosition(a),
    q = cellPosition(b);
  return {
    p: [(p[0] + q[0]) / 2, 1.7, (p[2] + q[2]) / 2],
    s: a % 7 === b % 7 ? [6.6, 3.4, 0.6] : [0.6, 3.4, 6.6],
  };
};
const connected = (a: number, b: number) => neighbors(a).includes(b);
export const mazeWalls: Wall[] = [];
for (let c = 0; c < 49; c++) {
  if (c % 7 < 6 && !connected(c, c + 1)) mazeWalls.push(edgeWall(c, c + 1));
  if (c < 42 && !connected(c, c + 7)) mazeWalls.push(edgeWall(c, c + 7));
}
for (let i = 0; i < 7; i++) {
  const v = -18 + i * 6;
  mazeWalls.push(
    { p: [-21, 1.7, v], s: [0.6, 3.4, 6.6] },
    { p: [21, 1.7, v], s: [0.6, 3.4, 6.6] },
  );
  if (i !== 3)
    mazeWalls.push(
      { p: [v, 1.7, 21], s: [6.6, 3.4, 0.6] },
      { p: [v, 1.7, -21], s: [6.6, 3.4, 0.6] },
    );
}
export const looseWall = edgeWall(level.looseEdge[0], level.looseEdge[1]);
export const templeWalls: Wall[] = [
  { p: [-10, 3, -33], s: [1, 6, 16] },
  { p: [10, 3, -33], s: [1, 6, 16] },
  { p: [0, 3, -41], s: [21, 6, 1] },
  { p: [-6.2, 3, -26], s: [8.4, 6, 1] },
  { p: [6.2, 3, -26], s: [8.4, 6, 1] },
  { p: [0, 5, -26], s: [4, 2, 1] },
];
export const gateWall: Wall = { p: [0, 2, -26], s: [4, 4, 0.7] };
export const bounds: Wall[] = [
  { p: [-48, 3, 0], s: [1, 6, 96] },
  { p: [48, 3, 0], s: [1, 6, 96] },
  { p: [0, 3, -48], s: [96, 6, 1] },
  { p: [0, 3, 48], s: [96, 6, 1] },
];
// Same wall geometry used by physics and interaction occlusion. Prevents collecting through walls.
export function clearLine(from: Point, to: Point, walls: Wall[]) {
  return !walls.some(({ p, s }) => {
    let lo = 0,
      hi = 1;
    for (const axis of [0, 1, 2]) {
      const d = to[axis] - from[axis],
        min = p[axis] - s[axis] / 2,
        max = p[axis] + s[axis] / 2;
      if (Math.abs(d) < 1e-8) {
        if (from[axis] < min || from[axis] > max) return false;
      } else {
        const a = (min - from[axis]) / d,
          b = (max - from[axis]) / d;
        lo = Math.max(lo, Math.min(a, b));
        hi = Math.min(hi, Math.max(a, b));
        if (lo > hi) return false;
      }
    }
    return hi > 0.01 && lo < 0.98;
  });
}
