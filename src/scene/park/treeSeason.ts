export type TreeSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export function treeSeason(date = new Date()): TreeSeason {
  const month = new Date(date.getTime() + 9 * 60 * 60 * 1000).getUTCMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/** Recolor foliage only; preserve the original trunk, transparency and painted shading. */
export function seasonalFoliage(pixels: Uint8ClampedArray, season: TreeSeason) {
  if (season === 'summer') return;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2];
    if (pixels[i + 3] < 100 || g < r * 0.86 || g < b * 1.13 || g - b < 14) continue;
    const light = (r * 0.3 + g * 0.6 + b * 0.1) / 255;
    const palette =
      season === 'spring'
        ? [160 + light * 95, 87 + light * 145, 116 + light * 129]
        : season === 'autumn'
          ? [123 + light * 128, 43 + light * 137, 24 + light * 59]
          : [150 + light * 103, 164 + light * 90, 167 + light * 88];
    pixels[i] = palette[0];
    pixels[i + 1] = palette[1];
    pixels[i + 2] = palette[2];
  }
}
