import type { CSSProperties } from 'react';
import { useMounted } from '../../hooks/useMounted';
import { formatCompact } from '../../utils/format';
import './bar-chart.css';

type BarProps = {
  data: { label: string; v: number; night?: boolean }[];
  max?: number;
  ticks?: number;
  format?: (n: number) => string;
  showEvery?: number;
};

export function BarChart({
  data,
  max,
  ticks = 4,
  format = formatCompact,
  showEvery = 1,
}: BarProps) {
  const on = useMounted();
  const peak = max ?? niceMax(Math.max(...data.map((d) => d.v)));
  return (
    <div className="a-chart">
      <div className="a-chart-grid">
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <div key={i}>
            <span>{format(peak - (peak / ticks) * i)}</span>
          </div>
        ))}
      </div>
      <div className="a-bars">
        {data.map((d, i) => {
          const pct = `${(d.v / peak) * 100}%`;
          return (
            <div
              key={d.label + i}
              className={`a-bar ${d.night ? 'night' : ''}`}
              style={{ '--i': i, '--v': pct } as CSSProperties}
            >
              <i style={{ height: on ? pct : 0 }} />
              <b>
                {d.label} · {format(d.v)}
              </b>
              {i % showEvery === 0 && <em>{d.label}</em>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function niceMax(n: number) {
  const mag = Math.pow(10, Math.floor(Math.log10(n || 1)));
  return Math.ceil(n / mag / 2) * 2 * mag;
}
