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
  instrument: 'microphone',
});
const guitar = composeAvatar(layers, { hair: 0, instrument: 'guitar' });
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

const accessories = [
  ['headwear', 'snapback'],
  ['headwear', 'beanie'],
  ['headwear', 'bucket'],
  ['earwear', 'headset'],
  ['earwear', 'airpods'],
  ['eyewear', 'sunglasses'],
  ['eyewear', 'glasses'],
  ['bag', 'backpack'],
  ['bag', 'crossbody'],
];
const accessorySheet = createCanvas(1024, accessories.length * 256);
const accessoryCtx = accessorySheet.getContext('2d');
accessoryCtx.fillStyle = '#e9eddb';
accessoryCtx.fillRect(0, 0, 1024, accessories.length * 256);
const plain = composeAvatar(layers, { hair: 0 });
accessories.forEach(([key, value], row) => {
  const sprite = composeAvatar(layers, { hair: 0, [key]: value });
  for (let direction = 0; direction < 4; direction++) {
    const crop = (image) => {
      const out = createCanvas(512, 512);
      out.getContext('2d').drawImage(image, direction * 512, 0, 512, 512, 0, 0, 512, 512);
      return out.toBuffer('image/png');
    };
    // A backpack exposes its straps in front; a crossbody exposes its strap behind.
    assert.notDeepEqual(crop(sprite), crop(plain), `${value} direction ${direction}`);
  }
  accessoryCtx.drawImage(sprite, 0, row * 256, 1024, 256);
  accessoryCtx.fillStyle = '#263d35';
  accessoryCtx.font = '16px sans-serif';
  accessoryCtx.fillText(value, 8, row * 256 + 22);
});
writeFileSync('tmp/qa/avatar-accessories.png', accessorySheet.toBuffer('image/png'));
console.log('Accessories: nine items render distinctly in all four directions.');

// Inspect every hair/hat combination and instrument/bag combination in all four views.
const hats = ['beanie', 'snapback', 'bucket'];
const hatSheet = createCanvas(1024, 14 * hats.length * 256);
const hatCtx = hatSheet.getContext('2d');
hatCtx.fillStyle = '#e9eddb';
hatCtx.fillRect(0, 0, hatSheet.width, hatSheet.height);
for (let hair = 0; hair < 14; hair++)
  for (let h = 0; h < hats.length; h++) {
    const row = hair * hats.length + h;
    const sprite = composeAvatar(layers, { hair, headwear: hats[h] });
    hatCtx.drawImage(sprite, 0, row * 256, 1024, 256);
    hatCtx.fillStyle = '#263d35';
    hatCtx.font = '14px sans-serif';
    hatCtx.fillText(`${hair} ${hats[h]}`, 8, row * 256 + 18);
  }
writeFileSync('tmp/qa/avatar-hat-fit.png', hatSheet.toBuffer('image/png'));
const bagInstruments = ['none', 'microphone', 'ukulele', 'guitar', 'electric', 'tambourine'];
const bagSheet = createCanvas(1024, bagInstruments.length * 256);
const bagCtx = bagSheet.getContext('2d');
bagCtx.fillStyle = '#e9eddb';
bagCtx.fillRect(0, 0, bagSheet.width, bagSheet.height);
bagInstruments.forEach((instrument, row) => {
  bagCtx.drawImage(
    composeAvatar(layers, { hair: 3, bag: 'crossbody', instrument }),
    0,
    row * 256,
    1024,
    256,
  );
  bagCtx.fillStyle = '#263d35';
  bagCtx.font = '14px sans-serif';
  bagCtx.fillText(instrument, 8, row * 256 + 18);
});
writeFileSync('tmp/qa/avatar-bag-fit.png', bagSheet.toBuffer('image/png'));
console.log(
  'Fit sheets: 42 hair/hat combinations and six crossbody/instrument combinations, four directions each.',
);

const extraHairSheet = createCanvas(1024, 5 * 256);
const extraHairCtx = extraHairSheet.getContext('2d');
extraHairCtx.fillStyle = '#e9eddb';
extraHairCtx.fillRect(0, 0, 1024, 5 * 256);
for (let hair = 9; hair < 14; hair++) {
  const sprite = composeAvatar(layers, { hair, hairColor: '#67402a' });
  assert.notDeepEqual(sprite.toBuffer('image/png'), plain.toBuffer('image/png'));
  extraHairCtx.drawImage(sprite, 0, (hair - 9) * 256, 1024, 256);
  extraHairCtx.fillStyle = '#263d35';
  extraHairCtx.font = '14px sans-serif';
  extraHairCtx.fillText(
    ['bald', 'pomade', 'dreads', 'buzz cut', 'mohawk'][hair - 9],
    8,
    (hair - 9) * 256 + 18,
  );
}
writeFileSync('tmp/qa/avatar-extra-hair.png', extraHairSheet.toBuffer('image/png'));
