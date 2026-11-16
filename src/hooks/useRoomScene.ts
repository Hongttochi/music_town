import { useEffect, useRef, useState } from 'react';
import { createRoomScene } from '../scene/room/createRoomScene';
import type { RoomSceneProps } from '../types/room';

export function useRoomScene(props: RoomSceneProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [error, setError] = useState(false);
  useEffect(
    () =>
      createRoomScene({
        el: canvas.current!,
        latest,
        setError,
      }),
    [],
  );
  return { canvas, error };
}
