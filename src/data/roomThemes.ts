import type { RoomTheme } from '../types/room';

export type RoomThemeDefinition = {
  id: RoomTheme;
  label: string;
  floor: string;
  floorAlt: string;
  wall: string;
  accent: string;
};

export const roomThemes: readonly RoomThemeDefinition[] = [
  {
    id: 'cozy',
    label: '포근한 방',
    floor: '#e9d8b8',
    floorAlt: '#e2cfaa',
    wall: '#c9a982',
    accent: '#f2e3c6',
  },
  {
    id: 'studio',
    label: '작업실',
    floor: '#b9b2c9',
    floorAlt: '#afa7c1',
    wall: '#6f6884',
    accent: '#e4dfef',
  },
  {
    id: 'night',
    label: '밤의 방',
    floor: '#4b5a79',
    floorAlt: '#43516e',
    wall: '#2c3550',
    accent: '#93a8d6',
  },
  {
    id: 'garden',
    label: '정원 방',
    floor: '#c8d9a8',
    floorAlt: '#bed29b',
    wall: '#7c9a63',
    accent: '#e6efd2',
  },
];

export function isRoomTheme(value: unknown): value is RoomTheme {
  return roomThemes.some((theme) => theme.id === value);
}
