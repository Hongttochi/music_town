import * as T from 'three';
import rabbitImage from '../../assets/npc/school-rabbit.webp';

/** Image-based billboard, using the same anchoring and material as player avatars. */
export function createRabbitNpc(position: T.Vector3) {
  let disposed = false;
  const material = new T.SpriteMaterial({ transparent: true, alphaTest: 0.15, depthWrite: false });
  material.toneMapped = false;
  const sprite = new T.Sprite(material);
  sprite.name = 'school-rabbit-caretaker';
  sprite.center.set(0.5, 0.05);
  sprite.position.copy(position);
  sprite.visible = false;
  const texture = new T.TextureLoader().load(rabbitImage, (loaded) => {
    if (disposed) return;
    loaded.colorSpace = T.SRGBColorSpace;
    loaded.minFilter = T.LinearMipmapLinearFilter;
    loaded.magFilter = T.LinearFilter;
    material.map = loaded;
    material.needsUpdate = true;
    sprite.scale.set((2.8 * loaded.image.width) / loaded.image.height, 2.8, 1);
    sprite.visible = true;
  });
  let walkTime = 0;
  let lastTime: number | undefined;
  return {
    sprite,
    update(time: number, paused = false) {
      const dt = lastTime === undefined ? 0 : Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      if (!paused) walkTime += dt;
      // Four short strolls with a pause at each corner, all in the clear school forecourt.
      const route = [
        [0, 0],
        [-1.2, 0.3],
        [-1.2, 1.3],
        [0.4, 1.1],
      ];
      const leg = Math.floor(walkTime / 7) % route.length;
      const t = Math.min(1, (walkTime % 7) / 4);
      const eased = t * t * (3 - 2 * t);
      const from = route[leg],
        to = route[(leg + 1) % route.length];
      sprite.position.x = position.x + from[0] + (to[0] - from[0]) * eased;
      sprite.position.z = position.z + from[1] + (to[1] - from[1]) * eased;
      sprite.position.y =
        position.y + (!paused && t < 1 ? Math.abs(Math.sin(walkTime * 8)) * 0.055 : 0);
    },
    dispose() {
      disposed = true;
      sprite.removeFromParent();
      texture.dispose();
      material.dispose();
    },
  };
}
