import * as T from 'three';

export const CAMPFIRE_SPOT = new T.Vector3(0, 0, 2);
export const CAMPFIRE_RADIUS = 1.25;

/** Shared textures and a few sprites keep the evening fire inexpensive on mobile. */
export function createCampfire(scene: T.Scene) {
  const group = new T.Group();
  group.name = 'central-campfire';
  group.position.copy(CAMPFIRE_SPOT);
  scene.add(group);
  const materials: T.Material[] = [];
  const material = (color: string) => {
    const result = new T.MeshStandardMaterial({ color, roughness: 0.95 });
    materials.push(result);
    return result;
  };
  const earth = material('#c4ac7d'),
    ash = material('#756654'),
    bark = material('#735039'),
    cut = material('#bf9563');
  const add = (geometry: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number) => {
    const mesh = new T.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const clearing = add(new T.CircleGeometry(2.45, 48), earth, 0, 0.018, 0);
  clearing.rotation.x = -Math.PI / 2;
  const bed = add(new T.CircleGeometry(1.08, 32), ash, 0, 0.028, 0);
  bed.rotation.x = -Math.PI / 2;
  const stoneMaterials = ['#a6a28c', '#b8b19a', '#908e7c'].map(material);
  const rockGeometry = new T.IcosahedronGeometry(0.3, 1);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const rock = add(
      rockGeometry,
      stoneMaterials[i % 3],
      Math.cos(angle) * 1.02,
      0.18,
      Math.sin(angle) * 1.02,
    );
    rock.scale.set(1.15, 0.75, 0.9);
    rock.rotation.set(0.1 * i, angle, 0.13 * (i % 3));
  }
  const logGeometry = new T.CylinderGeometry(0.17, 0.2, 1.65, 9);
  for (let i = 0; i < 4; i++) {
    const angle = i % 2 ? -0.7 : 0.7;
    const direction = new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const center = new T.Vector3(0, 0.23 + Math.floor(i / 2) * 0.24, i % 2 ? -0.22 : 0.22);
    const log = add(logGeometry, bark, center.x, center.y, center.z);
    log.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
    for (const sign of [-1, 1]) {
      const end = center.clone().addScaledVector(direction, sign * 0.83);
      const disc = add(new T.CircleGeometry(0.155, 12), cut, end.x, end.y, end.z);
      disc.quaternion.setFromUnitVectors(
        new T.Vector3(0, 0, 1),
        direction.clone().multiplyScalar(sign),
      );
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 20, 0, 250);
  gradient.addColorStop(0, '#ffc45100');
  gradient.addColorStop(0.2, '#ff9c29b0');
  gradient.addColorStop(0.55, '#ffb943ed');
  gradient.addColorStop(1, '#fff4b5');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(66, 12);
  ctx.bezierCurveTo(111, 84, 70, 110, 106, 150);
  ctx.bezierCurveTo(151, 232, 89, 257, 57, 249);
  ctx.bezierCurveTo(1, 254, 4, 197, 30, 157);
  ctx.bezierCurveTo(26, 203, 67, 174, 53, 131);
  ctx.bezierCurveTo(36, 82, 72, 63, 66, 12);
  ctx.fill();
  const flameTexture = new T.CanvasTexture(canvas);
  flameTexture.colorSpace = T.SRGBColorSpace;
  const flames = Array.from({ length: 3 }, (_, i) => {
    const mat = new T.SpriteMaterial({
      map: flameTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    materials.push(mat);
    const sprite = new T.Sprite(mat);
    sprite.name = 'campfire-flame';
    sprite.position.set((i - 1) * 0.27, 0.43, (i % 2) * 0.18);
    sprite.center.set(0.5, 0);
    group.add(sprite);
    return sprite;
  });
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 64;
  const gc = glowCanvas.getContext('2d')!;
  const glow = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, '#ffcc7680');
  glow.addColorStop(0.45, '#ffa84c35');
  glow.addColorStop(1, '#ff9e3900');
  gc.fillStyle = glow;
  gc.fillRect(0, 0, 64, 64);
  const glowTexture = new T.CanvasTexture(glowCanvas);
  const glowMaterial = new T.MeshBasicMaterial({
    map: glowTexture,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  materials.push(glowMaterial);
  const pool = add(new T.PlaneGeometry(7, 7), glowMaterial, 0, 0.035, 0);
  pool.rotation.x = -Math.PI / 2;
  const light = new T.PointLight('#ffb45e', 0, 10, 2);
  light.position.set(0, 1.3, 0);
  group.add(light);
  // Default to unlit until the world's current time is supplied.
  flames.forEach((flame) => (flame.visible = false));
  pool.visible = false;
  return {
    update(night: boolean, time: number, reducedMotion: boolean) {
      const t = reducedMotion ? 0 : time / 1000;
      flames.forEach((flame, i) => {
        flame.visible = night;
        if (!night) return;
        const pulse = Math.sin(t * 3.3 + i * 2.1);
        flame.scale.set(
          0.72 + i * 0.08 + pulse * 0.06,
          1.15 + (i === 1 ? 0.5 : 0) + pulse * 0.12,
          1,
        );
        flame.material.rotation = Math.sin(t * 2 + i) * 0.07;
      });
      pool.visible = night;
      light.intensity = night ? 32 + Math.sin(t * 3.3) * 2 : 0;
    },
    dispose() {
      flameTexture.dispose();
      glowTexture.dispose();
      materials.forEach((mat) => mat.dispose());
    },
  };
}
