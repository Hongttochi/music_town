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
    const samples = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1));
    for (let i = 1; i <= samples; i++)
      if (!clear({ x: a.x + ((b.x - a.x) * i) / samples, z: a.z + ((b.z - a.z) * i) / samples }))
        return false;
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

/** Recover a spawn or displaced resident inside an obstacle's exclusion area.
 * River/building boundary checks still apply; valid positions are never moved.
 */
export function residentSafePosition(
  from: GroundPoint,
  clear: (p: GroundPoint) => boolean,
  cross: (a: GroundPoint, b: GroundPoint) => boolean,
): GroundPoint | null {
  if (clear(from)) return from;
  for (let radius = 0.15; radius <= 4.05; radius += 0.15) {
    for (let direction = 0; direction < 32; direction++) {
      const angle = (direction * Math.PI) / 16;
      const point = { x: from.x + Math.cos(angle) * radius, z: from.z + Math.sin(angle) * radius };
      if (point.x < -18 || point.x > 38 || point.z < -12 || point.z > 13.5) continue;
      if (clear(point) && cross(from, point)) return point;
    }
  }
  return null;
}
