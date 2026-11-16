import type { RoomFurnitureId, RoomLayout } from '../types/room';

export type RoomFurnitureLayer = 'floor' | 'object';

export type RoomFurniture = {
  id: RoomFurnitureId;
  name: string;
  width: number;
  depth: number;
  layer: RoomFurnitureLayer;
  icon: string;
};

export const ROOM_FURNITURE: readonly RoomFurniture[] = [
  { id: 'bed', name: '침대', width: 2, depth: 3, layer: 'object', icon: '🛏️' },
  { id: 'sofa', name: '소파', width: 3, depth: 1, layer: 'object', icon: '🛋️' },
  { id: 'chair', name: '의자', width: 1, depth: 1, layer: 'object', icon: '🪑' },
  { id: 'table', name: '테이블', width: 2, depth: 2, layer: 'object', icon: '🍽️' },
  { id: 'desk', name: '책상', width: 2, depth: 1, layer: 'object', icon: '📝' },
  { id: 'lamp', name: '스탠드', width: 1, depth: 1, layer: 'object', icon: '💡' },
  { id: 'plant', name: '화분', width: 1, depth: 1, layer: 'object', icon: '🪴' },
  { id: 'rug', name: '러그', width: 3, depth: 2, layer: 'floor', icon: '🧶' },
  { id: 'bookshelf', name: '책장', width: 2, depth: 1, layer: 'object', icon: '📚' },
  { id: 'tv', name: '텔레비전', width: 2, depth: 1, layer: 'object', icon: '📺' },
  { id: 'guitar', name: '기타', width: 1, depth: 1, layer: 'object', icon: '🎸' },
  { id: 'speaker', name: '스피커', width: 1, depth: 1, layer: 'object', icon: '🔊' },
];

export const roomFurniture = ROOM_FURNITURE;

export const DEFAULT_ROOM_LAYOUT: RoomLayout = {
  items: [
    { id: 'default-bed', item: 'bed', x: 0, z: 0, r: 0 },
    { id: 'default-rug', item: 'rug', x: 2, z: 3, r: 0 },
    { id: 'default-plant', item: 'plant', x: 6, z: 0, r: 0 },
    { id: 'default-lamp', item: 'lamp', x: 6, z: 2, r: 0 },
  ],
};
