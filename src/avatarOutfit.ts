import type { Avatar } from './model';

/** Tailored silhouettes use the same body coordinates as every avatar view. */
export function drawOutfit(
  ctx: CanvasRenderingContext2D,
  avatar: Partial<Avatar>,
  direction: number,
) {
  const style = avatar.clothingStyle;
  if (!style || ['plain', 'stripe', 'pocket'].includes(style)) return;
  const side = direction === 1 || direction === 3,
    back = direction === 2;
  const x = side ? 236 : 214,
    width = side ? 48 : 84;
  const shirt = avatar.shirt || '#758d82',
    pants = avatar.pants || '#536b83';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const panel = (px: number, py: number, w: number, h: number, color: string, r = 8) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(px, py, w, h, r);
    ctx.fill();
  };
  const line = (points: number[][], color: string, weight = 3) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.beginPath();
    points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
  };
  const poly = (points: number[][], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
  };
  if (!['dress', 'tank'].includes(style)) {
    // Cover the whole original shorts silhouette before extending each leg to the shoes.
    // A shared hip section prevents exposed short hems beside narrow trouser legs.
    if (side) {
      const hipX = direction === 1 ? 235 : 231;
      panel(hipX, 362, 51, 40, pants, 8);
      panel(hipX + 2, 389, 47, 60, pants, 5);
      line(
        [
          [hipX + 42, 397],
          [hipX + 42, 440],
        ],
        '#00000018',
        2,
      );
      line(
        [
          [hipX + 6, 444],
          [hipX + 44, 444],
        ],
        '#ffffff24',
        2,
      );
    } else {
      panel(211, 362, 90, 38, pants, 9);
      panel(216, 387, 38, 62, pants, 5);
      panel(258, 387, 38, 62, pants, 5);
      line(
        [
          [254, 392],
          [254, 442],
        ],
        '#00000020',
        2,
      );
      line(
        [
          [219, 444],
          [250, 444],
        ],
        '#ffffff24',
        2,
      );
      line(
        [
          [262, 444],
          [293, 444],
        ],
        '#ffffff24',
        2,
      );
    }
  }
  if (style === 'tank') {
    // Cover the old sleeves with the selected skin before drawing narrow shoulder straps.
    const skin = avatar.skinTone || '#f3c79f';
    if (side) panel(239, 295, 35, 65, skin, 14);
    else {
      panel(199, 295, 29, 60, skin, 14);
      panel(286, 295, 29, 60, skin, 14);
    }
    panel(x + 5, 297, width - 10, 69, shirt, 8);
    panel(x + 5, 280, 13, 32, shirt, 5);
    panel(x + width - 18, 280, 13, 32, shirt, 5);
    if (!back)
      line(
        [
          [x + 18, 289],
          [x + width / 2, 305],
          [x + width - 18, 289],
        ],
        '#c7c5b7',
        2,
      );
  } else if (style === 'dress' || style === 'monk') {
    panel(x, 282, width, 77, shirt, 12);
    poly(
      [
        [x + 5, 338],
        [x + width - 5, 338],
        [x + width + 19, 427],
        [x - 19, 427],
      ],
      shirt,
    );
    line(
      [
        [x - 14, 421],
        [x + width + 14, 421],
      ],
      '#ffffff60',
      3,
    );
    if (style === 'dress') {
      panel(x, 337, width, 9, '#e9d9af', 3);
      for (const offset of [0.25, 0.5, 0.75])
        line(
          [
            [x + width * offset, 360],
            [x - 8 + (width + 16) * offset, 414],
          ],
          '#ffffff45',
          2,
        );
      if (!back)
        poly(
          [
            [x + width / 2, 341],
            [x + width / 2 - 14, 331],
            [x + width / 2 - 14, 351],
            [x + width / 2, 341],
            [x + width / 2 + 14, 331],
            [x + width / 2 + 14, 351],
          ],
          '#f1d8b7',
        );
    } else {
      if (!back) {
        poly(
          [
            [x + 8, 281],
            [x + width - 3, 322],
            [x + width - 9, 350],
            [x + 1, 304],
          ],
          '#c7c9bc',
        );
        line(
          [
            [x + 8, 281],
            [x + width - 3, 322],
            [x + width - 9, 350],
          ],
          '#737e75',
          3,
        );
      }
      panel(x, 344, width, 9, '#737e75', 3);
    }
  } else {
    const bulky = style === 'street' || style === 'puffer';
    panel(
      x - (bulky ? 7 : 0),
      280,
      width + (bulky ? 14 : 0),
      bulky ? 99 : 89,
      shirt,
      bulky ? 15 : 9,
    );
    if (side) panel(241, 294, 35, 63, shirt, 12);
    else {
      panel(195, 294, 29, 67, shirt, 12);
      panel(288, 294, 29, 67, shirt, 12);
    }
    if (style === 'suit') {
      if (!back) {
        poly(
          [
            [x + 14, 280],
            [x + width - 14, 280],
            [x + width / 2, 334],
          ],
          '#f4eee1',
        );
        poly(
          [
            [x + width / 2, 291],
            [x + width / 2 - 6, 308],
            [x + width / 2, 334],
            [x + width / 2 + 6, 308],
          ],
          '#b26c6d',
        );
        line(
          [
            [x + 5, 283],
            [x + 19, 310],
            [x + 12, 318],
            [x + width / 2, 343],
          ],
          '#b1b9c1',
          3,
        );
        line(
          [
            [x + width - 5, 283],
            [x + width - 19, 310],
            [x + width - 12, 318],
            [x + width / 2, 343],
          ],
          '#b1b9c1',
          3,
        );
        panel(x + width / 2 - 2, 345, 4, 4, '#e8d6ab', 2);
      }
    } else if (style === 'shirt') {
      if (!back) {
        poly(
          [
            [x + 10, 280],
            [x + width / 2, 297],
            [x + width / 2 - 9, 310],
          ],
          '#f2f0df',
        );
        poly(
          [
            [x + width - 10, 280],
            [x + width / 2, 297],
            [x + width / 2 + 9, 310],
          ],
          '#f2f0df',
        );
        line(
          [
            [x + width / 2, 298],
            [x + width / 2, 365],
          ],
          '#6a8287',
          2,
        );
        for (let y = 312; y < 364; y += 14) panel(x + width / 2 - 2, y, 4, 4, '#f6f3df', 2);
      }
    } else if (style === 'puffer') {
      for (let y = 302; y < 376; y += 19)
        line(
          [
            [x - 3, y],
            [x + width + 3, y],
          ],
          '#344e4455',
          3,
        );
      if (!back)
        line(
          [
            [x + width / 2, 284],
            [x + width / 2, 375],
          ],
          '#dfdfd2',
          3,
        );
      panel(x - 2, 277, width + 4, 16, shirt, 7);
    } else if (style === 'street') {
      line(
        [
          [x + 5, 284],
          [x + width / 2, 307],
          [x + width - 5, 284],
        ],
        '#d1c8db',
        6,
      );
      if (!back) {
        line(
          [
            [x + width / 2 - 10, 300],
            [x + width / 2 - 10, 325],
          ],
          '#e9dfcf',
          2,
        );
        line(
          [
            [x + width / 2 + 10, 300],
            [x + width / 2 + 10, 325],
          ],
          '#e9dfcf',
          2,
        );
        panel(x + 10, 342, width - 20, 18, '#00000022', 6);
      }
      panel(x - 4, 371, width + 8, 8, '#00000022', 3);
    }
  }
  ctx.restore();
}
