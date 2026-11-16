import * as T from 'three';

export const OFFICE_SPOT = new T.Vector3(5, 0, -20);
export const OFFICE_CLERK = new T.Vector3(5, 0, -16.4);
export function overlapsOffice(point: { x: number; z: number }, radius: number) {
  return (
    Math.abs(point.x - OFFICE_SPOT.x) < 3.6 + radius &&
    Math.abs(point.z - OFFICE_SPOT.z) < 2.5 + radius
  );
}

/** Village office with a uniformed owl clerk at the outdoor reception desk. */
export function createTownOffice(scene: T.Scene) {
  const group = new T.Group();
  group.name = 'town-office';
  group.position.copy(OFFICE_SPOT);
  scene.add(group);
  const materials = new Map<string, T.MeshStandardMaterial>();
  const geometries: T.BufferGeometry[] = [];
  const textures: T.Texture[] = [];
  const extraMaterials: T.Material[] = [];
  function part(
    shape: T.BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = group,
  ) {
    geometries.push(shape);
    if (!materials.has(color))
      materials.set(color, new T.MeshStandardMaterial({ color, roughness: 0.8 }));
    const mesh = new T.Mesh(shape, materials.get(color)!);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    parent = group,
  ) => part(new T.BoxGeometry(w, h, d), color, x, y, z, parent);
  box(0, 0.14, 0, 7.3, 0.28, 5.2, '#b9b4a0');
  box(0, 1.65, 0, 6.9, 3, 4.7, '#f2e8ce');
  box(0, 0.5, 0, 7, 0.48, 4.8, '#c6c9ac');
  for (const side of [-1, 1]) {
    const roof = box(0, 3.65, side * 1.25, 7.7, 0.25, 2.9, '#64866d');
    roof.rotation.x = side * 0.35;
  }
  for (const x of [-2.25, 2.25]) {
    box(x, 1.8, 2.4, 1.4, 1.5, 0.15, '#91a38a');
    box(x, 1.8, 2.5, 1.17, 1.27, 0.06, '#a7d3ce');
    box(x, 1.8, 2.55, 0.07, 1.27, 0.06, '#fff8df');
    box(x, 1.8, 2.55, 1.17, 0.07, 0.06, '#fff8df');
  }
  box(0, 1.25, 2.4, 1.3, 2.2, 0.15, '#698775');
  box(0, 1.6, 2.5, 0.96, 0.88, 0.06, '#c1ded2');
  box(0.42, 1, 2.55, 0.08, 0.12, 0.08, '#dab773');
  box(0, 0.15, 2.75, 2.2, 0.28, 0.7, '#d7cfb6');
  // Legible sign facing the camera.
  const sign = document.createElement('canvas');
  sign.width = 512;
  sign.height = 128;
  const ctx = sign.getContext('2d')!;
  ctx.fillStyle = '#f9f1d8';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#769077';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 118);
  ctx.fillStyle = '#435b48';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 58px sans-serif';
  ctx.fillText('동사무소', 256, 65);
  const texture = new T.CanvasTexture(sign);
  texture.colorSpace = T.SRGBColorSpace;
  textures.push(texture);
  const signMaterial = new T.MeshBasicMaterial({ map: texture });
  extraMaterials.push(signMaterial);
  const signGeometry = new T.PlaneGeometry(3.4, 0.85);
  geometries.push(signGeometry);
  const signMesh = new T.Mesh(signGeometry, signMaterial);
  signMesh.position.set(0, 2.95, 2.56);
  group.add(signMesh);
  // A red letter box and envelope emblem beside reception.
  box(-2.25, 0.55, 3.25, 0.15, 1.1, 0.15, '#78634e');
  box(-2.25, 1.3, 3.25, 0.9, 0.85, 0.6, '#b86d55');
  box(-2.25, 1.48, 3.56, 0.6, 0.07, 0.03, '#533f37');
  box(-2.25, 1.14, 3.57, 0.4, 0.24, 0.03, '#fff5db');
  // Sol: small owl, navy waistcoat, cap and a letter in hand.
  const clerk = new T.Group();
  clerk.position.set(0, 0, 3.6);
  group.add(clerk);
  const sphere = (x: number, y: number, z: number, r: number, color: string) =>
    part(new T.SphereGeometry(r, 16, 12), color, x, y, z, clerk);
  const body = sphere(0, 0.72, 0, 0.45, '#667d88');
  body.scale.set(1, 1.3, 0.85);
  sphere(0, 1.45, 0, 0.51, '#ae8762');
  for (const side of [-1, 1]) {
    const cheek = sphere(side * 0.21, 1.46, 0.38, 0.24, '#f6e4c6');
    cheek.scale.z = 0.35;
    sphere(side * 0.2, 1.49, 0.47, 0.065, '#343f3d');
    const wing = sphere(side * 0.4, 0.82, 0.02, 0.2, '#ae8762');
    wing.scale.set(0.65, 1.6, 0.8);
    sphere(side * 0.2, 0.14, 0.1, 0.15, '#c59b54');
  }
  const beak = part(new T.ConeGeometry(0.1, 0.22, 4), '#d4a054', 0, 1.3, 0.5, clerk);
  beak.rotation.x = Math.PI / 2;
  part(new T.CylinderGeometry(0.43, 0.48, 0.18, 20), '#526d7a', 0, 1.92, 0, clerk);
  box(0, 1.84, 0.26, 0.65, 0.05, 0.5, '#425b69', clerk);
  box(0, 0.9, 0.42, 0.46, 0.31, 0.05, '#fff4d9', clerk);
  box(0.19, 1.13, 0.36, 0.12, 0.12, 0.035, '#e5c17d', clerk);
  const light = new T.PointLight('#ffe6b5', 0, 12, 2);
  light.position.set(0, 3, 3);
  group.add(light);
  return {
    update(time: number, night: boolean, reduced: boolean) {
      clerk.rotation.y = reduced ? 0 : Math.sin(time / 2200) * 0.07;
      light.intensity = night ? 7 : 0;
    },
    dispose() {
      group.removeFromParent();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      extraMaterials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
