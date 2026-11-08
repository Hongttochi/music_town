import { barDrinks, type BarDrinkId } from '../../data/bar';
import { findCoffee, type CoffeeId } from '../../data/coffeeMenu';

/** Cup and fingers share the same transformed palm anchor in every animation frame. */
export function drawDrinkingPose(
  ctx: CanvasRenderingContext2D,
  standing: HTMLCanvasElement,
  lift: number,
  coffee: CoffeeId,
  barDrink?: BarDrinkId,
  armSource = standing,
) {
  const drink = findCoffee(coffee);
  const upperAngle = -0.12 - lift * 0.32;
  const forearmAngle = 0.15 + lift * 2.5;
  const elbowX = 310 + 20 * Math.cos(upperAngle) - 35 * Math.sin(upperAngle);
  const elbowY = 326 + 20 * Math.sin(upperAngle) + 35 * Math.cos(upperAngle);
  const handX = elbowX - 29 * Math.sin(forearmAngle);
  const handY = elbowY + 29 * Math.cos(forearmAngle);
  {
    ctx.save();
    ctx.drawImage(standing, 0, 0, 512, 512, 0, 0, 512, 512);
    ctx.clearRect(306, 324, 48, 78);
    // The upper arm and forearm pivot separately; neither is stretched.
    ctx.save();
    ctx.translate(310, 326);
    ctx.rotate(upperAngle);
    ctx.drawImage(armSource, 305, 324, 47, 39, -4, 0, 47, 39);
    ctx.restore();
    ctx.save();
    ctx.translate(elbowX, elbowY);
    ctx.rotate(forearmAngle);
    ctx.drawImage(armSource, 314, 355, 32, 42, -16, -4, 32, 42);
    ctx.restore();
    ctx.save();
    ctx.translate(handX - 10, handY);
    ctx.rotate(-lift * 0.2);
    if (barDrink) {
      const color = barDrinks.find((drink) => drink.id === barDrink)!.color;
      ctx.fillStyle = '#edf3e8aa';
      ctx.strokeStyle = '#efe3c9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-16, -25, 32, 38, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(-13, -12, 26, 21);
      ctx.fillStyle = '#ffffff88';
      ctx.fillRect(-10, -21, 3, 24);
    } else {
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
    }
    ctx.restore();
    // Palm follows the forearm without a second wrist twist or scaling.
    ctx.save();
    ctx.translate(elbowX, elbowY);
    ctx.rotate(forearmAngle);
    ctx.drawImage(armSource, 322, 377, 14, 16, -8, 18, 14, 16);
    ctx.restore();
    ctx.restore();
  }
}
