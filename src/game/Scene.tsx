import { useEffect, useRef, useMemo, useState, memo, createRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import {
  RigidBody,
  CuboidCollider,
  CapsuleCollider,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import { Avatar, Box } from "./Avatar";
import { monsterModels, MONSTER_PARTS } from "./monsterModel";
import { ForestExpansion } from "./ForestExpansion";
import { WORLD, oreDeposits } from "./expansion";
import { AnimalModel } from "./AnimalModel";
import { BakedVoxels } from "./BakedVoxels";
import { input, clearInput } from "./input";
import {
  trees,
  rocks,
  collectibles,
  checkpoints,
  chestPosition,
  monsterStarts,
  animals,
  animalPosition,
  distance,
  type Vec3,
} from "./world";
import level from "../data/level1.json";
import { taskMarkers, stumps } from "./tasks";
import type { Save } from "./state";
export type Status = {
  x: number;
  y: number;
  z: number;
  near: string;
  grounded: boolean;
  draws: number;
  nearbyAnimals: string[];
};
export type Controller = { respawn: () => void; swing: () => void };
export type SceneProps = {
  save: Save;
  paused: boolean;
  onStatus: (s: Status) => void;
  onInteract: (id?: string) => void;
  onCheckpoint: (n: number) => void;
  onBump: () => void;
  controller: React.RefObject<Controller | null>;
  onReady: () => void;
  onTaskStep: (task: string, step: string) => void;
  onParkourReset: () => void;
};
const temp = new THREE.Object3D(),
  color = new THREE.Color();
const PLAYER_DATA = { player: true };
const monsterSafeZones = [
  ...checkpoints.map((position) => ({ position, radius: 2.4 })),
  { position: [3.8, 0, 19] as Vec3, radius: 4 },
  { position: animals[2].position, radius: 2.8 },
  ...taskMarkers
    .filter((m) => m.task === "explore" && m.id !== "bridge")
    .map((m) => ({
      position: m.position,
      radius: m.id === "treehouse" ? 2.8 : 2.4,
    })),
];
const LOCK_ROTATIONS: [boolean, boolean, boolean] = [false, false, false];
function FixedBox({ p, s, c }: { p: Vec3; s: Vec3; c: string }) {
  return (
    <RigidBody type="fixed" colliders={false} position={p}>
      <CuboidCollider args={[s[0] / 2, s[1] / 2, s[2] / 2]} />
      <Box p={[0, 0, 0]} s={s} c={c} />
    </RigidBody>
  );
}
function Forest() {
  const trunks = useRef<THREE.InstancedMesh>(null),
    leaves = useRef<THREE.InstancedMesh>(null),
    tops = useRef<THREE.InstancedMesh>(null),
    pixels = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    trees.forEach(([x, , z], i) => {
      const size = 0.85 + (i % 3) * 0.16;
      temp.rotation.set(0, 0, 0);
      temp.position.set(x, 1.3, z);
      temp.scale.set(0.5, 2.6, 0.5);
      temp.updateMatrix();
      trunks.current!.setMatrixAt(i, temp.matrix);
      trunks.current!.setColorAt(
        i,
        color.set(i > 63 && i % 3 === 0 ? "#eee5cc" : "#916032"),
      );
      temp.position.set(x, 3.4, z);
      temp.scale.set(2.6 * size, 2.5 * size, 2.6 * size);
      temp.updateMatrix();
      leaves.current!.setMatrixAt(i, temp.matrix);
      leaves.current!.setColorAt(
        i,
        color.set(["#279b50", "#55be3e", "#16834b"][i % 3]),
      );
      temp.position.set(x, 4.9, z);
      temp.scale.set(1.9 * size, 1.1, 1.9 * size);
      temp.updateMatrix();
      tops.current!.setMatrixAt(i, temp.matrix);
      for (let j = 0; j < 12; j++) {
        const face = j % 4;
        const row = Math.floor(j / 4);
        const spread = (row - 1) * 0.65 * size;
        temp.position.set(
          x +
            (face === 0 ? -1 : face === 1 ? 1 : 0) * 1.31 * size +
            (face > 1 ? spread : 0),
          3 + row * 0.6,
          z +
            (face === 2 ? -1 : face === 3 ? 1 : 0) * 1.31 * size +
            (face < 2 ? spread : 0),
        );
        temp.scale.set(face < 2 ? 0.025 : 0.48, 0.43, face < 2 ? 0.48 : 0.025);
        temp.updateMatrix();
        pixels.current!.setMatrixAt(i * 12 + j, temp.matrix);
        pixels.current!.setColorAt(
          i * 12 + j,
          color.set(["#8ccc41", "#226e36", "#62b92e", "#abda58"][(i + j) % 4]),
        );
      }
    });
    for (const r of [trunks, leaves, tops, pixels]) {
      r.current!.instanceMatrix.needsUpdate = true;
      r.current!.computeBoundingSphere();
    }
  }, []);
  return (
    <>
      <instancedMesh
        ref={trunks}
        args={[undefined, undefined, trees.length]}
        castShadow
      >
        <boxGeometry />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh
        ref={leaves}
        args={[undefined, undefined, trees.length]}
        castShadow
      >
        <boxGeometry />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={tops} args={[undefined, undefined, trees.length]}>
        <boxGeometry />
        <meshLambertMaterial color="#92db4c" />
      </instancedMesh>
      <instancedMesh
        ref={pixels}
        args={[undefined, undefined, trees.length * 12]}
      >
        <boxGeometry />
        <meshLambertMaterial />
      </instancedMesh>
      {trees.map(([x, , z], i) => (
        <RigidBody
          key={i}
          type="fixed"
          colliders={false}
          position={[x, 1.3, z]}
        >
          <CuboidCollider args={[0.26, 1.3, 0.26]} />
        </RigidBody>
      ))}
    </>
  );
}
const Landscape = memo(function Landscape() {
  return (
    <BakedVoxels>
      <FixedBox p={[0, -0.5, 18]} s={[80, 1, 38]} c="#70bd45" />
      <FixedBox p={[0, -0.5, -27]} s={[80, 1, 40]} c="#60b748" />
      <Box p={[0, -0.8, -4]} s={[80, 0.4, 6]} c="#70aaa0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, -4]}>
        <planeGeometry args={[80, 6]} />
        <meshStandardMaterial
          color="#26b9e6"
          roughness={0.22}
          metalness={0.13}
          transparent
          opacity={0.88}
        />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <Box
          key={i}
          p={[-20 + i * 2.6, -0.1, -3.8 + (i % 3) * 0.7]}
          s={[1.1, 0.035, 0.07]}
          c="#b5ece5"
        />
      ))}
      <FixedBox p={[0, -0.14, -4]} s={[3, 0.32, 8.2]} c="#c7a775" />
      {Array.from({ length: 16 }, (_, i) => (
        <Box
          key={i}
          p={[0, 0.04, -7.8 + i * 0.5]}
          s={[2.9, 0.035, 0.035]}
          c="#9d7a52"
        />
      ))}
      {[-1.5, 1.5].map((x) => (
        <group key={x}>
          {[-7, -4, -1].map((z) => (
            <FixedBox
              key={z}
              p={[x, 0.75, z]}
              s={[0.15, 1.4, 0.15]}
              c="#a78858"
            />
          ))}
          <FixedBox p={[x, 1.2, -4]} s={[0.12, 0.12, 6.3]} c="#c5a575" />
        </group>
      ))}
      <Forest />
      {rocks.map((p, i) => (
        <FixedBox
          key={i}
          p={p}
          s={[1.3, 0.8 + (i % 2) * 0.3, 1.2]}
          c="#a2ad91"
        />
      ))}
      <FixedBox p={[-8, 3.1, -13]} s={[4, 0.4, 3.6]} c="#a27c4c" />
      <Box p={[-8, 4.4, -13.8]} s={[3.2, 2.2, 0.2]} c="#caa775" />
      <Box p={[-9.5, 4.4, -13]} s={[0.2, 2.2, 2.5]} c="#b48b5b" />
      <Box p={[-6.5, 4.4, -13]} s={[0.2, 2.2, 2.5]} c="#b48b5b" />
      <Box p={[-8, 5.6, -13]} s={[4.3, 0.5, 4]} c="#5e9470" />
      <Box p={[-8, 6, -13]} s={[3.2, 0.35, 3]} c="#81af75" />
      {Array.from({ length: 8 }, (_, i) => (
        <FixedBox
          key={i}
          p={[-8, 0.18 + i * 0.38, -6.3 - i * 0.8]}
          s={[1.9, 0.4 + i * 0.76, 0.8]}
          c="#b19462"
        />
      ))}
      {checkpoints.map(([x, , z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Box p={[0, 0.02, 0]} s={[2.3, 0.05, 2.3]} c="#e4d995" />
          <Box p={[-1.1, 1.2, 0]} s={[0.12, 2.4, 0.12]} c="#a38755" />
          <Box p={[-0.7, 2.15, 0]} s={[0.7, 0.45, 0.06]} c="#f4d881" />
        </group>
      ))}
      <Box p={[0, 0.025, 7]} s={[1.6, 0.035, 11]} c="#c7c391" />
      <Box p={[0, 0.025, -15]} s={[1.6, 0.035, 12]} c="#c7c391" />
      {[-2.3, 2.3].map((x) => (
        <group key={x}>
          <Box p={[x, 0.5, -21]} s={[1.9, 1, 2]} c="#5b9158" />
          <Box p={[x, 0.8, -22]} s={[1.5, 1.5, 1.2]} c="#74a55c" />
        </group>
      ))}
      {Array.from({ length: 100 }, (_, i) => {
        const x = ((i * 13) % 35) - 17,
          z = ((i * 17) % 45) - 25;
        if (z < -1 && z > -7) return null;
        return (
          <group key={i}>
            <Box p={[x, 0.18, z]} s={[0.08, 0.36, 0.08]} c="#5f9454" />
            <Box
              p={[x, 0.4, z]}
              s={[0.28, 0.16, 0.28]}
              c={["#ffe653", "#c890ff", "#ff69aa"][i % 3]}
            />
          </group>
        );
      })}
      {/* World boundaries are physical; river recovery is handled by the player. */}
      {[
        [WORLD.minX - 0.4, 2, -5],
        [WORLD.maxX + 0.4, 2, -5],
      ].map((p, i) => (
        <RigidBody key={i} type="fixed" colliders={false} position={p as Vec3}>
          <CuboidCollider args={[0.4, 3, 43]} />
        </RigidBody>
      ))}
      {[WORLD.maxZ, WORLD.minZ].map((z) => (
        <RigidBody key={z} type="fixed" colliders={false} position={[0, 2, z]}>
          <CuboidCollider args={[41, 3, 0.4]} />
        </RigidBody>
      ))}
    </BakedVoxels>
  );
});
function Pickup({
  kind,
  position,
  onClick,
}: {
  kind: "wood" | "amber";
  position: Vec3;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.65;
      ref.current.position.y =
        position[1] + Math.sin(clock.elapsedTime * 2 + position[0]) * 0.12;
    }
  });
  return (
    <group
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {kind === "wood" ? (
        <>
          <Box p={[0, 0, 0]} s={[0.75, 0.46, 0.46]} c="#936839" />
          <Box p={[0.39, 0, 0]} s={[0.03, 0.37, 0.37]} c="#e8c693" />
        </>
      ) : (
        <>
          <mesh castShadow>
            <octahedronGeometry args={[0.48, 0]} />
            <meshStandardMaterial
              color="#ffbe40"
              emissive="#e89122"
              emissiveIntensity={0.65}
              roughness={0.4}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
            <ringGeometry args={[0.37, 0.51, 16]} />
            <meshBasicMaterial color="#ffe9a2" transparent opacity={0.65} />
          </mesh>
        </>
      )}
    </group>
  );
}
function Chest({ opened, onClick }: { opened: boolean; onClick: () => void }) {
  const lid = useRef<THREE.Group>(null);
  const opening = useRef(opened ? 1 : 0);
  useFrame((_, dt) => {
    if (lid.current) {
      opening.current = THREE.MathUtils.damp(
        opening.current,
        opened ? 1 : 0,
        5,
        dt,
      );
      lid.current.rotation.x = opening.current * -Math.PI * 0.65;
    }
  });
  return (
    <group
      position={chestPosition}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Box p={[0, 0, 0]} s={[1.6, 0.85, 1.1]} c="#986138" />
      <Box p={[-0.57, 0, 0]} s={[0.15, 0.88, 1.12]} c="#ecc365" />
      <Box p={[0.57, 0, 0]} s={[0.15, 0.88, 1.12]} c="#ecc365" />
      <group ref={lid} position={[0, 0.42, 0.55]}>
        <Box p={[0, 0.14, -0.55]} s={[1.65, 0.35, 1.15]} c="#c18b45" />
        <Box p={[-0.57, 0.15, -0.55]} s={[0.16, 0.38, 1.18]} c="#f5d276" />
        <Box p={[0.57, 0.15, -0.55]} s={[0.16, 0.38, 1.18]} c="#f5d276" />
      </group>
      <Box p={[0, 0.25, -0.58]} s={[0.25, 0.3, 0.08]} c="#ffe7a1" />
      {opened && (
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[1.3, 0.14, 0.8]} />
          <meshBasicMaterial color="#ffd35a" />
        </mesh>
      )}
    </group>
  );
}
const Animal = memo(
  function Animal({
    kind,
    position,
    index,
    paused,
    onInteract,
  }: {
    onInteract: () => void;
    kind: number;
    position: Vec3;
    index: number;
    paused: boolean;
  }) {
    const group = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
      if (!group.current || paused) return;
      const t = clock.elapsedTime * 0.45 + index;
      group.current.position.x = position[0] + Math.sin(t) * 0.65;
      group.current.position.z = position[2] + Math.cos(t) * 0.65;
      group.current.rotation.y = -t;
      group.current.position.y =
        kind === 4
          ? 1.5 + Math.sin(t * 3) * 0.15
          : kind === 0
            ? Math.abs(Math.sin(t * 3)) * 0.12
            : 0;
    });
    return (
      <group
        ref={group}
        position={position}
        scale={kind === 1 ? 0.85 : 0.65}
        onClick={(e) => {
          e.stopPropagation();
          onInteract();
        }}
      >
        <AnimalModel kind={kind} />
      </group>
    );
  },
  (a, b) => a.kind === b.kind && a.index === b.index && a.paused === b.paused,
);
// Fixed pool of 24 sensor bodies; detailed parts are instanced across the pool.
function Monsters({
  player,
  paused,
  onBump,
}: {
  player: React.RefObject<RapierRigidBody | null>;
  paused: boolean;
  onBump: () => void;
}) {
  const bodies = useRef<(RapierRigidBody | null)[]>([]),
    parts = useMemo(
      () =>
        Array.from({ length: MONSTER_PARTS }, () =>
          createRef<THREE.InstancedMesh>(),
        ),
      [],
    ),
    painted = useRef(false);
  const points = useMemo(
    () => monsterStarts.map((p) => new THREE.Vector3(...p)),
    [],
  );
  const bumpRef = useRef(onBump);
  bumpRef.current = onBump;
  useFrame(({ clock }, dt) => {
    const target = player.current?.translation();
    dt = Math.min(dt, 1 / 30);
    points.forEach((p, i) => {
      const active =
        !target ||
        level.mobs.zoneCount === 1 ||
        target.z < -4 === monsterStarts[i][2] < -1;
      if (!paused && target && active) {
        const d = Math.hypot(target.x - p.x, target.z - p.z);
        const homeDistance = Math.hypot(
          p.x - monsterStarts[i][0],
          p.z - monsterStarts[i][2],
        );
        let tx =
            monsterStarts[i][0] + Math.sin(clock.elapsedTime * 0.35 + i) * 1.5,
          tz = monsterStarts[i][2] + Math.cos(clock.elapsedTime * 0.3 + i);
        if (
          d < level.mobs.chaseRadius &&
          d > 0.3 &&
          homeDistance < level.mobs.leashRadius
        ) {
          tx = target.x;
          tz = target.z;
        }
        const v = new THREE.Vector2(tx - p.x, tz - p.z);
        if (v.length() > 0.05) {
          v.normalize();
          p.x += v.x * dt * level.mobs.speed;
          p.z += v.y * dt * level.mobs.speed;
        }
        // Monsters stay on their bank, leaving the bridge and safe flags peaceful.
        p.z =
          monsterStarts[i][2] > -1 ? Math.max(0.8, p.z) : Math.min(-8.8, p.z);
        for (const { position: safe, radius } of monsterSafeZones) {
          if (distance(p, safe) < radius) {
            const away = new THREE.Vector2(p.x - safe[0], p.z - safe[2]);
            if (away.length() < 0.01) away.set(1, 0);
            away.setLength(radius);
            p.x = safe[0] + away.x;
            p.z = safe[2] + away.y;
          }
        }
        bodies.current[i]?.setNextKinematicTranslation({
          x: p.x,
          y: 0.7,
          z: p.z,
        });
      }
      if (!paused && !active)
        bodies.current[i]?.setNextKinematicTranslation({
          x: p.x,
          y: -100,
          z: p.z,
        });
      const specs = monsterModels[i % 3];
      specs.forEach((s, j) => {
        const angle = target ? Math.atan2(target.x - p.x, target.z - p.z) : 0;
        temp.position.set(
          p.x + s.p[0] * Math.cos(angle) + s.p[2] * Math.sin(angle),
          s.p[1] + Math.sin(clock.elapsedTime * 3 + i) * 0.025,
          p.z + s.p[2] * Math.cos(angle) - s.p[0] * Math.sin(angle),
        );
        temp.scale.set(...(s.s as Vec3));
        if (!active) temp.scale.set(0, 0, 0);
        temp.rotation.set(0, angle, 0);
        temp.updateMatrix();
        parts[j].current?.setMatrixAt(i, temp.matrix);
        parts[j].current?.setColorAt(i, color.set(s.c));
      });
    });
    for (const ref of parts)
      if (ref.current) {
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor)
          ref.current.instanceColor.needsUpdate = true;
        if (!painted.current)
          (ref.current.material as THREE.Material).needsUpdate = true;
      }
    painted.current = true;
  });
  return (
    <>
      {parts.map((ref, i) => (
        <instancedMesh
          key={i}
          ref={ref}
          args={[undefined, undefined, monsterStarts.length]}
          frustumCulled={false}
          castShadow
        >
          <boxGeometry />
          <meshLambertMaterial />
        </instancedMesh>
      ))}
      {monsterStarts.map((p, i) => (
        <RigidBody
          key={i}
          ref={(v) => {
            bodies.current[i] = v;
          }}
          type="kinematicPosition"
          position={p}
          colliders={false}
        >
          <CapsuleCollider
            args={[0.3, 0.35]}
            sensor
            onIntersectionEnter={(e) => {
              if (e.other.rigidBodyObject?.userData.player) bumpRef.current();
            }}
          />
        </RigidBody>
      ))}
    </>
  );
}
export function Scene({
  save,
  paused,
  onStatus,
  onInteract,
  onCheckpoint,
  onBump,
  controller,
  onReady,
  onTaskStep,
  onParkourReset,
}: SceneProps) {
  const body = useRef<RapierRigidBody>(null),
    visual = useRef<THREE.Group>(null);
  const props = useRef({
    save,
    paused,
    onStatus,
    onInteract,
    onCheckpoint,
    onBump,
    onTaskStep,
    onParkourReset,
  });
  props.current = {
    save,
    paused,
    onStatus,
    onInteract,
    onCheckpoint,
    onBump,
    onTaskStep,
    onParkourReset,
  };
  const { camera, gl } = useThree(),
    { rapier, world } = useRapier();
  const [walk, setWalk] = useState(0);
  const [swing, setSwing] = useState(0);
  const lastStatus = useRef(0),
    lastBump = useRef(-10);
  const spawn = useMemo(() => checkpoints[save.checkpoint], []);
  const initialized = useRef(false);
  function respawn() {
    const rb = body.current;
    if (!rb) return;
    const p = checkpoints[props.current.save.checkpoint];
    rb.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    clearInput();
  }
  function bump() {
    const now = performance.now();
    if (props.current.paused || now - lastBump.current < 1800) return;
    lastBump.current = now;
    respawn();
    props.current.onBump();
  }
  useEffect(() => {
    controller.current = { respawn, swing: () => setSwing((n) => n + 1) };
    return () => {
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    const canvas = gl.domElement;
    let pointer: number | null = null,
      lx = 0,
      ly = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      pointer = e.pointerId;
      lx = e.clientX;
      ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      input.yaw -= (e.clientX - lx) * 0.006;
      input.pitch = THREE.MathUtils.clamp(
        input.pitch + (e.clientY - ly) * 0.004,
        0.22,
        0.95,
      );
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = () => {
      pointer = null;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, [gl]);
  useFrame(({ clock }, delta) => {
    const rb = body.current;
    if (!rb) return;
    const p = rb.translation(),
      s = props.current;
    delta = Math.min(delta, 1 / 30);
    if (!initialized.current) {
      initialized.current = true;
      camera.position.set(p.x, p.y + 6, p.z + 9);
      onReady();
    }
    const ray = new rapier.Ray(
      { x: p.x, y: p.y - 0.25, z: p.z },
      { x: 0, y: -1, z: 0 },
    );
    const grounded = !!world.castRay(
      ray,
      0.48,
      true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      undefined,
      rb,
    );
    if (!s.paused) {
      const dx =
        input.x +
        (input.keys.has("KeyD") || input.keys.has("ArrowRight") ? 1 : 0) -
        (input.keys.has("KeyA") || input.keys.has("ArrowLeft") ? 1 : 0);
      const dz =
        input.z +
        (input.keys.has("KeyS") || input.keys.has("ArrowDown") ? 1 : 0) -
        (input.keys.has("KeyW") || input.keys.has("ArrowUp") ? 1 : 0);
      const v = new THREE.Vector2(dx, dz);
      if (v.length() > 1) v.normalize();
      const x = (v.x * Math.cos(input.yaw) + v.y * Math.sin(input.yaw)) * 4.2,
        z = (-v.x * Math.sin(input.yaw) + v.y * Math.cos(input.yaw)) * 4.2;

      rb.setLinvel(
        { x, y: input.jump && grounded ? 6.5 : rb.linvel().y, z },
        true,
      );
      input.jump = false;
      if (visual.current && v.length() > 0.1)
        visual.current.rotation.y = Math.atan2(-x, -z);
      if (p.y < -2) {
        respawn();
        s.onBump();
      }
      checkpoints.forEach((point, i) => {
        if (i > s.save.checkpoint && distance(p, point) < 1.6 && p.y > 0)
          s.onCheckpoint(i);
      });
      if (s.save.tasks.active === "parkour") {
        const done = s.save.tasks.steps.parkour ?? [];
        stumps.forEach((point, i) => {
          if (
            grounded &&
            distance(p, point) < 0.83 &&
            p.y > point[1] * 2 + 0.48 &&
            done.length === i
          )
            s.onTaskStep("parkour", `stump-${i + 1}`);
        });
        if (
          done.length > 0 &&
          done.length < 3 &&
          grounded &&
          p.y < 0.85 &&
          p.z > 15 &&
          p.x > 2
        ) {
          rb.setTranslation({ x: 3.8, y: 1.2, z: 22 }, true);
          rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
          s.onParkourReset();
          clearInput();
        }
      }
      if (input.interact) {
        input.interact = false;
        s.onInteract();
      }
    } else {
      rb.setLinvel({ x: 0, y: rb.linvel().y, z: 0 }, true);
      clearInput();
    }
    camera.position.lerp(
      new THREE.Vector3(
        p.x + Math.sin(input.yaw) * 9 * Math.cos(input.pitch),
        p.y + 2 + Math.sin(input.pitch) * 9,
        p.z + Math.cos(input.yaw) * 9 * Math.cos(input.pitch),
      ),
      1 - Math.exp(-8 * delta),
    );
    camera.lookAt(p.x, p.y + 0.65, p.z);
    if (clock.elapsedTime - lastStatus.current > 0.12) {
      lastStatus.current = clock.elapsedTime;
      let near = "";
      let best = 2.45;
      for (const item of collectibles) {
        if (s.save[item.kind].includes(item.id)) continue;
        const d = distance(p, item.position);
        if (d < best) {
          near = item.id;
          best = d;
        }
      }
      for (const ore of oreDeposits) {
        if (
          !s.save.mined.includes(ore.id) &&
          distance(p, ore.position) < best
        ) {
          near = ore.id;
          best = distance(p, ore.position);
        }
      }
      if (distance(p, chestPosition) < 2.6) near = "chest";
      const nearbyAnimals = animals
        .filter(
          (animal) =>
            distance(p, animalPosition(animal, clock.elapsedTime)) < 2.65,
        )
        .map((a) => a.id);
      if (!near && nearbyAnimals.length) near = nearbyAnimals[0];
      const marker = taskMarkers.find(
        (m) =>
          m.task === s.save.tasks.active &&
          !(s.save.tasks.steps[m.task] ?? []).includes(m.id) &&
          distance(p, m.position) < 2 &&
          Math.abs(p.y - m.position[1]) < 2,
      );
      if (marker) near = `marker:${marker.id}`;
      s.onStatus({
        x: p.x,
        y: p.y,
        z: p.z,
        near,
        grounded,
        draws: gl.info.render.calls,
        nearbyAnimals,
      });
      setWalk(
        !s.paused && Math.abs(rb.linvel().x) + Math.abs(rb.linvel().z) > 0.3
          ? Math.sin(clock.elapsedTime * 11) * 0.5
          : 0,
      );
    }
  });
  return (
    <>
      <color attach="background" args={["#65c7f7"]} />
      <fog attach="fog" args={["#b6e1cc", 42, 104]} />
      <Sky
        distance={450000}
        sunPosition={[70, 80, 30]}
        inclination={0.5}
        azimuth={0.2}
      />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#fff6dd", "#6d9762", 0.8]} />
      <directionalLight
        position={[-12, 25, 8]}
        intensity={1.8}
        castShadow={!save.lowQuality}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-normalBias={0.04}
      />
      <Landscape />
      <ForestExpansion />
      <Box p={[3.8, 0.03, 22]} s={[1.4, 0.06, 1]} c="#ffdb63" />
      {stumps.map((p, i) => (
        <FixedBox
          key={i}
          p={p}
          s={[1.1, p[1] * 2, 1.1]}
          c={["#a66d33", "#bd8040", "#d99d49"][i]}
        />
      ))}
      {taskMarkers
        .filter((m) => m.task === save.tasks.active)
        .map((m) => (
          <group
            key={m.id}
            position={m.position}
            onClick={(e) => {
              e.stopPropagation();
              onInteract(`marker:${m.id}`);
            }}
          >
            <Box p={[0, 0.9, 0]} s={[0.12, 1.8, 0.12]} c="#694023" />
            <Box
              p={[0.35, 1.55, 0]}
              s={[0.7, 0.5, 0.12]}
              c={
                (save.tasks.steps[m.task] ?? []).includes(m.id)
                  ? "#fcd04b"
                  : "#26bce8"
              }
            />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
              <ringGeometry args={[0.6, 0.85, 4]} />
              <meshBasicMaterial color="#fff4af" side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      <RigidBody
        ref={body}
        position={spawn}
        colliders={false}
        enabledRotations={LOCK_ROTATIONS}
        linearDamping={1}
        friction={0}
        userData={PLAYER_DATA}
        canSleep={false}
      >
        <CapsuleCollider args={[0.35, 0.28]} />
        <group ref={visual}>
          <Avatar
            appearance={save.appearance}
            walking={walk}
            pickaxe={save.equipment.pickaxe}
            backpack={save.equipment.backpack}
            swing={swing}
            paused={paused}
          />
        </group>
      </RigidBody>
      {collectibles
        .filter((item) => !save[item.kind].includes(item.id))
        .map((item) => (
          <Pickup key={item.id} {...item} onClick={() => onInteract(item.id)} />
        ))}
      {oreDeposits
        .filter((ore) => !save.mined.includes(ore.id))
        .map((ore) => (
          <group
            key={ore.id}
            position={ore.position}
            onClick={(e) => {
              e.stopPropagation();
              onInteract(ore.id);
            }}
          >
            <Box p={[0, 0, 0]} s={[1, 0.8, 0.9]} c="#7f8e88" />
            <Box p={[-0.18, 0.36, -0.12]} s={[0.3, 0.48, 0.28]} c="#bcf3e6" />
            <Box p={[0.22, 0.25, 0.18]} s={[0.26, 0.38, 0.29]} c="#e9fff0" />
            <Box p={[0.1, -0.06, -0.46]} s={[0.3, 0.18, 0.035]} c="#8fd9c8" />
          </group>
        ))}
      <Chest opened={save.completed} onClick={() => onInteract("chest")} />
      {animals.map((animal) => (
        <Animal
          key={animal.id}
          index={animal.index}
          kind={animal.kind}
          paused={paused}
          position={animal.position}
          onInteract={() => onInteract(animal.id)}
        />
      ))}
      <Monsters player={body} paused={paused} onBump={bump} />
    </>
  );
}
