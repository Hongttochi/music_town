import type { Avatar } from '../../data/model';
import { fabricFill, fabricShade } from './avatarFabric';

export function drawFacewear(
  ctx: CanvasRenderingContext2D,
  avatar: Partial<Avatar>,
  direction: number,
) {
  const side = direction === 1 || direction === 3;
  const back = direction === 2;
  ctx.save();
  if (direction === 3) {
    ctx.translate(512, 0);
    ctx.scale(-1, 1);
  }
  ctx.lineCap = 'round';
  if (avatar.neckwear && avatar.neckwear !== 'none') {
    const color = avatar.neckwear === 'rose-scarf' ? '#c78f9e' : '#e2d1af';
    const x = side ? 234 : 211;
    const width = side ? 58 : 90;
    if (!back) {
      ctx.fillStyle = fabricFill(ctx, color, x + 12, 27);
      ctx.beginPath();
      ctx.roundRect(x + 12, 285, 27, 65, 7);
      ctx.fill();
      ctx.strokeStyle = fabricShade(color, -0.16);
      ctx.lineWidth = 2;
      for (let y = 302; y < 344; y += 7) {
        ctx.beginPath();
        ctx.moveTo(x + 16, y);
        ctx.lineTo(x + 35, y);
        ctx.stroke();
      }
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 15 + i * 5, 346);
        ctx.lineTo(x + 15 + i * 5, 354);
        ctx.stroke();
      }
    }
    ctx.fillStyle = fabricFill(ctx, color, x, width);
    ctx.beginPath();
    ctx.roundRect(x, 267, width, 31, 14);
    ctx.fill();
    ctx.strokeStyle = fabricShade(color, -0.12);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, 280);
    ctx.quadraticCurveTo(x + width / 2, 292, x + width - 8, 280);
    ctx.stroke();
    ctx.strokeStyle = fabricShade(color, 0.18);
    for (let offset = 10; offset < width - 7; offset += 7) {
      ctx.beginPath();
      ctx.moveTo(x + offset, 272);
      ctx.lineTo(x + offset - 2, 279);
      ctx.stroke();
    }
  }
  if (avatar.facewear && avatar.facewear !== 'none' && !back) {
    const color = avatar.facewear === 'black-mask' ? '#52565b' : '#f0eee5';
    ctx.strokeStyle = fabricShade(color, -0.16);
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (side) {
      ctx.moveTo(334, 224);
      ctx.quadraticCurveTo(263, 202, 244, 213);
      ctx.quadraticCurveTo(254, 247, 334, 249);
    } else {
      ctx.moveTo(202, 222);
      ctx.quadraticCurveTo(150, 210, 136, 215);
      ctx.quadraticCurveTo(160, 243, 203, 246);
      ctx.moveTo(310, 222);
      ctx.quadraticCurveTo(362, 210, 376, 215);
      ctx.quadraticCurveTo(352, 243, 309, 246);
    }
    ctx.stroke();
    const x = side ? 329 : 199;
    const width = side ? 53 : 114;
    ctx.fillStyle = fabricFill(ctx, color, x, width);
    ctx.beginPath();
    ctx.moveTo(x, 221);
    ctx.quadraticCurveTo(x + width / 2, 208, x + width, 222);
    ctx.lineTo(x + width - 4, 249);
    ctx.quadraticCurveTo(x + width / 2, 276, x + 4, 249);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.5;
    for (const y of [230, 239, 248]) {
      ctx.beginPath();
      ctx.moveTo(x + 10, y);
      ctx.quadraticCurveTo(x + width / 2, y + 8, x + width - 10, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}
