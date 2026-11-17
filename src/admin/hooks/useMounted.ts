import { useEffect, useState } from 'react';

// Turns true one frame after mount so CSS transitions can grow bars from zero.
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}
