import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
const target = new URL('../src/assets/coffee/', import.meta.url);
await mkdir(target, { recursive: true });
for (const name of ['americano', 'latte', 'vanilla', 'mocha']) {
  const source = await loadImage(
    new URL(`../public/icons/coffee/${name}.png`, import.meta.url).pathname,
  );
  // 4x the menu's 44px display size, with transparency and original proportions preserved.
  const size = 192;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const scale = Math.min(size / source.width, size / source.height);
  const width = source.width * scale,
    height = source.height * scale;
  ctx.drawImage(source, (size - width) / 2, (size - height) / 2, width, height);
  const bytes = await canvas.encode('webp', 85);
  await writeFile(new URL(`${name}.webp`, target), bytes);
  console.log(`${name}: ${bytes.byteLength} bytes`);
}
