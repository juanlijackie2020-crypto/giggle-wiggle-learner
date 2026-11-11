import { useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Avatar, Box } from "./game/Avatar";
import type { Appearance } from "./game/state";
function Ready({ done }: { done: () => void }) {
  const first = useRef(true);
  useFrame(() => {
    if (first.current) {
      first.current = false;
      done();
    }
  });
  return null;
}
export default function AvatarPreview({
  appearance,
  desertGear = false,
  equipment = { pickaxe: true, backpack: true },
}: {
  appearance: Appearance;
  desertGear?: boolean;
  equipment?: { pickaxe: boolean; backpack: boolean };
}) {
  const [ready, setReady] = useState(false);
  return (
    <div
      data-ready={ready}
      className="avatar-preview"
      aria-label="可拖动旋转的角色预览"
    >
      <Canvas
        dpr={1}
        camera={{ position: [2, 1.6, -3.6], fov: 38 }}
        gl={{ antialias: false }}
      >
        <Ready done={() => setReady(true)} />
        <color attach="background" args={["#a9e6db"]} />
        <ambientLight intensity={2} />
        <directionalLight position={[2, 5, -4]} intensity={2} />
        <group rotation={[0, -0.2, 0]}>
          <Avatar
            appearance={appearance}
            {...equipment}
            desertGear={desertGear}
          />
        </group>
        <Box p={[0, -0.73, 0]} s={[1.6, 0.12, 1.4]} c="#66aa45" />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          target={[0, 0.35, 0]}
          minPolarAngle={0.7}
          maxPolarAngle={1.8}
        />
      </Canvas>
      <span>{ready ? "拖动看看新装扮" : "正在准备 3D 换装镜…"}</span>
    </div>
  );
}
