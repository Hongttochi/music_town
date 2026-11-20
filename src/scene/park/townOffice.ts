import * as T from 'three';

export const OFFICE_SPOT = new T.Vector3(5, 0, -20);
export const OFFICE_CLERK = new T.Vector3(5, 0, -22.3);
export const OFFICE_FLOOR_HEIGHT = 0.065;
// Lift the billboard hip anchor slightly above the stool so the seat does not hide the pelvis.
export const OFFICE_SEAT_HEIGHT = 0.76 - OFFICE_FLOOR_HEIGHT;
export const OFFICE_TALK_REACH = 4.4;
export const OFFICE_SEATS = [-2.5, 2.5].map(
  (x) => new T.Vector3(OFFICE_SPOT.x + x, 0, OFFICE_SPOT.z + 0.5),
);
// Billboards lean toward the counter in world space: reserve room for the head, too.
const OFFICE_DESK_FRONT = 0.9;
type Point = { x: number; z: number };
function overlapsOfficeDesk(point: Point, radius: number) {
  const z = point.z - OFFICE_SPOT.z;
  // Include the countertop overhang and the camera-facing sprite's front clearance.
  return (
    Math.abs(point.x - OFFICE_SPOT.x) < 3.7 + radius &&
    z > -1.75 - radius &&
    z < OFFICE_DESK_FRONT + radius
  );
}
export function recoverOfficeDeskPosition(point: Point, radius: number): Point {
  return overlapsOfficeDesk(point, radius)
    ? { x: point.x, z: OFFICE_SPOT.z + OFFICE_DESK_FRONT + radius + 0.02 }
    : point;
}
export function blocksOfficeStep(from: Point, to: Point, radius: number) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.15));
  for (let i = 1; i <= steps; i++) {
    if (
      overlapsOffice(
        { x: from.x + ((to.x - from.x) * i) / steps, z: from.z + ((to.z - from.z) * i) / steps },
        radius,
      )
    )
      return true;
  }
  return false;
}
export function isInsideOffice(point: { x: number; z: number }) {
  return Math.abs(point.x - OFFICE_SPOT.x) < 4.8 && Math.abs(point.z - OFFICE_SPOT.z) < 3.8;
}
/** Reserve the building AND entrance apron when placing scenery. */
export function isOfficeGround(point: { x: number; z: number }, radius = 0) {
  return (
    Math.abs(point.x - OFFICE_SPOT.x) < 5.3 + radius &&
    point.z > OFFICE_SPOT.z - 4.3 - radius &&
    point.z < OFFICE_SPOT.z + 6 + radius
  );
}
export function overlapsOffice(point: { x: number; z: number }, radius: number) {
  const x = Math.abs(point.x - OFFICE_SPOT.x),
    z = point.z - OFFICE_SPOT.z;
  if (x >= 5.1 + radius || Math.abs(z) >= 4.1 + radius) return false;
  if (x > 4.8 - radius || z < -3.8 + radius) return true;
  // A wide door on the south facade; both directions remain walkable.
  if (z > 3.8 - radius && x > 1.4 - radius) return true;
  if (overlapsOfficeDesk(point, radius)) return true;
  if (x > 3.9 - radius && z < -1.6 + radius) return true;
  return [-2.5, 2.5].some(
    (seat) => Math.hypot(point.x - OFFICE_SPOT.x - seat, z - 0.5) < 0.4 + radius,
  );
}

