import type { RoomItemId } from '../types/room';

export type RoomCatalogItem = {
  id: RoomItemId;
  name: string;
  emoji: string;
  width: number;
  depth: number;
};

export const roomCatalog: readonly RoomCatalogItem[] = [
  { id: 'bed', name: '침대', emoji: '🛏️', width: 2, depth: 3 },
  { id: 'sofa', name: '소파', emoji: '🛋️', width: 3, depth: 1 },
  { id: 'chair', name: '의자', emoji: '🪑', width: 1, depth: 1 },
  { id: 'desk', name: '책상', emoji: '🗄️', width: 2, depth: 1 },
  { id: 'rug', name: '러그', emoji: '🟫', width: 3, depth: 2 },
  { id: 'plant', name: '화분', emoji: '🪴', width: 1, depth: 1 },
  { id: 'lamp', name: '스탠드 조명', emoji: '💡', width: 1, depth: 1 },
  { id: 'bookshelf', name: '책장', emoji: '📚', width: 2, depth: 1 },
  { id: 'guitar-stand', name: '기타 스탠드', emoji: '🎸', width: 1, depth: 1 },
  { id: 'speaker', name: '스피커', emoji: '🔊', width: 1, depth: 1 },
  { id: 'turntable', name: '턴테이블', emoji: '🎧', width: 1, depth: 1 },
  { id: 'poster', name: '포스터', emoji: '🖼️', width: 2, depth: 1 },
];
