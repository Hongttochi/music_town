import type { GroundPoint } from './residentNavigation';
export type BenchFootprint = GroundPoint & { facing: number };
/** Oriented seat/back/armrest footprint, expanded by the walking character radius. */
export function benchClearance(point: GroundPoint, bench: BenchFootprint) {
  const dx = point.x - bench.x,
    dz = point.z - bench.z;
  const x = dx * Math.cos(bench.facing) - dz * Math.sin(bench.facing);
  const z = dx * Math.sin(bench.facing) + dz * Math.cos(bench.facing);
  const edgeX = Math.abs(x) - 1.2;
  const edgeZ = Math.abs(z) - 0.49;
  return Math.hypot(Math.max(0, edgeX), Math.max(0, edgeZ)) + Math.min(0, Math.max(edgeX, edgeZ));
}

export function overlapsBench(point: GroundPoint, bench: BenchFootprint, radius = 0.45) {
  return benchClearance(point, bench) < radius;
}
/** Check the whole step; old saved positions inside furniture can move outward. */
export function blocksBenchStep(
  from: GroundPoint,
  to: GroundPoint,
  bench: BenchFootprint,
  radius = 0.35,
) {
  const start = benchClearance(from, bench);
  if (start < radius) return benchClearance(to, bench) <= start;
  const samples = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.1));
  for (let i = 1; i <= samples; i++) {
    if (
      overlapsBench(
        {
          x: from.x + ((to.x - from.x) * i) / samples,
          z: from.z + ((to.z - from.z) * i) / samples,
        },
        bench,
        radius,
      )
    )
      return true;
  }
  return false;
}
