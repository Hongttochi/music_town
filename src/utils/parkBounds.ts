import type { Position } from '../types/park';

// Keep the client within the previously supported multiplayer area until the
// production RPC's coordinate constraints can be migrated together with the map.
export const PARK_BOUNDS = { left: 240, right: 1650, top: 150, bottom: 790 };
export function clampParkPosition(position: Position): Position {
  return {
    x: Math.max(PARK_BOUNDS.left, Math.min(PARK_BOUNDS.right, position.x)),
    y: Math.max(PARK_BOUNDS.top, Math.min(PARK_BOUNDS.bottom, position.y)),
  };
}
