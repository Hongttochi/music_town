import type { Avatar } from '../../data/model';
import { fabricFill, fabricShade } from './avatarFabric';

export function drawSoftOutfit(
  ctx: CanvasRenderingContext2D,
  avatar: Partial<Avatar>,
  direction: number,
) {
  const side = direction === 1 || direction === 3;
  const back = direction === 2;
  const dress = avatar.clothingStyle === 'ribbon-dress';
  const cardigan = avatar.clothingStyle === 'cardigan-skirt';
  const simple = avatar.clothingStyle === 'pleated-skirt' || avatar.clothingStyle === 'aline-skirt';
  const pleated = cardigan || avatar.clothingStyle === 'pleated-skirt';
  const shirt = avatar.shirt || '#e8d7d4';
  const skirt = dress ? shirt : avatar.pants || '#a19187';
  const x = side ? 231 : 207;
  const width = side ? 56 : 98;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const seam = (points: number[][], color: string, weight = 2) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.beginPath();
    points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
  };
  const rounded = (px: number, py: number, w: number, h: number, color: string, radius = 10) => {
    ctx.fillStyle = fabricFill(ctx, color, px, w);
    ctx.beginPath();
    ctx.roundRect(px, py, w, h, radius);
    ctx.fill();
  };
  // A curved skirt covers the source shorts, leaving the lower legs visible.
  ctx.fillStyle = fabricFill(ctx, skirt, x - 12, width + 24);
  ctx.beginPath();
  ctx.moveTo(x + 5, 349);
  ctx.quadraticCurveTo(x + width / 2, 355, x + width - 5, 349);
  ctx.quadraticCurveTo(x + width + 4, 389, x + width + 14, 426);
  ctx.quadraticCurveTo(x + width / 2, 440, x - 14, 426);
  ctx.quadraticCurveTo(x - 2, 388, x + 5, 349);
  ctx.fill();
  for (let i = 1; i <= (side ? 3 : 6); i++) {
    const fraction = i / (side ? 4 : 7);
    seam(
      [
        [x + width * fraction, 360],
        [x - 9 + (width + 18) * fraction, 425],
      ],
      fabricShade(skirt, pleated ? -0.12 : -0.04),
      pleated ? 3 : 1.5,
    );
    if (pleated)
      seam(
        [
          [x + width * fraction + 2, 363],
          [x - 7 + (width + 18) * fraction, 425],
        ],
        fabricShade(skirt, 0.16),
        2,
      );
  }
  rounded(x, 281, width, 80, shirt, 13);
  // Soft sleeves terminate above the hands and wrist accessories.
  for (const sleeveX of side ? [241] : [193, 289]) {
    rounded(sleeveX, 293, side ? 35 : 30, cardigan ? 69 : 45, shirt, 14);
    rounded(sleeveX + 2, cardigan ? 351 : 329, side ? 31 : 26, 8, fabricShade(shirt, -0.04), 4);
  }
  if (!back) {
    const center = side ? (direction === 1 ? x + width - 9 : x + 9) : 256;
    ctx.fillStyle = simple ? fabricShade(shirt, -0.06) : '#fff8eb';
    ctx.beginPath();
    ctx.moveTo(center - (side ? 12 : 22), 281);
    ctx.quadraticCurveTo(center - 16, 307, center, 298);
    ctx.quadraticCurveTo(center + 16, 307, center + (side ? 12 : 22), 281);
    ctx.closePath();
    ctx.fill();
    if (cardigan) {
      seam(
        [
          [center, 299],
          [center, 357],
        ],
        fabricShade(shirt, -0.18),
        2,
      );
      for (const y of [313, 330, 347]) rounded(center - 2, y, 4, 4, '#f7e9cf', 2);
      if (!side) {
        rounded(217, 330, 18, 17, shirt, 4);
        rounded(277, 330, 18, 17, shirt, 4);
      }
    } else if (!simple) {
      const ribbon = dress ? fabricShade(shirt, -0.25) : '#a27989';
      const ribbonY = dress ? 351 : 300;
      ctx.fillStyle = ribbon;
      ctx.beginPath();
      ctx.moveTo(center, ribbonY);
      ctx.bezierCurveTo(center - 25, ribbonY - 17, center - 23, ribbonY + 13, center, ribbonY + 2);
      ctx.bezierCurveTo(center + 23, ribbonY + 13, center + 25, ribbonY - 17, center, ribbonY);
      ctx.fill();
      seam(
        [
          [center - 2, ribbonY + 2],
          [center - 7, ribbonY + 21],
        ],
        ribbon,
        4,
      );
      seam(
        [
          [center + 2, ribbonY + 2],
          [center + 9, ribbonY + 17],
        ],
        ribbon,
        4,
      );
    }
  } else {
    seam(
      [
        [x + width / 2, 294],
        [x + width / 2, 350],
      ],
      fabricShade(shirt, -0.08),
      1,
    );
  }
  if (cardigan) rounded(x, 356, width, 7, fabricShade(shirt, -0.08), 3);
  ctx.restore();
}
