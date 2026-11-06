import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export type Voxel = {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
};
/** One draw per articulated part, regardless of the number of coloured pixels. */
export function VoxelMesh({ parts }: { parts: Voxel[] }) {
  const geometry = useMemo(() => {
    const pieces = parts.map(({ p, s, c }) => {
      const g = new THREE.BoxGeometry(...s);
      g.translate(...p);
      const color = new THREE.Color(c),
        count = g.getAttribute("position").count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return g;
    });
    const merged = mergeGeometries(pieces, false)!;
    pieces.forEach((g) => g.dispose());
    return merged;
  }, [parts]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}
export const voxel = (p: Voxel["p"], s: Voxel["s"], c: string): Voxel => ({
  p,
  s,
  c,
});
