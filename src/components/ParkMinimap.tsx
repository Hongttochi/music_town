import { useEffect, useRef, type MutableRefObject } from 'react';
import { CatmullRomCurve3, Vector3 } from 'three';
import { PARK_PATHS } from '../parkPaths';
import { RIVER, BRIDGE } from '../riverBoundary';
import { COFFEE_BUILDING } from '../coffeeShop';
import { NOTICE_BOARD_SPOT } from '../noticeBoard';
import { CAMPFIRE_SPOT } from '../campfire';
import type { Position } from '../Park';
import type { Participant } from '../useTown';
import type { Stage } from '../model';
const paths = PARK_PATHS.map(({ points, width }) => ({
  width,
  points: new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, 0, z)))
    .getPoints(100)
    .map((p) => `${p.x},${p.z}`)
    .join(' '),
}));
export function ParkMinimap({
  position,
  mapPositions,
  stages,
  participants,
}: {
  position: MutableRefObject<Position>;
  mapPositions: MutableRefObject<Map<string, Position>>;
  stages: Stage[];
  participants: Participant[];
}) {
  const marker = useRef<SVGCircleElement>(null);
  const others = useRef(new Map<string, SVGCircleElement>());
  useEffect(() => {
    let frame = 0;
    const update = () => {
      const place = (node: SVGCircleElement, p: Position) => {
        node.setAttribute('cx', String((p.x - 700) / 25));
        node.setAttribute('cy', String((p.y - 450) / 25));
      };
      if (marker.current) place(marker.current, position.current);
      others.current.forEach((node, id) => {
        const p = mapPositions.current.get(id);
        if (p) place(node, p);
      });
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [position, mapPositions]);
  return (
    <div
      className="map-card"
      role="img"
      aria-label={`공원 지도 · 나와 다른 참가자 ${participants.length}명`}
    >
      <svg viewBox="-20 -16 60 32" aria-hidden="true">
        <rect x={-20} y={-16} width={60} height={32} rx={3} fill="#c4d6a5" />
        <path d={`M${RIVER.left},-16V16H${RIVER.right}V-16Z`} fill="#91c6c4" />
        <g fill="none" stroke="#eee3c8" strokeLinecap="round" strokeLinejoin="round">
          {paths.map((p, i) => (
            <polyline key={i} points={p.points} strokeWidth={p.width * 2} />
          ))}
        </g>
        <rect
          x={15}
          y={BRIDGE.centerZ - BRIDGE.width / 2}
          width={10.3}
          height={BRIDGE.width}
          rx={0.25}
          fill="#bd9767"
        />
        <rect
          x={COFFEE_BUILDING.x - 1.5}
          y={COFFEE_BUILDING.z - 1}
          width={3}
          height={2}
          rx={0.4}
          fill="#c08b60"
        />
        <rect
          x={NOTICE_BOARD_SPOT.x - 0.7}
          y={NOTICE_BOARD_SPOT.z - 0.4}
          width={1.4}
          height={0.8}
          fill="#617b57"
        />
        <circle cx={CAMPFIRE_SPOT.x} cy={CAMPFIRE_SPOT.z} r={0.7} fill="#ad8059" />
        {stages.map((s) => (
          <circle
            key={s.id}
            cx={(s.x - 700) / 25}
            cy={(s.y - 450) / 25}
            r={1.3}
            fill={s.artist ? '#e9bf82' : '#fcf8e8'}
            stroke="#a57c50"
            strokeWidth={0.4}
          />
        ))}
        {participants.map((p) => (
          <circle
            key={p.id}
            ref={(node) => {
              if (node) others.current.set(p.id, node);
              else others.current.delete(p.id);
            }}
            cx={(p.x - 700) / 25}
            cy={(p.y - 450) / 25}
            r={0.85}
            fill="#557f9c"
            stroke="#fffdf2"
            strokeWidth={0.35}
          />
        ))}
        <circle
          ref={marker}
          cx={(position.current.x - 700) / 25}
          cy={(position.current.y - 450) / 25}
          r={1}
          fill="#ef976c"
          stroke="#fffdf2"
          strokeWidth={0.45}
        />
      </svg>
    </div>
  );
}
