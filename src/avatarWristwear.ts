import type { Avatar } from './model';

/** Wrist position stays inside the forearm crop used by sitting and drinking poses. */
export function drawWristwear(
  ctx: CanvasRenderingContext2D,
  avatar: Partial<Avatar>,
  direction: number,
) {
  const style = avatar.wristwear;
  if (!style || style === 'none') return;
  const x = [329, 262, 182, 250][direction];
  const side = direction === 1 || direction === 3;
  ctx.save();
  ctx.translate(x, 364);
  ctx.rotate(direction === 0 || direction === 3 ? -0.12 : 0.12);
  if (side) ctx.scale(0.85, 1);
  ctx.lineWidth = 1.4;
  if (style === 'bracelet') {
    ctx.strokeStyle = '#9f7846';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const t = (i / 6) * Math.PI;
      const shade = ctx.createRadialGradient(
        Math.cos(t) * 10 - 1,
        Math.sin(t) * 3 - 1,
        0,
        Math.cos(t) * 10,
        Math.sin(t) * 3,
        3,
      );
      shade.addColorStop(0, '#f4dc9a');
      shade.addColorStop(1, '#af8352');
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(Math.cos(t) * 10, Math.sin(t) * 3, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'watch' || style === 'apple-watch') {
    const smart = style === 'apple-watch';
    ctx.fillStyle = smart ? '#8b9e82' : '#8b6046';
    ctx.beginPath();
    ctx.roundRect(-12, -5, 24, 10, 4);
    ctx.fill();
    ctx.fillStyle = smart ? '#596361' : '#d8c18a';
    ctx.strokeStyle = smart ? '#424b49' : '#a18a5a';
    ctx.beginPath();
    if (smart) ctx.roundRect(-8, -10, 16, 20, 5);
    else ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (smart) {
      ctx.fillStyle = '#202c30';
      ctx.beginPath();
      ctx.roundRect(-6, -8, 12, 16, 3);
      ctx.fill();
      ctx.lineWidth = 1.8;
      for (const [r, c] of [
        [4.5, '#d98489'],
        [2.8, '#aecb78'],
      ] as const) {
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.arc(0, 0, r, -0.5, Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.fillStyle = '#a9b2a5';
      ctx.fillRect(8, -3, 2, 4);
    } else {
      ctx.fillStyle = '#fff4d7';
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5c6556';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 0);
      ctx.lineTo(4, 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}
