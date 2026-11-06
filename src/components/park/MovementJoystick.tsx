import type { MutableRefObject } from 'react';
import type { Position } from '../../types/park';
export function MovementJoystick({ motion }: { motion: MutableRefObject<Position> }) {
  return (
    <div className="movement">
      <div
        id="joystick"
        role="button"
        tabIndex={0}
        aria-label="이동 조이스틱"
        onPointerDown={(e) => {
          if (!e.isPrimary) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          const rect = e.currentTarget.getBoundingClientRect();
          motion.current = {
            x: Math.max(-1, Math.min(1, (e.clientX - rect.left - rect.width / 2) / 35)),
            y: Math.max(-1, Math.min(1, (e.clientY - rect.top - rect.height / 2) / 35)),
          };
          const stick = e.currentTarget.querySelector<HTMLElement>('#stick')!;
          stick.style.transform = `translate(${motion.current.x * 22}px,${motion.current.y * 22}px)`;
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const r = e.currentTarget.getBoundingClientRect();
          motion.current = {
            x: Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / 35)),
            y: Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / 35)),
          };
          e.currentTarget.querySelector<HTMLElement>('#stick')!.style.transform =
            `translate(${motion.current.x * 22}px,${motion.current.y * 22}px)`;
        }}
        onPointerUp={(e) => {
          motion.current = { x: 0, y: 0 };
          e.currentTarget.querySelector<HTMLElement>('#stick')!.style.transform = '';
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => {
          motion.current = { x: 0, y: 0 };
          e.currentTarget.querySelector<HTMLElement>('#stick')!.style.transform = '';
        }}
        onLostPointerCapture={(e) => {
          motion.current = { x: 0, y: 0 };
          e.currentTarget.querySelector<HTMLElement>('#stick')!.style.transform = '';
        }}
      >
        <span className="north">⌃</span>
        <span className="west">‹</span>
        <span className="east">›</span>
        <span className="south">⌄</span>
        <div id="stick" />
      </div>
    </div>
  );
}
