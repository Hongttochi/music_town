import { CAMPFIRE_SPOT } from '../scene/park/campfire';
import fire from '../sounds/fire.mp3';
import { resumeAudio } from '../utils/resumeAudio';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { useSoundSettings } from './useSoundEffects';
import { isParkNight } from '../utils/time';
import { RIVER } from '../scene/park/riverBoundary';
import morning from '../sounds/morning.mp3';
import night from '../sounds/night.mp3';
import river from '../sounds/river.mp3';
import jazz from '../sounds/jazz_bar.m4a';
import { isInsideBar } from '../scene/park/nightBar';
import { ambientLevels } from '../audio/ambientMix';

type Position = { x: number; y: number };
export function useAmbientAudio(
  position: MutableRefObject<Position>,
  entered: boolean,
  quiet: boolean,
  parkNight?: boolean,
  barPerforming = false,
) {
  const { ambientVolume: volume } = useSoundSettings();
  const enabled = volume > 0;
  const settings = useRef({ enabled, volume, entered, quiet, parkNight, barPerforming });
  settings.current = { enabled, volume, entered, quiet, parkNight, barPerforming };
  useEffect(() => {
    const context = new AudioContext();
    const tracks = [morning, night, river, fire, jazz].map((url) => {
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
      const isNight = s.parkNight ?? isParkNight();
      const x = (position.current.x - 700) / 25;
      const distance = Math.max(RIVER.left - x, x - RIVER.right, 0);
      const proximity = Math.max(0, 1 - distance / 7);
      const mix = proximity * proximity * (3 - 2 * proximity);
      const z = (position.current.y - 450) / 25;
      const fireProximity = Math.max(
        0,
        1 - Math.hypot(x - CAMPFIRE_SPOT.x, z - CAMPFIRE_SPOT.z) / 7,
      );
      const targets = ambientLevels({
        audible: s.entered && s.enabled && !document.hidden,
        volume: s.volume,
        quiet: s.quiet,
        night: isNight,
        insideBar: isInsideBar({ x, z }),
        barPerforming: s.barPerforming,
        riverMix: mix,
        fireProximity,
      });
      tracks.forEach(({ gain }, i) => {
        // Silence excluded rooms and jazz during a performance immediately.
        if (targets[i] === 0) {
          gain.gain.value = 0;
          return;
        }
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
