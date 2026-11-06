import * as T from 'three';

// At the north end of the central walk, beside the café and away from busking.
export const NOTICE_BOARD_SPOT = new T.Vector3(-0.1, 0, -13.3);
export const NOTICE_BOARD_REACH = 3.3;

export function createNoticeBoard(scene: T.Scene) {
  const group = new T.Group();
  group.name = 'village-notice-board';
  group.position.copy(NOTICE_BOARD_SPOT);
  const materials = new Map<string, T.MeshStandardMaterial>();
  function block(x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
    if (!materials.has(color))
      materials.set(color, new T.MeshStandardMaterial({ color, roughness: 0.9 }));
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), materials.get(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  for (const x of [-1.08, 1.08]) block(x, 1.45, 0, 0.2, 2.9, 0.24, '#96704c');
  block(0, 2, 0, 2.7, 1.65, 0.25, '#b48d60');
  block(0, 2, 0.14, 2.4, 1.36, 0.06, '#4a6656');
  block(0, 2.95, 0, 3, 0.18, 0.65, '#77543f');
  for (const [x, y, tilt] of [
    [-0.65, 2.05, 0.08],
    [0.2, 1.95, -0.05],
    [0.8, 2.2, -0.1],
  ]) {
    const note = block(x, y, 0.2, 0.55, 0.75, 0.035, '#f5e6bc');
    note.rotation.z = tilt;
    block(x, y + 0.28, 0.24, 0.08, 0.08, 0.05, '#b3654f');
  }
  scene.add(group);
  return {
    dispose() {
      materials.forEach((material) => material.dispose());
    },
  };
}
