import { useContext } from 'react';
import { SoundContext, SoundSettingsContext } from '../contexts/SoundContext';
export type { SoundEffect } from '../data/sounds';
export function useSoundSettings() {
  return useContext(SoundSettingsContext);
}
export function useSoundEffects() {
  return useContext(SoundContext);
}
