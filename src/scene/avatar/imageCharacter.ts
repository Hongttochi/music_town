import type { BarDrinkId } from '../../data/bar';
import { type CoffeeId } from '../../data/coffeeMenu';
import * as THREE from 'three';
import { drawDrinkingPose } from './drinkingAvatar';
import type { Avatar } from '../../data/model';
import { composeSeatedAvatar } from './seatedAvatar';
import { loadAvatarLayers, composeAvatar } from './modularAvatar';
import { composeWalkingAvatar, WALK_FRAMES } from './walkingAvatar';
import {
  advanceGait,
  createGaitState,
  facingCell,
  gaitBob,
  gaitFrame,
  gaitTilt,
  type GaitState,
} from './gait';

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
    walkTexture?: THREE.CanvasTexture;
    gait: GaitState;
    facingCell?: number;
    drinkAtlas?: HTMLCanvasElement;
    drinkTexture?: THREE.CanvasTexture;
    drinkSource?: HTMLCanvasElement;
    drinkArmSource?: HTMLCanvasElement;
    drinkHairLayer?: HTMLCanvasElement;
    preparedFrames?: number;
    coffee?: CoffeeId;
    barDrink?: BarDrinkId;
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
    actors.add({ group, sprite, texture, avatar, standingImage, gait: createGaitState() });
    return group;
  }
  function update(player: THREE.Group, moving: boolean, dt: number, reducedMotion = false) {
    for (const actor of actors) {
      if (!actor.group.parent) {
        actor.walkTexture?.dispose();
        actor.drinkTexture?.dispose();
        actor.texture.dispose();
        actor.sprite.material.dispose();
        actors.delete(actor);
        continue;
      }
      actor.sprite.visible = ready;
      const foreground = actor.group.userData.inFrontOfBarCounter === true;
      actor.sprite.material.depthTest = !foreground;
      actor.sprite.renderOrder = foreground ? 10 : 0;
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
      const barDrink = actor.group.userData.barDrink as BarDrinkId | undefined;
      if (actor.coffee !== coffee || actor.barDrink !== barDrink) {
        actor.sprite.material.map = actor.texture;
        actor.drinkTexture?.dispose();
        actor.drinkTexture = undefined;
        actor.drinkAtlas = undefined;
        actor.drinkSource = undefined;
        actor.drinkArmSource = undefined;
        actor.drinkHairLayer = undefined;
        actor.preparedFrames = 0;
        actor.coffee = coffee;
        actor.barDrink = barDrink;
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
          actor.drinkArmSource = composeAvatar(
            source,
            { ...actor.avatar, instrument: 'none' },
            0,
            'body',
          );
          actor.drinkHairLayer = composeAvatar(
            source,
            { ...actor.avatar, instrument: 'none' },
            0,
            'hair',
          );
          if (barDrink) {
            const seatedFront = composeSeatedAvatar(
              composeAvatar(source, { ...actor.avatar, instrument: 'none' }, undefined, 'body'),
            );
            actor.drinkSource = document.createElement('canvas');
            actor.drinkSource.width = actor.drinkSource.height = 512;
            actor.drinkSource
              .getContext('2d')!
              .drawImage(seatedFront, 0, 0, 512, 512, 0, 0, 512, 512);
            actor.drinkSource.getContext('2d')!.drawImage(actor.drinkHairLayer, 0, 0);
          }
        } else {
          const frame = actor.preparedFrames ?? 0;
          const ctx = actor.drinkAtlas.getContext('2d')!;
          ctx.save();
          ctx.translate((frame % 8) * 256, Math.floor(frame / 8) * 256);
          ctx.scale(0.5, 0.5);
          drawDrinkingPose(
            ctx,
            actor.drinkSource!,
            frame / 31,
            coffee,
            barDrink,
            actor.drinkArmSource,
            actor.drinkHairLayer,
          );
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
            actor.drinkArmSource = undefined;
            actor.drinkHairLayer = undefined;
          }
        }
      }
      // The drinking atlas is a front view. Keep the seated back/side view at
      // the counter instead of turning the character around for every sip.
      const frontFacingDrink = !seated || Math.cos(actor.group.rotation.y) > Math.SQRT1_2;
      if (drinking !== undefined && actor.drinkTexture && frontFacingDrink) {
        const frame = Math.round(Math.max(0, Math.min(1, drinking)) * 31);
        actor.drinkTexture.offset.set((frame % 8) / 8, 1 - (Math.floor(frame / 8) + 1) / 4);
        actor.sprite.material.map = actor.drinkTexture;
      } else actor.sprite.material.map = actor.texture;
      // Anchor the hips to the seat rather than anchoring seated feet to the ground.
      actor.sprite.center.set(0.5, seated ? 0.25 : 0.05);
      actor.sprite.position.y = seated ? (actor.group.userData.seatHeight ?? 0.68) : 0;
      const angle = Math.atan2(Math.sin(actor.group.rotation.y), Math.cos(actor.group.rotation.y));
      actor.facingCell = facingCell(angle, actor.facingCell);
      const cell = actor.facingCell;
      actor.texture.offset.set(cell * 0.25, 0);
      const walking =
        !seated &&
        drinking === undefined &&
        (actor.group === player ? moving : actor.group.userData.walking === true);
      // Seated characters have no ground gait, so drop residual bob before standing up.
      if (seated && (actor.gait.phase !== 0 || actor.gait.settling || actor.gait.bobWeight !== 0))
        actor.gait = createGaitState();
      const distanceMoved = walking ? Number(actor.group.userData.walkDistance) || 0 : 0;
      actor.gait = advanceGait(actor.gait, distanceMoved, dt, walking);
      const gaitActive = !seated && drinking === undefined && (walking || actor.gait.settling);
      if (gaitActive && actor.standingImage) {
        if (!actor.walkTexture) {
          const texture = new THREE.CanvasTexture(composeWalkingAvatar(actor.standingImage));
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.generateMipmaps = false;
          texture.minFilter = texture.magFilter = THREE.LinearFilter;
          texture.repeat.set(0.25, 1 / WALK_FRAMES);
          actor.walkTexture = texture;
        }
        const frame = gaitFrame(actor.gait.phase);
        actor.walkTexture.offset.set(cell * 0.25, 1 - (frame + 1) / WALK_FRAMES);
        actor.sprite.material.map = actor.walkTexture;
      }
      actor.group.userData.gaitBob = reducedMotion
        ? 0
        : gaitBob(actor.gait.phase, actor.gait.bobWeight);
      actor.group.userData.gaitBobWeight = actor.gait.bobWeight;
      actor.sprite.material.rotation =
        drinking !== undefined
          ? -drinking * 0.035
          : gaitActive && !reducedMotion
            ? gaitTilt(actor.gait.phase, actor.gait.bobWeight)
            : 0;
    }
  }
  function dispose() {
    disposed = true;
    actors.forEach((actor) => {
      actor.walkTexture?.dispose();
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
  function barDrinkingReady(group: THREE.Group, drink: BarDrinkId) {
    for (const actor of actors)
      if (actor.group === group) return actor.barDrink === drink && !!actor.drinkTexture;
    return false;
  }
  return { create, update, dispose, drinkingReady, barDrinkingReady };
}
