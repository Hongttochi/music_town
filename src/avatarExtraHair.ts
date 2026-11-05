/** Extra hair silhouettes are drawn in the shared 512px avatar coordinates. */
export function drawExtraHair(
  ctx: CanvasRenderingContext2D,
  hair: number,
  color: string,
  direction: number,
) {
  if (hair === 9) return; // The original body layer already contains a shaded bare scalp.
  const side = direction === 1 || direction === 3,
    back = direction === 2;
  ctx.save();
  // Draw a single right-facing profile, then mirror for the left view.
  if (direction === 3) {
    ctx.translate(512, 0);
    ctx.scale(-1, 1);
  }
  const cap = (bottom: number) => {
    ctx.beginPath();
    ctx.moveTo(120, 190);
    ctx.bezierCurveTo(103, 24, 364, 1, 391, 147);
    if (back) ctx.bezierCurveTo(404, 277, 117, 281, 120, 190);
    else if (side) {
      ctx.lineTo(365, bottom);
      ctx.quadraticCurveTo(305, bottom - 40, 265, 173);
      ctx.lineTo(236, 219);
      ctx.quadraticCurveTo(167, 231, 120, 190);
    } else {
      ctx.lineTo(372, 201);
      ctx.lineTo(358, 138);
      ctx.quadraticCurveTo(260, bottom, 153, 138);
      ctx.lineTo(139, 201);
      ctx.closePath();
    }
  };
  const fill = ctx.createLinearGradient(120, 70, 380, 240);
  fill.addColorStop(0, color);
  fill.addColorStop(1, '#242326');
  ctx.fillStyle = fill;
  if (hair === 12 || hair === 13) {
    ctx.globalAlpha = 0.5;
    cap(136);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (hair === 12) {
      ctx.save();
      cap(136);
      ctx.clip();
      ctx.fillStyle = color;
      for (let y = 65; y < 246; y += 10)
        for (let x = 120; x < 394; x += 11) {
          ctx.beginPath();
          ctx.arc(x + (y % 3), y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      ctx.restore();
    } else {
      ctx.fillStyle = fill;
      ctx.beginPath();
      if (side) {
        ctx.moveTo(154, 114);
        ctx.lineTo(143, 64);
        ctx.lineTo(179, 78);
        ctx.lineTo(194, 27);
        ctx.lineTo(227, 52);
        ctx.lineTo(256, 12);
        ctx.lineTo(281, 48);
        ctx.lineTo(323, 28);
        ctx.lineTo(320, 66);
        ctx.lineTo(357, 63);
        ctx.lineTo(375, 119);
      } else {
        ctx.moveTo(224, back ? 233 : 133);
        ctx.lineTo(220, 63);
        ctx.lineTo(239, 35);
        ctx.lineTo(255, 12);
        ctx.lineTo(272, 38);
        ctx.lineTo(291, 63);
        ctx.lineTo(286, back ? 233 : 133);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else if (hair === 10) {
    cap(153);
    ctx.fill();
    // Lifted, swept-back quiff with a clean part and comb lines.
    ctx.beginPath();
    ctx.moveTo(136, 129);
    ctx.bezierCurveTo(111, 47, 231, -8, 337, 46);
    ctx.quadraticCurveTo(384, 65, 388, 119);
    ctx.quadraticCurveTo(320, 83, 286, 118);
    ctx.quadraticCurveTo(217, 145, 136, 129);
    ctx.fill();
    ctx.strokeStyle = '#ffffff30';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(151 + i * 5, 111 - i * 11);
      ctx.bezierCurveTo(210, 43 - i * 4, 292, 38 + i * 4, 353 + i * 3, 90 + i * 6);
      ctx.stroke();
    }
    if (!back) {
      ctx.strokeStyle = '#211f2860';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(side ? 307 : 326, 120);
      ctx.quadraticCurveTo(350, 98, 372, 131);
      ctx.stroke();
    }
  } else if (hair === 11) {
    cap(142);
    ctx.fill();
    ctx.lineCap = 'round';
    const lock = (sx: number, sy: number, ex: number, ey: number, index: number) => {
      ctx.strokeStyle = '#242326';
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx - 12, sy + 25, ex + 13, ey - 36, ex, ey);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 17;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff25';
      ctx.lineWidth = 3;
      for (let t = 0.2; t < 0.95; t += 0.18) {
        const x = sx + (ex - sx) * t,
          y = sy + (ey - sy) * t;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 2);
        ctx.lineTo(x + 5, y + 3);
        ctx.stroke();
      }
      if (index % 4 === 0) {
        ctx.strokeStyle = '#c9b17c';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(ex - 6, ey - 17);
        ctx.lineTo(ex + 6, ey - 14);
        ctx.stroke();
      }
    };
    if (back)
      for (let i = 0; i < 12; i++) lock(140 + i * 21, 90, 137 + i * 22, 250 + (i % 3) * 11, i);
    else {
      for (let i = 0; i < 4; i++) lock(133 + i * 19, 94, 129 + i * 16, 218 + i * 10, i);
      if (!side)
        for (let i = 0; i < 4; i++) lock(322 + i * 17, 90, 329 + i * 16, 247 - i * 9, i + 4);
      for (let i = 0; i < 9; i++)
        lock(151 + i * 25, 68 + (i % 2) * 6, 158 + i * 26, 128 + (i % 3) * 9, i + 8);
    }
  }
  ctx.restore();
}
