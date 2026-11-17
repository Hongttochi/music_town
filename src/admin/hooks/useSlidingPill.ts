import { useLayoutEffect, useRef, type RefObject } from 'react';
import { easeInOutCubic, easeOutCubic } from '../utils/easing';

type Edges = { top: number; bottom: number };

/**
 * Moves the sidebar highlight to the active item. The leading edge arrives first
 * (0.36s ease-out) and the trailing edge follows (0.55s ease-in-out), so it stretches then settles.
 */
export function useSlidingPill(container: RefObject<HTMLElement | null>, activeKey: string) {
  const pill = useRef<HTMLDivElement>(null);
  const edges = useRef<Edges | null>(null);
  useLayoutEffect(() => {
    const el = pill.current;
    const target = container.current?.querySelector<HTMLElement>(`[data-key="${activeKey}"]`);
    if (!el || !target) return;
    const to = { top: target.offsetTop, bottom: target.offsetTop + target.offsetHeight };
    const paint = (e: Edges) => {
      el.style.top = `${e.top}px`;
      el.style.height = `${e.bottom - e.top}px`;
    };
    const from = edges.current;
    if (!from) {
      edges.current = to;
      paint(to);
      return;
    }
    const down = to.top > from.top;
    const lead: keyof Edges = down ? 'bottom' : 'top';
    const trail: keyof Edges = down ? 'top' : 'bottom';
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const leadT = Math.min(1, elapsed / 360);
      const trailT = Math.min(1, elapsed / 550);
      const current = {
        [lead]: from[lead] + (to[lead] - from[lead]) * easeOutCubic(leadT),
        [trail]: from[trail] + (to[trail] - from[trail]) * easeInOutCubic(trailT),
      } as Edges;
      edges.current = current;
      paint(current);
      if (trailT < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeKey, container]);
  return pill;
}
