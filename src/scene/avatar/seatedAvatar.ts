/** Build a front-facing seated pose while preserving the selected face, hair and clothes. */
export function composeSeatedAvatar(standing: HTMLCanvasElement) {
  const seated = document.createElement('canvas');
  seated.width = standing.width;
  seated.height = standing.height;
  const ctx = seated.getContext('2d')!;
  // Sitting always faces the front of the bench; all atlas cells use the same pose.
  for (let cell = 0; cell < 4; cell++) {
    ctx.save();
    ctx.translate(cell * 512, 0);
    // Lower legs hang from separated knees, with shoes pointing slightly outward.
    ctx.drawImage(standing, 215, 410, 37, 40, 192, 417, 37, 42);
    ctx.drawImage(standing, 263, 410, 37, 40, 283, 417, 37, 42);
    ctx.save();
    ctx.translate(208, 455);
    ctx.rotate(0.12);
    ctx.drawImage(standing, 207, 448, 49, 29, -29, -2, 53, 30);
    ctx.restore();
    ctx.save();
    ctx.translate(303, 455);
    ctx.rotate(-0.12);
    ctx.drawImage(standing, 258, 448, 49, 29, -24, -2, 53, 30);
    ctx.restore();
    // Rotate each thigh outward from the hip, rather than squashing standing legs.
    for (const [hip, angle, sourceX] of [
      [235, 0.7, 205],
      [277, -0.7, 256],
    ]) {
      ctx.save();
      ctx.translate(hip, 375);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.roundRect(-25, -5, 51, 66, 16);
      ctx.clip();
      ctx.drawImage(standing, sourceX, 369, 51, 53, -25, -5, 51, 66);
      ctx.restore();
    }
    // Keep the upper body at its native proportions and rest the hands on the lap.
    ctx.drawImage(standing, 217, 371, 78, 24, 217, 370, 78, 30);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 512, 324);
    ctx.rect(205, 324, 102, 47);
    ctx.clip();
    ctx.drawImage(standing, 0, 0, 512, 371, 0, 0, 512, 371);
    ctx.restore();
    ctx.save();
    ctx.translate(203, 324);
    ctx.rotate(-0.42);
    ctx.drawImage(standing, 160, 324, 47, 73, -43, 0, 47, 73);
    ctx.restore();
    ctx.save();
    ctx.translate(309, 324);
    ctx.rotate(0.42);
    ctx.drawImage(standing, 305, 324, 47, 73, -4, 0, 47, 73);
    ctx.restore();
    ctx.restore();
  }
  return seated;
}
