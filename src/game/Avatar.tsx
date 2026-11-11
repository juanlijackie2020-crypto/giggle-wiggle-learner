import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { Appearance } from "./state";
import { VoxelMesh, voxel as v } from "./VoxelMesh";
type BoxProps = {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
};
export function Box({ p, s, c }: BoxProps) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshLambertMaterial color={c} />
    </mesh>
  );
}
const pickaxeParts = [
  v([0, -0.06, 0], [0.095, 0.75, 0.095], "#79502c"),
  v([0, -0.37, 0], [0.13, 0.13, 0.13], "#51351f"),
  v([0, 0.28, 0], [0.16, 0.16, 0.15], "#e1b654"),
  v([0, 0.4, 0], [0.65, 0.13, 0.16], "#247a83"),
  v([0, 0.45, -0.01], [0.48, 0.08, 0.17], "#69e4dc"),
  v([-0.33, 0.31, 0], [0.15, 0.19, 0.16], "#3ebbb8"),
  v([0.33, 0.31, 0], [0.15, 0.19, 0.16], "#3ebbb8"),
  v([-0.4, 0.2, 0], [0.13, 0.16, 0.16], "#abfff0"),
  v([0.4, 0.2, 0], [0.13, 0.16, 0.16], "#abfff0"),
];
export function Pickaxe() {
  return <VoxelMesh parts={pickaxeParts} />;
}
export function Avatar({
  appearance,
  walking = 0,
  pickaxe = true,
  backpack = true,
  swing = 0,
  paused = false,
  desertGear = false,
}: {
  appearance: Appearance;
  walking?: number;
  pickaxe?: boolean;
  backpack?: boolean;
  swing?: number;
  paused?: boolean;
  desertGear?: boolean;
}) {
  const arm = useRef<Group>(null),
    elapsed = useRef(1),
    previous = useRef(swing);
  useFrame((_, dt) => {
    if (previous.current !== swing) {
      previous.current = swing;
      elapsed.current = 0;
    }
    if (!paused)
      elapsed.current = Math.min(
        1,
        elapsed.current + Math.min(dt, 1 / 30) * 2.5,
      );
    if (arm.current)
      arm.current.rotation.x =
        walking +
        (elapsed.current < 1 ? -Math.sin(elapsed.current * Math.PI) * 1.65 : 0);
  });
  const {
    skin,
    shirt,
    outfit,
    pants = "#294578",
    accent = "#ffe191",
  } = appearance;
  const body = useMemo(() => {
    const p = [
      v([0, 0.75, 0], [0.57, 0.61, 0.35], shirt),
      v([0, 0.47, 0], [0.59, 0.09, 0.38], "#65462f"),
      v([0, 0.47, -0.205], [0.11, 0.09, 0.035], accent),
      v([0, 1.08, 0], [0.23, 0.12, 0.23], skin),
      v([0, 1.35, 0], [0.52, 0.5, 0.49], skin),
      v([0, 1.61, 0.025], [0.56, 0.14, 0.53], "#483021"),
      v([0, 1.44, 0.225], [0.54, 0.35, 0.08], "#553726"),
      v([-0.235, 1.5, -0.025], [0.09, 0.2, 0.47], "#513422"),
      v([0.235, 1.52, 0.025], [0.08, 0.19, 0.38], "#513422"),
      v([-0.1, 1.55, -0.25], [0.28, 0.13, 0.04], "#63412a"),
      v([0.13, 1.6, -0.25], [0.2, 0.07, 0.04], "#7a4e2c"),
      v([0, 1.3, -0.27], [0.085, 0.09, 0.065], skin),
      v([0, 1.19, -0.26], [0.14, 0.035, 0.025], "#965746"),
      v([0.065, 1.21, -0.266], [0.04, 0.035, 0.025], "#965746"),
      v([0, 0.95, -0.19], [0.12, 0.17, 0.035], accent),
      v([0, 0.79, -0.187], [0.025, 0.28, 0.022], "#d4e9dd"),
    ];
    for (const side of [-1, 1]) {
      p.push(
        v([side * 0.13, 1.38, -0.253], [0.13, 0.1, 0.023], "#fff8e9"),
        v([side * 0.12, 1.38, -0.271], [0.06, 0.085, 0.025], "#304d62"),
        v([side * 0.12, 1.39, -0.288], [0.023, 0.04, 0.01], "#182b34"),
        v([side * 0.13, 1.47, -0.253], [0.14, 0.035, 0.025], "#6e4830"),
      );
      p.push(
        v([side * 0.285, 1.34, 0], [0.06, 0.15, 0.18], skin),
        v([side * 0.16, 0.65, -0.19], [0.16, 0.14, 0.035], accent),
      );
    }
    if (backpack) {
      p.push(
        v([0, 0.78, 0.28], [0.46, 0.56, 0.23], "#926331"),
        v([0, 0.91, 0.415], [0.49, 0.25, 0.08], "#c69750"),
        v([0, 0.62, 0.425], [0.32, 0.22, 0.09], "#b28342"),
        v([0, 1.11, 0.3], [0.23, 0.065, 0.14], "#5d452d"),
      );
      for (const side of [-1, 1])
        p.push(
          v([side * 0.19, 0.79, -0.2], [0.065, 0.54, 0.05], "#735333"),
          v([side * 0.16, 0.8, 0.47], [0.055, 0.21, 0.03], "#5a4028"),
          v([side * 0.16, 0.79, 0.491], [0.075, 0.065, 0.025], "#edcc6e"),
          v([side * 0.285, 0.72, 0.28], [0.11, 0.27, 0.2], "#a37a3e"),
        );
    }
    if (outfit === "explorer" || outfit === "ranger") {
      const hat = outfit === "ranger" ? "#3e7150" : "#b99457";
      p.push(
        v([0, 1.75, 0], [0.6, 0.21, 0.56], hat),
        v([0, 1.63, -0.045], [0.79, 0.07, 0.76], hat),
        v([0, 1.68, 0], [0.62, 0.065, 0.58], "#5d4b32"),
        v([0.22, 1.73, -0.3], [0.07, 0.08, 0.025], accent),
      );
    }
    if (outfit === "hoodie" || outfit === "bunny" || outfit === "raincoat") {
      p.push(
        v([0, 1.65, 0.025], [0.64, 0.16, 0.61], shirt),
        v([0, 1.39, 0.26], [0.64, 0.44, 0.1], shirt),
      );
      if (outfit === "hoodie")
        p.push(v([0, 0.61, -0.23], [0.29, 0.14, 0.07], accent));
    }
    if (outfit === "bunny") {
      for (const side of [-1, 1])
        p.push(
          v([side * 0.2, 1.97, 0.025], [0.17, 0.54, 0.18], shirt),
          v([side * 0.2, 2, -0.072], [0.085, 0.35, 0.025], accent),
        );
      p.push(v([0, 0.75, -0.22], [0.29, 0.3, 0.045], accent));
    }
    if (outfit === "raincoat")
      p.push(
        v([0, 0.49, 0], [0.69, 0.32, 0.44], shirt),
        v([0, 0.76, -0.235], [0.04, 0.55, 0.03], accent),
        v([0, 1.57, -0.12], [0.71, 0.06, 0.69], accent),
      );
    if (outfit === "overalls") {
      p.push(
        v([0, 0.55, -0.045], [0.6, 0.23, 0.4], pants),
        v([0, 0.75, -0.19], [0.31, 0.29, 0.04], pants),
        v([0, 0.71, -0.22], [0.19, 0.13, 0.03], accent),
      );
      for (const side of [-1, 1])
        p.push(
          v([side * 0.19, 0.9, -0.2], [0.07, 0.34, 0.05], pants),
          v([side * 0.19, 0.8, -0.23], [0.065, 0.055, 0.03], "#efc55b"),
        );
    }
    if (desertGear)
      p.push(
        v([0, 1.07, 0], [0.52, 0.14, 0.43], "#eab95e"),
        v([0.18, 0.94, -0.22], [0.17, 0.28, 0.06], "#eab95e"),
        v([0, 1.46, -0.28], [0.49, 0.15, 0.055], "#5c4b37"),
        v([-0.13, 1.46, -0.315], [0.16, 0.1, 0.025], "#7de4ec"),
        v([0.13, 1.46, -0.315], [0.16, 0.1, 0.025], "#7de4ec"),
      );
    return p;
  }, [skin, shirt, outfit, pants, accent, backpack, desertGear]);
  const leg = useMemo(
    () => [
      v([0, -0.21, 0], [0.23, 0.42, 0.28], pants),
      v([0, -0.34, -0.15], [0.15, 0.055, 0.025], "#718193"),
      v([0, -0.42, -0.045], [0.26, 0.15, 0.39], "#493b2e"),
      v([0, -0.49, -0.05], [0.28, 0.045, 0.4], "#ccb98b"),
    ],
    [pants],
  );
  const sleeve = useMemo(
    () => [
      v([0, -0.13, 0], [0.23, 0.28, 0.3], shirt),
      v(
        [0, -0.32, 0],
        [0.21, 0.16, 0.26],
        ["raincoat", "hoodie", "bunny"].includes(outfit) ? shirt : skin,
      ),
      v([0, -0.46, -0.01], [0.21, 0.15, 0.26], skin),
      v([0, -0.36, -0.14], [0.22, 0.055, 0.035], accent),
    ],
    [shirt, skin, outfit, accent],
  );
  return (
    <group position={[0, -0.65, 0]}>
      <VoxelMesh parts={body} />
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 0.16, 0.5, 0]}
          rotation={[walking * side, 0, 0]}
        >
          <VoxelMesh parts={leg} />
        </group>
      ))}
      <group position={[-0.41, 1, 0]} rotation={[-walking, 0, 0]}>
        <VoxelMesh parts={sleeve} />
      </group>
      <group ref={arm} position={[0.41, 1, 0]}>
        <VoxelMesh parts={sleeve} />
        {pickaxe && (
          <group position={[0.08, -0.38, -0.25]} rotation={[-0.45, 0, -0.3]}>
            <Pickaxe />
          </group>
        )}
      </group>
    </group>
  );
}
