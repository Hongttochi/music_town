import { findCoffee, type CoffeeId } from './coffeeMenu';

/** Cup and fingers share the same transformed palm anchor in every animation frame. */
export function composeDrinkingAvatar(
  standing: HTMLCanvasElement,
  lift: number,
  coffee: CoffeeId = 'americano',
) {
  const canvas = document.createElement('canvas');
  canvas.width = standing.width;
  canvas.height = standing.height;
  const ctx = canvas.getContext('2d')!;
  const drink = findCoffee(coffee);
  const angle = 0.4 + lift * 2.3;
  const stretch = (73 + lift * 27) / 73;
  const palmX = 22,
    palmY = 62 * stretch;
  const handX = 310 + palmX * Math.cos(angle) - palmY * Math.sin(angle);
  const handY = 326 + palmX * Math.sin(angle) + palmY * Math.cos(angle);
  for (let cell = 0; cell < 4; cell++) {
    ctx.save();
    ctx.translate(cell * 512, 0);
    ctx.drawImage(standing, 0, 0, 512, 512, 0, 0, 512, 512);
    ctx.clearRect(306, 324, 48, 78);
    ctx.save();
    ctx.translate(310, 326);
    ctx.rotate(angle);
    ctx.drawImage(standing, 305, 324, 47, 73, -4, 0, 47, 73 * stretch);
    ctx.restore();
    ctx.save();
    ctx.translate(handX - 12, handY + 3);
    ctx.rotate(-lift * 0.3);
    ctx.fillStyle = drink.iced ? drink.color : '#fff3d7';
    ctx.beginPath();
    ctx.moveTo(-18, -24);
    ctx.lineTo(18, -24);
    ctx.lineTo(13, 13);
    ctx.lineTo(-13, 13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4c5a7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = drink.iced ? '#c8b58c' : '#648164';
    ctx.fillRect(-15, -11, 30, 13);
    ctx.fillStyle = drink.color;
    ctx.beginPath();
    ctx.ellipse(0, -24, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (drink.iced) {
      ctx.fillStyle = '#e2eee1';
      ctx.globalAlpha = 0.85;
      ctx.fillRect(-11, -26, 9, 7);
      ctx.fillRect(3, -25, 8, 6);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#f1e3c0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(7, -15);
      ctx.lineTo(7, -37);
      ctx.lineTo(1, -41);
      ctx.stroke();
    }
    ctx.restore();
    // Repaint the original fingers over the cup, so the hand visibly grips its side.
    ctx.save();
    ctx.translate(310, 326);
    ctx.rotate(angle);
    ctx.drawImage(standing, 322, 377, 14, 16, 13, 53 * stretch, 14, 16 * stretch);
    ctx.restore();
    ctx.restore();
  }
  return canvas;
}
