import { build } from 'esbuild';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
globalThis.document = { createElement: () => createCanvas(1, 1) };
async function bundle(path) {
  const result = await build({
    entryPoints: [path],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
  });
  return import(
    'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
  );
}
const { composeAvatar } = await bundle('src/scene/avatar/modularAvatar.ts');
const { composeSeatedAvatar } = await bundle('src/scene/avatar/seatedAvatar.ts');
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
const atlas = await loadImage('public/art/village-props.png');
const result = createCanvas(1200, 700),
  ctx = result.getContext('2d');
ctx.fillStyle = '#dbe5c3';
ctx.fillRect(0, 0, 1200, 700);
for (const [i, avatar] of [
  { hair: 0, pants: '#526e77' },
  { hair: 7, hairColor: '#d87593', skinTone: '#865638', pants: '#684e8a' },
].entries()) {
  const standing = composeAvatar(layers, avatar);
  const seated = composeSeatedAvatar(standing);
  assert.notDeepEqual(seated.toBuffer('image/png'), standing.toBuffer('image/png'));
  // Approximate the in-game billboard scale, hip anchor, and bench seat height.
  const baseX = 50 + i * 600,
    baseline = 630;
  ctx.drawImage(atlas, 515, 665, 500, 300, baseX, baseline - 329, 548, 329);
  ctx.drawImage(
    seated,
    0,
    0,
    512,
    512,
    baseX + 15,
    baseline - 512 * 0.75 - 0.68 * (512 / 2.8),
    512,
    512,
  );
}
mkdirSync('tmp/qa', { recursive: true });
writeFileSync('tmp/qa/seating.png', result.toBuffer('image/png'));
console.log('Seated pose preview: tmp/qa/seating.png');
