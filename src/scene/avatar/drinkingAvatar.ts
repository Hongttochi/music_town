import { barDrinks, type BarDrinkId } from '../../data/bar';
import { findCoffee, type CoffeeId } from '../../data/coffeeMenu';

/** Two-bone reach keeps the cup rim at the mouth at the top of the sip. */
export function drinkingArmPose(lift: number) {
  const amount = Math.max(0, Math.min(1, lift));
  const eased = amount * amount * (3 - 2 * amount);
  const handX = 329 + (271 - 329) * eased + Math.sin(eased * Math.PI) * 56;
  const handY = 383 + (250 - 383) * eased;
  const dx = handX - 310,
    dy = handY - 306;
  const upperLength = Math.hypot(20, 51),
    lowerLength = 29;
  const distance = Math.hypot(dx, dy);
  const bend = Math.acos(
    Math.max(
      -1,
      Math.min(
        1,
        (distance * distance + upperLength * upperLength - lowerLength * lowerLength) /
          (2 * distance * upperLength),
      ),
    ),
  );
  const angle = Math.atan2(dy, dx) - bend;
  const elbowX = 310 + upperLength * Math.cos(angle);
  const elbowY = 306 + upperLength * Math.sin(angle);
  return {
    handX,
    handY,
    elbowX,
    elbowY,
    upperAngle: angle - Math.atan2(51, 20),
    forearmAngle: Math.atan2(elbowX - handX, handY - elbowY),
  };
}

/** Cup and fingers share the same transformed palm anchor in every animation frame. */
export function drawDrinkingPose(
  ctx: CanvasRenderingContext2D,
  standing: HTMLCanvasElement,
  lift: number,
  coffee: CoffeeId,
  barDrink?: BarDrinkId,
  armSource = standing,
  hairLayer?: HTMLCanvasElement,
) {
  const drink = findCoffee(coffee);
  const { upperAngle, forearmAngle, elbowX, elbowY, handX, handY } = drinkingArmPose(lift);
  {
    ctx.save();
    ctx.drawImage(standing, 0, 0, 512, 512, 0, 0, 512, 512);
    if (barDrink) {
      // Replace the seated resting arm with the original torso before drawing the reach.
      ctx.clearRect(275, 324, 82, 82);
      ctx.drawImage(armSource, 275, 324, 32, 82, 275, 324, 32, 82);
    }
    ctx.clearRect(306, 304, 48, 98);
    // Restore stationary hair erased with the resting arm, before drawing the moving arm.
    if (hairLayer) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(306, 304, 48, 98);
      if (barDrink) ctx.rect(275, 324, 82, 82);
      ctx.clip();
      ctx.drawImage(hairLayer, 0, 0);
      ctx.restore();
    }
    // The upper arm and forearm pivot separately; neither is stretched.
    ctx.save();
    ctx.translate(310, 306);
    ctx.rotate(upperAngle);
    ctx.drawImage(armSource, 305, 304, 47, 59, -4, 0, 47, 59);
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
