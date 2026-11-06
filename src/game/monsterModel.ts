import { voxel as v, type Voxel } from "./VoxelMesh";
export const MONSTER_PARTS = 24;
export function monsterVoxels(kind: number): Voxel[] {
  const green = kind === 2,
    bone = kind === 1;
  const body = green ? "#65b52e" : bone ? "#e8e0c5" : "#719b51";
  const p = [
    v(
      [0, 0.72, 0],
      [bone ? 0.34 : 0.56, 0.7, 0.4],
      green ? body : bone ? body : "#437d95",
    ),
    v([0, 1.3, 0], [0.61, 0.54, 0.53], body),
    v([-0.145, 1.36, 0.28], [0.13, 0.13, 0.025], "#263b19"),
    v([0.145, 1.36, 0.28], [0.13, 0.13, 0.025], "#263b19"),
    v(
      [-0.2, 0.19, green ? 0.18 : 0],
      [0.22, 0.38, 0.26],
      green ? "#509626" : bone ? body : "#454971",
    ),
    v(
      [0.2, 0.19, green ? 0.18 : 0],
      [0.22, 0.38, 0.26],
      green ? "#509626" : bone ? body : "#454971",
    ),
    v(
      [green ? -0.2 : -0.43, green ? 0.19 : 0.78, green ? -0.21 : 0.04],
      green ? [0.22, 0.38, 0.26] : [0.16, 0.55, 0.22],
      body,
    ),
    v(
      [green ? 0.2 : 0.43, green ? 0.19 : 0.78, green ? -0.21 : 0.04],
      green ? [0.22, 0.38, 0.26] : [0.16, 0.55, 0.22],
      body,
    ),
    v([0, 1.16, 0.28], [0.19, 0.075, 0.025], "#263b19"),
  ];
  if (green) {
    // Lively yellow-green/light-green/dark-green mosaic with an original face.
    p.push(
      v([0, 1.235, 0.28], [0.07, 0.1, 0.025], "#263b19"),
      v([-0.13, 1.115, 0.28], [0.07, 0.09, 0.025], "#263b19"),
      v([0.13, 1.115, 0.28], [0.07, 0.09, 0.025], "#263b19"),
    );
    for (let i = 0; i < 12; i++) {
      const colors = ["#9cda48", "#3d8526", "#b7e566", "#4a9423"];
      p.push(
        v(
          [
            i < 6 ? -0.22 + (i % 3) * 0.2 : i % 2 ? 0.289 : -0.289,
            i < 6
              ? 1.48 - Math.floor(i / 3) * 0.4
              : 0.49 + ((i - 6) % 3) * 0.21,
            i < 6 ? 0.278 : -0.1 + Math.floor((i - 6) / 3) * 0.23,
          ],
          i < 6 ? [0.13, 0.09, 0.018] : [0.018, 0.13, 0.13],
          colors[i % 4],
        ),
      );
    }
  } else if (bone) {
    for (let i = 0; i < 4; i++)
      p.push(v([0, 0.54 + i * 0.12, 0.215], [0.4, 0.045, 0.025], "#9c9b86"));
    p.push(v([0, 1.25, 0.28], [0.075, 0.07, 0.03], "#6f7767"));
  } else {
    p.push(
      v([0, 1.57, 0], [0.63, 0.07, 0.55], "#405b2e"),
      v([-0.2, 1.22, 0.28], [0.1, 0.07, 0.02], "#9eb866"),
    );
  }
  while (p.length < MONSTER_PARTS) p.push(v([0, 0, 0], [0, 0, 0], body));
  return p;
}
export const monsterModels = [0, 1, 2].map(monsterVoxels);
