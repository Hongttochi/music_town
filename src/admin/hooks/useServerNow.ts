import { useEffect, useRef, useState } from 'react';

// Current time in ms, corrected by the offset between server and browser clocks. Ticks every second.
export function useServerNow(serverNow?: string) {
  const offset = useRef(0);
  const [, tick] = useState(0);
  useEffect(() => {
    if (serverNow) offset.current = new Date(serverNow).getTime() - Date.now();
  }, [serverNow]);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return Date.now() + offset.current;
}
