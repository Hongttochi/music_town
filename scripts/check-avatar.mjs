import { build } from 'esbuild';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
globalThis.document = {
  createElement(type) {
    assert.equal(type, 'canvas');
    return createCanvas(1, 1);
  },
};
const bundled = await build({
  entryPoints: ['src/modularAvatar.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { composeAvatar } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
);
const layers = {
  hairExtra: await loadImage('public/art/avatar-hair-extra.png'),
  featuresExtra: await loadImage('public/art/avatar-features-extra.png'),
  base: await loadImage('public/art/avatar-base.png'),
  hair: await loadImage('public/art/avatar-hair.png'),
  features: await loadImage('public/art/avatar-features.png'),
};
const result = createCanvas(2048, 1024),
  ctx = result.getContext('2d');
ctx.fillStyle = '#dbe5c3';
ctx.fillRect(0, 0, 2048, 1024);
const a = composeAvatar(layers, { hair: 0, eyeShape: 0, noseShape: 0 });
const b = composeAvatar(layers, {
  hair: 1,
  eyeShape: 2,
  noseShape: 1,
  skinTone: '#c78e61',
  hairColor: '#352d34',
  eyeColor: '#3868a0',
});
assert.equal(a.width, 2048);
assert.equal(a.height, 512);
assert.notDeepEqual(a.toBuffer('image/png'), b.toBuffer('image/png'));
ctx.drawImage(a, 0, 0);
ctx.drawImage(b, 0, 512);
mkdirSync('tmp/qa', { recursive: true });
writeFileSync('tmp/qa/avatar-parts.png', result.toBuffer('image/png'));
console.log(
  'Modular avatar rendering: two independent combinations, four directions each; output tmp/qa/avatar-parts.png',
);
const equipped = composeAvatar(layers, {
  hair: 1,
  earrings: true,
  necklace: true,
  instrument: 'microphone',
});
const guitar = composeAvatar(layers, { hair: 0, earrings: true, instrument: 'guitar' });
assert.notDeepEqual(equipped.toBuffer('image/png'), a.toBuffer('image/png'));
ctx.clearRect(0, 0, 2048, 1024);
ctx.fillStyle = '#f5f4e9';
ctx.fillRect(0, 0, 2048, 1024);
ctx.drawImage(equipped, 0, 0);
ctx.drawImage(guitar, 0, 512);
writeFileSync('tmp/qa/avatar-equipment.png', result.toBuffer('image/png'));

const catalog = createCanvas(1536, 1536),
  catalogCtx = catalog.getContext('2d');
catalogCtx.fillStyle = '#e9eddb';
catalogCtx.fillRect(0, 0, 1536, 1536);
for (let i = 0; i < 9; i++) {
  const sprite = composeAvatar(layers, { hair: i, eyeShape: i % 6, noseShape: i % 6 });
  catalogCtx.drawImage(sprite, 0, 0, 512, 512, (i % 3) * 512, Math.floor(i / 3) * 512, 512, 512);
}
writeFileSync('tmp/qa/avatar-catalog.png', catalog.toBuffer('image/png'));

const alignment = createCanvas(2048, 1024),
  alignmentCtx = alignment.getContext('2d');
alignmentCtx.fillStyle = '#e9eddb';
alignmentCtx.fillRect(0, 0, 2048, 1024);
for (let row = 0; row < 2; row++) {
  alignmentCtx.drawImage(
    composeAvatar(layers, {
      hair: 7 + row,
      eyeShape: 2,
      noseShape: 1,
      hairColor: '#d87593',
      skinTone: '#865638',
      earrings: true,
      necklace: true,
      instrument: 'guitar',
    }),
    0,
    row * 512,
  );
}
writeFileSync('tmp/qa/avatar-alignment.png', alignment.toBuffer('image/png'));

const instruments = createCanvas(1536, 512),
  instrumentCtx = instruments.getContext('2d');
instrumentCtx.fillStyle = '#e9eddb';
instrumentCtx.fillRect(0, 0, 1536, 512);
['electric', 'ukulele', 'tambourine'].forEach((instrument, i) => {
  const sprite = composeAvatar(layers, { hair: 7, hairColor: '#d87593', instrument });
  instrumentCtx.drawImage(sprite, 0, 0, 512, 512, i * 512, 0, 512, 512);
});
writeFileSync('tmp/qa/avatar-instruments.png', instruments.toBuffer('image/png'));
