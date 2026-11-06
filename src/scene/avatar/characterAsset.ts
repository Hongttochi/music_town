import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Set only after a real, inspected character GLB has been produced. */
export const CHARACTER_ASSET: { url: string | null; height: number; facingRadians: number } = {
  url: null,
  height: 2.2,
  facingRadians: 0,
};

export type CharacterRuntime = {
  object: THREE.Group;
  update: (seconds: number, walking: boolean) => void;
  dispose: () => void;
};

/** The GLB must include its textures, skeleton and in-place animation clips. */
export async function loadCharacterAsset(url: string): Promise<CharacterRuntime> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const object = new THREE.Group();
  const model = gltf.scene;
  object.add(model);
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const textures = new Set<THREE.Texture>();
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.castShadow = true;
    node.receiveShadow = true;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  const release = () => {
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    textures.forEach((value) => value.dispose());
    model.traverse((node) => {
      if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose();
    });
  };
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) {
    release();
    throw new Error('Character GLB has no valid visible geometry.');
  }
  const scale = CHARACTER_ASSET.height / size.y;
  const center = bounds.getCenter(new THREE.Vector3());
  model.scale.multiplyScalar(scale);
  model.position.add(
    new THREE.Vector3(-center.x * scale, -bounds.min.y * scale, -center.z * scale),
  );
  object.rotation.y = CHARACTER_ASSET.facingRadians;
  const mixer = new THREE.AnimationMixer(model);
  const idle = gltf.animations.find((clip) => /idle|standing/i.test(clip.name));
  const walk = gltf.animations.find((clip) => /walk/i.test(clip.name));
  if (!idle || !walk) {
    release();
    throw new Error('Character GLB needs both Idle and Walk clips before activation.');
  }
  const actions = { idle: mixer.clipAction(idle), walk: mixer.clipAction(walk) };
  let active = actions.idle;
  active.play();
  let disposed = false;
  return {
    object,
    update(seconds, walking) {
      if (disposed) return;
      const next = walking ? actions.walk : actions.idle;
      if (next !== active) {
        active.fadeOut(0.18);
        next.reset().fadeIn(0.18).play();
        active = next;
      }
      mixer.update(seconds);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      object.removeFromParent();
      release();
    },
  };
}
