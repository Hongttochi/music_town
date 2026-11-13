export const WALK_FRAMES = 8;

/** Bake four directions into columns and gait frames into rows, once per avatar. */
export function composeWalkingAvatar(standing: HTMLCanvasElement) {
  const atlas = document.createElement('canvas');
  atlas.width = 1024;
  atlas.height = 256 * WALK_FRAMES;
  const ctx = atlas.getContext('2d')!;
  for (let frame = 0; frame < WALK_FRAMES; frame++) {
    const stride = Math.sin((frame / WALK_FRAMES) * Math.PI * 2);
    for (let direction = 0; direction < 4; direction++) {
      ctx.save();
      ctx.translate(direction * 256, frame * 256);
      ctx.scale(0.5, 0.5);
      const sourceX = direction * 512;
      const side = direction === 1 || direction === 3;
      // The source's legs overlap in profile; draw the far leg first.
      for (const leg of [-1, 1]) {
        const step = stride * leg;
        const x = side ? 214 : leg === -1 ? 192 : 256;
        const width = side ? 84 : 64;
        const hip = side ? 256 : leg === -1 ? 234 : 278;
        ctx.save();
        ctx.translate(hip, 412);
        ctx.rotate(side ? step * 0.30 : step * 0.07);
        const lift = Math.max(0, step) * 10;
        ctx.drawImage(standing, sourceX + x, 410, width, 74,
          x - hip, -2, width, 74 - lift);
        ctx.restore();
      }
      // Preserve face, hair, clothes and equipment without stretching the portrait.
      ctx.drawImage(standing, sourceX, 0, 512, 414, 0, 0, 512, 414);
      ctx.restore();
    }
  }
  return atlas;
}
