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
  const rgb = /^#[0-9a-f]{6}$/i.test(color) ? color : '#67402a';
  const tone = (amount: number) => {
    const channels = [1, 3, 5].map((offset) => {
      const value = parseInt(rgb.slice(offset, offset + 2), 16);
      return Math.round(amount > 0 ? value + (255 - value) * amount : value * (1 + amount));
    });
    return `rgb(${channels.join(',')})`;
  };
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
      ctx.quadraticCurveTo(383, 198, 372, 201);
      ctx.quadraticCurveTo(362, 184, 358, 138);
      ctx.quadraticCurveTo(260, bottom, 153, 138);
      ctx.quadraticCurveTo(148, 187, 139, 201);
      ctx.closePath();
    }
  };
  const fill = ctx.createRadialGradient(214, 82, 18, 257, 145, 190);
  fill.addColorStop(0, tone(0.23));
  fill.addColorStop(0.38, tone(0.08));
  fill.addColorStop(0.73, color);
  fill.addColorStop(1, tone(-0.25));
  ctx.fillStyle = fill;
  if (hair === 12 || hair === 13) {
    ctx.fillStyle = hair === 12 ? tone(0.18) : tone(-0.08);
    cap(136);
    ctx.fill();
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
    cap(126);
    ctx.fill();
    if (back) {
      ctx.save();
      cap(126);
      ctx.clip();
      ctx.strokeStyle = tone(-0.14);
      ctx.lineWidth = 2;
      for (let x = 145; x < 385; x += 24) {
        ctx.beginPath();
        ctx.moveTo(256 + (x - 256) * 0.35, 60);
        ctx.bezierCurveTo(x, 100, x + 9, 175, x, 248);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
      return;
    }
    // Lifted, swept-back quiff with a clean part and comb lines.
    ctx.beginPath();
    ctx.moveTo(136, 129);
    ctx.bezierCurveTo(111, 47, 231, -8, 337, 46);
    ctx.quadraticCurveTo(384, 65, 388, 119);
    ctx.quadraticCurveTo(320, 83, 286, 118);
    ctx.quadraticCurveTo(217, 145, 136, 129);
    ctx.fill();
    ctx.strokeStyle = tone(0.27);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(151 + i * 5, 111 - i * 11);
      ctx.bezierCurveTo(210, 43 - i * 4, 292, 38 + i * 4, 353 + i * 3, 90 + i * 6);
      ctx.stroke();
    }
    if (!back) {
      ctx.strokeStyle = tone(-0.24);
      ctx.lineWidth = 3;
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
      ctx.strokeStyle = tone(-0.3);
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx - 12, sy + 25, ex + 13, ey - 36, ex, ey);
      ctx.stroke();
      ctx.strokeStyle = fill;
      ctx.lineWidth = 17;
      ctx.stroke();
      ctx.strokeStyle = tone(0.22);
      ctx.lineWidth = 1.5;
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
  if (hair >= 14 && hair <= 19) {
    const strand = (points: number[], width: number, shade: string | CanvasGradient = fill) => {
      ctx.strokeStyle = shade;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      ctx.bezierCurveTo(points[2], points[3], points[4], points[5], points[6], points[7]);
      ctx.stroke();
    };
    const sheen = (points: number[]) => strand(points, 2, tone(0.2));
    ctx.fillStyle = fill;
    // A cropped crown leaves room for each fringe; side profiles are mirrored above.
    cap(hair === 16 ? 135 : 126);
    ctx.fill();
    if (hair === 14) {
      // Light separated bangs and a softly curled, chin-length silhouette.
      for (const x of side ? [143] : [137, 375]) {
        strand([x, 116, x - 10, 174, x - 7, 242, x + (x < 256 ? 18 : -18), 257], 31);
        sheen([x - 5, 127, x - 9, 175, x - 3, 221, x + (x < 256 ? 10 : -10), 242]);
      }
      if (!back)
        for (let i = 0; i < (side ? 4 : 7); i++) {
          const x = (side ? 234 : 177) + i * 24;
          strand([x, 105, x + 8, 123, x + 5, 142, x + 2, 155 + (i % 3) * 5], 8);
        }
    } else if (hair === 15) {
      // In profile, project the centre part toward the forehead rather than
      // leaving the front-view split over the ear. The left view mirrors this.
      if (side) {
        ctx.beginPath();
        ctx.moveTo(326, 67);
        ctx.bezierCurveTo(250, 15, 112, 60, 126, 150);
        ctx.quadraticCurveTo(117, 208, 138, 238);
        ctx.bezierCurveTo(203, 238, 247, 180, 271, 137);
        ctx.quadraticCurveTo(309, 120, 326, 67);
        ctx.closePath();
        ctx.fill();
        sheen([313, 78, 266, 93, 205, 146, 168, 205]);
        ctx.beginPath();
        ctx.moveTo(326, 67);
        ctx.bezierCurveTo(369, 57, 400, 109, 387, 151);
        ctx.quadraticCurveTo(368, 145, 351, 119);
        ctx.quadraticCurveTo(334, 104, 326, 67);
        ctx.closePath();
        ctx.fill();
        sheen([339, 81, 359, 92, 375, 115, 379, 136]);
      } else
        for (const flip of [-1, 1]) {
          ctx.save();
          ctx.translate(256, 0);
          ctx.scale(flip, 1);
          ctx.beginPath();
          ctx.moveTo(0, 64);
          ctx.bezierCurveTo(125, 30, 160, 122, 136, 174);
          ctx.quadraticCurveTo(125, 216, 147, 238);
          ctx.quadraticCurveTo(82, 227, 91, 169);
          ctx.quadraticCurveTo(28, 177, 0, 95);
          ctx.closePath();
          ctx.fill();
          sheen([9, 79, 60, 80, 94, 112, 111, 163]);
          ctx.restore();
        }
    } else if (hair === 16) {
      // Straight princess cut: blunt bangs, short cheek panels, longer outer lengths.
      if (back) {
        ctx.beginPath();
        ctx.roundRect(126, 123, 263, 192, [15, 15, 8, 8]);
        ctx.fill();
        for (let x = 148; x < 380; x += 30) sheen([x, 136, x - 3, 185, x + 3, 247, x, 302]);
      } else {
        for (const x of side ? [126] : [126, 354]) {
          ctx.beginPath();
          ctx.roundRect(x, 116, 34, 191, [12, 12, 8, 8]);
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(x < 256 ? x + 19 : x - 19, 135, 29, 91, [6, 6, 5, 5]);
          ctx.fill();
          sheen([x + 10, 128, x + 8, 188, x + 12, 248, x + 10, 295]);
        }
        ctx.beginPath();
        ctx.moveTo(side ? 252 : 153, 104);
        ctx.quadraticCurveTo(279, 78, 367, 111);
        ctx.lineTo(359, 155);
        ctx.lineTo(side ? 275 : 156, 155);
        ctx.closePath();
        ctx.fill();
        for (let x = side ? 290 : 175; x < 350; x += 24)
          sheen([x, 111, x - 3, 129, x + 1, 139, x, 148]);
      }
    } else if (hair === 17) {
      // Layered wolf cut: short crown and a tapered, shaggy nape.
      for (const flip of side ? [-1] : [-1, 1]) {
        ctx.save();
        ctx.translate(256, 0);
        ctx.scale(flip, 1);
        ctx.beginPath();
        ctx.moveTo(88, 105);
        ctx.lineTo(130, 113);
        ctx.lineTo(142, 170);
        ctx.lineTo(160, 181);
        ctx.lineTo(134, 190);
        ctx.lineTo(157, 228);
        ctx.lineTo(132, 223);
        ctx.lineTo(143, 270);
        ctx.lineTo(105, 247);
        ctx.lineTo(112, 291);
        ctx.lineTo(72, 258);
        ctx.quadraticCurveTo(105, 204, 88, 105);
        ctx.closePath();
        ctx.fill();
        sheen([115, 145, 123, 186, 112, 224, 111, 251]);
        ctx.restore();
      }
      if (!back)
        for (let i = 0; i < 6; i++) {
          const x = (side ? 229 : 153) + i * (side ? 24 : 37);
          ctx.beginPath();
          ctx.moveTo(x, 97);
          ctx.quadraticCurveTo(x + 44, 103, x + 23, 159 + (i % 2) * 13);
          ctx.lineTo(x + 9, 145);
          ctx.closePath();
          ctx.fill();
        }
    } else if (hair === 18) {
      // Two interwoven braids, with small sage ties below the cheeks.
      for (const x of side ? [141] : [134, 378]) {
        strand([x, 147, x - 3, 207, x + 3, 256, x, 302], 29);
        for (let i = 0; i < 7; i++) {
          ctx.save();
          ctx.translate(x, 193 + i * 16);
          ctx.rotate(i % 2 ? -0.5 : 0.5);
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        strand([x - 10, 299, x - 4, 302, x + 4, 302, x + 10, 299], 6, '#a6b88b');
      }
      ctx.fillStyle = fill;
      if (!back) {
        strand([253, 79, 225, 114, 184, 135, 154, 142], 28);
        if (!side) strand([259, 79, 285, 114, 326, 135, 358, 142], 28);
      }
    } else if (hair === 19) {
      // A single high bun, distinct from the original twin buns.
      const x = side ? 195 : 256;
      ctx.beginPath();
      ctx.ellipse(x, 57, 56, 45, -0.13, 0, Math.PI * 2);
      ctx.fill();
      sheen([x - 39, 57, x - 28, 14, x + 29, 16, x + 40, 49]);
      sheen([x - 20, 72, x - 29, 41, x + 12, 25, x + 24, 48]);
      strand([x - 31, 88, x - 10, 98, x + 12, 98, x + 31, 87], 7, '#a6b88b');
      if (!back) {
        strand([155, 124, 150, 154, 161, 176, 148, 198], 9);
        if (!side) strand([358, 124, 363, 154, 352, 176, 365, 198], 9);
      }
    }
  }
  ctx.restore();
}
