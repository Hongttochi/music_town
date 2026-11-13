/** Soft fabric shading follows the selected color instead of adding black outlines. */
export function fabricShade(color: string, amount: number) {
  const hex = /^#[0-9a-f]{6}$/i.test(color) ? color : '#b6a6ca';
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16);
    return Math.round(amount > 0 ? value + (255 - value) * amount : value * (1 + amount));
  });
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function fabricFill(ctx: CanvasRenderingContext2D, color: string, x: number, width: number) {
  const fill = ctx.createLinearGradient(x, 0, x + width, 0);
  fill.addColorStop(0, fabricShade(color, -0.16));
  fill.addColorStop(0.35, fabricShade(color, 0.16));
  fill.addColorStop(0.7, color);
  fill.addColorStop(1, fabricShade(color, -0.13));
  return fill;
}
