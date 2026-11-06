import { type CoffeeId } from './coffeeMenu';
import * as THREE from 'three';
import { drawDrinkingPose } from './drinkingAvatar';
import type { Avatar } from './model';
import { composeSeatedAvatar } from './seatedAvatar';
import { loadAvatarLayers, composeAvatar } from './modularAvatar';

/** Six character rows, each with front/right/back/left views. */
export function createImageCharacters(renderer: THREE.WebGLRenderer) {
  let ready = false;
  let disposed = false;
  const actors = new Set<{
    group: THREE.Group;
    sprite: THREE.Sprite;
    texture: THREE.Texture;
    avatar: Partial<Avatar>;
    standingImage?: HTMLCanvasElement;
    seatedImage?: HTMLCanvasElement;
    seated?: boolean;
    drinkAtlas?: HTMLCanvasElement;
    drinkTexture?: THREE.CanvasTexture;
    drinkSource?: HTMLCanvasElement;
    preparedFrames?: number;
    coffee?: CoffeeId;
  }>();
  let source: Awaited<ReturnType<typeof loadAvatarLayers>> | null = null;
  loadAvatarLayers()
    .then((image) => {
      if (disposed) return;
      source = image;
      ready = true;
      actors.forEach((actor) => {
        actor.standingImage = composeAvatar(image, actor.avatar);
        actor.texture.image = actor.standingImage;
        actor.seated = false;
        actor.texture.needsUpdate = true;
      });
    })
    .catch((error) => console.error('Character image failed to load', error));
  function create(avatar: Partial<Avatar>) {
    const standingImage = source ? composeAvatar(source, avatar) : undefined;
    const texture = new THREE.Texture(standingImage);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(0.25, 1);
    texture.offset.set(0, 0);
    // The 512px view is usually displayed at a fraction of its native size in the park.
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
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
    actors.add({ group, sprite, texture, avatar, standingImage });
    return group;
  }
  function update(player: THREE.Group, moving: boolean, time: number) {
    for (const actor of actors) {
      if (!actor.group.parent) {
        actor.drinkTexture?.dispose();
        actor.texture.dispose();
        actor.sprite.material.dispose();
        actors.delete(actor);
        continue;
      }
      actor.sprite.visible = ready;
      const seated = actor.group.userData.seated === true;
      if (actor.standingImage && actor.seated !== seated) {
        if (seated && !actor.seatedImage) {
          actor.seatedImage = composeSeatedAvatar(actor.standingImage);
        }
        actor.texture.image = seated ? actor.seatedImage! : actor.standingImage;
        actor.texture.needsUpdate = true;
        actor.seated = seated;
      }
      const drinking = actor.group.userData.drinking as number | undefined;
      const coffee = (actor.group.userData.coffee ?? 'americano') as CoffeeId;
      if (actor.coffee !== coffee) {
        actor.sprite.material.map = actor.texture;
        actor.drinkTexture?.dispose();
        actor.drinkTexture = undefined;
        actor.drinkAtlas = undefined;
        actor.drinkSource = undefined;
        actor.preparedFrames = 0;
        actor.coffee = coffee;
      }
      // Prepare one front-facing pose per frame while the machine brews.
      // A single atlas is uploaded once; drinking only changes UV coordinates.
      if (
        actor.group.userData.coffeePreparing &&
        actor.standingImage &&
        source &&
        !actor.drinkTexture
      ) {
        if (!actor.drinkAtlas) {
          actor.drinkAtlas = document.createElement('canvas');
          actor.drinkAtlas.width = 2048;
          actor.drinkAtlas.height = 1024;
          actor.drinkSource = composeAvatar(source, { ...actor.avatar, instrument: 'none' });
        } else {
          const frame = actor.preparedFrames ?? 0;
          const ctx = actor.drinkAtlas.getContext('2d')!;
          ctx.save();
          ctx.translate((frame % 8) * 256, Math.floor(frame / 8) * 256);
          ctx.scale(0.5, 0.5);
          drawDrinkingPose(ctx, actor.drinkSource!, frame / 31, coffee);
          ctx.restore();
          actor.preparedFrames = frame + 1;
          if (actor.preparedFrames === 32) {
            const texture = new THREE.CanvasTexture(actor.drinkAtlas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.generateMipmaps = false;
            texture.minFilter = texture.magFilter = THREE.LinearFilter;
            texture.repeat.set(1 / 8, 1 / 4);
            renderer.initTexture(texture);
            actor.drinkTexture = texture;
            actor.drinkSource = undefined;
          }
        }
      }
      if (drinking !== undefined && actor.drinkTexture) {
        const frame = Math.round(Math.max(0, Math.min(1, drinking)) * 31);
        actor.drinkTexture.offset.set((frame % 8) / 8, 1 - (Math.floor(frame / 8) + 1) / 4);
        actor.sprite.material.map = actor.drinkTexture;
      } else actor.sprite.material.map = actor.texture;
      // Anchor the hips to the seat rather than anchoring seated feet to the ground.
      actor.sprite.center.set(0.5, seated ? 0.25 : 0.05);
      actor.sprite.position.y = seated ? 0.68 : 0;
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
        drinking !== undefined
          ? -drinking * 0.035
          : (actor.group === player ? moving : actor.group.userData.walking === true)
            ? Math.sin(time / 130) * 0.045
            : 0;
    }
  }
  function dispose() {
    disposed = true;
    actors.forEach((actor) => {
      actor.drinkTexture?.dispose();
      actor.texture.dispose();
      actor.sprite.material.dispose();
    });
    actors.clear();
  }
  function drinkingReady(group: THREE.Group, coffee: CoffeeId) {
    for (const actor of actors)
      if (actor.group === group) return actor.coffee === coffee && !!actor.drinkTexture;
    return false;
  }
  return { create, update, dispose, drinkingReady };
}
