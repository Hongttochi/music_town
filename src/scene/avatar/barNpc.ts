import * as T from 'three';

/** Transparent illustrated NPC, facing the camera like the town's other avatars. */
export function createBarNpc(image: string, name: string) {
  const group = new T.Group();
  group.name = name;
  let disposed = false;
  const material = new T.SpriteMaterial({
    transparent: true,
    alphaTest: 0.15,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new T.Sprite(material);
  sprite.center.set(0.5, 0.05);
  sprite.visible = false;
  group.add(sprite);
  const texture = new T.TextureLoader().load(image, (loaded) => {
    if (disposed) return;
    loaded.colorSpace = T.SRGBColorSpace;
    material.map = loaded;
    material.needsUpdate = true;
    sprite.scale.set((2.8 * loaded.image.width) / loaded.image.height, 2.8, 1);
    sprite.visible = true;
  });
  return {
    group,
    dispose() {
      disposed = true;
      group.removeFromParent();
      texture.dispose();
      material.dispose();
    },
  };
}
