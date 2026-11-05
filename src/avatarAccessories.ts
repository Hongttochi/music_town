import type { Avatar } from './model';

/** Accessories share the avatar's 512px coordinate space in all four views. */
export function drawAccessories(
  ctx: CanvasRenderingContext2D,
  avatar: Partial<Avatar>,
  direction: number,
) {
  const side = direction === 1 || direction === 3;
  const back = direction === 2;
  const right = direction === 1;
  const box = (x: number, y: number, w: number, h: number, radius: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
    ctx.stroke();
  };
  ctx.save();
  ctx.strokeStyle = '#48575c';
  ctx.lineWidth = 4;
  if (avatar.bag && avatar.bag !== 'none') {
    const backpack = avatar.bag === 'backpack';
    ctx.strokeStyle = '#655340';
    ctx.lineWidth = 9;
    if (backpack) {
      for (const x of side ? [right ? 249 : 263] : [221, 291]) {
        ctx.beginPath();
        ctx.moveTo(x, 280);
        ctx.quadraticCurveTo(x - 13, 320, x, 367);
        ctx.stroke();
      }
      if (back || side) {
        ctx.strokeStyle = '#4b6565';
        ctx.lineWidth = 4;
        const x = side ? (right ? 194 : 272) : 207;
        box(x, 287, side ? 46 : 98, 112, 22, '#79a5a0');
        box(x + 6, 344, side ? 34 : 86, 44, 12, '#aac2b3');
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(side ? 256 : 215, 277);
      ctx.lineTo(side ? (right ? 285 : 227) : 302, 377);
      ctx.stroke();
      if (!back) {
        ctx.strokeStyle = '#856449';
        ctx.lineWidth = 4;
        box(side ? (right ? 269 : 191) : 278, 355, side ? 51 : 69, 62, 13, '#c99c6b');
        ctx.beginPath();
        ctx.moveTo(side ? (right ? 276 : 198) : 287, 376);
        ctx.lineTo(side ? (right ? 310 : 232) : 338, 376);
        ctx.stroke();
      }
    }
  }
  if (avatar.headwear && avatar.headwear !== 'none') {
    const beanie = avatar.headwear === 'beanie';
    const bucket = avatar.headwear === 'bucket';
    ctx.strokeStyle = beanie ? '#8e5965' : '#455a6b';
    ctx.lineWidth = 4;
    ctx.fillStyle = beanie ? '#ca8795' : bucket ? '#d5c69a' : '#738fa6';
    ctx.beginPath();
    ctx.moveTo(124, 133);
    ctx.bezierCurveTo(126, 11, 377, 11, 388, 133);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (beanie) {
      box(121, 112, 270, 36, 13, '#dba0aa');
      ctx.lineWidth = 2;
      for (let x = 137; x < 385; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, 119);
        ctx.lineTo(x, 142);
        ctx.stroke();
      }
      box(278, 119, 27, 21, 4, '#f3dfc8');
    } else if (bucket) {
      ctx.fillStyle = '#c9b888';
      ctx.beginPath();
      ctx.moveTo(126, 117);
      ctx.lineTo(101, 159);
      ctx.quadraticCurveTo(256, 181, 412, 159);
      ctx.lineTo(386, 117);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const brimX = side ? (right ? 317 : 91) : 172;
      if (!back) box(brimX, 119, side ? 106 : 168, 24, 12, '#4d667e');
      else box(224, 112, 64, 23, 9, '#344657');
      if (!side && !back) box(241, 73, 30, 28, 7, '#e7d6ab');
    }
  }
  if (avatar.eyewear && avatar.eyewear !== 'none') {
    ctx.strokeStyle = '#43474e';
    ctx.lineWidth = 6;
    const dark = avatar.eyewear === 'sunglasses';
    if (!back) {
      for (const x of side ? [right ? 321 : 145] : [184, 267]) {
        ctx.fillStyle = dark ? '#394959' : 'rgba(203,231,232,0.22)';
        ctx.beginPath();
        ctx.roundRect(x, 173, side ? 45 : 61, 43, dark ? 9 : 18);
        ctx.fill();
        ctx.stroke();
        if (dark) {
          ctx.strokeStyle = '#8799a5';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + 10, 183);
          ctx.lineTo(x + 23, 183);
          ctx.stroke();
          ctx.strokeStyle = '#43474e';
          ctx.lineWidth = 6;
        }
      }
      ctx.beginPath();
      ctx.moveTo(side ? (right ? 320 : 190) : 245, 188);
      ctx.lineTo(side ? (right ? 242 : 270) : 267, 188);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(134, 183);
      ctx.lineTo(147, 195);
      ctx.moveTo(365, 195);
      ctx.lineTo(379, 183);
      ctx.stroke();
    }
  }
  if (avatar.earwear === 'headset') {
    ctx.strokeStyle = '#485460';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.ellipse(256, 164, 134, 115, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#c6d2d3';
    ctx.lineWidth = 4;
    for (const x of side ? [right ? 221 : 277] : [115, 370]) {
      box(x, 178, 30, 61, 13, '#596e82');
      box(x + 6, 190, 18, 36, 8, '#8fa9b5');
    }
  } else if (avatar.earwear === 'airpods') {
    ctx.strokeStyle = '#bbc7c8';
    ctx.lineWidth = 2;
    for (const x of side ? [right ? 224 : 278] : [126, 375]) {
      box(x, 212, 10, 39, 5, '#faf9f0');
      box(x - 4, 207, 18, 14, 7, '#ffffff');
    }
  }
  ctx.restore();
}
