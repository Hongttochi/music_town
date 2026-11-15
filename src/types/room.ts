export type RoomTheme = 'cozy' | 'studio' | 'night' | 'garden';

export type RoomItemId =
  | 'bed'
  | 'sofa'
  | 'chair'
  | 'desk'
  | 'rug'
  | 'plant'
  | 'lamp'
  | 'bookshelf'
  | 'guitar-stand'
  | 'speaker'
  | 'turntable'
  | 'poster';

export type RoomRotation = 0 | 1 | 2 | 3;

export type PlacedRoomItem = {
  id: string;
  item: RoomItemId;
  x: number;
  z: number;
  r: RoomRotation;
};

export type RoomLayout = {
  theme: RoomTheme;
  items: PlacedRoomItem[];
};
