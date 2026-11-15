import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const compiled = await build({
  stdin: {
    contents: `export {composeAvatar} from './src/scene/avatar/modularAvatar';export {drawDrinkingPose,drinkingArmPose} from './src/scene/avatar/drinkingAvatar';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  loader: { '.webp': 'dataurl' },
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(
  require,
  mod,
  mod.exports,
);
const layers = {};
for (const [key, name] of Object.entries({
  base: 'base',
  hair: 'hair',
  features: 'features',
  hairExtra: 'hair-extra',
  featuresExtra: 'features-extra',
  hairStyledA: 'hair-styled-a',
  hairStyledB: 'hair-styled-b',
})) {
  layers[key] = await loadImage(`public/art/avatar-${name}.png`);
}
test('long hair remains stationary at the shoulder when the cup reaches the mouth', () => {
  const oldDocument = globalThis.document;
  globalThis.document = { createElement: () => createCanvas(1, 1) };
  try {
    const { composeAvatar, drawDrinkingPose } = mod.exports;
    const avatar = { hair: 6, hairColor: '#8dc9a7', instrument: 'none' };
    const full = composeAvatar(layers, avatar, 0);
    const body = composeAvatar(layers, avatar, 0, 'body');
    const hair = composeAvatar(layers, avatar, 0, 'hair');
    const pose = createCanvas(512, 512);
    drawDrinkingPose(pose.getContext('2d'), full, 1, 'americano', undefined, body, hair);
    // This shoulder strip was previously erased and rotated with the upper arm.
    const pixels = (canvas) => canvas.getContext('2d').getImageData(330, 304, 20, 16).data;
    assert.deepEqual(pixels(pose), pixels(full));
    assert.notDeepEqual(pixels(body), pixels(full));
  } finally {
    globalThis.document = oldDocument;
  }
});

test('bare drinking arm stays opaque along shoulder, elbow and palm throughout the animation', () => {
  const oldDocument = globalThis.document;
  globalThis.document = { createElement: () => createCanvas(1, 1) };
  try {
    const { composeAvatar, drawDrinkingPose, drinkingArmPose } = mod.exports;
    const avatar = { hair: 0, clothingStyle: 'tank', instrument: 'none' };
    const body = composeAvatar(layers, avatar, 0, 'body');
    for (let frame = 0; frame <= 31; frame++) {
      const lift = frame / 31;
      const pose = createCanvas(512, 512);
      drawDrinkingPose(pose.getContext('2d'), body, lift, 'americano', undefined, body);
      const p = drinkingArmPose(lift);
      const pixels = pose.getContext('2d').getImageData(0, 0, 512, 512).data;
      for (const [a, b] of [
        [
          { x: 291, y: 294 },
          { x: p.elbowX, y: p.elbowY },
        ],
        [
          { x: p.elbowX, y: p.elbowY },
          { x: p.handX, y: p.handY },
        ],
      ]) {
        for (let i = 0; i <= 20; i++) {
          const x = Math.round(a.x + ((b.x - a.x) * i) / 20),
            y = Math.round(a.y + ((b.y - a.y) * i) / 20);
          assert.ok(pixels[(y * 512 + x) * 4 + 3] > 200, `arm gap at frame ${frame}, ${x},${y}`);
        }
      }
    }
  } finally {
    globalThis.document = oldDocument;
  }
});
