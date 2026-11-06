import { characterStyles, normalizeStyle } from '../../data/characterStyles';
import { tintPixel } from '../../data/appearance';
let source: Promise<HTMLImageElement> | null = null;
export function loadCharacterImage() {
  if (!source)
    source = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => {
        source = null;
        reject(new Error('캐릭터 이미지를 불러오지 못했어요.'));
      };
      image.src = '/characters/villagers-six.png';
    });
  return source;
}
// Bounded cache shared by the editor and world; canvases are immutable after creation.
const cache = new Map<string, HTMLCanvasElement>();
export function renderCharacterRow(image: HTMLImageElement, index: number, skin = '', eyes = '') {
  const style = normalizeStyle(index),
    key = `${style}|${skin}|${eyes}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const frame = characterStyles[style],
    height = frame.bottom - frame.top;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, frame.top, 1024, height, 0, 0, 1024, height);
  if (skin || eyes) {
    const imageData = context.getImageData(0, 0, 1024, height),
      pixels = imageData.data;
    for (let direction = 0; direction < 4; direction++) {
      let minX = 256,
        maxX = 0,
        minY = height,
        maxY = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < 256; x++) {
          if (pixels[(y * 1024 + direction * 256 + x) * 4 + 3] > 128) {
            minX = Math.min(x, minX);
            maxX = Math.max(x, maxX);
            minY = Math.min(y, minY);
            maxY = Math.max(y, maxY);
          }
        }
      for (let y = minY; y <= maxY; y++)
        for (let x = minX; x <= maxX; x++) {
          const i = (y * 1024 + direction * 256 + x) * 4;
          if (pixels[i + 3] < 128) continue;
          const color = tintPixel(
            [pixels[i], pixels[i + 1], pixels[i + 2]],
            (x - minX) / Math.max(1, maxX - minX),
            (y - minY) / Math.max(1, maxY - minY),
            direction,
            skin,
            eyes,
          );
          pixels[i] = color[0];
          pixels[i + 1] = color[1];
          pixels[i + 2] = color[2];
        }
    }
    context.putImageData(imageData, 0, 0);
  }
  cache.set(key, canvas);
  if (cache.size > 40) cache.delete(cache.keys().next().value!);
  return canvas;
}
