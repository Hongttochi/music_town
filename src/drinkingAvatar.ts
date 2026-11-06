/** Lift the existing sleeve and hand toward the mouth, preserving the chosen outfit. */
export function composeDrinkingAvatar(standing: HTMLCanvasElement, lift: number) {
  const canvas = document.createElement('canvas');
  canvas.width = standing.width;
  canvas.height = standing.height;
  const ctx = canvas.getContext('2d')!;
  for (let cell = 0; cell < 4; cell++) {
    ctx.save();
    ctx.translate(cell * 512, 0);
    ctx.drawImage(standing, 0, 0, 512, 512, 0, 0, 512, 512);
    ctx.clearRect(306, 324, 48, 78);
    ctx.save();
    ctx.translate(310, 326);
    ctx.rotate(0.4 + lift * 2.3);
    ctx.drawImage(standing, 305, 324, 47, 73, -4, 0, 47, 73 + lift * 27);
    ctx.restore();
    const x = 324 - lift * 44,
      y = 365 - lift * 126;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-lift * 0.3);
    ctx.fillStyle = '#fff3d7';
    ctx.beginPath();
    ctx.moveTo(-18, -24);
    ctx.lineTo(18, -24);
    ctx.lineTo(13, 13);
    ctx.lineTo(-13, 13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#648164';
    ctx.fillRect(-15, -11, 30, 13);
    ctx.fillStyle = '#67422b';
    ctx.beginPath();
    ctx.ellipse(0, -24, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  return canvas;
}
