import { DEFAULT_ROOM_LAYOUT, ROOM_FURNITURE, type RoomFurniture } from '../data/roomFurniture';
import type { PlacedFurniture, RoomFurnitureId, RoomLayout, RoomRotation } from '../types/room';

export const ROOM_SIZE = 8;
export const MAX_ROOM_ITEMS = 40;

const HALF_ROOM = ROOM_SIZE / 2;
const FURNITURE_BY_ID = new Map<string, RoomFurniture>(
  ROOM_FURNITURE.map((furniture) => [furniture.id, furniture]),
);

export type RoomTile = { x: number; z: number };
export type WorldRect = { minX: number; maxX: number; minZ: number; maxZ: number };
export type CanPlaceOptions = {
  ignoreId?: string;
  blockedTiles?: readonly RoomTile[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRoomRotation(value: unknown): value is RoomRotation {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

export function findRoomFurniture(id: string): RoomFurniture | undefined {
  return FURNITURE_BY_ID.get(id);
}

export function isRoomFurnitureId(value: unknown): value is RoomFurnitureId {
  return typeof value === 'string' && FURNITURE_BY_ID.has(value);
}

export function rotatedFootprint(
  item: RoomFurniture | RoomFurnitureId,
  r: RoomRotation,
): { width: number; depth: number } {
  const furniture = typeof item === 'string' ? FURNITURE_BY_ID.get(item) : item;
  if (!furniture) throw new Error(`Unknown room furniture: ${String(item)}`);
  return r % 2 === 1
    ? { width: furniture.depth, depth: furniture.width }
    : { width: furniture.width, depth: furniture.depth };
}

function footprintBounds(placed: PlacedFurniture) {
  const furniture = FURNITURE_BY_ID.get(placed.item);
  if (!furniture) return null;
  const { width, depth } = rotatedFootprint(furniture, placed.r);
  return { x: placed.x, z: placed.z, width, depth };
}

function footprintsOverlap(
  a: { x: number; z: number; width: number; depth: number },
  b: { x: number; z: number; width: number; depth: number },
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.z < b.z + b.depth && a.z + a.depth > b.z;
}

function isInsideRoom(placed: PlacedFurniture, bounds: { width: number; depth: number }) {
  return (
    Number.isInteger(placed.x) &&
    Number.isInteger(placed.z) &&
    placed.x >= 0 &&
    placed.z >= 0 &&
    placed.x + bounds.width <= ROOM_SIZE &&
    placed.z + bounds.depth <= ROOM_SIZE
  );
}

export function footprintTiles(placed: PlacedFurniture): RoomTile[] {
  const bounds = footprintBounds(placed);
  if (!bounds) return [];
  const tiles: RoomTile[] = [];
  for (let z = placed.z; z < placed.z + bounds.depth; z++) {
    for (let x = placed.x; x < placed.x + bounds.width; x++) tiles.push({ x, z });
  }
  return tiles;
}

export function canPlace(
  layout: RoomLayout,
  candidate: PlacedFurniture,
  { ignoreId, blockedTiles = [] }: CanPlaceOptions = {},
): boolean {
  const candidateItem = FURNITURE_BY_ID.get(candidate.item);
  if (!candidateItem) return false;
  if (!isRoomRotation(candidate.r)) return false;
  const candidateBounds = footprintBounds(candidate);
  if (!candidateBounds || !isInsideRoom(candidate, candidateBounds)) return false;
  const blocked = new Set(blockedTiles.map((tile) => `${tile.x},${tile.z}`));
  for (let z = candidate.z; z < candidate.z + candidateBounds.depth; z++) {
    for (let x = candidate.x; x < candidate.x + candidateBounds.width; x++) {
      if (blocked.has(`${x},${z}`)) return false;
    }
  }
  for (const existing of layout.items) {
    if (existing.id === ignoreId) continue;
    const existingItem = FURNITURE_BY_ID.get(existing.item);
    if (!existingItem) continue;
    const sameLayer =
      candidateItem.layer === 'floor'
        ? existingItem.layer === 'floor'
        : existingItem.layer === 'object';
    if (!sameLayer) continue;
    const existingBounds = footprintBounds(existing);
    if (existingBounds && footprintsOverlap(candidateBounds, existingBounds)) return false;
  }
  return true;
}

export function findFreePlacement(
  layout: RoomLayout,
  item: RoomFurnitureId,
  r: RoomRotation,
  { ignoreId, blockedTiles = [] }: CanPlaceOptions = {},
): RoomTile | null {
  const center = (ROOM_SIZE - 1) / 2;
  const spots: Array<RoomTile & { distance: number }> = [];
  for (let z = 0; z < ROOM_SIZE; z++) {
    for (let x = 0; x < ROOM_SIZE; x++) {
      spots.push({ x, z, distance: Math.hypot(x - center, z - center) });
    }
  }
  spots.sort((a, b) => a.distance - b.distance || a.z - b.z || a.x - b.x);
  for (const spot of spots) {
    const candidate: PlacedFurniture = {
      id: ignoreId ?? '__new__',
      item,
      x: spot.x,
      z: spot.z,
      r,
    };
    if (canPlace(layout, candidate, { ignoreId, blockedTiles })) {
      return { x: spot.x, z: spot.z };
    }
  }
  return null;
}

export function validateRoomLayout(value: unknown): RoomLayout {
  const source = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.items)
      ? value.items
      : [];
  const items: PlacedFurniture[] = [];
  const ids = new Set<string>();
  for (const raw of source) {
    if (items.length >= MAX_ROOM_ITEMS) break;
    if (!isRecord(raw)) continue;
    const { id, item, x, z, r } = raw;
    if (typeof id !== 'string' || id.length === 0) continue;
    if (!isRoomFurnitureId(item) || !isRoomRotation(r)) continue;
    if (typeof x !== 'number' || typeof z !== 'number') continue;
    const placed: PlacedFurniture = { id, item, x, z, r };
    const bounds = footprintBounds(placed);
    if (!bounds || !isInsideRoom(placed, bounds)) continue;
    if (ids.has(id)) continue;
    const furniture = FURNITURE_BY_ID.get(item)!;
    const overlaps = items.some((existing) => {
      const existingFurniture = FURNITURE_BY_ID.get(existing.item)!;
      const sameLayer =
        furniture.layer === 'floor'
          ? existingFurniture.layer === 'floor'
          : existingFurniture.layer === 'object';
      if (!sameLayer) return false;
      const existingBounds = footprintBounds(existing)!;
      return footprintsOverlap(bounds, existingBounds);
    });
    if (overlaps) continue;
    ids.add(id);
    items.push(placed);
  }
  return { items };
}

function defaultLayout(): RoomLayout {
  return { items: DEFAULT_ROOM_LAYOUT.items.map((item) => ({ ...item })) };
}

export function parseSavedRoom(json: unknown): RoomLayout {
  if (!json) return defaultLayout();
  let value: unknown = json;
  if (typeof json === 'string') {
    try {
      value = JSON.parse(json);
    } catch {
      return defaultLayout();
    }
  }
  if (!isRecord(value) || !Array.isArray(value.items)) return defaultLayout();
  const layout = validateRoomLayout(value);
  if (value.items.length > 0 && layout.items.length === 0) return defaultLayout();
  return layout;
}

export function tileToWorld(x: number, z: number): { x: number; z: number } {
  return { x: x - HALF_ROOM + 0.5, z: z - HALF_ROOM + 0.5 };
}

export function worldToTile(wx: number, wz: number): RoomTile {
  return { x: Math.floor(wx + HALF_ROOM), z: Math.floor(wz + HALF_ROOM) };
}

export function blockingRects(layout: RoomLayout): WorldRect[] {
  const rects: WorldRect[] = [];
  for (const placed of layout.items) {
    const furniture = FURNITURE_BY_ID.get(placed.item);
    if (!furniture || furniture.layer !== 'object') continue;
    const { width, depth } = rotatedFootprint(furniture, placed.r);
    rects.push({
      minX: placed.x - HALF_ROOM,
      maxX: placed.x - HALF_ROOM + width,
      minZ: placed.z - HALF_ROOM,
      maxZ: placed.z - HALF_ROOM + depth,
    });
  }
  return rects;
}

export function collidesCircle(
  rects: readonly WorldRect[],
  x: number,
  z: number,
  radius: number,
): boolean {
  return rects.some((rect) => {
    const nearestX = Math.max(rect.minX, Math.min(x, rect.maxX));
    const nearestZ = Math.max(rect.minZ, Math.min(z, rect.maxZ));
    const dx = x - nearestX;
    const dz = z - nearestZ;
    return dx * dx + dz * dz <= radius * radius;
  });
}

export function clampToRoom(x: number, z: number, radius: number): { x: number; z: number } {
  const limit = Math.max(0, HALF_ROOM - radius);
  return {
    x: Math.max(-limit, Math.min(limit, x)),
    z: Math.max(-limit, Math.min(limit, z)),
  };
}
