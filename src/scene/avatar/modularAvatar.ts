import { drawWristwear } from './avatarWristwear';
import { drawExtraEyes, drawExtraNose } from './avatarExtraFeatures';
import { drawExtraHair } from './avatarExtraHair';
import { drawOutfit } from './avatarOutfit';
import { drawEquipment } from './avatarEquipment';
import type { Avatar } from '../../data/model';
import { resolveParts } from '../../data/avatarParts';
import { hexRgb } from '../../data/appearance';
import { dressBase } from '../../data/clothing';

type Layers = {
  base: HTMLImageElement;
  hair: HTMLImageElement;
  features: HTMLImageElement;
  hairExtra: HTMLImageElement;
  featuresExtra: HTMLImageElement;
};
let loading: Promise<Layers> | null = null;
const cache = new Map<string, HTMLCanvasElement>();
const portraitCache = new Map<string, HTMLCanvasElement>();
const bodyCache = new Map<string, HTMLCanvasElement>();
const tintCache: {
  input: HTMLCanvasElement;
  color: string;
  kind: string;
  output: HTMLCanvasElement;
}[] = [];
const pieces = new Map<string, HTMLCanvasElement>();
function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`캐릭터 부품 로딩 실패: ${src}`));
    image.src = src;
  });
}
export function loadAvatarLayers() {
  if (!loading)
    loading = Promise.all([
      load('/art/avatar-base.png'),
      load('/art/avatar-hair.png'),
      load('/art/avatar-features.png'),
      load('/art/avatar-hair-extra.png'),
      load('/art/avatar-features-extra.png'),
    ])
      .then(([base, hair, features, hairExtra, featuresExtra]) => ({
        base,
        hair,
        features,
        hairExtra,
        featuresExtra,
      }))
      .catch((error) => {
        loading = null;
        throw error;
      });
  return loading;
}
function canvas(w: number, h: number) {
  const result = document.createElement('canvas');
  result.width = w;
  result.height = h;
  return result;
}
/** Tight alpha bounds align independently generated parts without mutating source art. */
function piece(image: HTMLImageElement, columns: number, rows: number, col: number, row: number) {
  const key = [image.src, columns, rows, col, row].join('|');
  const prior = pieces.get(key);
  if (prior) return prior;
  const w = Math.floor(image.width / columns),
    h = Math.floor(image.height / rows),
    temp = canvas(w, h),
    ctx = temp.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, col * w, row * h, w, h, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  let left = w,
    right = -1,
    top = h,
    bottom = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data.data[i + 3] < 100) {
        data.data[i + 3] = 0;
        continue;
      }
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  ctx.putImageData(data, 0, 0);
  const result = canvas(Math.max(1, right - left + 1), Math.max(1, bottom - top + 1));
  if (right >= left)
    result
      .getContext('2d')!
      .drawImage(temp, left, top, result.width, result.height, 0, 0, result.width, result.height);
  pieces.set(key, result);
  return result;
}
function tinted(input: HTMLCanvasElement, color: string, kind: 'hair' | 'skin' | 'eyes') {
  const rgb = hexRgb(color);
  if (!rgb) return input;
  const found = tintCache.findIndex(
    (item) => item.input === input && item.color === color && item.kind === kind,
  );
  if (found >= 0) {
    const [entry] = tintCache.splice(found, 1);
    tintCache.push(entry);
    return entry.output;
  }
  const output = canvas(input.width, input.height),
    ctx = output.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(input, 0, 0);
  const data = ctx.getImageData(0, 0, output.width, output.height),
    d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i],
      g = d[i + 1],
      b = d[i + 2],
      mx = Math.max(r, g, b),
      mn = Math.min(r, g, b),
      sat = mx ? (mx - mn) / mx : 0;
    const isSkin =
      r > 185 &&
      r > g &&
      g > b &&
      sat > 0.32 &&
      sat < 0.65 &&
      (g - b) / (r - b) > 0.28 &&
      (g - b) / (r - b) < 0.68;
    if ((kind === 'skin' && !isSkin) || (kind === 'eyes' && mx > 120)) continue;
    const shade =
      kind === 'hair'
        ? 0.65 + 0.65 * (r / 150)
        : kind === 'skin'
          ? 0.8 + 0.25 * (r / 255)
          : 0.8 + 0.2 * (mx / 120);
    d[i] = Math.min(255, rgb[0] * shade);
    d[i + 1] = Math.min(255, rgb[1] * shade);
    d[i + 2] = Math.min(255, rgb[2] * shade);
  }
  ctx.putImageData(data, 0, 0);
  tintCache.push({ input, color, kind, output });
  if (tintCache.length > 32) tintCache.shift();
  return output;
}
/** World textures use four views; portraits request only their visible direction. */
export function composeAvatar(
  layers: Layers,
  avatar: Partial<Avatar>,
  view?: number,
  layer: 'full' | 'body' | 'hair' = 'full',
) {
  const singleView = view === undefined ? undefined : Math.max(0, Math.min(3, Math.trunc(view)));
  const targetCache = singleView === undefined ? cache : portraitCache;
  const p = resolveParts(avatar),
    key = JSON.stringify([
      p,
      singleView,
      layer,
      avatar.headwear,
      avatar.earwear,
      avatar.eyewear,
      avatar.bag,
      avatar.wristwear,
      avatar.instrument || 'none',
      avatar.clothingStyle,
      avatar.shirt,
      avatar.pants,
    ]);
  const cached = targetCache.get(key);
  if (cached) {
    targetCache.delete(key);
    targetCache.set(key, cached);
    return cached;
  }
  const out = canvas(singleView === undefined ? 2048 : 512, 512),
    ctx = out.getContext('2d')!;
  for (let direction = singleView ?? 0; direction <= (singleView ?? 3); direction++) {
    ctx.save();
    ctx.translate(singleView === undefined ? direction * 512 : 0, 0);
    const skinBase = tinted(
      piece(layers.base, 2, 2, direction % 2, Math.floor(direction / 2)),
      p.skin,
      'skin',
    );
    // Garment masks use the original palette, before skin tinting.
    const original = piece(layers.base, 2, 2, direction % 2, Math.floor(direction / 2));
    const bodyKey = JSON.stringify([
      direction,
      p.skin,
      avatar.clothingStyle,
      avatar.shirt,
      avatar.pants,
    ]);
    let base = bodyCache.get(bodyKey);
    if (!base) {
      base = dressBase(original, avatar, direction, skinBase);
      bodyCache.set(bodyKey, base);
      if (bodyCache.size > 16) bodyCache.delete(bodyCache.keys().next().value!);
    }
    // Preserve source aspect and center the base on a common foot line.
    const bh = 418,
      bw = (bh * base.width) / base.height;
    if (layer !== 'hair') {
      ctx.drawImage(base, 256 - bw / 2, 58, bw, bh);
      drawOutfit(ctx, avatar, direction);
      if (
        (direction === 1 || direction === 3) &&
        avatar.clothingStyle &&
        !['plain', 'stripe', 'pocket', 'dress', 'tank'].includes(avatar.clothingStyle)
      ) {
        // The near hand hangs in front of the wider trouser hip in profile.
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(direction === 1 ? 262 : 250, 382, 14, 21, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(base, 256 - bw / 2, 58, bw, bh);
        ctx.restore();
      }
    }
    const hair =
      p.hair < 9
        ? tinted(
            piece(
              p.hair < 3 ? layers.hair : layers.hairExtra,
              p.hair < 3 ? 3 : 6,
              4,
              p.hair < 3 ? p.hair : p.hair - 3,
              direction,
            ),
            p.hairColor,
            'hair',
          )
        : null;
    const side = direction === 1 || direction === 3;
    // Tie/bun volume sits above the crown; it must not shrink the scalp coverage.
    const tied = p.hair === 7 || p.hair === 8;
    const hairWidth = p.hair === 7 ? (side ? 322 : 326) : side ? (p.hair === 6 ? 302 : 278) : 306;
    // Extend the wave silhouette over the rear scalp without moving the fringe.
    const hairX = 256 - hairWidth / 2 + (p.hair === 6 && side ? (direction === 1 ? -12 : 12) : 0);
    const hairHeight =
      p.hair === 7
        ? direction === 2
          ? 282
          : side
            ? 270
            : 250
        : direction === 2
          ? p.hair === 6
            ? 300
            : 244
          : side
            ? p.hair === 6
              ? 290
              : 235
            : [178, 215, 200, 178, 210, 178, 280, 230, 220][p.hair];
    const hairY = p.hair === 7 ? 10 : tied ? 24 : 42;
    ctx.save();
    if (avatar.headwear && avatar.headwear !== 'none') {
      // Tuck crown volume and tied hair under the hat while keeping the lower hairstyle.
      const brim = avatar.headwear === 'bucket' ? 155 : 136;
      ctx.beginPath();
      ctx.rect(116, brim, 280, 45);
      ctx.rect(0, brim + 45, 512, 512);
      ctx.clip();
    }
    if (layer !== 'body') {
      if (hair) ctx.drawImage(hair, hairX, hairY, hairWidth, hairHeight);
      else drawExtraHair(ctx, p.hair, p.hairColor, direction);
    }
    ctx.restore();
    if (layer !== 'hair') {
      if (direction !== 2) {
        if (p.eyes >= 6) drawExtraEyes(ctx, p.eyes, p.eyeColor, direction);
        else {
          const eyes = tinted(
            piece(p.eyes < 3 ? layers.features : layers.featuresExtra, 3, 2, p.eyes % 3, 0),
            p.eyeColor,
            'eyes',
          );
          const ew = 130,
            eh = [54, 20, 34, 40, 42, 40][p.eyes],
            ey = 171 + (54 - eh) / 2;
          if (side) {
            const right = direction === 1;
            ctx.drawImage(
              eyes,
              right ? eyes.width / 2 : 0,
              0,
              eyes.width / 2,
              eyes.height,
              right ? 322 : 151,
              ey,
              40,
              eh,
            );
          } else ctx.drawImage(eyes, 256 - ew / 2, ey, ew, eh);
        }
        if (p.nose >= 6) drawExtraNose(ctx, p.nose, p.skin, direction);
        else {
          const nose = piece(
              p.nose < 3 ? layers.features : layers.featuresExtra,
              3,
              2,
              p.nose % 3,
              1,
            ),
            nw = [23, 23, 20, 23, 27, 20][p.nose],
            nh = [23, 23, 10, 21, 17, 20][p.nose];
          ctx.drawImage(
            nose,
            (direction === 1 ? 369 : direction === 3 ? 143 : 256) - nw / 2,
            202,
            nw,
            nh,
          );
        }
      }
      drawEquipment(ctx, avatar, direction);
      drawWristwear(ctx, avatar, direction);
      if (avatar.instrument === 'microphone' && direction !== 3) {
        // Restore the palm over the handle so the microphone is visibly gripped.
        const handX = [329, 262, 182, 250][direction];
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(handX, 374, 12, 9, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(base, 256 - bw / 2, 58, bw, bh);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  targetCache.set(key, out);
  const limit = singleView === undefined ? 12 : 48;
  if (targetCache.size > limit) targetCache.delete(targetCache.keys().next().value!);
  return out;
}
