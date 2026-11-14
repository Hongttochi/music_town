// Generated sheets have uneven row spacing. Extract connected silhouettes instead
// of dividing the sheet into equal rectangles (which can cut feet into the next row).
const cache = new WeakMap<HTMLImageElement, Map<number, HTMLCanvasElement[]>>();

export function residentFrameCanvas(image: HTMLImageElement, column: number, rows: number) {
  let columns = cache.get(image);
  if (!columns) cache.set(image, (columns = new Map()));
  const key = column * 10 + rows;
  const cached = columns.get(key);
  if (cached) return cached;
  const x = Math.floor((image.width * column) / 4);
  const width = Math.floor((image.width * (column + 1)) / 4) - x;
  const height = image.height;
  const source = document.createElement('canvas');
  source.width = width;
  source.height = height;
  const context = source.getContext('2d')!;
  context.drawImage(image, x, 0, width, height, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  const labels = new Int32Array(width * height);
  const queue = new Int32Array(labels.length);
  const components: {
    id: number;
    mass: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
  }[] = [];
  let id = 0;
  for (let seed = 0; seed < labels.length; seed++) {
    if (labels[seed] || pixels.data[seed * 4 + 3] < 100) continue;
    id++;
    let read = 0,
      count = 1;
    queue[0] = seed;
    labels[seed] = id;
    let left = width,
      right = 0,
      top = height,
      bottom = 0;
    while (read < count) {
      const index = queue[read++],
        cx = index % width,
        cy = Math.floor(index / width);
      left = Math.min(left, cx);
      right = Math.max(right, cx);
      top = Math.min(top, cy);
      bottom = Math.max(bottom, cy);
      const visit = (next: number) => {
        if (labels[next] || pixels.data[next * 4 + 3] < 100) return;
        labels[next] = id;
        queue[count++] = next;
      };
      if (cx > 0) visit(index - 1);
      if (cx + 1 < width) visit(index + 1);
      if (cy > 0) visit(index - width);
      if (cy + 1 < height) visit(index + width);
    }
    components.push({ id, mass: count, left, right, top, bottom });
  }
  const frames = components
    .sort((a, b) => b.mass - a.mass)
    .slice(0, rows)
    .sort((a, b) => a.top - b.top)
    .map((part) => {
      const canvas = document.createElement('canvas');
      canvas.width = part.right - part.left + 1;
      canvas.height = part.bottom - part.top + 1;
      const ctx = canvas.getContext('2d')!;
      const output = ctx.createImageData(canvas.width, canvas.height);
      for (let y = part.top; y <= part.bottom; y++)
        for (let x = part.left; x <= part.right; x++) {
          const index = y * width + x;
          // Preserve the soft edge, but never include a neighboring figure.
          const belongs =
            labels[index] === part.id ||
            (!labels[index] &&
              ((x > 0 && labels[index - 1] === part.id) ||
                (x + 1 < width && labels[index + 1] === part.id) ||
                (y > 0 && labels[index - width] === part.id) ||
                (y + 1 < height && labels[index + width] === part.id)));
          if (belongs)
            output.data.set(
              pixels.data.subarray(index * 4, index * 4 + 4),
              ((y - part.top) * canvas.width + x - part.left) * 4,
            );
        }
      ctx.putImageData(output, 0, 0);
      return canvas;
    });
  columns.set(key, frames);
  return frames;
}
