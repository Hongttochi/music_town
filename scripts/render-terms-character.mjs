import { build } from 'esbuild';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
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
  hairStyledA: 'hair-styled-a',
  hairStyledB: 'hair-styled-b',
}))
  layers[key] = await loadImage(`public/art/avatar-${file}.png`);
const sprite = composeAvatar(layers, { hair: 0, eyeShape: 0, noseShape: 0, instrument: 'guitar' });
const canvas = createCanvas(512, 512);
canvas.getContext('2d').drawImage(sprite, 0, 0, 512, 512, 0, 0, 512, 512);
writeFileSync('public/art/terms-character.png', canvas.toBuffer('image/png'));
