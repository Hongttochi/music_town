import * as THREE from 'three';
import { findRoomFurniture } from '../../utils/roomLayout';
import type { RoomFurnitureId } from '../../types/room';

const MARGIN = 0.06;
export const GHOST_OK_COLOR = '#6fd18a';
export const GHOST_BLOCKED_COLOR = '#ef6b6b';
const GHOST_OK = new THREE.Color(GHOST_OK_COLOR);
const GHOST_BLOCKED = new THREE.Color(GHOST_BLOCKED_COLOR);

type Finish = {
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
};

export function createFurniture(item: RoomFurnitureId): THREE.Group {
  const furniture = findRoomFurniture(item);
  if (!furniture) throw new Error(`Unknown room furniture: ${item}`);

  const group = new THREE.Group();
  group.name = `room-furniture-${item}`;

  const w = furniture.width - MARGIN * 2;
  const d = furniture.depth - MARGIN * 2;
  const materials = new Map<string, THREE.MeshStandardMaterial>();

  function material(color: string, finish: Finish = {}) {
    const roughness = finish.roughness ?? 0.82;
    const metalness = finish.metalness ?? 0;
    const emissive = finish.emissive ?? '#000000';
    const emissiveIntensity = finish.emissiveIntensity ?? 0;
    const key = `${color}|${roughness}|${metalness}|${emissive}|${emissiveIntensity}`;
    let result = materials.get(key);
    if (!result) {
      result = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        emissive,
        emissiveIntensity,
      });
      materials.set(key, result);
    }
    return result;
  }

  function mesh(
    geometry: THREE.BufferGeometry,
    finishMaterial: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const part = new THREE.Mesh(geometry, finishMaterial);
    part.position.set(x, y, z);
    part.castShadow = true;
    part.receiveShadow = true;
    group.add(part);
    return part;
  }

  function box(
    color: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    finish: Finish = {},
  ) {
    return mesh(new THREE.BoxGeometry(width, height, depth), material(color, finish), x, y, z);
  }

  function cylinder(
    color: string,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    segments: number,
    x: number,
    y: number,
    z: number,
    finish: Finish = {},
    rotation?: { x?: number; y?: number; z?: number },
  ) {
    const part = mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
      material(color, finish),
      x,
      y,
      z,
    );
    part.rotation.set(rotation?.x ?? 0, rotation?.y ?? 0, rotation?.z ?? 0);
    return part;
  }

  function sphere(
    color: string,
    radius: number,
    x: number,
    y: number,
    z: number,
    scale: { x?: number; y?: number; z?: number } = {},
    finish: Finish = {},
  ) {
    const part = mesh(new THREE.SphereGeometry(radius, 10, 8), material(color, finish), x, y, z);
    part.scale.set(scale.x ?? 1, scale.y ?? 1, scale.z ?? 1);
    return part;
  }

  switch (item) {
    case 'bed': {
      const wood = '#79543a';
      const frame = '#8d6244';
      const linen = '#f3e7d4';
      for (const x of [-w * 0.4, w * 0.4])
        for (const z of [-d * 0.42, d * 0.42]) box(wood, 0.12, 0.16, 0.12, x, 0.08, z);
      box(frame, w, 0.14, d, 0, 0.2, 0);
      box('#a97551', w * 0.96, 0.18, d * 0.94, 0, 0.34, 0);
      box(linen, w * 0.93, 0.16, d * 0.9, 0, 0.36, 0);
      box('#8ca687', w * 0.9, 0.06, d * 0.46, 0, 0.46, d * 0.2);
      box('#fff8e9', w * 0.54, 0.11, d * 0.16, 0, 0.49, -d * 0.36);
      box('#734b34', w, 0.35, 0.09, 0, 0.33, -d * 0.5);
      break;
    }
    case 'sofa': {
      box('#5d7e70', w * 0.94, 0.28, d * 0.74, 0, 0.25, 0);
      box('#547366', w * 0.94, 0.55, d * 0.2, 0, 0.6, -d * 0.37);
      for (const x of [-w * 0.43, w * 0.43]) box('#547366', 0.17, 0.36, d * 0.7, x, 0.47, 0);
      for (let i = 0; i < 3; i++)
        box('#e7d0ae', w * 0.27, 0.15, d * 0.58, -w * 0.29 + i * w * 0.29, 0.45, d * 0.04);
      for (const x of [-w * 0.38, w * 0.38]) box('#4b685d', 0.06, 0.08, 0.06, x, 0.04, -d * 0.25);
      break;
    }
    case 'chair': {
      box('#a86f45', 0.62, 0.08, 0.58, 0, 0.45, 0);
      box('#8e5b38', 0.58, 0.5, 0.07, 0, 0.72, -0.29);
      for (const x of [-0.24, 0.24])
        for (const z of [-0.22, 0.22]) box('#6f462e', 0.07, 0.42, 0.07, x, 0.21, z);
      box('#c99a6c', 0.5, 0.06, 0.46, 0, 0.5, 0.01);
      break;
    }
    case 'table': {
      box('#9c6a44', w, 0.1, d, 0, 0.74, 0);
      box('#b27c52', w * 0.92, 0.06, d * 0.92, 0, 0.67, 0);
      for (const x of [-w * 0.4, w * 0.4])
        for (const z of [-d * 0.4, d * 0.4]) box('#7b5133', 0.09, 0.68, 0.09, x, 0.34, z);
      break;
    }
    case 'desk': {
      box('#9b6b47', w, 0.08, d * 0.96, 0, 0.74, 0);
      for (const x of [-w * 0.42, w * 0.42])
        for (const z of [-d * 0.34, d * 0.34]) box('#745033', 0.08, 0.7, 0.08, x, 0.35, z);
      box('#80583a', w * 0.34, 0.34, d * 0.58, w * 0.24, 0.51, 0);
      box('#d8b17d', w * 0.22, 0.04, 0.04, w * 0.24, 0.51, d * 0.3);
      break;
    }
    case 'lamp': {
      cylinder('#6f5a45', 0.22, 0.22, 0.06, 14, 0, 0.03, 0, { roughness: 0.6 });
      cylinder('#8b7359', 0.035, 0.035, 1.12, 8, 0, 0.62, 0, { metalness: 0.25, roughness: 0.5 });
      cylinder('#f6d9a1', 0.13, 0.27, 0.3, 16, 0, 1.3, 0, {
        emissive: '#f2b45e',
        emissiveIntensity: 0.9,
        roughness: 0.7,
      });
      sphere('#ffe6b5', 0.06, 0, 1.25, 0, {}, { emissive: '#ffcf83', emissiveIntensity: 1 });
      break;
    }
    case 'plant': {
      cylinder('#b46c4b', 0.22, 0.16, 0.3, 10, 0, 0.15, 0, { roughness: 0.9 });
      cylinder('#ca8560', 0.23, 0.23, 0.06, 10, 0, 0.29, 0);
      cylinder('#5a4433', 0.18, 0.18, 0.03, 10, 0, 0.325, 0);
      cylinder('#4c6d3d', 0.025, 0.03, 0.32, 6, 0, 0.47, 0);
      sphere('#4f7d54', 0.18, 0, 0.67, 0);
      sphere('#6b9a63', 0.14, -0.13, 0.58, 0.06, { y: 0.85 });
      sphere('#6b9a63', 0.14, 0.12, 0.61, -0.06, { y: 0.9 });
      sphere('#3f6b4a', 0.16, 0.02, 0.82, 0.02, { y: 0.9 });
      sphere('#5a8a58', 0.11, -0.07, 0.87, -0.05);
      break;
    }
    case 'rug': {
      box('#b06f5d', w, 0.035, d, 0, 0.018, 0);
      box('#d9a487', w * 0.9, 0.02, d * 0.86, 0, 0.042, 0);
      box('#ead0ad', w * 0.66, 0.012, d * 0.55, 0, 0.055, 0);
      break;
    }
    case 'bookshelf': {
      const frame = '#7b5238';
      const shelf = '#9a6a48';
      for (const x of [-w / 2 + 0.04, w / 2 - 0.04]) box(frame, 0.08, 1.58, d * 0.92, x, 0.79, 0);
      box(frame, w, 0.08, d * 0.92, 0, 1.56, 0);
      box(frame, w, 0.08, d * 0.92, 0, 0.04, 0);
      box('#6d4932', w * 0.96, 1.5, 0.04, 0, 0.78, -d * 0.4);
      const colors = ['#b65f52', '#6b8c6a', '#d4a85d', '#5e7691', '#9d6c96', '#c4825a'];
      for (let row = 0; row < 3; row++) {
        const shelfY = 0.33 + row * 0.38;
        box(shelf, w * 0.9, 0.055, d * 0.72, 0, shelfY, 0.02);
        for (let i = 0; i < 5; i++) {
          const bookW = 0.11 + ((i + row) % 3) * 0.02;
          const bookH = 0.22 + ((i * 3 + row) % 4) * 0.03;
          box(
            colors[(i + row) % colors.length],
            bookW,
            bookH,
            0.24,
            -w * 0.31 + i * (w * 0.155),
            shelfY + bookH / 2 + 0.03,
            0.02,
          );
        }
      }
      break;
    }
    case 'tv': {
      box('#6f5138', w * 0.62, 0.42, d * 0.6, 0, 0.22, 0);
      for (const x of [-w * 0.24, w * 0.24]) box('#523b29', 0.08, 0.08, d * 0.5, x, 0.04, 0);
      box('#3e4646', w * 0.8, 0.1, d * 0.42, 0, 0.48, 0);
      box('#252b2c', w * 0.9, 0.8, 0.1, 0, 0.88, 0, { roughness: 0.5 });
      box('#10181a', w * 0.8, 0.68, 0.04, 0, 0.88, 0.065, {
        roughness: 0.25,
        metalness: 0.35,
      });
      box('#596366', 0.06, 0.05, 0.02, w * 0.37, 0.52, 0.07);
      break;
    }
    case 'guitar': {
      const body = '#a9663b';
      cylinder(body, 0.23, 0.23, 0.1, 16, 0, 0.38, 0, { roughness: 0.65 }, { x: Math.PI / 2 });
      cylinder(body, 0.17, 0.17, 0.1, 16, 0, 0.6, 0, { roughness: 0.65 }, { x: Math.PI / 2 });
      box('#6d4527', 0.07, 0.62, 0.06, 0, 0.95, 0);
      box('#4f321d', 0.15, 0.18, 0.06, 0, 1.33, 0);
      box('#2f2419', 0.34, 0.06, 0.07, 0, 0.16, 0.05);
      for (const x of [-0.025, 0, 0.025]) box('#e7d9b8', 0.01, 0.58, 0.012, x, 0.96, 0.045);
      box('#cbb48a', 0.05, 0.1, 0.035, 0, 0.44, 0.07);
      break;
    }
    case 'speaker': {
      box('#4b5553', 0.58, 0.75, 0.46, 0, 0.4, 0);
      box('#2e3534', 0.5, 0.66, 0.03, 0, 0.4, 0.24);
      cylinder('#8d9793', 0.13, 0.13, 0.04, 16, 0, 0.56, 0.27, {}, { x: Math.PI / 2 });
      cylinder('#5f6a67', 0.09, 0.09, 0.05, 16, 0, 0.56, 0.295, {}, { x: Math.PI / 2 });
      cylinder('#8d9793', 0.08, 0.08, 0.04, 16, 0, 0.27, 0.27, {}, { x: Math.PI / 2 });
      cylinder('#5f6a67', 0.05, 0.05, 0.05, 16, 0, 0.27, 0.295, {}, { x: Math.PI / 2 });
      for (const x of [-0.2, 0.2]) box('#303836', 0.07, 0.06, 0.07, x, 0.03, 0);
      break;
    }
  }

  return group;
}

