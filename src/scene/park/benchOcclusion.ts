import * as T from 'three';

/** Keep the bench visible while allowing a seated billboard to cover its slats. */
export function createBenchOcclusion(bench: T.Group) {
  const entries: { mesh: T.Mesh; original: T.Material | T.Material[]; copies: T.Material[] }[] = [];
  bench.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    const original = object.material;
    const copies = (Array.isArray(original) ? original : [original]).map((material) =>
      material.clone(),
    );
    object.material = Array.isArray(original) ? copies : copies[0];
    entries.push({ mesh: object, original, copies });
  });
  const local = new T.Vector3();
  return {
    update(occupants: readonly { x: number; z: number }[], camera?: T.Vector3) {
      bench.updateWorldMatrix(true, false);
      const occupied = occupants.some((point) => {
        local.set(point.x, 0, point.z);
        bench.worldToLocal(local);
        return Math.abs(local.x) <= 1.25 && Math.abs(local.z) <= 0.85;
      });
      const behind = camera ? bench.worldToLocal(local.copy(camera)).z < 0 : false;
      for (const { mesh, copies } of entries) {
        // Rear rails must cover a sitter viewed from behind; seat slats must not cut the billboard.
        const backrest = mesh.position.z < -0.35 && mesh.position.y > 0.8;
        for (const material of copies) material.depthWrite = !occupied || (behind && backrest);
      }
    },
    dispose() {
      for (const { mesh, original, copies } of entries) {
        mesh.material = original;
        copies.forEach((material) => material.dispose());
      }
    },
  };
}
