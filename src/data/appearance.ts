export const skinTones = [
  { label: '원래 피부', color: '' },
  { label: '밝은 살구', color: '#ffdbb8' },
  { label: '따뜻한 베이지', color: '#eaba89' },
  { label: '햇볕에 그을린 피부', color: '#c78e61' },
  { label: '짙은 브라운', color: '#865638' },
];
export const eyeColors = [
  { label: '기본 눈', color: '' },
  { label: '밤색', color: '#70472c' },
  { label: '초록', color: '#3b7659' },
  { label: '파랑', color: '#3868a0' },
  { label: '보라', color: '#775499' },
];

export function hexRgb(hex: string): [number, number, number] | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Runtime palette replacement. Coordinates are relative to the visible silhouette. */
export function tintPixel(
  rgb: readonly number[],
  x: number,
  y: number,
  direction: number,
  skin: string,
  eyes: string,
): [number, number, number] {
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    sat = max ? (max - min) / max : 0;
  const skinTarget = hexRgb(skin),
    eyeTarget = hexRgb(eyes);
  // Hue/saturation plus body regions keep hair, white eyes and orange clothing intact.
  const skinRegion =
    (y > 0.31 && y < 0.64) ||
    (y > 0.65 && y < 0.82 && (x < 0.34 || x > 0.66)) ||
    (y > 0.82 && y < 0.94);
  const skinColor =
    r > 140 &&
    g > 75 &&
    b > 40 &&
    r > g &&
    g > b &&
    sat > 0.18 &&
    sat < 0.66 &&
    (g - b) / (r - b) > 0.3 &&
    (g - b) / (r - b) < 0.68;
  if (skinTarget && skinRegion && skinColor) {
    const light = 0.9 + 0.16 * (r / 255);
    return skinTarget.map((v) => Math.min(255, Math.round(v * light))) as [number, number, number];
  }
  // Only the eye band; back views and highlights are never recolored.
  const eyeRegion = direction !== 2 && y > 0.365 && y < 0.52 && x > 0.18 && x < 0.83;
  if (eyeTarget && eyeRegion && max < 95 && max - min < 30) {
    return eyeTarget.map((v) => Math.min(255, Math.round(v * (0.8 + (0.2 * max) / 95)))) as [
      number,
      number,
      number,
    ];
  }
  return [r, g, b];
}
