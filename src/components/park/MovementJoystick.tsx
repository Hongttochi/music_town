import type { MutableRefObject } from 'react';
import type { Position } from '../../types/park';
import { joystickVector } from '../../scene/avatar/gait';
export function MovementJoystick({
  motion,
  id = 'joystick',
  className = 'movement',
  label = '이동 조이스틱',
  stickId = 'stick',
}: {
  motion: MutableRefObject<Position>;
  id?: string;
  className?: string;
  label?: string;
  stickId?: string;
}) {
  const move = (element: HTMLElement, clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect();
    motion.current = joystickVector(
      clientX - rect.left - rect.width / 2,
      clientY - rect.top - rect.height / 2,
      35,
    );
    const stick = element.querySelector<HTMLElement>(`#${stickId}`)!;
    stick.style.transform = `translate(${motion.current.x * 22}px,${motion.current.y * 22}px)`;
  };
  return (
    <div className={className}>
      <div
        id={id}
        role="button"
        tabIndex={0}
        aria-label={label}
        onPointerDown={(e) => {
          if (!e.isPrimary) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e.currentTarget, e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          move(e.currentTarget, e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          motion.current = { x: 0, y: 0 };
          e.currentTarget.querySelector<HTMLElement>(`#${stickId}`)!.style.transform = '';
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => {
          motion.current = { x: 0, y: 0 };
          e.currentTarget.querySelector<HTMLElement>(`#${stickId}`)!.style.transform = '';
        }}
        onLostPointerCapture={(e) => {
          motion.current = { x: 0, y: 0 };
          e.currentTarget.querySelector<HTMLElement>(`#${stickId}`)!.style.transform = '';
        }}
      >
        <span className="north">⌃</span>
        <span className="west">‹</span>
        <span className="east">›</span>
        <span className="south">⌄</span>
        <div id={stickId} />
      </div>
    </div>
  );
}
