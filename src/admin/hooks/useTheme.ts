import { useEffect, useState } from 'react';
import type { Theme } from '../data/themes';
import { applyTheme, loadTheme, saveTheme } from '../utils/theme';

export function useTheme() {
  const [theme, set] = useState(loadTheme);
  useEffect(() => applyTheme(theme), [theme]);
  const setTheme = (next: Theme) => {
    set(next);
    saveTheme(next);
  };
  return [theme, setTheme] as const;
}
