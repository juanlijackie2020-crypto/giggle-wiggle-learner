import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
/** Merge static, opaque voxel pieces into a single vertex-coloured draw.
 * Keep original meshes mounted (but hidden), so Rapier colliders remain intact.
 */
export function BakedVoxels({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const group = root.current!;
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const pieces: THREE.BufferGeometry[] = [],
      originals: THREE.Mesh[] = [];
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (
        !mesh.isMesh ||
        (mesh as THREE.InstancedMesh).isInstancedMesh ||
        !mesh.visible ||
        Array.isArray(mesh.material)
      )
        return;
      const material = mesh.material as THREE.MeshLambertMaterial;
      if (material.transparent || !material.color) return;
      const geo = mesh.geometry.clone();
      geo.applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld),
      );
      const count = geo.getAttribute("position").count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) material.color.toArray(colors, i * 3);
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      pieces.push(geo);
      originals.push(mesh);
    });
    if (!pieces.length) return;
    const combined = mergeGeometries(pieces, false);
    pieces.forEach((p) => p.dispose());
    if (!combined) return;
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const baked = new THREE.Mesh(combined, material);
    baked.castShadow = true;
    baked.receiveShadow = true;
    group.add(baked);
    originals.forEach((m) => (m.visible = false));
    return () => {
      originals.forEach((m) => (m.visible = true));
      group.remove(baked);
      combined.dispose();
      material.dispose();
    };
  }, []);
  return <group ref={root}>{children}</group>;
}
