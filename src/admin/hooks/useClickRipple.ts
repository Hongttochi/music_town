import { useEffect } from 'react';

// Draws an expanding ring wherever the pointer goes down.
export function useClickRipple() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const ring = document.createElement('span');
      ring.className = 'a-ripple';
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      document.body.appendChild(ring);
      ring.addEventListener('animationend', () => ring.remove());
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);
}
