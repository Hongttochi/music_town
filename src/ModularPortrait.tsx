import { useEffect, useRef, useState } from 'react';
import type { Avatar } from './model';
import { loadAvatarLayers, composeAvatar } from './modularAvatar';
export function ModularPortrait({
  avatar,
  direction = 0,
}: {
  avatar: Partial<Avatar>;
  direction?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const key = JSON.stringify(avatar);
  useEffect(() => {
    let active = true;
    loadAvatarLayers()
      .then((layers) => {
        if (!active || !ref.current) return;
        const row = composeAvatar(layers, JSON.parse(key));
        const context = ref.current.getContext('2d')!;
        context.clearRect(0, 0, 512, 512);
        context.drawImage(
          row,
          Math.max(0, Math.min(3, direction)) * 512,
          0,
          512,
          512,
          0,
          0,
          512,
          512,
        );
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [key, direction]);
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
