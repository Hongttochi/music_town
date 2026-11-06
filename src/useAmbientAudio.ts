import { CAMPFIRE_SPOT } from './campfire';
import fire from './sounds/fire.mp3';
import { resumeAudio } from './resumeAudio';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { useSoundSettings } from './useSoundEffects';
import { koreanHour } from './model';
import { RIVER } from './riverBoundary';
import morning from './sounds/morning.mp3';
import night from './sounds/night.mp3';
import river from './sounds/river.mp3';

type Position = { x: number; y: number };
export function useAmbientAudio(
  position: MutableRefObject<Position>,
  entered: boolean,
  quiet: boolean,
) {
  const { enabled, volume } = useSoundSettings();
  const settings = useRef({ enabled, volume, entered, quiet });
  settings.current = { enabled, volume, entered, quiet };
  useEffect(() => {
    const context = new AudioContext();
    const tracks = [morning, night, river, fire].map((url) => {
      const audio = new Audio(url);
      audio.loop = true;
      audio.preload = 'auto';
      // iOS ignores HTMLMediaElement.volume; control the mix with Web Audio gains.
      const gain = context.createGain();
      gain.gain.value = 0;
      const source = context.createMediaElementSource(audio);
      source.connect(gain).connect(context.destination);
      return { audio, gain };
    });
    let unlocked = false;
    let disposed = false;
    const start = () => {
      if (disposed || document.hidden) return;
      void resumeAudio(context);
      // Invoke play directly in the gesture for Safari's autoplay policy.
      for (const { audio } of tracks) {
        if (audio.paused) void audio.play().catch(() => {});
      }
    };
    const unlock = () => {
      unlocked = true;
      start();
    };
    const visibility = () => {
      if (document.hidden) tracks.forEach(({ audio }) => audio.pause());
      else if (unlocked) start();
    };
    const update = () => {
      const s = settings.current;
      const master =
        s.entered && s.enabled && !document.hidden ? s.volume * (s.quiet ? 0.08 : 0.3) : 0;
      const hour = koreanHour();
      const isNight = hour < 6 || hour >= 19;
      const x = (position.current.x - 700) / 25;
      const distance = Math.max(RIVER.left - x, x - RIVER.right, 0);
      const proximity = Math.max(0, 1 - distance / 7);
      const mix = proximity * proximity * (3 - 2 * proximity);
      const z = (position.current.y - 450) / 25;
      const fireProximity = Math.max(
        0,
        1 - Math.hypot(x - CAMPFIRE_SPOT.x, z - CAMPFIRE_SPOT.z) / 7,
      );
      const targets = [
        isNight ? 0 : master * (1 - mix * 0.65),
        isNight ? master * (1 - mix * 0.65) : 0,
        master * mix,
        isNight ? master * fireProximity * fireProximity : 0,
      ];
      tracks.forEach(({ gain }, i) => {
        // Smooth changes over roughly a second, including sliders and day/night changes.
        const next = gain.gain.value + (targets[i] - gain.gain.value) * 0.25;
        gain.gain.value = Math.abs(next - targets[i]) < 0.001 ? targets[i] : next;
      });
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', visibility);
    window.addEventListener('focus', visibility);
    const timer = window.setInterval(update, 150);
    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', visibility);
      window.removeEventListener('focus', visibility);
      tracks.forEach(({ audio, gain }) => {
        audio.pause();
        gain.disconnect();
        audio.removeAttribute('src');
        audio.load();
      });
      void context.close().catch(() => {});
    };
  }, [position]);
}
