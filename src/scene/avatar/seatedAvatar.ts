/** Preserve all four view directions while bending the legs into a seated pose. */
export function composeSeatedAvatar(standing: HTMLCanvasElement) {
  const seated = document.createElement('canvas');
  seated.width = standing.width;
  seated.height = standing.height;
  const ctx = seated.getContext('2d')!;
  // Each cell keeps its own hair, face and clothing view.
  for (let cell = 0; cell < 4; cell++) {
    const view = document.createElement('canvas');
    view.width = view.height = 512;
    view.getContext('2d')!.drawImage(standing, cell * 512, 0, 512, 512, 0, 0, 512, 512);
    ctx.save();
    ctx.translate(cell * 512, 0);
    if (cell === 1 || cell === 3) {
      const side = cell === 1 ? 1 : -1;
      // Side views have one overlapping pair of bent legs, extending toward the table.
      ctx.save();
      ctx.translate(256, 388);
      ctx.rotate((-side * Math.PI) / 2);
      ctx.drawImage(view, 224, 385, 64, 43, -32, 0, 64, 43);
      ctx.restore();
      ctx.drawImage(view, 222, 420, 70, 60, 222 + side * 36, 405, 70, 60);
      ctx.drawImage(view, 0, 0, 512, 390, 0, 0, 512, 390);
      ctx.restore();
      continue;
    }
    // Lower legs hang from separated knees, with shoes pointing slightly outward.
    ctx.drawImage(view, 215, 410, 37, 40, 192, 417, 37, 42);
    ctx.drawImage(view, 263, 410, 37, 40, 283, 417, 37, 42);
    ctx.save();
    ctx.translate(208, 455);
    ctx.rotate(0.12);
    ctx.drawImage(view, 207, 448, 49, 29, -29, -2, 53, 30);
    ctx.restore();
    ctx.save();
    ctx.translate(303, 455);
    ctx.rotate(-0.12);
    ctx.drawImage(view, 258, 448, 49, 29, -24, -2, 53, 30);
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
      ctx.drawImage(view, sourceX, 369, 51, 53, -25, -5, 51, 66);
      ctx.restore();
    }
    // Keep the upper body at its native proportions and rest the hands on the lap.
    ctx.drawImage(view, 217, 371, 78, 24, 217, 370, 78, 30);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 512, 324);
    ctx.rect(205, 324, 102, 47);
    ctx.clip();
    ctx.drawImage(view, 0, 0, 512, 371, 0, 0, 512, 371);
    ctx.restore();
    ctx.save();
    ctx.translate(203, 324);
    ctx.rotate(-0.42);
    ctx.drawImage(view, 160, 324, 47, 73, -43, 0, 47, 73);
    ctx.restore();
    ctx.save();
    ctx.translate(309, 324);
    ctx.rotate(0.42);
    ctx.drawImage(view, 305, 324, 47, 73, -4, 0, 47, 73);
    ctx.restore();
    ctx.restore();
  }
  return seated;
}
