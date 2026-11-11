import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  RigidBody,
  CuboidCollider,
  CapsuleCollider,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Group, Vector2, Vector3, MathUtils } from "three";
import { Avatar } from "../game/Avatar";
import { VoxelMesh, voxel as v, type Voxel } from "../game/VoxelMesh";
import type { Save } from "../game/state";
import { input, clearInput } from "../game/input";
import {
  level,
  cellAt,
  cellPosition,
  route,
  mazeWalls,
  templeWalls,
  bounds,
  gateWall,
  looseWall,
  clearLine,
  type Point,
  type Wall,
} from "./maze";
import type { DesertAction } from "./state";
import { DesertAnimal, DesertChest, GuardModel, TempleSlots } from "./Models";
export type DesertStatus = {
  x: number;
  y: number;
  z: number;
  near: string;
  grounded: boolean;
  draws: number;
  guide: boolean;
  camelX: number;
  camelZ: number;
};
export type DesertController = {
  swing: () => void;
  returnSafe: () => void;
  guide: () => void;
};
export type WorldProps = {
  save: Save;
  paused: boolean;
  onStatus: (s: DesertStatus) => void;
  dispatch: (a: DesertAction) => void;
  onReady: () => void;
  onNotice: (s: string) => void;
  controller: RefObject<DesertController | null>;
};
function Collider({ p, s }: Wall) {
  return (
    <RigidBody type="fixed" colliders={false} position={p}>
      <CuboidCollider args={[s[0] / 2, s[1] / 2, s[2] / 2]} />
    </RigidBody>
  );
}
function Solid({ wall, color }: { wall: Wall; color: string }) {
  const parts = useMemo(() => [v(wall.p, wall.s, color)], [wall, color]);
  return (
    <>
      <Collider {...wall} />
      <VoxelMesh parts={parts} />
    </>
  );
}
const scenery: Voxel[] = [
  v([0, -0.5, 0], [96, 1, 96], "#edce88"),
  v([0, 0.01, 28], [2, 0.03, 14], "#fff0b7"),
  v([0, 0.015, -33], [19, 0.04, 14], "#e5bb71"),
];
for (const [i, w] of [...mazeWalls, ...templeWalls].entries()) {
  scenery.push(v(w.p, w.s, i < mazeWalls.length ? "#d5ad68" : "#b88042"));
  const horizontal = w.s[0] > w.s[2];
  scenery.push(
    v(
      [w.p[0], w.p[1] + w.s[1] / 2 + 0.08, w.p[2]],
      [w.s[0] + 0.12, 0.16, w.s[2] + 0.12],
      "#f8df9b",
    ),
  );
  for (let j = -1; j <= 1; j++)
    scenery.push(
      v(
        [
          w.p[0] + (horizontal ? j * 1.4 : 0),
          1.4 + (j % 2) * 0.55,
          w.p[2] + (horizontal ? 0 : j * 1.4),
        ],
        horizontal ? [0.7, 0.23, w.s[2] + 0.02] : [w.s[0] + 0.02, 0.23, 0.7],
        ["#c49c5c", "#eccd8c", "#b68d52"][j + 1],
      ),
    );
}
for (let i = 0; i < 22; i++) {
  const x = i % 2 === 0 ? -33 - (i % 4) * 2 : 33 + (i % 3) * 2,
    z = -40 + i * 3.8;
  scenery.push(
    v([x, 0.8, z], [5, 1.6, 5], "#dfb76e"),
    v([x, 0.8 + 1, z], [3.3, 0.6, 3.3], "#f5d698"),
  );
}
for (let i = 0; i < 49; i++) {
  const [x, , z] = cellPosition(i);
  scenery.push(
    v([x, 0.016, z], [1.5, 0.025, 1.5], i % 3 === 0 ? "#f6dfab" : "#e3be79"),
  );
}
for (let i = 0; i < 8; i++) {
  scenery.push(
    v(
      [0, 0.035, 22 + i * 1.65],
      [1.5, 0.04, 0.8],
      i % 2 ? "#ead6a4" : "#d7bd82",
    ),
  );
}
for (let i = 0; i < 18; i++) {
  const x = -22 + (i % 6) * 8,
    z = 30 + Math.floor(i / 6) * 5;
  scenery.push(v([x, 0.025, z], [0.5, 0.04, 0.2], "#ccab67"));
}
for (let i = 0; i < 6; i++)
  scenery.push(
    v(
      [-37, 0.6 + i * 1.1, -34],
      [15 - i * 2, 1.2, 15 - i * 2],
      i % 2 ? "#d0a668" : "#dfbb7f",
    ),
  );
