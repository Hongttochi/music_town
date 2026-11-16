import type { Stage } from './model';
export const BAR_STAGE_ID = 6;
export const barStage: Stage = {
  id: BAR_STAGE_ID,
  name: '문나잇 바 라이브',
  x: 1587.5,
  y: 235,
  artist: '',
  genre: '빈 자리',
  bio: '',
  followers: 0,
  listeners: 0,
  color: '#b78a66',
};
export const barDrinks = [
  { id: 'grape', name: '포도주스', detail: '달콤한 포도 향', icon: '🍇', color: '#824c99' },
  { id: 'cola', name: '콜라', detail: '시원하고 톡 쏘는 맛', icon: '🥤', color: '#603b29' },
  { id: 'soda', name: '사이다', detail: '맑고 청량한 탄산', icon: '🥤', color: '#d5eee5' },
  {
    id: 'orange',
    name: '오렌지 주스',
    detail: '상큼한 오렌지 향',
    icon: '🍊',
    color: '#f3a633',
  },
] as const;
export type BarDrinkId = (typeof barDrinks)[number]['id'];
