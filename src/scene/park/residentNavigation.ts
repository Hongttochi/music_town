export type GroundPoint = { x: number; z: number };
/** Bounded grid search; every edge is checked, including diagonals and the final approach. */
export function residentRoute(
  from: GroundPoint,
  to: GroundPoint,
  clear: (p: GroundPoint) => boolean,
  cross: (a: GroundPoint, b: GroundPoint) => boolean,
): GroundPoint[] | null {
  const step = 0.75;
  const key = (p: GroundPoint) => `${Math.round(p.x / step)},${Math.round(p.z / step)}`;
  const snap = (p: GroundPoint) => ({
    x: Math.round(p.x / step) * step,
    z: Math.round(p.z / step) * step,
  });
  const safeEdge = (a: GroundPoint, b: GroundPoint) => {
    if (!cross(a, b)) return false;
    for (let i = 1; i <= 4; i++)
      if (!clear({ x: a.x + ((b.x - a.x) * i) / 4, z: a.z + ((b.z - a.z) * i) / 4 })) return false;
    return true;
  };
  const start = snap(from);
  const queue: GroundPoint[] = [from];
  const parents = new Map<string, GroundPoint | null>([[key(from), null]]);
  for (let index = 0; index < queue.length && index < 6500; index++) {
    const current = queue[index];
    if (Math.hypot(current.x - to.x, current.z - to.z) <= 1.1 && safeEdge(current, to)) {
      const route = [to];
      let point: GroundPoint | null = current;
      while (point && parents.get(key(point))) {
        route.push(point);
        point = parents.get(key(point))!;
      }
      return route.reverse();
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const base = index === 0 ? start : current;
      const next = { x: base.x + dx * step, z: base.z + dz * step };
      if (
        next.x < -18 ||
        next.x > 38 ||
        next.z < -12 ||
        next.z > 13.5 ||
        parents.has(key(next)) ||
        !safeEdge(current, next)
      )
        continue;
      parents.set(key(next), current);
      queue.push(next);
    }
  }
  return null;
}
