import { roomCatalog, type RoomCatalogItem } from '../data/roomCatalog';
import { isRoomTheme } from '../data/roomThemes';
import type {
  PlacedRoomItem,
  RoomItemId,
  RoomLayout,
  RoomRotation,
  RoomTheme,
} from '../types/room';

export const ROOM_SIZE = 8;
export const MAX_ROOM_ITEMS = 40;

export type Footprint = { width: number; depth: number };
export type RoomTile = { x: number; z: number };

const itemById = new Map<RoomItemId, RoomCatalogItem>(roomCatalog.map((item) => [item.id, item]));

export function getRoomItem(id: RoomItemId): RoomCatalogItem | undefined {
  return itemById.get(id);
}

export function isRoomItemId(value: unknown): value is RoomItemId {
  return typeof value === 'string' && itemById.has(value as RoomItemId);
}

export function defaultRoomLayout(): RoomLayout {
  return { theme: 'cozy', items: [] };
}

/** Rotate a footprint by 90° steps. Odd rotations swap width and depth. */
export function rotatedFootprint(item: RoomItemId, r: number): Footprint {
  const definition = itemById.get(item);
  if (!definition) return { width: 0, depth: 0 };
  return Math.abs(r) % 2 === 0
    ? { width: definition.width, depth: definition.depth }
    : { width: definition.depth, depth: definition.width };
}

export function footprintTiles(item: RoomItemId, x: number, z: number, r: number): RoomTile[] {
  const { width, depth } = rotatedFootprint(item, r);
  const tiles: RoomTile[] = [];
  for (let dz = 0; dz < depth; dz += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      tiles.push({ x: x + dx, z: z + dz });
    }
  }
  return tiles;
}

function tilesOverlap(a: RoomTile[], b: RoomTile[]): boolean {
  return a.some((tile) => b.some((other) => other.x === tile.x && other.z === tile.z));
}

function isValidRotation(value: number): value is RoomRotation {
  return Number.isInteger(value) && value >= 0 && value <= 3;
}

/**
 * A rug lives on the floor layer: it may share tiles with non-rug items, while
 * two rugs may not overlap. Every other item pair must keep all tiles separate.
 */
export function canPlace(
  layout: RoomLayout,
  candidate: PlacedRoomItem,
  ignoreId?: string,
): boolean {
  if (!isRoomItemId(candidate.item) || !isValidRotation(candidate.r)) return false;
  if (!Number.isInteger(candidate.x) || !Number.isInteger(candidate.z)) return false;

  const { width, depth } = rotatedFootprint(candidate.item, candidate.r);
  if (
    candidate.x < 0 ||
    candidate.z < 0 ||
    candidate.x + width > ROOM_SIZE ||
    candidate.z + depth > ROOM_SIZE
  ) {
    return false;
  }

  const candidateTiles = footprintTiles(candidate.item, candidate.x, candidate.z, candidate.r);

  return layout.items.every((existing) => {
    if (existing.id === ignoreId) return true;
    if (!isRoomItemId(existing.item) || !isValidRotation(existing.r)) return true;
    const rugPair = candidate.item === 'rug' || existing.item === 'rug';
    if (rugPair && candidate.item !== existing.item) return true;
    const existingTiles = footprintTiles(existing.item, existing.x, existing.z, existing.r);
    return !tilesOverlap(candidateTiles, existingTiles);
  });
}

function normalizePlacedItem(value: unknown): PlacedRoomItem | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || !record.id.trim()) return null;
  if (!isRoomItemId(record.item)) return null;
  if (!Number.isInteger(record.x) || !Number.isInteger(record.z)) return null;
  if (typeof record.r !== 'number' || !isValidRotation(record.r)) return null;
  return {
    id: record.id,
    item: record.item,
    x: record.x as number,
    z: record.z as number,
    r: record.r,
  };
}

/**
 * Keep only placeable items with unique ids, dropping unknown ids, invalid
 * coordinates, overlaps, duplicates and anything past the 40-item limit.
 */
export function validateRoomLayout(value: unknown): RoomLayout {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const theme: RoomTheme = isRoomTheme(record.theme) ? record.theme : 'cozy';
  const sourceItems = Array.isArray(record.items) ? record.items : [];
  const layout: RoomLayout = { theme, items: [] };

  for (const raw of sourceItems) {
    if (layout.items.length >= MAX_ROOM_ITEMS) break;
    const candidate = normalizePlacedItem(raw);
    if (!candidate) continue;
    if (layout.items.some((item) => item.id === candidate.id)) continue;
    if (!canPlace(layout, candidate)) continue;
    layout.items.push(candidate);
  }

  return layout;
}

/** Corrupt or missing saved data falls back to the default room. */
export function parseSavedRoom(json: unknown): RoomLayout {
  let value = json;
  if (typeof json === 'string') {
    try {
      value = JSON.parse(json);
    } catch {
      return defaultRoomLayout();
    }
  }
  if (!value || typeof value !== 'object') return defaultRoomLayout();
  return validateRoomLayout(value);
}
