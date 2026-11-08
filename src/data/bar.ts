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
  { id: 'beer', name: '생맥주', detail: '시원한 한 잔', icon: '🍺', color: '#e5b750' },
  { id: 'wine', name: '레드 와인', detail: '깊고 부드러운 향', icon: '🍷', color: '#963e53' },
  { id: 'whisky', name: '위스키', detail: '은은한 오크 향', icon: '🥃', color: '#b97935' },
  {
    id: 'mocktail',
    name: '달빛 에이드',
    detail: '알코올 없는 산뜻한 한 잔',
    icon: '🍹',
    color: '#83bba1',
  },
] as const;
export type BarDrinkId = (typeof barDrinks)[number]['id'];
