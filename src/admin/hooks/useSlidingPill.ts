import { useLayoutEffect, useRef, type RefObject } from 'react';

export function useSlidingPill(container: RefObject<HTMLElement | null>, activeKey: string) {
  const pill = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = pill.current;
    const target = container.current?.querySelector<HTMLElement>(`[data-key="${activeKey}"]`);
    if (!el || !target) return;
    el.style.top = `${target.offsetTop}px`;
    el.style.height = `${target.offsetHeight}px`;
  }, [activeKey, container]);
  return pill;
}
