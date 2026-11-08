import { useId } from 'react';
import moriPortrait from '../../assets/npc/school-rabbit.webp';
import type { TimeTransitionPhase } from '../../hooks/useParkTimeTransition';
import './time-transition.css';
export function TimeTransition({
  phase,
  message,
}: {
  phase: TimeTransitionPhase;
  message: string;
}) {
  const id = useId();
  if (phase === 'idle') return null;
  return (
    <div className="time-transition" data-phase={phase} role="status" aria-live="polite">
      {phase === 'talk' && (
        <div className="time-transition-speech">
          <div className="time-transition-speaker">
            <img src={moriPortrait} alt="" />
            <span>
              모리<small>공원 안내</small>
            </span>
          </div>
          <p>{message}</p>
        </div>
      )}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <mask id={id}>
            <rect width="100" height="100" fill="white" />
            <circle
              className="time-transition-hole"
              cx="50"
              cy="50"
              r={phase === 'closing' ? 0 : 80}
              fill="black"
            />
          </mask>
        </defs>
        <rect width="100" height="100" fill="#101812" mask={`url(#${id})`} />
      </svg>
    </div>
  );
}
