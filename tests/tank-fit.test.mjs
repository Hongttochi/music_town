import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createCanvas, loadImage } from '@napi-rs/canvas';

globalThis.document = { createElement: () => createCanvas(1, 1) };
const bundle = await build({
  entryPoints: ['src/scene/avatar/modularAvatar.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { composeAvatar } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);
const layers = {};
for (const [key, file] of Object.entries({
  base: 'base',
  hair: 'hair',
  features: 'features',
  hairExtra: 'hair-extra',
  featuresExtra: 'features-extra',
})) {
  layers[key] = await loadImage(`public/art/avatar-${file}.png`);
}
test('tank keeps the torso opaque from the chest through the waist in every view', () => {
  for (const skinTone of ['', '#865638']) {
    const sprite = composeAvatar(layers, {
      hair: 0,
      skinTone,
      clothingStyle: 'tank',
      shirt: '#f5f0df',
      pants: '#647f99',
    });
    const ctx = sprite.getContext('2d');
    for (let direction = 0; direction < 4; direction++) {
      const side = direction % 2 === 1;
      for (let y = 328; y <= 360; y += 4) {
        for (let x = side ? 249 : 226; x <= (side ? 267 : 286); x += 4) {
          const alpha = ctx.getImageData(direction * 512 + x, y, 1, 1).data[3];
          assert.ok(alpha > 240, `torso hole: direction=${direction}, x=${x}, y=${y}`);
        }
      }
    }
  }
});
