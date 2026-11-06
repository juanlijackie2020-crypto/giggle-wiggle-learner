import { memo } from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Box } from "./Avatar";
import { BakedVoxels } from "./BakedVoxels";
import type { Vec3 } from "./world";
function Solid({ p, s, c }: { p: Vec3; s: Vec3; c: string }) {
  return (
    <RigidBody type="fixed" colliders={false} position={p}>
      <CuboidCollider args={[s[0] / 2, s[1] / 2, s[2] / 2]} />
      <Box p={[0, 0, 0]} s={s} c={c} />
    </RigidBody>
  );
}
export const ForestExpansion = memo(function ForestExpansion() {
  return (
    <BakedVoxels>
      {/* Second real river crossing, including physical hand rails. */}
      <Solid p={[24, -0.14, -4]} s={[3.8, 0.32, 8.2]} c="#bd884a" />
      {[-1.9, 1.9].map((x) => (
        <group key={x}>
          <Solid p={[24 + x, 1.1, -4]} s={[0.16, 0.16, 7.6]} c="#e0b270" />
          {[-7.5, -4, -0.5].map((z) => (
            <Solid
              key={z}
              p={[24 + x, 0.6, z]}
              s={[0.22, 1.3, 0.22]}
              c="#855532"
            />
          ))}
        </group>
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <Box
          key={i}
          p={[24, 0.035, -7.8 + i * 0.5]}
          s={[3.65, 0.04, 0.06]}
          c="#744d2c"
        />
      ))}
      {/* An accessible cottage. Door faces south; wall gaps are actual walkable openings. */}
      <group position={[27, 0, -17]}>
        <Solid p={[0, 0.06, 0]} s={[6, 0.12, 5]} c="#bb9767" />
        <Solid p={[-3, 1.65, 0]} s={[0.3, 3.3, 5.4]} c="#f1ddac" />
        <Solid p={[3, 1.65, 0]} s={[0.3, 3.3, 5.4]} c="#f1ddac" />
        <Solid p={[0, 1.65, -2.5]} s={[6, 3.3, 0.3]} c="#ead39c" />
        {[-2, 2].map((x) => (
          <Solid key={x} p={[x, 1.65, 2.5]} s={[2, 3.3, 0.3]} c="#f3e4bd" />
        ))}
        <Solid p={[0, 3, 2.5]} s={[2, 0.6, 0.3]} c="#8c5b34" />
        {[-2.9, 2.9].flatMap((x) =>
          [-2.5, 2.5].map((z) => (
            <Solid
              key={`${x}:${z}`}
              p={[x, 1.7, z]}
              s={[0.4, 3.4, 0.4]}
              c="#80542f"
            />
          )),
        )}
        {Array.from({ length: 6 }, (_, i) => (
          <Box
            key={i}
            p={[0, 3.35 + i * 0.28, 0]}
            s={[7.3 - i * 0.98, 0.35, 6.2]}
            c={i % 2 ? "#be8039" : "#ce9448"}
          />
        ))}
        {[-2, 2].map((x) => (
          <group key={x}>
            <Box p={[x, 1.8, 2.67]} s={[1, 0.95, 0.035]} c="#6bc5d6" />
            <Box p={[x, 1.8, 2.7]} s={[0.08, 1.08, 0.04]} c="#89592e" />
            <Box p={[x, 1.8, 2.7]} s={[1.1, 0.08, 0.04]} c="#89592e" />
            <Box p={[x, 1.2, 2.85]} s={[1.2, 0.24, 0.5]} c="#9c642e" />
            {[-0.35, 0, 0.35].map((dx) => (
              <Box
                key={dx}
                p={[x + dx, 1.4, 2.85]}
                s={[0.22, 0.2, 0.22]}
                c={dx === 0 ? "#ffd65d" : "#ef84b4"}
              />
            ))}
          </group>
        ))}
        <Solid p={[-1.8, 0.65, -1.5]} s={[1.6, 1.1, 0.75]} c="#ba8145" />
        <Box p={[2, 4.5, -1]} s={[0.8, 2.2, 0.8]} c="#a5a59a" />
        <Box p={[2, 5.62, -1]} s={[1, 0.2, 1]} c="#6b766d" />
      </group>
      {/* Stepped foothills: low physical terraces leading to a lookout. */}
      {[0, 1, 2, 3].map((i) => (
        <Solid
          key={i}
          p={[-31, 0.22 + i * 0.22, -36 - i * 1.2]}
          s={[9 - i, 0.44 + i * 0.44, 2.4]}
          c={i % 2 ? "#74ae43" : "#91bc53"}
        />
      ))}
      {/* River banks and branch paths; thin pieces do not obstruct movement. */}
      {[-0.7, -7.3].map((z) => (
        <Box key={z} p={[0, 0.015, z]} s={[80, 0.025, 0.6]} c="#e9d69c" />
      ))}
      {Array.from({ length: 40 }, (_, i) => (
        <group key={i}>
          <Box
            p={[-38 + i * 1.94, 0.02, 26 + Math.sin(i * 0.4) * 1.3]}
            s={[1.65, 0.04, 1.2]}
            c={i % 3 ? "#c6bc94" : "#d6cba6"}
          />
          <Box
            p={[24 + Math.sin(i * 0.2) * 0.5, 0.02, 30 - i * 1.82]}
            s={[1.65, 0.04, 1.4]}
            c={i % 3 ? "#c6bc94" : "#d6cba6"}
          />
        </group>
      ))}
      {/* Chunky grass edges, original low-cost pixel patches and wildflower clusters. */}
      {Array.from({ length: 360 }, (_, i) => {
        const x = ((i * 29) % 77) - 38,
          z = ((i * 37) % 81) - 45;
        if (
          (z > -8 && z < 0) ||
          Math.abs(x) < 5 ||
          (x > 23 && x < 31 && z < -12 && z > -21)
        )
          return null;
        return (
          <group key={i}>
            <Box
              p={[x, 0.018, z]}
              s={[0.4 + (i % 3) * 0.22, 0.025, 0.6]}
              c={["#89c64f", "#659e3b", "#9cc957"][i % 3]}
            />
            <Box p={[x, 0.22, z]} s={[0.055, 0.42, 0.055]} c="#4d8e37" />
            <Box
              p={[x, 0.43, z]}
              s={[0.28, 0.08, 0.12]}
              c={["#fff6dd", "#efadd5", "#ffce4c"][i % 3]}
            />
            <Box
              p={[x, 0.43, z]}
              s={[0.12, 0.08, 0.28]}
              c={["#fff6dd", "#efadd5", "#ffce4c"][i % 3]}
            />
            <Box p={[x, 0.48, z]} s={[0.09, 0.045, 0.09]} c="#e7a837" />
          </group>
        );
      })}
      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} position={[-36 + i * 6, 0, -54 - (i % 3) * 3]}>
          {[0, 1, 2, 3].map((j) => (
            <Box
              key={j}
              p={[0, 2 + j * 2, 0]}
              s={[9 - j * 1.8, 4, 8 - j * 1.3]}
              c={j === 3 ? "#f4f2dd" : ["#729589", "#8ba496", "#a0b6a4"][j]}
            />
          ))}
        </group>
      ))}
    </BakedVoxels>
  );
});
