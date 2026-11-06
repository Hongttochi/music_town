export const PLAYER_RADIUS = 0.35;
export const RIVER = { left: 16, right: 24, bankPadding: 0.5 };
export const BRIDGE = { centerZ: 4.5, width: 2.6, left: 15, right: 25.3, surfaceHeight: 0.24 };
export function isOnBridge(point: { x: number; z: number }) {
  return (
    point.x >= BRIDGE.left &&
    point.x <= BRIDGE.right &&
    Math.abs(point.z - BRIDGE.centerZ) <= BRIDGE.width / 2
  );
}
type Point = { x: number; z: number };

/** The entire player's footprint must stay on the banks or inside the bridge rails. */
export function canCrossRiver(from: Point, to: Point) {
  const left = RIVER.left - RIVER.bankPadding - PLAYER_RADIUS;
  const right = RIVER.right + RIVER.bankPadding + PLAYER_RADIUS;
  const near = BRIDGE.centerZ - BRIDGE.width / 2 + PLAYER_RADIUS;
  const far = BRIDGE.centerZ + BRIDGE.width / 2 - PLAYER_RADIUS;
  if ((from.x <= left && to.x <= left) || (from.x >= right && to.x >= right)) return true;

  // Check the whole movement segment so diagonal steps cannot cut across a water corner.
  const dx = to.x - from.x;
  const enter = dx === 0 ? 0 : Math.max(0, Math.min((left - from.x) / dx, (right - from.x) / dx));
  const exit = dx === 0 ? 1 : Math.min(1, Math.max((left - from.x) / dx, (right - from.x) / dx));
  const zEnter = from.z + (to.z - from.z) * enter;
  const zExit = from.z + (to.z - from.z) * exit;
  return Math.min(zEnter, zExit) >= near && Math.max(zEnter, zExit) <= far;
}
