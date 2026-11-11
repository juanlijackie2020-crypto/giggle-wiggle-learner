import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils } from "three";
import { VoxelMesh, voxel as v, type Voxel } from "../game/VoxelMesh";
export function DesertAnimal({
  kind,
  walking = 0,
}: {
  kind: string;
  walking?: number;
}) {
  const parts = useMemo(() => {
    const p: Voxel[] = [];
    if (kind === "camel") {
      p.push(
        v([0, 1.25, 0], [0.85, 0.8, 1.6], "#c99c56"),
        v([0, 1.85, 0.35], [0.65, 0.65, 0.65], "#ad783e"),
        v([0, 1.7, 0.35], [0.85, 0.3, 0.85], "#d9ad69"),
        v([0, 1.8, -0.8], [0.4, 1.2, 0.45], "#d5ab6b"),
        v([0, 2.4, -1], [0.55, 0.5, 0.7], "#e9c58c"),
        v([0, 2.23, -1.42], [0.46, 0.25, 0.3], "#b38750"),
        v([0, 1.65, 0.05], [0.9, 0.12, 0.65], "#276e85"),
        v([0, 1.3, 0.83], [0.15, 0.8, 0.17], "#997343"),
      );
      for (const side of [-1, 1])
        p.push(
          v([side * 0.26, 2.64, -0.87], [0.16, 0.28, 0.16], "#c09056"),
          v([side * 0.285, 2.45, -1.14], [0.035, 0.1, 0.1], "#302f30"),
          v([side * 0.45, 1.36, 0.1], [0.035, 0.5, 0.5], "#e5b83c"),
        );
    } else if (kind === "fennec") {
      p.push(
        v([0, 0.36, 0], [0.45, 0.45, 0.75], "#e9c18a"),
        v([0, 0.61, -0.4], [0.49, 0.4, 0.38], "#f4d6a4"),
        v([0, 0.5, -0.65], [0.24, 0.18, 0.23], "#fff1d4"),
        v([0, 0.54, -0.78], [0.11, 0.09, 0.05], "#413a30"),
        v([0, 0.22, 0.57], [0.25, 0.25, 0.65], "#d0a26e"),
        v([0, 0.22, 0.9], [0.22, 0.2, 0.15], "#fff4d7"),
      );
      for (const side of [-1, 1])
        p.push(
          v([side * 0.18, 1, -0.35], [0.2, 0.5, 0.18], "#edc58b"),
          v([side * 0.18, 1.04, -0.45], [0.1, 0.3, 0.025], "#d68984"),
          v([side * 0.15, 0.67, -0.6], [0.07, 0.09, 0.03], "#343a36"),
        );
    } else {
      p.push(
        v([0, 0.22, 0], [0.36, 0.3, 0.65], "#76aa57"),
        v([0, 0.3, -0.42], [0.43, 0.28, 0.4], "#a4cc6e"),
        v([0, 0.15, 0.53], [0.24, 0.16, 0.5], "#608f48"),
        v([0, 0.12, 0.88], [0.12, 0.1, 0.3], "#517d42"),
      );
      for (const side of [-1, 1])
        p.push(
          v([side * 0.2, 0.4, -0.48], [0.08, 0.08, 0.1], "#fff1b4"),
          v([side * 0.21, 0.41, -0.52], [0.045, 0.055, 0.04], "#253b3c"),
          v([side * 0.3, 0.14, 0.05], [0.3, 0.12, 0.3], "#a3c86d"),
        );
      for (let i = 0; i < 5; i++)
        p.push(v([0, 0.39, 0.3 - i * 0.14], [0.1, 0.06, 0.07], "#dce69b"));
    }
    return p;
  }, [kind]);
  const leg = useMemo(
    () => [
      v(
        [0, kind === "camel" ? -0.35 : -0.08, 0],
        kind === "camel" ? [0.21, 0.8, 0.25] : [0.12, 0.2, 0.13],
        kind === "camel" ? "#b98a4d" : "#dbb47c",
      ),
      v(
        [0, kind === "camel" ? -0.72 : -0.17, -0.03],
        kind === "camel" ? [0.25, 0.14, 0.33] : [0.15, 0.08, 0.2],
        "#655342",
      ),
    ],
    [kind],
  );
  return (
    <group>
      <VoxelMesh parts={parts} />
      {kind !== "lizard" &&
        [-1, 1].flatMap((s) =>
          [-1, 1].map((f) => (
            <group
              key={`${s}-${f}`}
              position={[
                s * (kind === "camel" ? 0.32 : 0.17),
                kind === "camel" ? 0.8 : 0.2,
                f * (kind === "camel" ? 0.53 : 0.23),
              ]}
              rotation={[walking * s * f, 0, 0]}
            >
              <VoxelMesh parts={leg} />
            </group>
          )),
        )}
    </group>
  );
}
const guardParts = [
  v([0, 0.8, 0], [0.65, 1, 0.5], "#af8c63"),
  v([0, 1.6, 0], [0.8, 0.6, 0.65], "#d7b484"),
  v([-0.18, 1.62, -0.34], [0.12, 0.08, 0.04], "#42b7c8"),
  v([0.18, 1.62, -0.34], [0.12, 0.08, 0.04], "#42b7c8"),
  v([0, 1.38, -0.35], [0.23, 0.035, 0.03], "#8d6649"),
  v([-0.48, 0.9, 0], [0.24, 0.8, 0.3], "#b7976c"),
  v([0.48, 0.9, 0], [0.24, 0.8, 0.3], "#b7976c"),
  v([-0.2, 0.2, 0], [0.28, 0.4, 0.4], "#8d7456"),
  v([0.2, 0.2, 0], [0.28, 0.4, 0.4], "#8d7456"),
  v([0, 1.95, 0], [0.34, 0.12, 0.32], "#2f8390"),
];
export function GuardModel() {
  return <VoxelMesh parts={guardParts} />;
}
const base = [
  v([0, 0.38, 0], [1.6, 0.76, 1.1], "#946030"),
  v([0, 0.4, -0.56], [1.6, 0.16, 0.06], "#e3b549"),
  v([-0.65, 0.4, 0], [0.1, 0.8, 1.13], "#e3b549"),
  v([0.65, 0.4, 0], [0.1, 0.8, 1.13], "#e3b549"),
];
const lid = [
  v([0, 0, -0.55], [1.66, 0.3, 1.18], "#b37c34"),
  v([0, 0.02, -1.15], [0.2, 0.32, 0.06], "#ffe18c"),
];
export function DesertChest({
  open,
  paused,
}: {
  open: boolean;
  paused: boolean;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current && !paused)
      ref.current.rotation.x = MathUtils.damp(
        ref.current.rotation.x,
        open ? -1.6 : 0,
        4,
        Math.min(dt, 1 / 30),
      );
  });
  return (
    <group>
      <VoxelMesh parts={base} />
      <group ref={ref} position={[0, 0.88, 0.55]}>
        <VoxelMesh parts={lid} />
      </group>
      {open && (
        <mesh position={[0, 1, 0]}>
          <octahedronGeometry args={[0.28]} />
          <meshStandardMaterial
            color="#ffda55"
            emissive="#ffbb22"
            emissiveIntensity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}

/** Three sockets give the physical gate the same progress language as the HUD. */
export function TempleSlots({ tablets }: { tablets: string[] }) {
  const parts = useMemo(() => {
    const p: Voxel[] = [];
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 1.15,
        filled = tablets.includes(`tablet-${i}`);
      p.push(v([x, 4.6, -25.4], [0.95, 1.05, 0.16], "#725532"));
      p.push(
        v([x, 4.6, -25.29], [0.74, 0.82, 0.08], filled ? "#f1c658" : "#224b61"),
      );
      const ink = filled ? "#75512a" : "#74afb7";
      if (i === 0) {
        p.push(v([x, 4.6, -25.23], [0.31, 0.31, 0.05], ink));
        for (const side of [-1, 1])
          p.push(
            v([x + side * 0.25, 4.6, -25.23], [0.08, 0.09, 0.05], ink),
            v([x, 4.6 + side * 0.27, -25.23], [0.09, 0.08, 0.05], ink),
          );
      }
      if (i === 1)
        p.push(
          v([x - 0.1, 4.6, -25.23], [0.14, 0.46, 0.05], ink),
          v([x + 0.03, 4.8, -25.23], [0.2, 0.09, 0.05], ink),
          v([x + 0.03, 4.4, -25.23], [0.2, 0.09, 0.05], ink),
        );
      if (i === 2)
        p.push(
          v([x, 4.6, -25.23], [0.13, 0.5, 0.05], ink),
          v([x, 4.6, -25.23], [0.46, 0.13, 0.05], ink),
        );
    }
    return p;
  }, [tablets]);
  return <VoxelMesh parts={parts} />;
}
