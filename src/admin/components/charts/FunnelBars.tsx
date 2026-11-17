import type { CSSProperties } from 'react';
import { CountUp } from '../ui/CountUp';
import { useMounted } from '../../hooks/useMounted';
import type { FunnelStep } from '../../services/adminRepository';
import './funnel-bars.css';

type FunnelProps = {
  steps: FunnelStep[];
  tone?: 'blue' | 'teal';
  height?: number;
  showLast?: boolean;
  selected?: number;
  onSelect?: (i: number) => void;
};

// Bars fill up over a hatched track; chips between steps show step-to-step conversion.
export function FunnelBars({
  steps,
  tone = 'blue',
  height = 190,
  showLast = false,
  selected,
  onSelect,
}: FunnelProps) {
  const on = useMounted();
  const top = steps[0]?.value || 1;
  const topLast = steps[0]?.last || 1;
  const inner = height - 12;
  return (
    <div className={`a-funnel ${on ? 'on' : ''}`} style={{ '--n': steps.length } as CSSProperties}>
      {steps.map((s, i) => {
        const ratio = s.value / top;
        const prev = steps[i - 1];
        const conv = prev ? (s.value / prev.value) * 100 : 0;
        const next = steps[i + 1];
        const nextConv = next ? (next.value / s.value) * 100 : 0;
        return (
          <div key={s.label} style={{ '--i': i } as CSSProperties}>
            <div className="a-step-head">
              <p>{s.label}</p>
              <strong>
                <CountUp value={s.value} />
              </strong>
              <small>
                {i === 0
                  ? '시작 대비 100%'
                  : `시작 대비 ${(ratio * 100).toFixed(ratio < 0.1 ? 1 : 0)}%`}
              </small>
            </div>
            <div
              className={`a-col ${i === 0 ? 'solid' : ''} ${selected === i ? 'sel' : ''}`}
              style={{ '--h': `${height}px` } as CSSProperties}
              onClick={() => onSelect?.(i)}
              title={prev ? `이전 단계 대비 ${conv.toFixed(1)}%` : undefined}
            >
              <div
                className={`a-fill ${tone}`}
                style={{ height: on ? Math.max(4, ratio * inner) : 0 }}
              />
              {showLast && s.last > 0 && (
                <div
                  className="a-tick"
                  style={{ bottom: on ? 6 + (s.last / topLast) * inner : 6, opacity: on ? 1 : 0 }}
                />
              )}
              {next && (
                <span
                  className={`a-conv ${nextConv < 15 ? 'amber' : ''}`}
                  style={{ bottom: on ? Math.max(14, (next.value / top) * inner - 2) : 6 }}
                >
                  {nextConv.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
