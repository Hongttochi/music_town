import { useRef, useState, type CSSProperties } from 'react';
import { Button } from '../ui/Button';
import { CHANNEL_COUNT } from '../../data/channels';
import './channel-picker.css';

export function ChannelPicker({
  current,
  entered,
  onSelect,
  populations,
  capacities,
  busy,
}: {
  current: number;
  entered: boolean;
  onSelect: (index: number) => void | Promise<void>;
  populations: number[];
  capacities: number[];
  busy: boolean;
}) {
  const [selecting, setSelecting] = useState<number | null>(null);
  const pending = useRef(false);
  const loading = populations.length === 0;
  const rows: (number | null)[] = loading
    ? Array(CHANNEL_COUNT).fill(null)
    : populations.slice(0, CHANNEL_COUNT);
  const select = async (index: number) => {
    if (pending.current || busy || loading) return;
    pending.current = true;
    setSelecting(index);
    try {
      // Let the pressed state paint before mounting the 3D park, including demo entry.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      await onSelect(index);
    } finally {
      pending.current = false;
      setSelecting(null);
    }
  };
  return (
    <div className="park-directory" aria-busy={loading || busy || selecting !== null}>
      <span className="sr-only" role="status">
        {loading
          ? '채널 정보를 불러오고 있어요.'
          : selecting !== null
            ? `${selecting + 1}번 공원에 입장하고 있어요.`
            : ''}
      </span>
      <div className="directory-list">
        {rows.map((count, index) => {
          const full = count !== null && count >= (capacities[index] ?? 30),
            active = entered && index === current;
          return (
            <Button
              key={index}
              className="directory-row"
              data-ready={!loading}
              data-entering={selecting === index}
              style={{ '--channel-order': index } as CSSProperties}
              disabled={loading || busy || selecting !== null || (full && !active)}
              aria-current={active ? 'true' : undefined}
              onClick={() => void select(index)}
            >
              <span className="directory-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="directory-name">
                {index + 1}번 공원{selecting === index && <small>입장 중…</small>}
              </span>
              <span className="directory-population">
                <strong>{count ?? '—'}</strong>
                <span>{loading ? '' : `/ ${capacities[index] ?? 30}`}</span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
