import type { CSSProperties } from 'react';
import { useMounted } from '../../hooks/useMounted';
import './meter.css';

export function Meter({ ratio, i = 0, hot = false }: { ratio: number; i?: number; hot?: boolean }) {
  const on = useMounted();
  return (
    <div className={`a-meter ${hot ? 'hot' : ''}`} style={{ '--i': i } as CSSProperties}>
      <i style={{ width: on ? `${Math.min(1, ratio) * 100}%` : 0 }} />
    </div>
  );
}