// Oasis island, palm leaves, tents, flags, murals and readable landmark silhouettes.
scenery.push(
  v([-11, 0.02, 34], [10, 0.06, 8], "#38b9c5"),
  v([-11, 0.055, 34], [8, 0.025, 6], "#6bd6d5"),
  v([6, 1.4, 33], [4, 2.8, 0.2], "#216e87"),
  v([6, 2.9, 34], [5, 0.3, 3], "#f6edc7"),
  v([6, 0.4, 34], [3, 0.8, 1], "#ad7c41"),
);
for (const [x, z] of [
  [-16, 31],
  [-7, 38],
  [9, 38],
  [-16, 37],
  [30, 20],
  [-30, -28],
]) {
  scenery.push(v([x, 2, z], [0.55, 4, 0.55], "#997149"));
  for (let i = 0; i < 4; i++)
    scenery.push(
      v(
        [
          x + (i < 2 ? (i === 0 ? -1 : 1) * 1.3 : 0),
          4.1,
          z + (i >= 2 ? (i === 2 ? -1 : 1) * 1.3 : 0),
        ],
        i < 2 ? [3.3, 0.28, 0.8] : [0.8, 0.28, 3.3],
        i % 2 ? "#58ab69" : "#348f65",
      ),
    );
  scenery.push(v([x, 4.45, z], [1.2, 0.5, 1.2], "#79bb65"));
}
for (const [x, , z] of level.checkpoints) {
  scenery.push(
    v([x, 0.04, z], [2, 0.08, 2], "#b2e4db"),
    v([x - 1.2, 1.25, z], [0.1, 2.5, 0.1], "#795732"),
    v([x - 0.7, 2.1, z], [1, 0.55, 0.08], "#2d9fa3"),
  );
}
for (let i = 0; i < 6; i++) {
  const x = i % 2 === 0 ? -8 : 8,
    z = -28 - Math.floor(i / 2) * 5;
  scenery.push(
    v([x, 2.3, z], [1, 4.6, 1], "#e2bb7b"),
    v([x, 4.6, z], [1.4, 0.3, 1.4], "#274b67"),
    v([x, 0.15, z], [1.6, 0.3, 1.6], "#f6dfa7"),
  );
}
scenery.push(
  v([0, 6.2, -26], [22, 0.45, 2], "#1e5d77"),
  v([0, 6.7, -26], [17, 0.5, 2], "#e4bc61"),
  v([0, 7.2, -26], [10, 0.5, 2], "#e4bc61"),
  v([0, 7.7, -26], [3, 0.5, 2], "#f7dc90"),
  v([-9.43, 2, -32], [0.06, 2, 3], "#257c91"),
);
for (let i = 0; i < 5; i++)
  scenery.push(
    v(
      [-9.38, 1.4 + i * 0.3, -32 + (i % 2) * 0.4],
      [0.06, 0.15, 1.2],
      "#f5cc69",
    ),
  );
