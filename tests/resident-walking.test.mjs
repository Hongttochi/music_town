import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createCanvas, loadImage } from '@napi-rs/canvas';
globalThis.document = { createElement: () => createCanvas(1, 1) };
async function load(path) {
  const b = await build({
    entryPoints: [path],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
  });
  return import(
    'data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64')
  );
}
const { residentFrameCanvas } = await load('src/scene/park/residentFrames.ts');
const { composeResidentWalking } = await load('src/scene/park/residentWalking.ts');
test('fox back view alternates the planted foot and keeps torso pixels fixed', async () => {
  const image = await loadImage('public/art/park-residents-simple.png');
  const source = residentFrameCanvas(image, 1, 3)[2];
  const frames = composeResidentWalking(source, false, 0.87);
  assert.equal(frames.length, 8);
  function feet(canvas) {
    const { width, height } = canvas;
    const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    const pad = Math.ceil(source.height * 0.08);
    const cut = Math.floor(height * 0.87);
    let min = width,
      max = 0;
    for (let y = cut; y < height; y++)
      for (let x = 0; x < width; x++)
        if (pixels[(y * width + x) * 4 + 3] > 100) {
          min = Math.min(min, x);
          max = Math.max(max, x);
        }
    const mid = Math.round((min + max + 1) / 2);
    let bottoms = [0, 0];
    for (let y = cut; y < height; y++)
      for (let x = pad; x < width - pad; x++)
        if (pixels[(y * width + x) * 4 + 3] > 100) bottoms[x < mid ? 0 : 1] = y;
    return bottoms;
  }
  const a = feet(frames[2]),
    b = feet(frames[6]);
  assert.ok(a[0] > a[1] + 3, 'right foot should lift first');
  assert.ok(b[1] > b[0] + 3, 'left foot should lift next');
  for (const frame of frames)
    assert.deepEqual(
      frame.getContext('2d').getImageData(0, 0, frame.width, Math.floor(frame.height * 0.8)).data,
      frames[0].getContext('2d').getImageData(0, 0, frame.width, Math.floor(frame.height * 0.8))
        .data,
    );
});
test('penguin profile has distinct opposite steps instead of repeated same-leg poses', async () => {
  const image = await loadImage('public/art/park-residents-extra-simple.png');
  const source = residentFrameCanvas(image, 1, 3)[1];
  const frames = composeResidentWalking(source, true, 0.92);
  const pixels = (f) =>
    f
      .getContext('2d')
      .getImageData(0, Math.floor(f.height * 0.92), f.width, f.height - Math.floor(f.height * 0.92))
      .data;
  assert.notDeepEqual(pixels(frames[2]), pixels(frames[6]));
  assert.notDeepEqual(pixels(frames[0]), pixels(frames[2]));
});
