import type { MutableRefObject } from 'react';
import type { Avatar } from '../data/model';
import type { Position } from './park';

export type RoomFurnitureId =
  | 'bed'
  | 'sofa'
  | 'chair'
  | 'table'
  | 'desk'
  | 'lamp'
  | 'plant'
  | 'rug'
  | 'bookshelf'
  | 'tv'
  | 'guitar'
  | 'speaker';

export type RoomRotation = 0 | 1 | 2 | 3;

export type PlacedFurniture = {
  id: string;
  item: RoomFurnitureId;
  x: number;
  z: number;
  r: RoomRotation;
};

export type RoomLayout = {
  items: PlacedFurniture[];
};

export type RoomMode = 'walk' | 'decorate';

export type RoomGhost = {
  item: RoomFurnitureId;
  x: number;
  z: number;
  r: RoomRotation;
  ok: boolean;
};

export type RoomSceneProps = {
  avatar: Avatar;
  layout: RoomLayout;
  ghost: RoomGhost | null;
  selectedId: string | null;
  movingId: string | null;
  mode: RoomMode;
  paused?: boolean;
  motion: MutableRefObject<Position>;
  avatarTile: MutableRefObject<RoomTile>;
  onAvatarTap: () => void;
  onSelectItem: (id: string) => void;
  onFloorTap: (x: number, z: number) => void;
  onHoverTile: (x: number, z: number) => void;
  onReady?: () => void;
};

export type RoomTile = { x: number; z: number };
