export type Theme = {
  mode: 'dark' | 'light';
  bg: string;
  glow1: string;
  glow2: string;
  glow: number; // percent, 0-150
  frame1: string;
  frame2: string;
  angle: number; // deg
  card: string;
  cardTint: number; // percent, 0-100
  acc1: string;
  acc2: string;
};

const p = (id: string, name: string, theme: Theme) => ({ id, name, theme });
export const presets = [
  p('graphite', '그래파이트', {
    mode: 'dark',
    bg: '#09090b',
    glow1: '#5a6075',
    glow2: '#2a6f9e',
    glow: 60,
    frame1: '#262932',
    frame2: '#0b0c0f',
    angle: 180,
    card: '#4a5062',
    cardTint: 16,
    acc1: '#a3add0',
    acc2: '#6c7796',
  }),
  p('white', '화이트', {
    mode: 'light',
    bg: '#eceff4',
    glow1: '#c7d2ff',
    glow2: '#ffe0cc',
    glow: 70,
    frame1: '#ffffff',
    frame2: '#f3f5f9',
    angle: 180,
    card: '#ffffff',
    cardTint: 90,
    acc1: '#5b7bff',
    acc2: '#3456f0',
  }),
  p('midnight', '미드나잇', {
    mode: 'dark',
    bg: '#040820',
    glow1: '#344eff',
    glow2: '#1e8cdc',
    glow: 100,
    frame1: '#142282',
    frame2: '#060a2e',
    angle: 160,
    card: '#2a3ec4',
    cardTint: 20,
    acc1: '#6481ff',
    acc2: '#3d5bff',
  }),
  p('aurora', '오로라', {
    mode: 'dark',
    bg: '#03110f',
    glow1: '#19d3a0',
    glow2: '#7b4dff',
    glow: 90,
    frame1: '#0d4140',
    frame2: '#040f14',
    angle: 150,
    card: '#1e9a80',
    cardTint: 18,
    acc1: '#45e8b8',
    acc2: '#14a487',
  }),
  p('sunset', '노을', {
    mode: 'dark',
    bg: '#170610',
    glow1: '#ff6a3d',
    glow2: '#c2387a',
    glow: 85,
    frame1: '#4f1631',
    frame2: '#12050c',
    angle: 170,
    card: '#b23f60',
    cardTint: 18,
    acc1: '#ff8f62',
    acc2: '#e8456f',
  }),
  p('park', '공원', {
    mode: 'dark',
    bg: '#06120b',
    glow1: '#5fae6e',
    glow2: '#d8a174',
    glow: 70,
    frame1: '#1d4630',
    frame2: '#07120b',
    angle: 160,
    card: '#3f8a5b',
    cardTint: 18,
    acc1: '#86d394',
    acc2: '#3f9a5a',
  }),
  p('moonnight', '문나잇 바', {
    mode: 'dark',
    bg: '#0b0620',
    glow1: '#7a4dff',
    glow2: '#ff7ad0',
    glow: 95,
    frame1: '#2c1868',
    frame2: '#0a0520',
    angle: 145,
    card: '#6040d8',
    cardTint: 20,
    acc1: '#ae93ff',
    acc2: '#7a4dff',
  }),
];
export const defaultTheme = presets[0].theme;