scenery.push(
  v([27, 0.4, 5], [2, 0.8, 2], "#b58e54"),
  v([27, 1.1, 5], [0.15, 1.2, 0.15], "#31546a"),
);
for (const m of level.markers.filter((m) => m.task === "tracks"))
  for (let i = 0; i < 4; i++)
    scenery.push(
      v(
        [
          m.position[0] + (i % 2 ? -0.25 : 0.25),
          0.045,
          m.position[2] + i * 0.3,
        ],
        [0.22, 0.045, 0.35],
        "#9b7847",
      ),
    );
for (let i = 0; i < 8; i++)
  scenery.push(
    v(
      [-45 + i * 12, 15 + (i % 3) * 3, -44],
      [5 + (i % 2) * 2, 0.7, 2],
      "#fff5d5",
    ),
  );
for (const w of bounds)
  scenery.push(
    v(w.p, w.s, "#c3a26b"),
    v([w.p[0], 6.1, w.p[2]], [w.s[0], 0.2, w.s[2]], "#eed294"),
  );
const Landscape = memo(function Landscape() {
  return (
    <>
      <VoxelMesh parts={scenery} />
      {[
        ...mazeWalls,
        ...templeWalls,
        ...bounds,
        { p: [0, -0.5, 0] as Point, s: [96, 1, 96] as Point },
      ].map((w, i) => (
        <Collider key={i} {...w} />
      ))}
    </>
  );
});
const tabletParts = [
  v([0, 0.7, 0], [0.65, 1, 0.18], "#e2b455"),
  v([0, 0.7, -0.1], [0.45, 0.7, 0.03], "#2f8490"),
  v([0, 0.7, -0.13], [0.08, 0.4, 0.03], "#f8e1a0"),
  v([0, 0.7, -0.14], [0.3, 0.08, 0.03], "#f8e1a0"),
];
const oreParts = [
  v([0, 0.3, 0], [1, 0.6, 0.8], "#a99d88"),
  v([-0.2, 0.8, 0], [0.3, 0.75, 0.3], "#94ded2"),
  v([0.25, 0.6, 0.1], [0.3, 0.6, 0.3], "#d3fff2"),
];
const markerParts = [
  v([0, 0.7, 0], [0.1, 1.4, 0.1], "#896238"),
  v([0, 1.35, 0], [0.7, 0.5, 0.1], "#3e9cad"),
];
function Token({ p, kind }: { p: Point; kind: "tablet" | "ore" | "marker" }) {
  return (
    <group position={p}>
      <VoxelMesh
        parts={
          kind === "tablet"
            ? tabletParts
            : kind === "ore"
              ? oreParts
              : markerParts
        }
      />
    </group>
  );
}
export function World(props: WorldProps) {
  const { save, paused, controller } = props,
    s = save.desert;
  const latest = useRef(props);
  latest.current = props;
  const body = useRef<RapierRigidBody>(null),
    visual = useRef<Group>(null),
    camel = useRef<Group>(null);
  const guards = useRef<(Group | null)[]>([]),
    guardTime = useRef(0),
    guidePath = useRef<Point[]>([]),
    guideIndex = useRef(0);
  const { camera, gl } = useThree(),
    { world, rapier } = useRapier();
  const [walk, setWalk] = useState(0),
    [swing, setSwing] = useState(0),
    [camelWalk, setCamelWalk] = useState(0);
  const spawn = useMemo(() => level.checkpoints[s.checkpoint] as Point, []),
    first = useRef(true),
    last = useRef(0),
    bumpAt = useRef(0);
  const shadowTarget = useRef<Group>(null);
  const dynamicWalls = [
    ...mazeWalls,
    ...templeWalls,
    ...(!s.gate ? [gateWall] : []),
    ...(!s.broken ? [looseWall] : []),
  ];
  const walls = useRef(dynamicWalls);
  walls.current = dynamicWalls;
  function returnSafe() {
    const rb = body.current;
    if (!rb) return;
    const d = latest.current.save.desert;
    const index = d.visited.includes(2) ? 2 : d.checkpoint;
    const p = level.checkpoints[index];
    rb.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    latest.current.dispatch({ type: "checkpoint", index });
    clearInput();
    latest.current.onNotice(
      index === 2 ? "回到中庭了，石板还在！" : "回到安全旗旁，收集品还在！",
    );
  }
  function respawn() {
    const rb = body.current,
      p = level.checkpoints[latest.current.save.desert.checkpoint];
    if (rb) {
      rb.setTranslation({ x: p[0], y: 1, z: p[2] }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    clearInput();
    latest.current.onNotice("石头守卫碰到你了，回到安全旗再试一次。");
  }
  function guide() {
    if (!camel.current) return;
    const d = latest.current.save.desert,
      target = level.tablets.find((t) => !d.tablets.includes(t.id));
    if (!target) {
      latest.current.onNotice("石板齐了！向北走，前往神殿门口。");
      return;
    }
    const p = camel.current.position,
      c = cellAt(p.x, p.z),
      start = c < 0 ? level.maze.entrance : c;
    const path = route(start, target.cell).slice(0, 5).map(cellPosition);
    guidePath.current = c < 0 ? [[0, 0, 27], [0, 0, 24], ...path] : path;
    guideIndex.current = 0;
    latest.current.onNotice(
      `阿沙带你走一小段，朝${target.name}的方向出发。靠近它就会继续走。`,
    );
  }
  useEffect(() => {
    controller.current = {
      returnSafe,
      swing: () => setSwing((n) => n + 1),
      guide,
    };
    return () => {
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    const el = gl.domElement;
    let pointer: number | null = null,
      lx = 0,
      ly = 0;
    const down = (e: PointerEvent) => {
      if (latest.current.paused || e.button !== 0) return;
      pointer = e.pointerId;
      lx = e.clientX;
      ly = e.clientY;
      el.setPointerCapture(pointer);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointer || latest.current.paused) return;
      input.yaw -= (e.clientX - lx) * 0.006;
      input.pitch = MathUtils.clamp(
        input.pitch + (e.clientY - ly) * 0.004,
        0.35,
        1.15,
      );
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = () => {
      pointer = null;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl]);
  useFrame(({ clock }, delta) => {
    const rb = body.current;
    if (!rb) return;
    const p = rb.translation(),
      current = latest.current,
      d = current.save.desert;
    const dt = Math.min(delta, 1 / 30);
    if (first.current) {
      first.current = false;
      camera.position.set(p.x, p.y + 8, p.z + 8);
      current.onReady();
    }
    const grounded = !!world.castRay(
      new rapier.Ray({ x: p.x, y: p.y - 0.25, z: p.z }, { x: 0, y: -1, z: 0 }),
      0.48,
      true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      undefined,
      rb,
    );
    let moving = false;
    if (!current.paused) {
      const keys = input.keys,
        dx =
          input.x +
          (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
          (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
        dz =
          input.z +
          (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
          (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0),
        v2 = new Vector2(dx, dz);
      if (v2.length() > 1) v2.normalize();
      const x = (v2.x * Math.cos(input.yaw) + v2.y * Math.sin(input.yaw)) * 5.5,
        z = (-v2.x * Math.sin(input.yaw) + v2.y * Math.cos(input.yaw)) * 5.5;
      rb.setLinvel(
        { x, y: input.jump && grounded ? 6.5 : rb.linvel().y, z },
        true,
      );
      input.jump = false;
      moving = v2.length() > 0.1;
      if (moving && visual.current)
        visual.current.rotation.y = Math.atan2(-x, -z);
      if (p.y < -2) respawn();
      if (camel.current && guideIndex.current < guidePath.current.length) {
        const cp = camel.current.position,
          target = new Vector3(...guidePath.current[guideIndex.current]);
        target.y = 0;
        if (cp.distanceTo(target) < 0.15) guideIndex.current++;
        else if (
          Math.hypot(cp.x - p.x, cp.z - p.z) < 9 &&
          clearLine([cp.x, 0, cp.z], [target.x, 0, target.z], walls.current)
        ) {
          const dir = target.sub(cp).normalize();
          cp.addScaledVector(dir, dt * 2.6);
          camel.current.rotation.y = Math.atan2(-dir.x, -dir.z);
        }
      }
      guardTime.current += dt;
      guards.current.forEach((g, i) => {
        if (!g) return;
        const homeX = i < 2 ? -33 : 33,
          homeZ = -12 - (i % 2) * 18,
          dist = Math.hypot(p.x - g.position.x, p.z - g.position.z);
        // Guards remain in the outer dunes, with a clear safe route along x=25.
        const chase = dist < 6 && Math.abs(p.x) > 29;
        const target = new Vector3(
          chase ? p.x : homeX + Math.sin(guardTime.current * 0.65 + i) * 2,
          0,
          chase ? p.z : homeZ + Math.cos(guardTime.current * 0.65 + i) * 3,
        );
        const dir = target.sub(g.position);
        if (dir.length() > 0.1) {
          dir.normalize();
          g.position.addScaledVector(dir, dt * (chase ? 2.5 : 1.2));
          g.rotation.y = Math.atan2(-dir.x, -dir.z);
        }
        if (dist < 0.85 && clock.elapsedTime - bumpAt.current > 2) {
          bumpAt.current = clock.elapsedTime;
          respawn();
        }
      });
    } else {
      rb.setLinvel({ x: 0, y: rb.linvel().y, z: 0 }, true);
    }
    const target = new Vector3(p.x, p.y + 0.7, p.z),
      desired = new Vector3(
        p.x + Math.sin(input.yaw) * 10 * Math.cos(input.pitch),
        p.y + 2 + Math.sin(input.pitch) * 10,
        p.z + Math.cos(input.yaw) * 10 * Math.cos(input.pitch),
      );
    // Pull the camera in when a sandstone wall is between it and the player.
    const dir = desired.clone().sub(target),
      len = dir.length();
    dir.normalize();
    const hit = world.castRay(
      new rapier.Ray(target, dir),
      len,
      true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      undefined,
      rb,
    );
    if (hit)
      desired
        .copy(target)
        .addScaledVector(dir, Math.max(0.9, hit.timeOfImpact - 0.25));
    camera.position.lerp(desired, 1 - Math.exp(-12 * dt));
    camera.lookAt(target);
    if (shadowTarget.current) shadowTarget.current.position.set(p.x, 0, p.z);
    if (clock.elapsedTime - last.current > 0.13) {
      last.current = clock.elapsedTime;
      if (!current.paused) {
        const cell = cellAt(p.x, p.z);
        if (cell >= 0 && !d.explored.includes(cell))
          current.dispatch({ type: "explore", cell });
        level.checkpoints.forEach((cp, i) => {
          if (i !== d.checkpoint && Math.hypot(p.x - cp[0], p.z - cp[2]) < 1.25)
            current.dispatch({ type: "checkpoint", index: i });
        });
      }
      const targets: { id: string; p: Point; ownWall?: Wall }[] = [
        ...level.deadEndClues.map((c) => ({
          id: c.id,
          p: cellPosition(c.cell),
        })),
        ...level.tablets
          .filter((t) => !d.tablets.includes(t.id))
          .map((t) => ({ id: t.id, p: cellPosition(t.cell) })),
        ...level.ores
          .filter((o) => !d.mined.includes(o.id))
          .map((o) => ({ id: o.id, p: o.position as Point })),
        ...level.animals.map((a) => ({
          id: a.id,
          p:
            a.id === "camel" && camel.current
              ? ([
                  camel.current.position.x,
                  0,
                  camel.current.position.z,
                ] as Point)
              : (a.position as Point),
        })),
        ...level.markers
          .filter(
            (m) => m.task === d.task && !(d.steps[m.task] ?? []).includes(m.id),
          )
          .map((m) => ({ id: m.id, p: m.position as Point })),
        { id: "chest", p: level.chest as Point },
        ...(!d.broken
          ? [{ id: "sandstone", p: looseWall.p, ownWall: looseWall }]
          : []),
        ...(!d.gate ? [{ id: "gate", p: gateWall.p, ownWall: gateWall }] : []),
      ];
      let near = "",
        best = 2.6;
      for (const t of targets) {
        const distance = Math.hypot(p.x - t.p[0], p.z - t.p[2]);
        if (
          distance < best &&
          clearLine(
            [p.x, p.y, p.z],
            t.p,
            walls.current.filter((w) => w !== t.ownWall),
          )
        ) {
          best = distance;
          near = t.id;
        }
      }
      current.onStatus({
        x: p.x,
        y: p.y,
        z: p.z,
        near,
        grounded,
        draws: gl.info.render.calls,
        guide: guideIndex.current < guidePath.current.length,
        camelX: camel.current?.position.x ?? -4,
        camelZ: camel.current?.position.z ?? 29,
      });
      setWalk(moving ? Math.sin(clock.elapsedTime * 11) * 0.5 : 0);
      setCamelWalk(
        !current.paused && guideIndex.current < guidePath.current.length
          ? Math.sin(clock.elapsedTime * 7) * 0.35
          : 0,
      );
    }
  });
  return (
    <>
      <color attach="background" args={["#75cef1"]} />
      <fog attach="fog" args={["#dfe7cc", 65, 135]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#fff6ce", "#bfa06c", 0.65]} />
      <directionalLight
        position={[-18, 38, 22]}
        intensity={1.7}
        castShadow={!save.lowQuality}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-far={130}
        shadow-bias={-0.001}
        shadow-normalBias={0.04}
      />
      <Landscape />
      <TempleSlots tablets={s.tablets} />
      {level.deadEndClues.map((c) => (
        <Token key={c.id} p={cellPosition(c.cell)} kind="marker" />
      ))}
      {!s.broken && <Solid wall={looseWall} color="#e5bc75" />}
      {!s.gate && <Solid wall={gateWall} color="#2d7183" />}
      {!s.broken && (
        <Token p={[looseWall.p[0], 3.5, looseWall.p[2]]} kind="ore" />
      )}
      {level.tablets
        .filter((t) => !s.tablets.includes(t.id))
        .map((t) => (
          <Token key={t.id} p={cellPosition(t.cell)} kind="tablet" />
        ))}
      {level.ores
        .filter((o) => !s.mined.includes(o.id))
        .map((o) => (
          <Token key={o.id} p={o.position as Point} kind="ore" />
        ))}
      {level.markers
        .filter((m) => m.task === s.task)
        .map((m) => (
          <Token key={m.id} p={m.position as Point} kind="marker" />
        ))}
      <group position={[0, 0, -36]}>
        <DesertChest open={s.completed} paused={paused} />
      </group>
      {level.animals.map((a) => (
        <group
          key={a.id}
          ref={a.id === "camel" ? camel : undefined}
          position={a.position as Point}
        >
          <DesertAnimal
            kind={a.id}
            walking={a.id === "camel" ? camelWalk : 0}
          />
        </group>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <group
          key={i}
          ref={(g) => {
            guards.current[i] = g;
          }}
          position={[i < 2 ? -33 : 33, 0, -12 - (i % 2) * 18]}
        >
          <GuardModel />
        </group>
      ))}
      <RigidBody
        ref={body}
        position={spawn}
        colliders={false}
        enabledRotations={[false, false, false]}
        mass={1}
        friction={0}
        restitution={0}
        ccd
        canSleep={false}
        linearDamping={0}
      >
        <CapsuleCollider args={[0.35, 0.28]} />
        <group ref={visual}>
          <Avatar
            appearance={save.appearance}
            {...save.equipment}
            desertGear={s.scarf}
            walking={walk}
            swing={swing}
            paused={paused}
          />
        </group>
      </RigidBody>
    </>
  );
}
