import { drawAccessories } from './avatarAccessories';
import type { Avatar } from '../../data/model';

/** Equipment is drawn into the same four-view texture used by preview and world. */
export function drawEquipment(
  ctx: CanvasRenderingContext2D,
  avatar: Partial<Avatar>,
  direction: number,
) {
  const side = direction === 1 || direction === 3,
    back = direction === 2;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawAccessories(ctx, avatar, direction);
  if (['guitar', 'electric', 'ukulele'].includes(avatar.instrument || '')) {
    const electric = avatar.instrument === 'electric',
      small = avatar.instrument === 'ukulele';
    // A strap and compact acoustic guitar worn across the torso (also visible from behind).
    ctx.strokeStyle = '#765b40';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(223, 273);
    ctx.lineTo(304, 370);
    ctx.stroke();
    ctx.save();
    ctx.translate(side ? (direction === 1 ? 295 : 217) : 271, 370);
    ctx.scale(side ? 0.47 : 0.85, 0.85);
    ctx.rotate(0.55);
    if (small) ctx.scale(0.72, 0.72);
    ctx.fillStyle = electric ? '#729f9c' : small ? '#d4a664' : '#ad743e';
    ctx.strokeStyle = '#765435';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, -21);
    ctx.bezierCurveTo(-50, -38, -57, -3, -34, 13);
    ctx.bezierCurveTo(-65, 57, -5, 78, 15, 43);
    ctx.bezierCurveTo(40, 57, 61, 21, 33, 5);
    ctx.bezierCurveTo(52, -28, 24, -46, 13, -21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#755035';
    ctx.fillRect(-6, -104, 15, 100);
    ctx.fillStyle = '#b28b50';
    ctx.fillRect(-10, -120, 23, 25);
    if (!back) {
      ctx.fillStyle = '#4f392c';
      ctx.beginPath();
      ctx.arc(0, 5, electric ? 0 : 11, 0, Math.PI * 2);
      ctx.fill();
      if (electric) {
        ctx.fillStyle = '#efe8d4';
        ctx.fillRect(-14, -4, 28, 25);
        ctx.fillStyle = '#4f392c';
        ctx.fillRect(-10, 0, 20, 5);
        ctx.fillRect(-10, 14, 20, 5);
      }
      ctx.fillRect(-12, 35, 26, 6);
      ctx.strokeStyle = '#e4cf99';
      ctx.lineWidth = 1;
      for (const x of [-3, 1, 5]) {
        ctx.beginPath();
        ctx.moveTo(x, -111);
        ctx.lineTo(x, 38);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  if (avatar.instrument === 'tambourine') {
    const handX = [329, 262, 182, 250][direction];
    ctx.save();
    ctx.translate(handX + 10, 397);
    if (side) ctx.scale(0.6, 1);
    ctx.strokeStyle = '#b77b4e';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = '#d3d9cd';
      ctx.strokeStyle = '#89958b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(27, 0, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  // The microphone arm is behind the body in the left-facing profile.
  // Do not transfer the microphone onto the visible, accessorized free arm.
  if (avatar.instrument === 'microphone' && direction !== 3) {
    const handX = direction === 0 ? 329 : direction === 1 ? 262 : direction === 2 ? 182 : 250;
    ctx.save();
    ctx.translate(handX, 385);
    ctx.rotate(direction === 3 || back ? 0.15 : -0.15);
    ctx.fillStyle = '#536263';
    ctx.fillRect(-7, -33, 14, 49);
    ctx.fillStyle = '#b8c7bf';
    ctx.strokeStyle = '#6b7d76';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -43, 14, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#899d92';
    ctx.lineWidth = 2;
    for (const y of [-49, -43, -37]) {
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.lineTo(10, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}
