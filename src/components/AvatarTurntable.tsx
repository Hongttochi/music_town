import { useRef, useState, type PointerEvent } from 'react';
import { ModularPortrait } from '../ModularPortrait';
import type { Avatar } from '../model';

const directions = ['앞', '오른쪽', '뒤', '왼쪽'];
export function AvatarTurntable({ avatar }: { avatar: Avatar }) {
  const [direction, setDirection] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; direction: number; step: number } | null>(null);
  const wrap = (value: number) => ((value % 4) + 4) % 4;
  function finish(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <div className="avatar-turntable-wrap">
      <div
        className={`avatar-turntable ${dragging ? 'is-dragging' : ''}`}
        tabIndex={0}
        role="slider"
        aria-label="캐릭터 회전"
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={direction}
        aria-valuetext={`${directions[direction]} 모습`}
        aria-describedby="avatar-rotate-hint"
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || drag.current) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            direction,
            step: Math.max(28, event.currentTarget.clientWidth / 4),
          };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || start.id !== event.pointerId) return;
          setDirection(wrap(start.direction + Math.trunc((event.clientX - start.x) / start.step)));
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          setDirection((value) =>
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? 3
                : wrap(value + (event.key === 'ArrowRight' ? 1 : -1)),
          );
        }}
      >
        <ModularPortrait avatar={avatar} direction={direction} />
      </div>
      <span id="avatar-rotate-hint" className="sr-only">
        좌우로 드래그하거나 키보드 좌우 방향키로 회전할 수 있어요.
      </span>
    </div>
  );
}
