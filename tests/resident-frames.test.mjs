import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createCanvas, loadImage } from '@napi-rs/canvas';
globalThis.document = { createElement: () => createCanvas(1, 1) };
const bundle = await build({
  entryPoints: ['src/scene/park/residentFrames.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { residentFrameCanvas } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);
for (const [name, rows] of [
  ['seated-side', 2],
  ['seated-back', 2],
  ['drinking', 4],
  ['simple', 3],
  ['extra-simple', 3],
  ['motion', 5],
  ['extra-motion', 5],
  ['walk', 4],
  ['extra-walk', 4],
]) {
  test(`${name}: every frame preserves the complete silhouette without adjacent feet`, async () => {
    const image = await loadImage(`public/art/park-residents-${name}.png`);
    const source = createCanvas(image.width, image.height);
    source.getContext('2d').drawImage(image, 0, 0);
    const pixels = source.getContext('2d').getImageData(0, 0, image.width, image.height).data;
    for (let col = 0; col < 4; col++) {
      const frames = residentFrameCanvas(image, col, rows);
      assert.equal(frames.length, rows);
      let actual = 0,
        expected = 0;
      for (let y = 0; y < image.height; y++)
        for (
          let x = Math.floor((col * image.width) / 4);
          x < Math.floor(((col + 1) * image.width) / 4);
          x++
        )
          if (pixels[(y * image.width + x) * 4 + 3] >= 100) expected++;
      for (const frame of frames) {
        const data = frame.getContext('2d').getImageData(0, 0, frame.width, frame.height).data;
        for (let i = 3; i < data.length; i += 4) if (data[i] >= 100) actual++;
        assert.ok(frame.height > (image.height / rows) * 0.7);
      }
      // All visible source pixels belong to exactly one frame, including the feet.
      assert.equal(actual, expected, `column ${col}: lost or duplicated silhouette pixels`);
      assert.equal(residentFrameCanvas(image, col, rows), frames);
    }
  });
}
test('walking cat retains full legs across uneven row boundaries', async () => {
  const image = await loadImage('public/art/park-residents-walk.png');
  assert.deepEqual(
    residentFrameCanvas(image, 2, 4).map((f) => f.height),
    [289, 281, 251, 220],
  );
});