export function setGhostAppearance(group: THREE.Group, ok: boolean) {
  const tint = ok ? GHOST_OK : GHOST_BLOCKED;
  const originals: THREE.Material[] = group.userData.originalMaterials ?? [];
  group.userData.originalMaterials = originals;
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const existing = object.material;
    if (object.userData.ghost) {
      const previous = Array.isArray(existing) ? existing : [existing];
      previous.forEach((item) => item.dispose());
    } else {
      (Array.isArray(existing) ? existing : [existing]).forEach((item) => originals.push(item));
    }
    const tinted = (source: THREE.Material) => {
      const clone = source.clone() as THREE.MeshStandardMaterial;
      clone.transparent = true;
      clone.opacity = 0.55;
      clone.depthWrite = false;
      clone.color.copy(tint);
      clone.emissive.copy(tint).multiplyScalar(0.35);
      clone.emissiveIntensity = 1;
      clone.needsUpdate = true;
      return clone;
    };
    object.material = Array.isArray(existing) ? existing.map(tinted) : tinted(existing);
    object.userData.ghost = true;
  });
}

export function disposeFurniture(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const originals = group.userData.originalMaterials as THREE.Material[] | undefined;
  originals?.forEach((item) => materials.add(item));
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    if (Array.isArray(object.material)) object.material.forEach((item) => materials.add(item));
    else materials.add(object.material);
  });
  group.removeFromParent();
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((item) => item.dispose());
}
