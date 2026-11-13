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
const canvas = createCanvas(1024, 2560),
  ctx = canvas.getContext('2d');
const looks = [
  { clothingStyle: 'suit', shirt: '#465368', pants: '#465368' },
  { clothingStyle: 'street', shirt: '#6b638b', pants: '#536b83' },
  { clothingStyle: 'puffer', shirt: '#758d82', pants: '#565761' },
  { clothingStyle: 'shirt', shirt: '#c5dbe0', pants: '#736958' },
  { clothingStyle: 'dress', shirt: '#c98ba4', pants: '#c98ba4' },
  { clothingStyle: 'monk', shirt: '#a6aaa3', pants: '#858d85' },
  { clothingStyle: 'tank', shirt: '#f5f0df', pants: '#647f99' },
  { clothingStyle: 'plain', shirt: '#eee3ca', pants: '#459e96' },
  { clothingStyle: 'stripe', shirt: '#526b8b', pants: '#d1ba91' },
  { clothingStyle: 'pocket', shirt: '#db8c7a', pants: '#536b83' },
  { clothingStyle: 'pleated-skirt', shirt: '#f2e8dc', pants: '#8798ad', facewear: 'white-mask' },
  { clothingStyle: 'aline-skirt', shirt: '#f2e8dc', pants: '#b78e9b', facewear: 'black-mask' },
  { clothingStyle: 'blouse', shirt: '#f2e8dc', pants: '#8d9ca8', wristwear: 'bracelet' },
  { clothingStyle: 'cardigan-skirt', shirt: '#d7a2ad', pants: '#a19187', neckwear: 'cream-scarf' },
  { clothingStyle: 'ribbon-dress', shirt: '#b6a6ca', pants: '#b6a6ca', neckwear: 'rose-scarf' },
];
canvas.height = looks.length * 256;
for (let i = 0; i < looks.length; i++) {
  const sprite = composeAvatar(layers, { hair: 0, ...looks[i] });
  ctx.fillStyle = '#e9eddb';
  ctx.fillRect(0, i * 256, 1024, 256);
  ctx.drawImage(sprite, 0, i * 256, 1024, 256);
  ctx.fillStyle = '#263d35';
  ctx.font = '14px sans-serif';
  ctx.fillText(looks[i].clothingStyle, 8, i * 256 + 18);
}
writeFileSync('tmp/clothing-preview.png', canvas.toBuffer('image/png'));
const additions = createCanvas(1024, 1280);
additions.getContext('2d').drawImage(canvas, 0, 2560, 1024, 1280, 0, 0, 1024, 1280);
writeFileSync('tmp/qa/new-clothing.png', additions.toBuffer('image/png'));

const tankCanvas = createCanvas(1024, 1024),
  tankCtx = tankCanvas.getContext('2d');
tankCtx.fillStyle = '#e9eddb';
tankCtx.fillRect(0, 0, 1024, 1024);
['', '#ffdbb8', '#c78e61', '#865638'].forEach((skinTone, i) => {
  tankCtx.drawImage(
    composeAvatar(layers, {
      hair: 0,
      skinTone,
      clothingStyle: 'tank',
      shirt: '#f5f0df',
      pants: '#647f99',
    }),
    0,
    i * 256,
    1024,
    256,
  );
});
writeFileSync('tmp/qa/tank-fit.png', tankCanvas.toBuffer('image/png'));