/** Walk-in town office; roof and front facade lift away while visiting. */
export function createTownOffice(scene: T.Scene) {
  const group = new T.Group();
  group.name = 'town-office';
  group.position.copy(OFFICE_SPOT);
  scene.add(group);
  const materials = new Map<string, T.MeshStandardMaterial>();
  const geometries: T.BufferGeometry[] = [];
  const stools: T.MeshStandardMaterial[][] = [];
  const facade = new T.Group();
  facade.name = 'office-facade';
  group.add(facade);
  const roof = new T.Group();
  roof.name = 'office-roof';
  group.add(roof);
  const interior = new T.Group();
  interior.name = 'office-interior';
  group.add(interior);
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
      materials.set(color, new T.MeshStandardMaterial({ color, roughness: 0.85 }));
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
    parent: T.Object3D = group,
  ) => part(new T.BoxGeometry(w, h, d), color, x, y, z, parent);
  box(0, 0.02, 0, 10, 0.06, 8, '#c38867');
  for (let z = -3.8; z < 4; z += 0.45) box(0, 0.055, z, 9.8, 0.015, 0.025, '#e1b294');
  box(-4.95, 1.65, 0, 0.2, 3.3, 8, '#f0dfba');
  box(4.95, 1.65, 0, 0.2, 3.3, 8, '#f0dfba');
  box(0, 1.65, -3.95, 10, 3.3, 0.2, '#e4cba7');
  for (const side of [-1, 1]) {
    box(side * 3.2, 1.65, 3.95, 3.6, 3.3, 0.2, '#f0dfba', facade);
    box(side * 3.1, 1.8, 4.08, 1.7, 1.4, 0.12, '#6e8d79', facade);
    box(side * 3.1, 1.8, 4.16, 1.4, 1.1, 0.04, '#bedbcf', facade);
    // Steeper roof with raised seams and a warm timber fascia.
    const slope = box(0, 4.18, side * 2.1, 10.8, 0.18, 4.65, '#466c60', roof);
    slope.rotation.x = side * 0.36;
    for (let x = -5; x <= 5; x += 0.65) {
      const seam = box(x, 4.29, side * 2.1, 0.035, 0.045, 4.65, '#638575', roof);
      seam.rotation.x = side * 0.36;
    }
    box(0, 3.43, side * 4.3, 10.9, 0.18, 0.16, '#b29468', roof);
    box(side * 4.77, 1.65, 4.1, 0.22, 3.3, 0.16, '#d5bb90', facade);
    box(side * 3.2, 0.24, 4.1, 3.6, 0.42, 0.22, '#b6ab91', facade);
    box(side * 3.1, 1.8, 4.2, 0.07, 1.15, 0.07, '#fff0d0', facade);
    box(side * 3.1, 1.8, 4.2, 1.45, 0.07, 0.07, '#fff0d0', facade);
    box(side * 3.1, 1.14, 4.2, 1.95, 0.13, 0.35, '#b29468', facade);
  }
  box(0, 4.98, 0, 10.95, 0.16, 0.22, '#36574e', roof);
  // Fill the gable ends beneath the pitched roof.
  const gable = new T.Shape();
  gable.moveTo(-4.25, 3.32);
  gable.lineTo(0, 4.98);
  gable.lineTo(4.25, 3.32);
  gable.closePath();
  for (const side of [-1, 1]) {
    const end = part(
      new T.ExtrudeGeometry(gable, { depth: 0.12, bevelEnabled: false }),
      '#e4cba7',
      side * 4.95,
      0,
      0,
      roof,
    );
    end.rotation.y = Math.PI / 2;
  }
  // A small civic clock and sheltered entry make the public entrance recognizable.
  // Mount the whole clock assembly ahead of the roof edge so the eave cannot occlude it.
  const clockMount = new T.Group();
  clockMount.position.set(0, 0.45, 0.65);
  facade.add(clockMount);
  box(0, 3.45, 4.02, 2.1, 1.1, 0.3, '#f0dfba', clockMount);
  const entryClock = part(
    new T.CylinderGeometry(0.38, 0.38, 0.09, 32),
    '#fff3d6',
    0,
    3.52,
    4.24,
    clockMount,
  );
  entryClock.rotation.x = Math.PI / 2;
  box(0, 3.63, 4.3, 0.035, 0.23, 0.03, '#466c60', clockMount);
  box(0.1, 3.52, 4.3, 0.2, 0.035, 0.03, '#466c60', clockMount);
  const canopy = box(0, 2.95, 4.43, 3.3, 0.15, 1.05, '#466c60', facade);
  canopy.rotation.x = 0.12;
  for (const side of [-1, 1]) {
    box(side * 1.49, 1.42, 4.05, 0.16, 2.84, 0.23, '#b29468', facade);
  }
  // Open doorway, lintel and floor mat; no solid box across the entrance.
  box(0, 2.9, 3.95, 2.8, 0.8, 0.22, '#6e8d79', facade);
  box(0, 0.07, 3.2, 2.5, 0.06, 1.2, '#74917d');
  box(0, 0.62, -1.2, 7.1, 1.2, 0.9, '#aa6550', interior);
  box(0, 1.27, -1.2, 7.4, 0.15, 1.1, '#d09b70', interior);
  box(0, 1.37, -1.05, 1.15, 0.04, 0.55, '#88a796', interior);
  box(-2.3, 1.54, -1.4, 0.65, 0.5, 0.16, '#59695d', interior);
  box(-2.3, 1.55, -1.3, 0.5, 0.33, 0.025, '#bcdbcf', interior);
  box(-2.3, 1.33, -1.05, 0.7, 0.04, 0.25, '#e8dec4', interior);
  for (let i = 0; i < 3; i++)
    box(
      1.7,
      1.37 + i * 0.06,
      -1.25,
      0.5,
      0.05,
      0.35,
      ['#f7eed4', '#d7a46b', '#b6cbb1'][i],
      interior,
    );
  for (const side of [-1, 1]) {
    box(side * 4.4, 1, -2.7, 0.8, 2, 1.6, '#9a7757', interior);
    for (let y = 0.5; y < 2; y += 0.6)
      box(side * 4.4, y, -1.86, 0.65, 0.04, 0.03, '#e9d4b4', interior);
    const top = part(
      new T.CylinderGeometry(0.42, 0.42, 0.16, 24),
      '#6c8978',
      side * 2.5,
      0.55,
      0.5,
      interior,
    );
    const post = part(
      new T.CylinderGeometry(0.07, 0.1, 0.5, 12),
      '#795c47',
      side * 2.5,
      0.25,
      0.5,
      interior,
    );
    stools.push(
      [top, post].map((mesh, index) => {
        const material = mesh.material.clone();
        mesh.material = material;
        materials.set(`stool-${side}-${index}`, material);
        return material;
      }),
    );
  }
  box(0, 2.1, -3.8, 2.3, 1.2, 0.12, '#8f775b', interior);
  box(0, 2.1, -3.71, 2.1, 1, 0.04, '#e9dfc2', interior);
  for (const x of [-0.65, 0, 0.65]) box(x, 2.15, -3.67, 0.4, 0.6, 0.02, '#fff5de', interior);
  const clock = part(
    new T.CylinderGeometry(0.34, 0.34, 0.07, 32),
    '#fff3d6',
    0,
    3,
    -3.78,
    interior,
  );
  clock.rotation.x = Math.PI / 2;
  box(0, 3.1, -3.72, 0.025, 0.2, 0.03, '#614f42', interior);
  box(0.09, 3, -3.71, 0.18, 0.025, 0.03, '#614f42', interior);
  const light = new T.PointLight('#ffe7bd', 0, 12, 2);
  light.position.set(0, 3, 0);
  group.add(light);
  return {
    setOccupied(points: readonly Point[]) {
      stools.forEach((parts, index) => {
        const seat = OFFICE_SEATS[index];
        const occupied = points.some(
          (point) => Math.hypot(point.x - seat.x, point.z - seat.z) < 0.35,
        );
        // The stool must not slice through the camera-facing seated sprite.
        parts.forEach((material) => {
          material.depthWrite = !occupied;
        });
      });
    },
    update(_time: number, night: boolean, _reduced: boolean, inside = false) {
      roof.visible = facade.visible = !inside;
      interior.visible = inside;
      light.intensity = night ? 7 : 0;
    },
    dispose() {
      group.removeFromParent();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
