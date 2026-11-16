import type { Position } from '../types/park';

// Deploy 202611160002_expanded_park.sql before the expanded-map client.
export const PARK_BOUNDS = { left: 100, right: 1800, top: -200, bottom: 1000 };
export function clampParkPosition(position: Position): Position {
  return {
    x: Math.max(PARK_BOUNDS.left, Math.min(PARK_BOUNDS.right, position.x)),
    y: Math.max(PARK_BOUNDS.top, Math.min(PARK_BOUNDS.bottom, position.y)),
  };
}
