import * as T from 'three';

/** Draw once, then display as a billboard like the player avatars. */
function rabbitTexture(blinking: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  function oval(x: number, y: number, rx: number, ry: number, color: string, angle = 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  function rounded(x: number, y: number, w: number, h: number, r: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }
  // Feet sit at the same 95% canvas baseline as the human sprites.
  oval(228, 445, 17, 29, '#e8d6ba');
  oval(284, 445, 17, 29, '#e8d6ba');
  rounded(205, 463, 43, 22, 10, '#997759');
  rounded(264, 463, 43, 22, 10, '#997759');
  rounded(207, 402, 98, 36, 10, '#c1ad83');
  oval(256, 373, 59, 63, '#79956b');
  oval(207, 375, 17, 37, '#f3e6cc', 0.22);
  oval(305, 375, 17, 37, '#f3e6cc', -0.22);
  // Soft, oversized face and long ears keep the same small-body proportions.
  oval(204, 127, 29, 91, '#ddcdb3', -0.16);
  oval(308, 127, 29, 91, '#ddcdb3', 0.16);
  oval(204, 123, 26, 86, '#f8edd7', -0.16);
  oval(308, 123, 26, 86, '#f8edd7', 0.16);
  oval(204, 120, 12, 63, '#e7b9a8', -0.16);
  oval(308, 120, 12, 63, '#e7b9a8', 0.16);
  const fur = ctx.createLinearGradient(0, 190, 0, 325);
  fur.addColorStop(0, '#fff3dc');
  fur.addColorStop(1, '#ead8ba');
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(256, 252, 91, 77, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const x of [222, 290]) {
    if (blinking) {
      ctx.strokeStyle = '#524738';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 9, 254);
      ctx.quadraticCurveTo(x, 260, x + 9, 254);
      ctx.stroke();
    } else {
      oval(x, 250, 16, 20, '#fffdf4');
      oval(x + 1, 253, 10, 14, '#4b4338');
      oval(x - 2, 248, 3, 4, '#ffffff');
    }
  }
  oval(194, 278, 16, 8, '#e9bca6');
  oval(318, 278, 16, 8, '#e9bca6');
  oval(256, 273, 7, 5, '#b98b79');
  ctx.strokeStyle = '#a28167';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(256, 278);
  ctx.quadraticCurveTo(256, 292, 245, 287);
  ctx.moveTo(256, 278);
  ctx.quadraticCurveTo(256, 292, 267, 287);
  ctx.stroke();
  // A little school neckerchief and book, held between both paws.
  rounded(232, 323, 48, 12, 5, '#e4bd78');
  oval(256, 340, 7, 13, '#d5a35e', -0.35);
  rounded(219, 366, 74, 47, 5, '#a76e47');
  rounded(225, 371, 63, 35, 3, '#f4dfb5');
  rounded(251, 371, 3, 35, 1, '#d4b78e');
  oval(213, 389, 12, 15, '#f6e8cc', -0.3);
  oval(299, 389, 12, 15, '#f6e8cc', 0.3);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter;
  return texture;
}

export function createRabbitNpc(position: T.Vector3) {
  const awake = rabbitTexture(false),
    blink = rabbitTexture(true);
  const material = new T.SpriteMaterial({
    map: awake,
    transparent: true,
    alphaTest: 0.15,
    depthWrite: false,
  });
  material.toneMapped = false;
  const sprite = new T.Sprite(material);
  sprite.name = 'school-rabbit-caretaker';
  sprite.center.set(0.5, 0.05);
  sprite.scale.set(2.8, 2.8, 1);
  sprite.position.copy(position);
  return {
    sprite,
    update(time: number) {
      material.map = time % 4600 < 140 ? blink : awake;
      sprite.position.y = position.y + Math.sin(time * 0.002) * 0.018;
    },
    dispose() {
      sprite.removeFromParent();
      awake.dispose();
      blink.dispose();
      material.dispose();
    },
  };
}
