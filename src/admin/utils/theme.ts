import { readSaved } from '../../utils/storage';
import { defaultTheme, type Theme } from '../data/themes';

// v1 saved the theme on every open, so a new default never reached returning viewers.
// v2 is written only when someone changes the theme.
const KEY = 'mt-admin-theme-v2';

export function loadTheme(): Theme {
  const saved = readSaved<Partial<Theme> | null>(KEY, null);
  return saved && typeof saved === 'object' ? { ...defaultTheme, ...saved } : defaultTheme;
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, JSON.stringify(theme));
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this visit.
  }
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  const s = root.style;
  root.dataset.mode = t.mode;
  s.setProperty('--t-bg', t.bg);
  s.setProperty('--t-glow1', t.glow1);
  s.setProperty('--t-glow2', t.glow2);
  s.setProperty('--t-glow-o', String(t.glow / 100));
  s.setProperty('--t-frame1', t.frame1);
  s.setProperty('--t-frame2', t.frame2);
  s.setProperty('--t-frame-angle', `${t.angle}deg`);
  s.setProperty('--t-card', t.card);
  s.setProperty('--t-card-a', `${t.cardTint}%`);
  s.setProperty('--t-card-b', `${Math.round(t.cardTint * 0.7)}%`);
  s.setProperty('--t-acc1', t.acc1);
  s.setProperty('--t-acc2', t.acc2);
}
