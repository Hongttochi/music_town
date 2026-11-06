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
  return {
    sprite,
    update(time: number) {
      sprite.position.y = position.y + Math.sin(time * 0.002) * 0.018;
    },
    dispose() {
      disposed = true;
      sprite.removeFromParent();
      texture.dispose();
      material.dispose();
    },
  };
}
