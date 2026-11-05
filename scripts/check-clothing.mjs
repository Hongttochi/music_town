import { build } from 'esbuild';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
globalThis.document = { createElement: () => createCanvas(1, 1) };
const bundle = await build({
  entryPoints: ['src/modularAvatar.ts'],
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
}))
  layers[key] = await loadImage(`public/art/avatar-${file}.png`);
const canvas = createCanvas(2048, 1536),
  ctx = canvas.getContext('2d');
const looks = [
  { clothingStyle: 'plain', shirt: '#eee3ca', pants: '#459e96' },
  { clothingStyle: 'stripe', shirt: '#526b8b', pants: '#d1ba91' },
  { clothingStyle: 'pocket', shirt: '#db8c7a', pants: '#536b83' },
];
for (let i = 0; i < looks.length; i++) {
  const sprite = composeAvatar(layers, { hair: 0, ...looks[i] });
  ctx.drawImage(sprite, 0, i * 512);
}
writeFileSync('tmp/clothing-preview.png', canvas.toBuffer('image/png'));
