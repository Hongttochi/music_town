import type { Avatar } from './model';
import { hexRgb } from './appearance';

export const outfits = [
  { label: '크림 티셔츠', clothingStyle: 'plain', shirt: '#eee3ca', pants: '#459e96' },
  { label: '마린 스트라이프', clothingStyle: 'stripe', shirt: '#526b8b', pants: '#d1ba91' },
  { label: '코랄 포켓 티', clothingStyle: 'pocket', shirt: '#db8c7a', pants: '#536b83' },
  { label: '초록 스트라이프', clothingStyle: 'stripe', shirt: '#78977c', pants: '#6c6259' },
  { label: '라벤더 티셔츠', clothingStyle: 'plain', shirt: '#aaa0c3', pants: '#536b83' },
  { label: '블루 포켓 티', clothingStyle: 'pocket', shirt: '#83a9c2', pants: '#d1ba91' },
] satisfies Array<Pick<Avatar, 'clothingStyle' | 'shirt' | 'pants'> & { label: string }>;

export const clothingColors = [
  { label: '크림', color: '#eee3ca' },
  { label: '코랄', color: '#db8c7a' },
  { label: '세이지', color: '#78977c' },
  { label: '하늘', color: '#83a9c2' },
  { label: '라벤더', color: '#aaa0c3' },
  { label: '네이비', color: '#526b8b' },
  { label: '베이지', color: '#d1ba91' },
  { label: '차콜', color: '#6c6259' },
];

/** Recolor only the original garment pixels, preserving skin, shoes and shading. */
export function dressBase(
  input: HTMLCanvasElement,
  avatar: Partial<Avatar>,
  direction: number,
  skinBase = input,
) {
  if (!avatar.clothingStyle) return skinBase;
  const output = document.createElement('canvas');
  output.width = input.width;
  output.height = input.height;
  const ctx = output.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(skinBase, 0, 0);
  const image = ctx.getImageData(0, 0, output.width, output.height);
  const source = input.getContext('2d')!.getImageData(0, 0, input.width, input.height).data;
  const shirt = hexRgb(avatar.shirt || '') || [238, 227, 202];
  const pants = hexRgb(avatar.pants || '') || [69, 158, 150];
  for (let y = 0; y < output.height; y++)
    for (let x = 0; x < output.width; x++) {
      const i = (y * output.width + x) * 4,
        d = image.data;
      if (!d[i + 3]) continue;
      const r = source[i],
        g = source[i + 1],
        b = source[i + 2],
        ny = y / output.height,
        nx = x / output.width;
      const top =
        ny > 0.52 && ny < 0.78 && r > 140 && g > 130 && b > 105 && r - g < 32 && g - b < 48;
      const bottom = ny > 0.73 && ny < 0.87 && g > r * 1.18 && b > r * 1.12;
      if (!top && !bottom) continue;
      let color: number[] = top ? shirt : pants;
      if (top && avatar.clothingStyle === 'stripe' && Math.floor(ny * 48) % 2 === 0)
        color = [238, 232, 215];
      if (
        top &&
        avatar.clothingStyle === 'pocket' &&
        direction === 0 &&
        nx > 0.54 &&
        nx < 0.64 &&
        ny > 0.61 &&
        ny < 0.68
      )
        color = shirt.map((v) => v * 0.76);
      const shade = top ? (r + g + b) / (3 * 232) : (g + b) / (2 * 155);
      for (let c = 0; c < 3; c++) d[i + c] = Math.min(255, Math.round(color[c] * shade));
    }
  ctx.putImageData(image, 0, 0);
  return output;
}
