import type { Appearance } from "./state";
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
export function Avatar({
  appearance,
  walking = 0,
}: {
  appearance: Appearance;
  walking?: number;
}) {
  const { skin, shirt, outfit } = appearance;
  return (
    <group position={[0, -0.65, 0]}>
      <group rotation={[walking, 0, 0]}>
        <Box p={[-0.16, 0.22, 0]} s={[0.23, 0.44, 0.28]} c="#465d64" />
        <Box p={[-0.16, 0.04, 0.04]} s={[0.25, 0.12, 0.36]} c="#433e36" />
      </group>
      <group rotation={[-walking, 0, 0]}>
        <Box p={[0.16, 0.22, 0]} s={[0.23, 0.44, 0.28]} c="#465d64" />
        <Box p={[0.16, 0.04, 0.04]} s={[0.25, 0.12, 0.36]} c="#433e36" />
      </group>
      <Box p={[0, 0.74, 0]} s={[0.57, 0.6, 0.36]} c={shirt} />
      <group rotation={[-walking, 0, 0]}>
        <Box
          p={[-0.4, 0.74, 0]}
          s={[0.22, 0.54, 0.28]}
          c={outfit === "hoodie" ? shirt : skin}
        />
      </group>
      <group rotation={[walking, 0, 0]}>
        <Box
          p={[0.4, 0.74, 0]}
          s={[0.22, 0.54, 0.28]}
          c={outfit === "hoodie" ? shirt : skin}
        />
      </group>
      <Box p={[0, 1.3, 0]} s={[0.52, 0.52, 0.5]} c={skin} />
      <Box p={[-0.12, 1.34, -0.26]} s={[0.07, 0.09, 0.025]} c="#283a3c" />
      <Box p={[0.12, 1.34, -0.26]} s={[0.07, 0.09, 0.025]} c="#283a3c" />
      <Box p={[0, 1.17, -0.26]} s={[0.13, 0.035, 0.025]} c="#995c4b" />
      <Box p={[0, 1.56, 0.02]} s={[0.55, 0.13, 0.52]} c="#574330" />
      {outfit === "explorer" && (
        <>
          <Box p={[0, 1.67, 0]} s={[0.61, 0.16, 0.6]} c="#b9a473" />
          <Box p={[0, 1.57, -0.04]} s={[0.8, 0.06, 0.8]} c="#d2bd8d" />
          <Box p={[0, 0.76, 0.26]} s={[0.42, 0.48, 0.2]} c="#8c6c41" />
        </>
      )}
      {outfit === "hoodie" && (
        <>
          <Box p={[0, 1.54, 0.08]} s={[0.64, 0.26, 0.58]} c={shirt} />
          <Box p={[0, 0.56, -0.2]} s={[0.34, 0.14, 0.05]} c="#e8dec6" />
        </>
      )}
      {outfit === "ranger" && (
        <>
          <Box p={[0, 1.65, 0]} s={[0.58, 0.18, 0.57]} c="#476947" />
          <Box p={[0, 1.54, -0.12]} s={[0.71, 0.06, 0.75]} c="#476947" />
          <Box p={[0, 0.7, -0.2]} s={[0.6, 0.09, 0.06]} c="#e2c477" />
        </>
      )}
    </group>
  );
}
