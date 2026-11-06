import type { Avatar } from '../../data/model';

/** Wear on the free arm, opposite the microphone; pose crops carry the band with the wrist. */
export function drawWristwear(
  ctx: CanvasRenderingContext2D,
  avatar: Partial<Avatar>,
  direction: number,
) {
  const style = avatar.wristwear;
  if (!style || style === 'none' || direction === 1) return;
  // In the right-facing profile this arm is behind the body, so hide it instead
  // of transferring the accessory to the visible microphone arm.
  const x = [184, 0, 328, 250][direction];
  const side = direction === 1 || direction === 3;
  ctx.save();
  ctx.translate(x, 356);
  ctx.rotate(direction === 0 ? 0.28 : direction === 2 ? -0.28 : 0);
  if (side) ctx.scale(0.85, 1);
  ctx.lineWidth = 1.4;
  if (style === 'bracelet') {
    ctx.strokeStyle = '#9f7846';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 4.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const t = (i / 6) * Math.PI;
      const shade = ctx.createRadialGradient(
        Math.cos(t) * 13 - 1,
        Math.sin(t) * 3 - 1,
        0,
        Math.cos(t) * 13,
        Math.sin(t) * 3,
        3,
      );
      shade.addColorStop(0, '#f4dc9a');
      shade.addColorStop(1, '#af8352');
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(Math.cos(t) * 13, Math.sin(t) * 3, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'watch' || style === 'apple-watch') {
    const smart = style === 'apple-watch';
    const band = ctx.createLinearGradient(-15, 0, 15, 0);
    band.addColorStop(0, smart ? '#5f735a' : '#68452f');
    band.addColorStop(0.45, smart ? '#a6b59b' : '#af805b');
    band.addColorStop(1, smart ? '#65795e' : '#715038');
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.moveTo(-15, -3);
    ctx.quadraticCurveTo(0, -8, 15, -3);
    ctx.lineTo(15, 4);
    ctx.quadraticCurveTo(0, 9, -15, 4);
    ctx.closePath();
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
