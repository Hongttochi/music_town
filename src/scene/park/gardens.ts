import * as T from 'three';

type Spot = { x: number; z: number };

/** Shared geometry keeps the flower borders inexpensive on mobile. */
export function createGardens(
  scene: T.Scene,
  _walkways: (Spot & { width: number })[],
  clear: (x: number, z: number, radius: number) => boolean,
) {
  const group = new T.Group();
  group.name = 'park-gardens';
  scene.add(group);
  const geometries: T.BufferGeometry[] = [];
  const instanceMeshes: T.InstancedMesh[] = [];
  const materials: T.Material[] = [];
  const geometry = <G extends T.BufferGeometry>(value: G) => {
    geometries.push(value);
    return value;
  };
  const material = (color: string, extra: T.MeshStandardMaterialParameters = {}) => {
    const value = new T.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
    materials.push(value);
    return value;
  };
  const stone = material('#d8cbb8');
  const rim = material('#eee2cf');
  const water = material('#80becb', { roughness: 0.28, metalness: 0.12 });
  const stream = material('#b8e2e8', {
    transparent: true,
    opacity: 0.7,
    roughness: 0.2,
    depthWrite: false,
  });
  function part(g: T.BufferGeometry, m: T.Material, x: number, y: number, z: number) {
    const object = new T.Mesh(geometry(g), m);
    object.position.set(x, y, z);
    object.receiveShadow = true;
    group.add(object);
    return object;
  }

  // Give the central lawn a focal point, with fallback sites for occupied layouts.
  const fountain = [
    { x: -5, z: 2 },
    { x: -5, z: 3.5 },
    { x: 6.5, z: -5 },
    { x: 8, z: -4.8 },
    { x: 4, z: -5.5 },
  ].find(({ x, z }) => clear(x, z, 1.8));
  const drops: T.Mesh[] = [];
  const ripples: T.Mesh[] = [];
  if (fountain) {
    const { x, z } = fountain;
    part(new T.CylinderGeometry(1.75, 1.85, 0.12, 40), stone, x, 0.08, z);
    part(new T.CylinderGeometry(1.5, 1.65, 0.4, 40), stone, x, 0.32, z);
    part(new T.CylinderGeometry(1.43, 1.43, 0.04, 40), water, x, 0.54, z);
    const edge = part(new T.TorusGeometry(1.49, 0.13, 8, 40), rim, x, 0.57, z);
    edge.rotation.x = Math.PI / 2;
    part(new T.CylinderGeometry(0.15, 0.28, 0.85, 16), stone, x, 0.94, z);
    part(new T.CylinderGeometry(0.6, 0.25, 0.22, 24), rim, x, 1.35, z);
    part(new T.CylinderGeometry(0.53, 0.53, 0.025, 24), water, x, 1.47, z);
    part(new T.SphereGeometry(0.12, 12, 8), rim, x, 1.6, z);
    const dropShape = geometry(new T.SphereGeometry(0.045, 6, 4));
    for (let jet = 0; jet < 6; jet++) {
      const angle = (jet * Math.PI) / 3;
      const curve = new T.QuadraticBezierCurve3(
        new T.Vector3(x, 1.65, z),
        new T.Vector3(x + Math.cos(angle) * 0.55, 2.2, z + Math.sin(angle) * 0.55),
        new T.Vector3(x + Math.cos(angle) * 1.1, 0.57, z + Math.sin(angle) * 1.1),
      );
      part(new T.TubeGeometry(curve, 16, 0.018, 4, false), stream, 0, 0, 0);
      for (let i = 0; i < 3; i++) {
        const drop = new T.Mesh(dropShape, stream);
        drop.userData.curve = curve;
        drop.userData.phase = i / 3 + jet / 12;
        group.add(drop);
        drops.push(drop);
      }
    }
    for (let i = 0; i < 3; i++) {
      const ring = part(new T.TorusGeometry(1, 0.012, 4, 32), stream, x, 0.568 + i * 0.002, z);
      ring.rotation.x = Math.PI / 2;
      ripples.push(ring);
    }
  }

  // Keep the open lawn calm: a few dense beds instead of scattered flower dots.
  const beds: Spot[] = [];
  const addBed = (x: number, z: number) => {
    if (!clear(x, z, 1) || beds.some((b) => Math.hypot(x - b.x, z - b.z) < 2.4)) return;
    if (fountain && Math.hypot(x - fountain.x, z - fountain.z) < 2.9) return;
    beds.push({ x, z });
  };
  for (const [x, z] of [
    [-10, 2],
    [-7, 7],
    [-5, -6.5],
    [6, 7],
    [40.5, -7.5],
    [42.5, 0],
    [40.5, 7.5],
  ])
    addBed(x, z);
  const shrubs = [
    { x: 43.5, z: -8.5 },
    { x: 44, z: -1 },
    { x: 43.5, z: 8.5 },
    { x: 40.5, z: 11.5 },
  ].filter(({ x, z }) => clear(x, z, 0.85));
  const flowers = beds.flatMap((bed, bedIndex) =>
    Array.from({ length: 32 }, (_, i) => {
      const angle = i * 2.4 + bedIndex;
      const radius = Math.sqrt(i / 32) * 0.82;
      return {
        x: bed.x + Math.cos(angle) * radius,
        z: bed.z + Math.sin(angle) * radius,
        y: 0.28 + (i % 3) * 0.035,
        color: bedIndex % 3,
      };
    }),
  );
  const palette = ['#e9a4ad', '#f2d58a', '#b6a5d6', '#fff2de'];
  const transform = new T.Object3D();
  function instances(
    shape: T.BufferGeometry,
    surface: T.Material,
    count: number,
    place: (i: number) => void,
  ) {
    const mesh = new T.InstancedMesh(geometry(shape), surface, count);
    instanceMeshes.push(mesh);
    for (let i = 0; i < count; i++) {
      transform.position.set(0, 0, 0);
      transform.scale.set(1, 1, 1);
      transform.rotation.set(0, 0, 0);
      place(i);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  instances(new T.SphereGeometry(1, 10, 7), material('#82966b'), beds.length, (i) => {
    const bed = beds[i];
    transform.position.set(bed.x, 0.1, bed.z);
    transform.scale.set(0.98, 0.18, 0.98);
  });
  // Low rounded foliage frames the flowers without hiding people or the doorway.
  instances(new T.SphereGeometry(1, 10, 7), material('#718754'), shrubs.length * 3, (i) => {
    const shrub = shrubs[Math.floor(i / 3)];
    const lobe = i % 3;
    transform.position.set(shrub.x + (lobe - 1) * 0.32, 0.26, shrub.z + (lobe === 1 ? -0.14 : 0.1));
    transform.scale.set(0.43, lobe === 1 ? 0.46 : 0.34, 0.42);
  });
  palette.forEach((color, colorIndex) => {
    const selected = flowers.filter((f) => f.color === colorIndex);
    instances(new T.SphereGeometry(0.075, 6, 4), material(color), selected.length * 5, (i) => {
      const f = selected[Math.floor(i / 5)],
        angle = ((i % 5) * Math.PI * 2) / 5;
      transform.position.set(f.x + Math.cos(angle) * 0.075, f.y, f.z + Math.sin(angle) * 0.075);
      transform.scale.set(1, 0.55, 1);
    });
  });
  instances(new T.SphereGeometry(0.045, 6, 4), material('#d9af55'), flowers.length, (i) => {
    const f = flowers[i];
    transform.position.set(f.x, f.y + 0.025, f.z);
  });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function update(time: number) {
    const seconds = reducedMotion ? 0 : time / 1000;
    drops.forEach((drop) =>
      drop.position.copy(
        (drop.userData.curve as T.QuadraticBezierCurve3).getPoint(
          (seconds * 0.55 + drop.userData.phase) % 1,
        ),
      ),
    );
    ripples.forEach((ring, i) => ring.scale.setScalar(0.35 + ((seconds * 0.3 + i / 3) % 1) * 1.02));
  }
  update(0);
  return {
    fountain,
    beds,
    shrubs,
    update,
    dispose() {
      group.removeFromParent();
      instanceMeshes.forEach((mesh) => mesh.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
