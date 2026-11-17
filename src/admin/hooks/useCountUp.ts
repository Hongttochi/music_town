import { useEffect, useRef, useState } from 'react';
import { easeOutCubic } from '../utils/easing';

// Rolls the number from its previous value to the new one whenever the target changes.
export function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = origin + (target - origin) * easeOutCubic(t);
      setValue(next);
      from.current = next;
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}
