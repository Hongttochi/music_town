import * as THREE from 'three';
export function createVillageProps(scene: THREE.Scene) {
  const materials: THREE.SpriteMaterial[] = [],
    textures: THREE.Texture[] = [];
  let disposed = false;
  const sources: Array<THREE.CanvasTexture | undefined> = [];
  const waiting: Array<{ sprite: THREE.Sprite; kind: number; height: number }> = [];
  const loader = new THREE.ImageLoader();
  loader.load('/art/village-props.png', (image) => {
    if (disposed) return;
    for (let kind = 0; kind < 6; kind++) {
      const row = kind < 3 ? 0 : 1,
        col = kind % 3,
        top = row ? 560 : 0,
        height = row ? 464 : 560;
      const cell = document.createElement('canvas');
      cell.width = 512;
      cell.height = height;
      const ctx = cell.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(image, col * 512, top, 512, height, 0, 0, 512, height);
      const pixels = ctx.getImageData(0, 0, 512, height);
      let left = 512,
        right = 0,
        up = height,
        down = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < 512; x++) {
          const i = (y * 512 + x) * 4;
          if (pixels.data[i + 3] < 100) {
            pixels.data[i + 3] = 0;
            continue;
          }
          left = Math.min(left, x);
          right = Math.max(right, x);
          up = Math.min(up, y);
          down = Math.max(down, y);
        }
      ctx.putImageData(pixels, 0, 0);
      const cropped = document.createElement('canvas');
      cropped.width = Math.max(1, right - left + 1);
      cropped.height = Math.max(1, down - up + 1);
      cropped
        .getContext('2d')!
        .drawImage(
          cell,
          left,
          up,
          cropped.width,
          cropped.height,
          0,
          0,
          cropped.width,
          cropped.height,
        );
      const texture = new THREE.CanvasTexture(cropped);
      texture.colorSpace = THREE.SRGBColorSpace;
      sources[kind] = texture;
      textures.push(texture);
    }
    waiting.forEach(({ sprite, kind, height }) => {
      sprite.material.map = sources[kind]!;
      sprite.material.needsUpdate = true;
      sprite.visible = true;
      const image = sources[kind]!.image;
      sprite.scale.set((height * image.width) / image.height, height, 1);
    });
  });
  function prop(kind: number, x: number, z: number, height: number) {
    const material = new THREE.SpriteMaterial({
      transparent: true,
      alphaTest: 0.28,
      depthWrite: true,
    });
    material.toneMapped = false;
    materials.push(material);
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.center.set(0.5, 0);
    sprite.position.set(x, 0.025, z);
    scene.add(sprite);
    waiting.push({ sprite, kind, height });
    return sprite;
  }
  const ground = new THREE.TextureLoader().load('/art/grass.png');
  ground.colorSpace = THREE.SRGBColorSpace;
  ground.wrapS = ground.wrapT = THREE.RepeatWrapping;
  ground.repeat.set(14, 14);
  textures.push(ground);
  return {
    prop,
    ground,
    setNight(night: boolean) {
      // Billboard trees and houses do not receive scene lighting.
      materials.forEach((material) => material.color.set(night ? '#8293bd' : '#ffffff'));
    },
    dispose() {
      disposed = true;
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      waiting.forEach((x) => x.sprite.removeFromParent());
    },
  };
}
