export const RESIDENT_WALK_FRAMES = 8;
export const RESIDENT_WALK_PERIOD = 640;

export function residentStep(time: number, leg: number) {
  return Math.sin((time / RESIDENT_WALK_PERIOD) * Math.PI * 2) * leg;
}

/** Bake a gait from the standing pose, like the player's walking avatar.
 * Opposite phases drive the two legs; the torso and tail remain stationary.
 */
export function composeResidentWalking(source: HTMLCanvasElement, side: boolean, legTop: number) {
  const { width, height } = source;
  const top = Math.floor(height * legTop);
  const length = height - top;
  const pixels = source.getContext('2d')!.getImageData(0, 0, width, height).data;
  let left = width,
    right = 0;
  for (let y = top; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] < 100) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  const middle = Math.round((left + right + 1) / 2);
  // Constant canvas dimensions keep the head and body stable throughout the cycle.
  const padding = Math.ceil(height * 0.08);
  return Array.from({ length: RESIDENT_WALK_FRAMES }, (_, frame) => {
    const canvas = document.createElement('canvas');
    canvas.width = width + padding * 2;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(padding, 0);
    for (const leg of [-1, 1]) {
      const step = residentStep((frame * RESIDENT_WALK_PERIOD) / RESIDENT_WALK_FRAMES, leg);
      const x = side ? left : leg === -1 ? left : middle;
      const w = side ? right - left + 1 : leg === -1 ? middle - left : right + 1 - middle;
      const lift = Math.max(0, step) * length * 0.32;
      ctx.save();
      // Bend the short upper leg while translating the foot as a whole. This
      // avoids stretching a shoe into a wedge or shrinking the foot each step.
      for (let y = 0; y < length; y++) {
        const bend = Math.min(1, y / Math.max(1, length * 0.4));
        const offset = side ? step * height * 0.085 * bend : 0;
        const targetY = top + y - lift * bend;
        ctx.drawImage(source, x, top + y, w, 1, x + offset, targetY, w, 1);
      }
      if (side && leg === -1) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = '#49362530';
        ctx.fillRect(left - padding, top, right - left + padding * 2, length);
      }
      ctx.restore();
    }
    ctx.drawImage(source, 0, 0, width, top + 1, 0, 0, width, top + 1);
    return canvas;
  });
}
