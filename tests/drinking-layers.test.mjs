import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const compiled = await build({
  stdin: {
    contents: `export {composeAvatar} from './src/scene/avatar/modularAvatar';export {drawDrinkingPose} from './src/scene/avatar/drinkingAvatar';`,
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
