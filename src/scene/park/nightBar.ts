import * as T from 'three';

export const BAR_SPOT = new T.Vector3(32, 0, -7);
export const BAR_ENTRANCE = new T.Vector3(32, 0, -2.8);
export const BAR_INSIDE = new T.Vector3(32, 0, -5.6);
export function isInsideBar(point: { x: number; z: number }) {
  return Math.abs(point.x - BAR_SPOT.x) < 2.8 && Math.abs(point.z - BAR_SPOT.z) < 2.3;
}
export function overlapsBar(point: { x: number; z: number }, radius: number, night: boolean) {
  const x = Math.abs(point.x - BAR_SPOT.x),
    z = point.z - BAR_SPOT.z;
  if (x >= 3 + radius || Math.abs(z) >= 2.5 + radius) return false;
  if (!night) return true;
  // Solid side/back walls, with a 1.8-unit doorway on the south facade.
  if (x > 2.8 - radius || z < -2.3 + radius) return true;
  if (z > 2.3 - radius && x > 0.9 - radius) return true;
  // Counter and stools remain solid inside the room.
  if (x < 2.3 + radius && z < -0.8 + radius) return true;
  return [-1.5, 0, 1.5].some(
    (seat) => Math.hypot(point.x - BAR_SPOT.x - seat, z + 0.2) < 0.3 + radius,
  );
}

export function createNightBar(scene: T.Scene) {
  const group = new T.Group();
  group.name = 'moonlight-bar';
  group.position.copy(BAR_SPOT);
  scene.add(group);
  const materials: T.Material[] = [];
  const geometries: T.BufferGeometry[] = [];
  const makeMaterial = (color: string) => {
    const material = new T.MeshStandardMaterial({ color, roughness: 0.8 });
    materials.push(material);
    return material;
  };
  const wood = makeMaterial('#684638'),
    cream = makeMaterial('#dfc4a2'),
    roofMat = makeMaterial('#3c4d52');
  const amber = makeMaterial('#ddad67');
  amber.emissive.set('#ffb95b');
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: T.Material,
  ) => {
    const geometry = new T.BoxGeometry(w, h, d);
    geometries.push(geometry);
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  box(0, 0.02, 0, 6, 0.06, 5, wood);
  for (let z = -2.3; z < 2.5; z += 0.4) box(0, 0.055, z, 5.8, 0.015, 0.018, cream);
  box(-2.9, 1.6, 0, 0.2, 3.2, 5, cream);
  box(2.9, 1.6, 0, 0.2, 3.2, 5, cream);
  box(0, 1.6, -2.4, 6, 3.2, 0.2, cream);
  const front = new T.Group();
  group.add(front);
  for (const x of [-1.95, 1.95]) {
    const wall = box(x, 1.6, 2.4, 2.1, 3.2, 0.2, cream);
    front.add(wall);
    const frame = box(x, 1.8, 2.54, 1.3, 1.3, 0.12, wood);
    front.add(frame);
    const window = box(x, 1.8, 2.62, 1.1, 1.1, 0.06, amber);
    front.add(window);
  }
  const door = box(0, 1.2, 2.45, 1.75, 2.4, 0.12, wood);
  const roof = box(0, 3.35, 0, 6.6, 0.4, 5.6, roofMat);
  box(0, 1, -1.4, 4.6, 2, 0.8, wood);
  box(0, 2.06, -1.4, 4.9, 0.12, 1, cream);
  box(0, 2, -2.25, 4.6, 0.12, 0.4, wood);
  const bottleColors = ['#6d967e', '#b98665', '#d7b76b'];
  for (let i = 0; i < 7; i++) {
    const bottle = makeMaterial(bottleColors[i % 3]);
    box(-1.8 + i * 0.6, 2.28, -2.24, 0.18, 0.4, 0.18, bottle);
    box(-1.8 + i * 0.6, 2.54, -2.24, 0.09, 0.16, 0.09, bottle);
  }
  for (const x of [-1.5, 0, 1.5]) {
    box(x, 0.45, -0.2, 0.12, 0.9, 0.12, wood);
    box(x, 0.94, -0.2, 0.6, 0.15, 0.6, roofMat);
  }
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const ctx = signCanvas.getContext('2d')!;
  ctx.fillStyle = '#31454a';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#ffe5ac';
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('MOONLIGHT BAR', 256, 58);
  ctx.font = '22px sans-serif';
  ctx.fillText('19:00 — 06:00', 256, 100);
  const texture = new T.CanvasTexture(signCanvas);
  texture.colorSpace = T.SRGBColorSpace;
  const signMaterial = new T.MeshBasicMaterial({ map: texture });
  materials.push(signMaterial);
  const sign = box(0, 2.78, 2.72, 3.8, 0.65, 0.06, signMaterial);
  front.add(sign);
  const light = new T.PointLight('#ffc17c', 0, 10, 2);
  light.position.set(0, 2.8, 0.8);
  group.add(light);
  return {
    update(night: boolean, inside: boolean) {
      door.visible = !night;
      roof.visible = !inside;
      front.visible = !inside;
      light.intensity = night ? 12 : 0;
      amber.emissiveIntensity = night ? 1.2 : 0;
    },
    dispose() {
      group.removeFromParent();
      texture.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
