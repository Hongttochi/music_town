export type ResidentFacing = { side: number; back: boolean };

export function residentFacing(dx: number, dz: number, previous: ResidentFacing): ResidentFacing {
  if (Math.hypot(dx, dz) <= 0.001) return previous;
  if (Math.abs(dx) > Math.abs(dz) * 1.1) return { side: Math.sign(dx), back: false };
  return { side: 0, back: dz < 0 };
}

/** Use the seat's orientation rather than the last approach direction. */
export function residentSeatFacing(angle: number): ResidentFacing {
  const x = Math.sin(angle),
    z = Math.cos(angle);
  return Math.abs(x) > Math.abs(z)
    ? { side: x > 0 ? 1 : -1, back: false }
    : { side: 0, back: z < 0 };
}
