import { useRef, type CSSProperties, type PointerEvent } from 'react';

type Drag = { id: number; x: number; y: number; value: number };
export function AudioKnob({
  label,
  caption,
  value,
  max,
  onChange,
}: {
  label: string;
  caption: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const drag = useRef<Drag | null>(null);
  const set = (next: number) => onChange(Math.max(0, Math.min(max, Math.round(next))));
  function down(event: PointerEvent<HTMLInputElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, value };
  }
  function move(event: PointerEvent<HTMLInputElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    // Relative motion prevents jumps when grabbing any part of the knob.
    const delta = event.clientX - start.x + (start.y - event.clientY);
    set(start.value + (delta * max) / (event.shiftKey ? 600 : 150));
  }
  return (
    <label className="audio-knob-control">
      <span className="audio-knob-caption">{caption}</span>
      <span className="audio-knob-name">{label}</span>
      <span
        className="audio-knob-dial"
        style={{ '--knob-angle': `${-135 + (value / max) * 270}deg` } as CSSProperties}
      >
        <span className="audio-knob-ticks" aria-hidden="true" />
        <span className="audio-knob-metal" aria-hidden="true">
          <span />
        </span>
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={value}
          aria-label={label}
          aria-valuetext={`${value}%`}
          title="위아래 또는 좌우로 드래그 · 방향키로 미세 조절"
          onChange={(event) => {
            if (!drag.current) set(Number(event.target.value));
          }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={(event) => {
            if (drag.current?.id === event.pointerId) drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onDoubleClick={() => set(caption === 'MIC VOLUME' ? 100 : 0)}
        />
      </span>
      <output className="audio-knob-value">
        {value}
        <small>%</small>
      </output>
    </label>
  );
}
