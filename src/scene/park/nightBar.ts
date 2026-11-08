import { barDrinks, type BarDrinkId } from '../../data/bar';
import * as T from 'three';

export const BAR_SPOT = new T.Vector3(32, 0, -7.5);
export const BAR_ENTRANCE = new T.Vector3(32, 0, 0.2);
export const BAR_INSIDE = new T.Vector3(32, 0, -5.6);
export const BAR_HOST = new T.Vector3(34.8, 0, -0.8);
export const BAR_SEATS = [new T.Vector3(29, 0, -7.1), new T.Vector3(30.4, 0, -7.1)];
export function isInsideBar(point: { x: number; z: number }) {
  return Math.abs(point.x - BAR_SPOT.x) < 3.8 && Math.abs(point.z - BAR_SPOT.z) < 3.3;
}
export function overlapsBar(point: { x: number; z: number }, radius: number, night: boolean) {
  const x = Math.abs(point.x - BAR_SPOT.x),
    z = point.z - BAR_SPOT.z;
  // Camera-facing avatars lean behind their feet: reserve the front apron while closed
  // so heads cannot intersect the facade even when their feet are outside the wall.
  if (!night) return x < 4.3 + radius && z > -3.8 - radius && z < 6.5 + radius;
  if (x >= 4 + radius || Math.abs(z) >= 3.5 + radius) return false;

  // Solid side/back walls, with a 1.8-unit doorway on the south facade.
  if (x > 3.8 - radius || z < -3.3 + radius) return true;
  if (z > 3.3 - radius && x > 0.9 - radius) return true;
  if (point.x < 31.2 + radius && point.z < -7.9 + radius) return true;
  if (Math.hypot(point.x - 34, point.z + 9.8) < 0.55 + radius) return true;
  if (Math.abs(point.x - 35.1) < 0.5 + radius && Math.abs(point.z + 8.3) < 0.25 + radius)
    return true;
  return BAR_SEATS.some((seat) => Math.hypot(point.x - seat.x, point.z - seat.z) < 0.3 + radius);
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
  box(0, 0.02, 0, 8, 0.06, 7, wood);
  for (let z = -3.3; z < 3.5; z += 0.4) box(0, 0.055, z, 7.8, 0.015, 0.018, cream);
  box(-3.9, 1.6, 0, 0.2, 3.2, 7, cream);
  box(3.9, 1.6, 0, 0.2, 3.2, 7, cream);
  box(0, 1.6, -3.4, 8, 3.2, 0.2, cream);
  const front = new T.Group();
  group.add(front);
  for (const x of [-2.45, 2.45]) {
    const wall = box(x, 1.6, 3.4, 3.1, 3.2, 0.2, cream);
    front.add(wall);
    const frame = box(x, 1.8, 3.54, 1.3, 1.3, 0.12, wood);
    front.add(frame);
    const window = box(x, 1.8, 3.62, 1.1, 1.1, 0.06, amber);
    front.add(window);
  }
  const door = box(0, 1.2, 3.45, 1.75, 2.4, 0.12, wood);
  const roof = box(0, 3.35, 0, 8.6, 0.4, 7.6, roofMat);
  box(-2.3, 0.7, -0.8, 2.4, 1.4, 0.8, wood);
  box(-2.3, 1.46, -0.8, 2.7, 0.12, 1, cream);
  box(-2.3, 2, -3.25, 2.7, 0.12, 0.4, wood);
  const bottleColors = ['#6d967e', '#b98665', '#d7b76b'];
  for (let i = 0; i < 5; i++) {
    const bottle = makeMaterial(bottleColors[i % 3]);
    box(-3.3 + i * 0.5, 2.28, -3.24, 0.18, 0.4, 0.18, bottle);
    box(-3.3 + i * 0.5, 2.54, -3.24, 0.09, 0.16, 0.09, bottle);
  }
  const stoolTops: T.Mesh[] = [];
  for (const seat of BAR_SEATS) {
    box(seat.x - BAR_SPOT.x, 0.45, seat.z - BAR_SPOT.z, 0.12, 0.9, 0.12, wood);
    stoolTops.push(box(seat.x - BAR_SPOT.x, 0.94, seat.z - BAR_SPOT.z, 0.65, 0.15, 0.65, roofMat));
  }
  // Stage instruments sit behind the singer, leaving the microphone area clear.
  const metal = makeMaterial('#b8a987'),
    drum = makeMaterial('#884b42');
  function cylinder(x: number, y: number, z: number, r: number, h: number, material: T.Material) {
    const geometry = new T.CylinderGeometry(r, r, h, 24);
    geometries.push(geometry);
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  const kick = cylinder(2, 0.55, -2.3, 0.44, 0.5, drum);
  kick.rotation.x = Math.PI / 2;
  for (const x of [1.5, 2.5]) {
    cylinder(x, 1, -2.4, 0.25, 0.3, drum);
    cylinder(x, 0.65, -2.8, 0.025, 1.3, metal);
    cylinder(x, 1.3, -2.8, 0.38, 0.035, metal);
  }
  box(3.1, 0.65, -1.3, 0.55, 1.3, 0.45, roofMat);
  box(3.1, 1.2, -0.8, 1, 0.15, 0.4, wood);
  for (let i = 0; i < 9; i++) box(2.7 + i * 0.1, 1.3, -0.78, 0.085, 0.05, 0.35, cream);
  box(3.1, 0.6, -0.8, 0.1, 1.2, 0.1, metal);
  const glass = new T.Group();
  scene.add(glass);
  glass.visible = false;
  const glassMat = new T.MeshStandardMaterial({
    color: '#f5e8d0',
    transparent: true,
    opacity: 0.45,
    roughness: 0.2,
  });
  materials.push(glassMat);
  const glassGeo = new T.CylinderGeometry(0.14, 0.1, 0.3, 16);
  geometries.push(glassGeo);
  glass.add(new T.Mesh(glassGeo, glassMat));
  const liquidMat = makeMaterial('#e5b750');
  const liquidGeo = new T.CylinderGeometry(0.12, 0.09, 0.2, 16);
  geometries.push(liquidGeo);
  const liquid = new T.Mesh(liquidGeo, liquidMat);
  liquid.position.y = -0.03;
  glass.add(liquid);
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
  const sign = box(0, 2.78, 3.72, 3.8, 0.65, 0.06, signMaterial);
  front.add(sign);
  const light = new T.PointLight('#ffc17c', 0, 10, 2);
  light.position.set(0, 2.8, 0.8);
  group.add(light);
  return {
    glass,
    setOccupied(points: { x: number; z: number }[]) {
      stoolTops.forEach((top, index) => {
        top.visible = !points.some(
          (point) => Math.hypot(point.x - BAR_SEATS[index].x, point.z - BAR_SEATS[index].z) < 0.35,
        );
      });
    },
    serve(id: BarDrinkId) {
      liquidMat.color.set(barDrinks.find((drink) => drink.id === id)!.color);
    },
    update(night: boolean, inside: boolean) {
      door.visible = !night;
      roof.visible = !inside;
      front.visible = !inside;
      light.intensity = night ? 12 : 0;
      amber.emissiveIntensity = night ? 1.2 : 0;
    },
    dispose() {
      glass.removeFromParent();
      group.removeFromParent();
      texture.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
