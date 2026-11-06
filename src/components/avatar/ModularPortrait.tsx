import { useEffect, useRef, useState } from 'react';
import type { Avatar } from '../../data/model';
import { loadAvatarLayers, composeAvatar } from '../../scene/avatar/modularAvatar';

// Thumbnails yield between frames instead of blocking input with an entire catalog.
const pending = new Map<symbol, () => void>();
let frame: number | undefined;
function drain() {
  frame = undefined;
  const start = performance.now();
  for (const [id, render] of pending) {
    pending.delete(id);
    render();
    if (performance.now() - start >= 5) break;
  }
  if (pending.size) frame = requestAnimationFrame(drain);
}
function schedule(render: () => void) {
  const id = Symbol();
  pending.set(id, render);
  frame ??= requestAnimationFrame(drain);
  return () => {
    pending.delete(id);
  };
}

export function ModularPortrait({
  avatar,
  direction = 0,
  lazy = false,
}: {
  avatar: Partial<Avatar>;
  direction?: number;
  lazy?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(!lazy);
  const key = JSON.stringify({ ...avatar, name: undefined });
  useEffect(() => {
    if (!lazy || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '80px',
    });
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, [lazy]);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    let cancel = () => {};
    loadAvatarLayers()
      .then((layers) => {
        if (!active) return;
        const render = () => {
          if (!active || !ref.current) return;
          try {
            const portrait = composeAvatar(layers, JSON.parse(key), direction);
            const context = ref.current.getContext('2d')!;
            context.clearRect(0, 0, 512, 512);
            context.drawImage(portrait, 0, 0);
            setError(false);
          } catch {
            setError(true);
          }
        };
        if (lazy) cancel = schedule(render);
        else render();
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      cancel();
    };
  }, [key, direction, visible, lazy]);
  return (
    <div className="modular-portrait">
      <canvas
        ref={ref}
        width={512}
        height={512}
        role="img"
        aria-label="선택한 부품을 조합한 캐릭터"
      />
      {error && <span role="alert">이미지를 불러오지 못했어요.</span>}
    </div>
  );
}
