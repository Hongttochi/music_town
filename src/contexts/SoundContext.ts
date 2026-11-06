import { createContext } from 'react';
import type { SoundEffect } from '../data/sounds';
export const SoundSettingsContext = createContext({
  enabled: true,
  volume: 1,
  setVolume: (_volume: number) => {},
  setEnabled: (_enabled: boolean) => {},
});
export const SoundContext = createContext<(name: SoundEffect, loop?: boolean) => () => void>(
  () => () => {},
);
