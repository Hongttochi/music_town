import { useEffect, useRef, useState } from 'react';
import { useSoundEffects } from './useSoundEffects';
import type { CoffeeId } from '../data/coffeeMenu';
import type { ParkProps } from '../types/park';
import { createParkScene } from '../scene/park/createParkScene';
export function useParkScene(props: ParkProps) {
  const playSound = useSoundEffects();
  const sound = useRef(playSound);
  sound.current = playSound;
  const canvas = useRef<HTMLCanvasElement>(null),
    latest = useRef(props);
  latest.current = props;
  const [error, setError] = useState(false);
  const benchBubble = useRef<HTMLButtonElement>(null);
  const [benchAction, setBenchAction] = useState<'sit' | null>(null);
  const useBench = useRef<() => void>(() => {});
  const noticeBubble = useRef<HTMLButtonElement>(null);
  const [nearNoticeBoard, setNearNoticeBoard] = useState(false);
  const [noticeBoardOpen, setNoticeBoardOpen] = useState(false);
  const coffeeBubble = useRef<HTMLButtonElement>(null);
  const [coffeeAction, setCoffeeAction] = useState<string | null>(null);
  const [coffeeMenuOpen, setCoffeeMenuOpen] = useState(false);
  const useCoffee = useRef<(order?: CoffeeId) => void>(() => {});
  useEffect(
    () =>
      createParkScene({
        el: canvas.current!,
        latest,
        sound,
        benchBubble,
        noticeBubble,
        coffeeBubble,
        useBench,
        useCoffee,
        setError,
        setBenchAction,
        setNearNoticeBoard,
        setCoffeeMenuOpen,
        setCoffeeAction,
      }),
    [],
  );
  return {
    canvas,
    error,
    noticeBoardOpen,
    setNoticeBoardOpen,
    nearNoticeBoard,
    noticeBubble,
    coffeeMenuOpen,
    setCoffeeMenuOpen,
    useCoffee,
    coffeeAction,
    coffeeBubble,
    benchAction,
    benchBubble,
    useBench,
  };
}
