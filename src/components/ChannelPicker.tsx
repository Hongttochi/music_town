import { Button } from './ui/Button';
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
  onSelect: (index: number) => void;
  populations: number[];
  capacities: number[];
  busy: boolean;
}) {
  return (
    <div className="park-directory">
      <div className="directory-list">
        {populations.map((count, index) => {
          const full = count >= (capacities[index] ?? 30),
            active = entered && index === current;
          return (
            <Button
              key={index}
              className="directory-row"
              disabled={busy || (full && !active)}
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(index)}
            >
              <span className="directory-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="directory-name">{index + 1}번 공원</span>
              <span className="directory-population">
                <strong>{count}</strong>
                <span>/ {capacities[index] ?? 30}</span>
              </span>
            </Button>
          );
        })}
      </div>
      {entered && <p className="directory-footnote">공원을 옮기면 공연과 대기가 종료돼요.</p>}
    </div>
  );
}
