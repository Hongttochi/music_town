import type { Avatar } from '../../data/model';
import { drawSoftOutfit } from './avatarSoftOutfits';

/** Tailored silhouettes use the same body coordinates as every avatar view. */
export function drawOutfit(
  ctx: CanvasRenderingContext2D,
  avatar: Partial<Avatar>,
  direction: number,
) {
  const style = avatar.clothingStyle;
  if (!style || ['plain', 'stripe', 'pocket'].includes(style)) return;
  if (
    ['blouse', 'cardigan-skirt', 'ribbon-dress', 'pleated-skirt', 'aline-skirt'].includes(style)
  ) {
    drawSoftOutfit(ctx, avatar, direction);
    return;
  }
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
  if (style === 'hanbok') {
    poly(
      [
        [x - 3, 333],
        [x + width + 3, 333],
        [x + width + 18, 438],
        [x - 18, 438],
      ],
      pants,
    );
    for (const fraction of [0.2, 0.4, 0.6, 0.8]) {
      line(
        [
          [x + width * fraction, 350],
          [x - 12 + (width + 24) * fraction, 430],
        ],
        '#ffffff35',
        2,
      );
    }
    panel(x - 3, 279, width + 6, 65, shirt, 9);
    if (side) panel(237, 292, 43, 71, shirt, 13);
    else {
      poly(
        [
          [216, 287],
          [199, 289],
          [181, 355],
          [211, 366],
          [229, 318],
        ],
        shirt,
      );
      poly(
        [
          [296, 287],
          [313, 289],
          [331, 355],
          [301, 366],
          [283, 318],
        ],
        shirt,
      );
    }
    panel(x - 2, 336, width + 4, 8, '#e8cfa9', 2);
    if (!back) {
      line(
        [
          [x + 12, 282],
          [x + width - 13, 320],
          [x + width - 17, 339],
        ],
        '#fff9e9',
        6,
      );
      const tieX = x + width * 0.65;
      poly(
        [
          [tieX, 317],
          [tieX - 17, 308],
          [tieX - 15, 325],
          [tieX, 319],
          [tieX + 16, 308],
          [tieX + 18, 325],
        ],
        '#a8556e',
      );
      line(
        [
          [tieX - 2, 321],
          [tieX - 8, 351],
        ],
        '#a8556e',
        5,
      );
      line(
        [
          [tieX + 3, 321],
          [tieX + 10, 347],
        ],
        '#a8556e',
        4,
      );
    }
    ctx.restore();
    return;
  }
  if (style === 'tank') {
    // Sleeves are recolored in the source garment mask, preserving the original arm outline.
    if (!side) {
      ctx.strokeStyle = '#c7c5b780';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(233, 280);
      ctx.quadraticCurveTo(256, 324, 279, 280);
      ctx.stroke();
    }
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
    const bulky = style === 'street' || style === 'puffer' || style === 'hoodie';
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
    if (style === 'suit' || style === 'uniform') {
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
        if (style === 'uniform') {
          panel(x + width - 24, 321, 15, 17, '#c6ad72', 3);
          line(
            [
              [x + width - 20, 325],
              [x + width - 17, 333],
              [x + width - 13, 325],
            ],
            '#59647a',
            2,
          );
          panel(x + 9, 344, 19, 3, '#c6ad72', 1);
          panel(x + width / 2 - 2, 358, 4, 4, '#e8d6ab', 2);
        }
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
    } else if (style === 'street' || style === 'hoodie') {
      if (style === 'hoodie') {
        ctx.fillStyle = shirt;
        ctx.strokeStyle = '#00000025';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(
          x + width / 2,
          back ? 302 : 285,
          width * 0.48,
          back ? 27 : 15,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      }
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
