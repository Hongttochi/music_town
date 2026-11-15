import { useId } from 'react';
import './sparkline.css';

export function Sparkline({ data }: { data: number[] }) {
  // useId contains characters that are unsafe inside url(#...).
  const gradient = `spark${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((v, i) => [
    (i / (data.length - 1)) * 100,
    30 - ((v - min) / (max - min || 1)) * 26,
  ]);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg className="a-spark" viewBox="0 0 100 34" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--t-acc1)' }} stopOpacity="0.35" />
          <stop offset="1" style={{ stopColor: 'var(--t-acc1)' }} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L100,34 L0,34 Z`} fill={`url(#${gradient})`} />
      <path className="ln" d={d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
