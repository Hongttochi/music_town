import * as THREE from 'three';
import type { Avatar } from './model';
import { loadAvatarLayers, composeAvatar } from './modularAvatar';

/** Six character rows, each with front/right/back/left views. */
export function createImageCharacters() {
  let ready = false;
  let disposed = false;
  const actors = new Set<{
    group: THREE.Group;
    sprite: THREE.Sprite;
    texture: THREE.Texture;
    avatar: Partial<Avatar>;
  }>();
  let source: Awaited<ReturnType<typeof loadAvatarLayers>> | null = null;
  loadAvatarLayers()
    .then((image) => {
      if (disposed) return;
      source = image;
      ready = true;
      actors.forEach((actor) => {
        actor.texture.image = composeAvatar(image, actor.avatar);
        actor.texture.needsUpdate = true;
      });
    })
    .catch((error) => console.error('Character image failed to load', error));
  function create(avatar: Partial<Avatar>) {
    const texture = new THREE.Texture(source ? composeAvatar(source, avatar) : undefined);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(0.25, 1);
    texture.offset.set(0, 0);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    if (ready) texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.15,
      depthWrite: false,
    });
    material.toneMapped = false;
    const sprite = new THREE.Sprite(material);
    // Feet are near 95% of each cell. Anchor there to avoid floating above the ground.
    sprite.center.set(0.5, 0.05);
    sprite.scale.set(2.8, 2.8, 1);
    const group = new THREE.Group();
    group.add(sprite);
    group.userData.limbs = [];
    actors.add({ group, sprite, texture, avatar });
    return group;
  }
  function update(player: THREE.Group, moving: boolean, time: number) {
    for (const actor of actors) {
      if (!actor.group.parent) {
        actor.texture.dispose();
        actor.sprite.material.dispose();
        actors.delete(actor);
        continue;
      }
      actor.sprite.visible = ready;
      const angle = Math.atan2(Math.sin(actor.group.rotation.y), Math.cos(actor.group.rotation.y));
      const cell =
        Math.abs(angle) < Math.PI / 4
          ? 0
          : Math.abs(angle) > Math.PI * 0.75
            ? 2
            : angle > 0
              ? 1
              : 3;
      actor.texture.offset.set(cell * 0.25, 0);
      actor.sprite.material.rotation =
        actor.group === player && moving ? Math.sin(time / 130) * 0.045 : 0;
    }
  }
  function dispose() {
    disposed = true;
    actors.forEach((actor) => {
      actor.texture.dispose();
      actor.sprite.material.dispose();
    });
    actors.clear();
  }
  return { create, update, dispose };
}
