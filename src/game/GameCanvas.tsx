import { Suspense, useEffect, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { Scene, type SceneProps } from "./Scene";
// Keep slow devices from advancing half a second of physics between input frames.
// Rapier still uses 1/60 fixed substeps; a slow frame advances at most two steps.
function StablePhysicsStep({ paused }: { paused: boolean }) {
  const { step } = useRapier();
  useFrame((_, delta) => {
    if (!paused) step(Math.min(delta, 1 / 30));
  }, -1);
  return null;
}
function ContextMonitor({ onError }: { onError: (message: string) => void }) {
  const { gl } = useThree();
  const latest = useRef(onError);
  latest.current = onError;
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      latest.current("图形上下文已丢失，请重试。");
    };
    canvas.addEventListener("webglcontextlost", lost);
    // Remove before renderer disposal, which can itself emit a context-loss event.
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl]);
  return null;
}
export default function GameCanvas({
  onError,
  onRendererReady,
  ...props
}: SceneProps & {
  onError: (message: string) => void;
  onRendererReady: () => void;
}) {
  return (
    <Canvas
      shadows={!props.save.lowQuality}
      dpr={[
        1,
        props.save.lowQuality || matchMedia("(pointer:coarse)").matches
          ? 1
          : 1.5,
      ]}
      camera={{ fov: 52, near: 0.1, far: 90, position: [0, 8, 23] }}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        alpha: false,
      }}
      fallback={
        <div className="webgl-fallback">
          无法启动 WebGL。请使用 Safari / Chrome 打开 HTTPS
          网站，并启用硬件加速。
        </div>
      }
      onCreated={({ gl }) => {
        onRendererReady();
        gl.domElement.setAttribute("aria-label", "可探索的 3D 森林");
      }}
    >
      <ContextMonitor onError={onError} />
      <Suspense fallback={null}>
        <Physics
          gravity={[0, -18, 0]}
          timeStep={1 / 60}
          paused
          interpolate={false}
        >
          <StablePhysicsStep paused={props.paused} />
          <Scene {...props} />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
