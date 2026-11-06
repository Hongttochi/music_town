import * as T from 'three';

export const SCHOOL_SPOT = new T.Vector3(-19, 0, -4);
export const SCHOOL_NPC_SPOT = new T.Vector3(-17.4, 0, -0.4);
export function overlapsSchool(point: { x: number; z: number }, radius: number) {
  return (
    Math.abs(point.x - SCHOOL_SPOT.x) < 2.9 + radius &&
    Math.abs(point.z - SCHOOL_SPOT.z) < 1.9 + radius
  );
}

/** A small village school and its rabbit caretaker. */
export function createSchool(scene: T.Scene) {
  const school = new T.Group();
  school.name = 'village-clock-school';
  school.position.copy(SCHOOL_SPOT);
  scene.add(school);
  const materials = new Map<string, T.MeshStandardMaterial>();
  function material(color: string) {
    if (!materials.has(color))
      materials.set(color, new T.MeshStandardMaterial({ color, roughness: 0.85 }));
    return materials.get(color)!;
  }
  function part(
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new T.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    parent: T.Object3D = school,
  ) {
    return part(parent, new T.BoxGeometry(w, h, d), color, x, y, z);
  }
  box(0, 1.5, 0, 5.6, 3, 3.4, '#efdcb2');
  box(0, 0.18, 0, 5.9, 0.36, 3.7, '#b29171');
  for (const side of [-1, 1]) {
    const roof = box(0, 3.5, side * 0.95, 6.1, 0.22, 2.25, '#b46e50');
    roof.rotation.x = side * 0.42;
    for (const x of [-1.85, 1.85]) {
      box(x, 1.85, side * 1.73, 1.1, 1.25, 0.12, '#a27e59');
      box(x, 1.85, side * 1.81, 0.91, 1.06, 0.07, '#99c4bb');
      box(x, 1.85, side * 1.86, 0.07, 1.06, 0.05, '#fff0cc');
      box(x, 1.85, side * 1.86, 0.91, 0.07, 0.05, '#fff0cc');
    }
  }
  box(0, 1.12, 1.75, 1.05, 2.1, 0.15, '#7e9a72');
  box(0, 1.55, 1.85, 0.68, 0.67, 0.06, '#bfd9cf');
  box(0.32, 0.95, 1.88, 0.08, 0.08, 0.08, '#eac580');
  box(0, 0.12, 2.05, 1.7, 0.24, 0.65, '#d6c49c');
  box(0, 3.95, 0.65, 1.75, 2.15, 1.45, '#f5e8c9');
  const cap = part(school, new T.ConeGeometry(1.42, 0.85, 4), '#9a5e48', 0, 5.35, 0.65);
  cap.rotation.y = Math.PI / 4;
  const rim = part(school, new T.CylinderGeometry(0.7, 0.7, 0.1, 32), '#8c7754', 0, 4.25, 1.43);
  rim.rotation.x = Math.PI / 2;
  const face = part(school, new T.CircleGeometry(0.61, 32), '#fff8df', 0, 4.25, 1.49);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const tick = box(
      Math.sin(a) * 0.51,
      4.25 + Math.cos(a) * 0.51,
      1.51,
      0.035,
      0.09,
      0.025,
      '#52614a',
    );
    tick.rotation.z = -a;
  }
  function hand(length: number, width: number) {
    const pivot = new T.Group();
    pivot.position.copy(face.position).add(new T.Vector3(0, 0, 0.05));
    school.add(pivot);
    box(0, length / 2, 0, width, length, 0.03, '#52614a', pivot);
    return pivot;
  }
  const hourHand = hand(0.29, 0.06),
    minuteHand = hand(0.43, 0.035);
  const rabbit = new T.Group();
  rabbit.name = 'school-rabbit-caretaker';
  rabbit.position.copy(SCHOOL_NPC_SPOT);
  scene.add(rabbit);
  function oval(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: string,
  ) {
    const mesh = part(rabbit, new T.SphereGeometry(1, 16, 12), color, x, y, z);
    mesh.scale.set(sx, sy, sz);
    return mesh;
  }
  oval(0, 0.8, 0, 0.4, 0.5, 0.29, '#809b79');
  oval(0, 1.48, 0.03, 0.48, 0.45, 0.36, '#f5e9d4');
  for (const side of [-1, 1]) {
    oval(side * 0.23, 2.03, 0, 0.14, 0.46, 0.13, '#f5e9d4').rotation.z = -side * 0.13;
    oval(side * 0.23, 2.06, 0.11, 0.065, 0.3, 0.035, '#dbb1a0');
    oval(side * 0.17, 1.54, 0.36, 0.045, 0.062, 0.025, '#414836');
    oval(side * 0.3, 1.38, 0.32, 0.09, 0.045, 0.025, '#dfb09c');
    oval(side * 0.21, 0.18, 0.1, 0.18, 0.16, 0.25, '#b39170');
    oval(side * 0.39, 0.86, 0.09, 0.13, 0.28, 0.14, '#f5e9d4');
  }
  oval(0, 1.39, 0.4, 0.055, 0.04, 0.03, '#a77b67');
  box(0, 0.82, 0.35, 0.48, 0.36, 0.12, '#be885c', rabbit);
  box(0, 0.84, 0.42, 0.38, 0.24, 0.03, '#f3dfaf', rabbit);
  const entranceLight = new T.PointLight('#ffe0a2', 0, 9, 1.8);
  entranceLight.position.set(SCHOOL_SPOT.x, 3, SCHOOL_SPOT.z + 3);
  scene.add(entranceLight);
  let lastMinute = -1;
  return {
    update(time: number, player: T.Vector3) {
      const minute = Math.floor(Date.now() / 60000);
      if (minute !== lastMinute) {
        lastMinute = minute;
        const date = new Date();
        const hour = (date.getUTCHours() + 9) % 24;
        entranceLight.intensity = hour >= 19 || hour < 6 ? 8 : 0;
        minuteHand.rotation.z = (-date.getUTCMinutes() * Math.PI) / 30;
        hourHand.rotation.z =
          (-(((date.getUTCHours() + 9) % 12) + date.getUTCMinutes() / 60) * Math.PI) / 6;
      }
      rabbit.position.y = Math.sin(time * 0.002) * 0.035;
      const near = player.distanceTo(SCHOOL_NPC_SPOT) < 5;
      const target = near
        ? Math.atan2(player.x - rabbit.position.x, player.z - rabbit.position.z)
        : 0.2;
      rabbit.rotation.y +=
        Math.atan2(Math.sin(target - rabbit.rotation.y), Math.cos(target - rabbit.rotation.y)) *
        0.04;
    },
    dispose() {
      materials.forEach((m) => m.dispose());
    },
  };
}
