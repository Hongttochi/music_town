/** Additional expressions in the same 512px coordinates as the original face layers. */
export function drawExtraEyes(
  ctx: CanvasRenderingContext2D,
  style: number,
  color: string,
  direction: number,
) {
  if (direction === 2) return;
  const centers = direction === 1 ? [342] : direction === 3 ? [171] : [222, 290];
  ctx.save();
  for (const x of centers) {
    // Keep the same anatomical eye when turning, including asymmetric winks.
    const left = direction === 1 || (direction === 0 && x < 256);
    const y = 197;
    const curve = (from: number, control: number, end: number) => {
      ctx.beginPath();
      ctx.moveTo(x - 14, y + from);
      ctx.quadraticCurveTo(x, y + control, x + 14, y + end);
      ctx.stroke();
    };
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const closed = style === 9 || (style === 8 && !left);
    if (closed) {
      curve(4, -14, 4);
      if (style === 8) {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 13, y + 3);
        ctx.lineTo(x + 20, y - 2);
        ctx.stroke();
      }
      continue;
    }
    ctx.save();
    ctx.beginPath();
    if (style === 10) {
      ctx.moveTo(x - 19, y + (left ? 0 : -8));
      ctx.quadraticCurveTo(x, y - 17, x + 19, y + (left ? -8 : 0));
      ctx.quadraticCurveTo(x + 13, y + 17, x, y + 17);
      ctx.quadraticCurveTo(x - 15, y + 15, x - 19, y + (left ? 0 : -8));
    } else
      ctx.ellipse(
        x,
        y + (style === 11 ? 3 : 0),
        style === 6 ? 21 : 19,
        style === 7 ? 15 : 23,
        style === 11 ? (left ? -0.12 : 0.12) : 0,
        0,
        Math.PI * 2,
      );
    ctx.fillStyle = '#fffdf6';
    ctx.fill();
    ctx.clip();
    const iris = ctx.createLinearGradient(x, y - 16, x, y + 21);
    iris.addColorStop(0, color);
    iris.addColorStop(1, '#171e25');
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.ellipse(x + (left ? 2 : -2), y + 3, 12, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffdf6';
    ctx.beginPath();
    ctx.arc(x - 3, y - 5, style === 6 ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (style === 6) {
      ctx.beginPath();
      ctx.arc(x + 5, y + 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (style === 7) {
      ctx.fillStyle = color;
      ctx.fillRect(x - 22, y - 25, 44, 19);
    }
    ctx.restore();
    if (style === 10) {
      ctx.lineWidth = 3;
      curve(left ? 0 : -8, -17, left ? -8 : 0);
    }
    if (style === 11) {
      ctx.strokeStyle = '#ffffff65';
      ctx.lineWidth = 2;
      curve(22, 28, 22);
    }
  }
  ctx.restore();
}

export function drawExtraNose(
  ctx: CanvasRenderingContext2D,
  style: number,
  skin: string,
  direction: number,
) {
  if (direction === 2) return;
  const side = direction !== 0;
  const x = direction === 1 ? 369 : direction === 3 ? 143 : 256;
  ctx.save();
  ctx.translate(x, 212);
  if (direction === 3) ctx.scale(-1, 1);
  const fill = ctx.createLinearGradient(-6, -10, 9, 13);
  fill.addColorStop(0, skin || '#f2bd94');
  fill.addColorStop(1, '#bc8065');
  ctx.fillStyle = fill;
  ctx.strokeStyle = '#9f624b55';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (style === 6) ctx.ellipse(0, 2, side ? 9 : 11, 8, 0, 0, Math.PI * 2);
  else if (style === 7) {
    ctx.moveTo(0, -12);
    ctx.bezierCurveTo(-3, -5, -12, 3, -8, 9);
    ctx.bezierCurveTo(-2, 16, 11, 10, 9, 4);
    ctx.quadraticCurveTo(7, -3, 0, -12);
  } else if (style === 8) {
    ctx.moveTo(-12, 1);
    ctx.bezierCurveTo(-16, 13, -5, 14, 0, 11);
    ctx.bezierCurveTo(8, 16, 17, 8, 11, 1);
    ctx.quadraticCurveTo(0, -11, -12, 1);
  } else {
    ctx.moveTo(-3, -14);
    ctx.quadraticCurveTo(side ? 11 : 4, -3, side ? 13 : 8, 6);
    ctx.quadraticCurveTo(5, 13, -6, 9);
    ctx.quadraticCurveTo(-2, 1, -3, -14);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff4dc65';
  ctx.beginPath();
  ctx.ellipse(-2, style === 9 ? 0 : 2, 3, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
