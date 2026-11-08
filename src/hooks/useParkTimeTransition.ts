import { useEffect, useRef, useState } from 'react';
import { isParkNight, koreanHour } from '../utils/time';
import { useSoundEffects } from './useSoundEffects';
export type TimeTransitionPhase = 'idle' | 'zoom' | 'talk' | 'closing' | 'opening';
export function useParkTimeTransition(entered: boolean) {
  const sound = useSoundEffects();
  const latest = useRef(sound);
  latest.current = sound;
  const [night, setNight] = useState(isParkNight);
  const current = useRef(night);
  const [phase, setPhase] = useState<TimeTransitionPhase>('idle');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stops: (() => void)[] = [];
    const later = (fn: () => void, delay: number) => timers.push(setTimeout(fn, delay));
    const check = () => {
      if (document.hidden || active) return;
      const next = isParkNight();
      if (!entered) {
        current.current = next;
        setNight(next);
        return;
      }
      if (next === current.current) return;
      active = true;
      const hour = koreanHour();
      const minutes = new Date().getUTCMinutes();
      setMessage(
        `어머, 벌써 ${hour % 12 || 12}시${minutes ? ` ${minutes}분이` : ''}네요! ${next ? '곧 밤이 찾아와요.' : '곧 해가 떠요.'}`,
      );
      stops.push(latest.current('timeChange'));
      setPhase('zoom');
      later(() => setPhase('talk'), 1100);
      later(() => {
        setPhase('closing');
        stops.push(latest.current('screenChange'));
      }, 4200);
      later(() => {
        current.current = next;
        setNight(next);
        // Rebuild only the park view; retain the channel, profile, queue and live audio session.
        setRevision((value) => value + 1);
      }, 5500);
      later(() => setPhase('opening'), 5900);
      later(() => {
        setPhase('idle');
        active = false;
      }, 7200);
    };
    const interval = setInterval(check, 300);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
      stops.forEach((stop) => stop());
      document.removeEventListener('visibilitychange', check);
    };
  }, [entered]);
  return {
    night,
    phase,
    message,
    revision,
    active: phase !== 'idle',
    focusNpc: ['zoom', 'talk', 'closing'].includes(phase),
  };
}
